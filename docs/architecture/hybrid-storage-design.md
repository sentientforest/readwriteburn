# Hybrid Storage Architecture Design

**Date:** 2025-06-26  
**Status:** Draft  
**Priority:** High

## Problem Statement

Traditional blockchain applications face a fundamental challenge: immutable storage makes content moderation challenging. If copyrighted material, illegal content, or content requiring DMCA takedown is stored on-chain, it may become permanently accessible and cannot be completely removed in any straightforward fashion.

## Solution: Hybrid Storage with Content Verification

### Core Principle
- **SQLite**: Store user-generated content that may require moderation
- **Blockchain**: Store cryptographic hashes and immutable proofs
- **Verification**: Enable anyone to verify content authenticity via hash comparison

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Server (API)    │───▶│   GalaChain     │
│                 │    │                  │    │   (Chaincode)   │
│ • Content       │    │ • Hash content   │    │ • Store hashes  │
│ • Interactions  │    │ • Store in SQLite│    │ • Vote counts   │
│                 │    │ • Verify hashes  │    │ • Rankings      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  SQLite Database │
                       │                  │
                       │ • Full content   │
                       │ • Descriptions   │ 
                       │ • Moderated data │
                       └──────────────────┘
```

## Data Storage Strategy

### What Goes On-Chain (Immutable)
- **Hashes**: SHA-256 hashes of content for verification
- **Vote Counts**: Aggregated token burn amounts
- **Rankings**: Time-weighted vote rankings
- **Metadata**: Fire names, submission titles (short, non-problematic data)
- **Proofs**: User authentication, transaction proofs

### What Goes Off-Chain (SQLite, Moderable)
- **Descriptions**: Full text descriptions of submissions
- **User Comments**: Potentially lengthy user-generated content
- **URLs**: External links that may become problematic
- **Rich Content**: Any content that might contain copyrighted material

## Content Verification Flow

### Submission Creation
1. User submits content via client
2. Server generates SHA-256 hash of content
3. Server stores full content in SQLite
4. Server sends hash + metadata to chaincode
5. Chaincode stores hash on immutable ledger

### Content Retrieval
1. Client requests submission data
2. Server retrieves content from SQLite
3. Server retrieves hash from chaincode
4. Server computes hash of SQLite content
5. Server verifies hashes match
6. Server returns content + verification status

### Content Moderation
1. Admin receives DMCA/takedown request
2. Admin removes/modifies content in SQLite
3. Hash on chain remains unchanged
4. Content no longer verifies against chain hash
5. System can flag content as "modified/removed"

## Database Schema Updates

### SQLite Schema Additions
```sql
-- Add hash tracking to submissions
ALTER TABLE submissions ADD COLUMN content_hash TEXT;
ALTER TABLE submissions ADD COLUMN hash_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE submissions ADD COLUMN moderation_status TEXT DEFAULT 'active';

-- Content moderation log
CREATE TABLE content_moderation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER,
  action TEXT, -- 'flagged', 'removed', 'modified'
  reason TEXT,
  admin_user TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);
```

### Chaincode Schema (Existing)
- **Submission**: Already stores composite keys and metadata
- **Vote**: Already stores vote amounts and references
- **VoteCount**: Already aggregates vote totals
- **VoteRanking**: Already handles time-weighted rankings

## API Endpoints Design

### Content Verification
```
GET /api/submissions/:id/verify
Response: {
  "content_hash": "sha256:abc123...",
  "chain_hash": "sha256:abc123...", 
  "verified": true,
  "moderation_status": "active"
}
```

### Enhanced Submission Retrieval
```
GET /api/submissions/:id
Response: {
  "id": 1,
  "title": "Submission Title",
  "description": "Full content from SQLite",
  "hash_verified": true,
  "moderation_status": "active",
  "vote_count": 150,
  "ranking_score": 85.2
}
```

### Moderation Endpoints
```
POST /api/admin/submissions/:id/moderate
Body: {
  "action": "remove|flag|modify",
  "reason": "DMCA takedown request",
  "new_content": "optional modified content"
}
```

## Security Considerations

### Hash Algorithm
- Use SHA-256 for cryptographic security
- Include salt/nonce to prevent rainbow table attacks
- Consider HMAC for additional security

### Access Control
- Admin-only access to moderation endpoints
- Public access to verification endpoints
- Rate limiting on verification checks

### Data Integrity
- Regular bulk verification jobs
- Alerts for hash mismatches
- Audit logs for all moderation actions

## Implementation Benefits

### Legal Compliance
- Can respond to DMCA takedowns
- Can remove illegal content
- Can moderate harmful content
- Maintains proof of original submission

### Data Integrity
- Cryptographic proof of content authenticity
- Tamper detection via hash verification
- Transparent moderation actions

### Performance
- Fast content retrieval from SQLite
- Minimal blockchain queries for verification
- Efficient bulk verification processes

### Scalability
- SQLite handles high-frequency content operations
- Blockchain only stores small hashes
- Future migration to rsqlite for distributed scaling

## Migration Strategy

### Phase 1: Add Hash Support
1. Update submission creation to generate hashes
2. Store hashes in both SQLite and chaincode
3. Add verification endpoints

### Phase 2: Enable Moderation
1. Add moderation status tracking
2. Implement admin moderation endpoints
3. Add audit logging

### Phase 3: Full Verification
1. Bulk verify existing content
2. Add automated verification checks
3. Implement alerting for mismatches

## Future Considerations

- **Distributed SQLite**: rsqlite for multi-instance synchronization
- **Content Encryption**: Encrypt sensitive content in SQLite
- **Decentralized Storage**: IPFS integration for large content
- **Advanced Hashing**: Merkle trees for batch verification