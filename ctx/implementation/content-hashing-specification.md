# Content Hashing Implementation Specification

**Date:** 2025-06-26  
**Status:** Draft  
**Priority:** High

## Overview

Specification for implementing content hashing to enable hybrid storage with moderation capabilities while maintaining cryptographic proof of content authenticity.

## Requirements

### Functional Requirements
1. Generate SHA-256 hashes of user-generated content using `@noble/hashes`
2. Store content in SQLite, hashes on blockchain
3. Provide verification endpoints to check content integrity  
4. Support content moderation without affecting chain data
5. Enable bulk verification of content/hash pairs

### Non-Functional Requirements
1. Hash generation must be deterministic and reproducible
2. Verification should complete in <100ms for single items
3. Support for bulk verification of up to 1000 items
4. Secure against rainbow table attacks
5. Use noble cryptography library for security and compatibility

## Technical Design

### Hash Algorithm
- **Algorithm**: SHA-256
- **Encoding**: Hexadecimal string representation
- **Salt**: Include submission timestamp as salt
- **Format**: `sha256:${hash}`

### Content Preparation
```typescript
interface HashableContent {
  title: string;
  description: string;
  url?: string;
  timestamp: number; // Unix timestamp as salt
}

function prepareContentForHashing(content: HashableContent): string {
  return JSON.stringify({
    title: content.title.trim(),
    description: content.description.trim(),
    url: content.url?.trim() || '',
    timestamp: content.timestamp
  });
}
```

### Hash Generation
```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

function generateContentHash(content: HashableContent): string {
  const normalizedContent = prepareContentForHashing(content);
  const contentBytes = new TextEncoder().encode(normalizedContent);
  const hashBytes = sha256(contentBytes);
  const hash = bytesToHex(hashBytes);
  return `sha256:${hash}`;
}
```

## Database Schema Changes

### SQLite Updates
```sql
-- Add content hashing fields to submissions table
ALTER TABLE submissions ADD COLUMN content_hash TEXT;
ALTER TABLE submissions ADD COLUMN hash_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE submissions ADD COLUMN content_timestamp INTEGER;
ALTER TABLE submissions ADD COLUMN moderation_status TEXT DEFAULT 'active';

-- Create content moderation audit log
CREATE TABLE content_moderation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('flagged', 'removed', 'modified', 'restored')),
  reason TEXT,
  admin_user TEXT NOT NULL,
  original_hash TEXT,
  new_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

-- Index for performance
CREATE INDEX idx_submissions_hash ON submissions(content_hash);
CREATE INDEX idx_submissions_moderation ON submissions(moderation_status);
```

## API Implementation

### Enhanced Submission Creation
```typescript
// POST /api/submissions
async function createSubmission(req: Request, res: Response) {
  const { title, description, url, fire } = req.body;
  const timestamp = Date.now();
  
  // Prepare content for hashing
  const hashableContent = {
    title,
    description,
    url,
    timestamp
  };
  
  // Generate hash
  const contentHash = generateContentHash(hashableContent);
  
  // Store in SQLite
  const submission = await db.prepare(`
    INSERT INTO submissions (name, description, url, subfire_id, content_hash, content_timestamp, hash_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, url, fire, contentHash, timestamp, true);
  
  // Send hash to chaincode
  const chaincodeDto = {
    name: title,
    fire: fire,
    entryParent: fire,
    contentHash: contentHash,
    uniqueKey: generateUniqueKey()
  };
  
  await sendToChaincode('ContributeSubmission', chaincodeDto);
  
  res.json({ 
    id: submission.lastInsertRowid,
    contentHash,
    verified: true 
  });
}
```

### Content Verification Endpoint
```typescript
// GET /api/submissions/:id/verify
async function verifySubmissionContent(req: Request, res: Response) {
  const { id } = req.params;
  
  // Get submission from SQLite
  const submission = await db.prepare(`
    SELECT name, description, url, content_hash, content_timestamp, moderation_status
    FROM submissions WHERE id = ?
  `).get(id);
  
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  
  // Get hash from chaincode
  const chainSubmission = await getFromChaincode('FetchSubmissions', { 
    entryParent: submission.subfire_id 
  });
  
  // Find matching submission on chain
  const chainHash = findChainHashForSubmission(chainSubmission, id);
  
  // Recalculate hash from current content
  const currentHash = generateContentHash({
    title: submission.name,
    description: submission.description,
    url: submission.url,
    timestamp: submission.content_timestamp
  });
  
  const verified = currentHash === submission.content_hash && 
                  submission.content_hash === chainHash;
  
  res.json({
    submissionId: id,
    sqliteHash: submission.content_hash,
    chainHash: chainHash,
    currentHash: currentHash,
    verified: verified,
    moderationStatus: submission.moderation_status,
    lastModified: submission.updated_at
  });
}
```

### Bulk Verification Endpoint
```typescript
// POST /api/admin/verify-bulk
async function bulkVerifyContent(req: Request, res: Response) {
  const { submissionIds } = req.body; // Array of submission IDs
  
  if (submissionIds.length > 1000) {
    return res.status(400).json({ error: 'Maximum 1000 submissions per request' });
  }
  
  const results = [];
  
  for (const id of submissionIds) {
    try {
      // Get submission from SQLite
      const submission = await db.prepare(`
        SELECT id, name, description, url, content_hash, content_timestamp
        FROM submissions WHERE id = ?
      `).get(id);
      
      if (!submission) {
        results.push({ id, status: 'not_found' });
        continue;
      }
      
      // Recalculate hash
      const currentHash = generateContentHash({
        title: submission.name,
        description: submission.description,
        url: submission.url,
        timestamp: submission.content_timestamp
      });
      
      const verified = currentHash === submission.content_hash;
      
      results.push({
        id,
        status: verified ? 'verified' : 'hash_mismatch',
        sqliteHash: submission.content_hash,
        currentHash: currentHash
      });
      
    } catch (error) {
      results.push({ id, status: 'error', error: error.message });
    }
  }
  
  res.json({ results });
}
```

## Content Moderation Implementation

### Moderation Endpoint
```typescript
// POST /api/admin/submissions/:id/moderate
async function moderateSubmission(req: Request, res: Response) {
  const { id } = req.params;
  const { action, reason, newContent } = req.body;
  const adminUser = req.user.id; // From auth middleware
  
  // Get current submission
  const submission = await db.prepare(`
    SELECT * FROM submissions WHERE id = ?
  `).get(id);
  
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  
  const originalHash = submission.content_hash;
  let newHash = originalHash;
  
  // Start transaction
  await db.exec('BEGIN TRANSACTION');
  
  try {
    // Update submission based on action
    switch (action) {
      case 'remove':
        await db.prepare(`
          UPDATE submissions 
          SET description = '[Content removed by moderator]',
              moderation_status = 'removed',
              hash_verified = FALSE
          WHERE id = ?
        `).run(id);
        break;
        
      case 'modify':
        if (!newContent) {
          throw new Error('New content required for modify action');
        }
        
        // Generate new hash for modified content
        newHash = generateContentHash({
          title: submission.name,
          description: newContent,
          url: submission.url,
          timestamp: submission.content_timestamp
        });
        
        await db.prepare(`
          UPDATE submissions 
          SET description = ?,
              content_hash = ?,
              moderation_status = 'modified',
              hash_verified = FALSE
          WHERE id = ?
        `).run(newContent, newHash, id);
        break;
        
      case 'flag':
        await db.prepare(`
          UPDATE submissions 
          SET moderation_status = 'flagged'
          WHERE id = ?
        `).run(id);
        break;
        
      case 'restore':
        await db.prepare(`
          UPDATE submissions 
          SET moderation_status = 'active',
              hash_verified = TRUE
          WHERE id = ?
        `).run(id);
        break;
    }
    
    // Log moderation action
    await db.prepare(`
      INSERT INTO content_moderation 
      (submission_id, action, reason, admin_user, original_hash, new_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, action, reason, adminUser, originalHash, newHash);
    
    await db.exec('COMMIT');
    
    res.json({ 
      success: true, 
      action,
      originalHash,
      newHash: newHash !== originalHash ? newHash : null
    });
    
  } catch (error) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
}
```

## Chaincode Integration

### Updated Submission DTO
```typescript
// Add contentHash field to submission DTO sent to chaincode
interface ChaincodeSubmissionDto {
  name: string;
  fire: string;
  entryParent: string;
  contentHash: string; // SHA-256 hash of content
  uniqueKey: string;
}
```

### Hash Storage in Chaincode
The chaincode should store the content hash in the Submission object:

```typescript
// In chaincode/src/readwriteburn/api/Submission.ts
export class Submission extends ChainObject {
  // ... existing fields ...
  
  @IsString()
  contentHash: string; // Store the hash on chain
}
```

## Security Considerations

### Hash Security
- Use timestamp as salt to prevent rainbow table attacks
- Store timestamp alongside hash for verification
- Use `@noble/hashes` library for cryptographically secure SHA-256 implementation

### Access Control
- Admin-only access to moderation endpoints
- Rate limiting on verification endpoints
- Audit logging for all moderation actions

### Data Integrity
- Atomic database transactions for moderation actions
- Regular bulk verification jobs to detect tampering
- Alerts for hash mismatches

## Performance Considerations

### Optimization Strategies
- Index content_hash field for fast lookups
- Cache verification results for frequently accessed content
- Batch verification operations for efficiency
- Async processing for bulk operations

### Monitoring
- Track verification response times
- Monitor hash mismatch rates
- Alert on unusual moderation activity
- Performance metrics for bulk operations

## Testing Strategy

### Unit Tests
- Hash generation determinism
- Content normalization
- Verification logic
- Moderation actions

### Integration Tests
- End-to-end submission flow
- Hash verification across systems
- Moderation workflow
- Bulk verification operations

### Load Tests
- Bulk verification performance
- Concurrent moderation operations
- Hash generation under load