# Noble Hashes Dependencies

**Date:** 2025-06-26  
**Status:** Specification  
**Priority:** High

## Overview

Documentation for using the `@noble/hashes` library for cryptographic hashing in the ReadWriteBurn application.

## Why Noble Hashes?

### Advantages over Node.js crypto
- **Pure JavaScript**: No native dependencies, better compatibility
- **Audited**: Cryptographically audited by security experts
- **Modern**: Uses modern JavaScript features and ES modules
- **Lightweight**: Smaller bundle size and tree-shakeable
- **Cross-platform**: Works in Node.js, browsers, and other JS environments
- **Consistent**: Same behavior across all platforms

### Security Benefits
- **Battle-tested**: Used by major crypto projects
- **Regularly updated**: Active maintenance and security updates
- **Standards compliant**: Follows cryptographic standards precisely
- **Side-channel resistant**: Designed to avoid timing attacks

## Required Dependencies

### Package Installation
```bash
npm install @noble/hashes
```

### Package.json Addition
```json
{
  "dependencies": {
    "@noble/hashes": "^1.3.3"
  }
}
```

## Import Patterns

### SHA-256 Hashing
```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
```

### Alternative Imports (if needed)
```typescript
// For other hash functions
import { sha512 } from '@noble/hashes/sha2.js';
import { keccak256 } from '@noble/hashes/sha3.js';
import { hmac } from '@noble/hashes/hmac.js';

// For utility functions
import { utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils.js';
```

## Usage Examples

### Basic Content Hashing
```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

function hashContent(content: string): string {
  const contentBytes = new TextEncoder().encode(content);
  const hashBytes = sha256(contentBytes);
  return bytesToHex(hashBytes);
}
```

### With Salt/Timestamp
```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

function hashContentWithSalt(content: string, timestamp: number): string {
  const saltedContent = `${content}:${timestamp}`;
  const contentBytes = new TextEncoder().encode(saltedContent);
  const hashBytes = sha256(contentBytes);
  return bytesToHex(hashBytes);
}
```

### HMAC for Enhanced Security (Optional)
```typescript
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

function hmacContent(content: string, secret: string): string {
  const contentBytes = new TextEncoder().encode(content);
  const secretBytes = new TextEncoder().encode(secret);
  const hmacBytes = hmac(sha256, secretBytes, contentBytes);
  return bytesToHex(hmacBytes);
}
```

## TypeScript Integration

### Type Definitions
```typescript
// The library includes its own TypeScript definitions
// No need for @types/noble-hashes

interface HashFunction {
  (data: Uint8Array): Uint8Array;
}

interface ContentHasher {
  hash(content: string): string;
  verify(content: string, hash: string): boolean;
}
```

### Implementation Example
```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

class ContentHasher implements ContentHasher {
  hash(content: string): string {
    const contentBytes = new TextEncoder().encode(content);
    const hashBytes = sha256(contentBytes);
    return `sha256:${bytesToHex(hashBytes)}`;
  }

  verify(content: string, expectedHash: string): boolean {
    const computedHash = this.hash(content);
    return computedHash === expectedHash;
  }
}
```

## Performance Considerations

### Benchmarks
- **Noble hashes**: ~100MB/s for SHA-256
- **Node.js crypto**: ~200MB/s for SHA-256
- **Trade-off**: Slightly slower but more portable and secure

### Optimization Tips
```typescript
// Reuse TextEncoder for better performance
const encoder = new TextEncoder();

function optimizedHash(content: string): string {
  const contentBytes = encoder.encode(content);
  const hashBytes = sha256(contentBytes);
  return bytesToHex(hashBytes);
}

// For bulk operations, consider streaming
import { sha256 } from '@noble/hashes/sha2.js';

function hashLargeContent(content: string): string {
  const hasher = sha256.create();
  const chunkSize = 64 * 1024; // 64KB chunks
  
  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.slice(i, i + chunkSize);
    const chunkBytes = new TextEncoder().encode(chunk);
    hasher.update(chunkBytes);
  }
  
  return bytesToHex(hasher.digest());
}
```

## Compatibility Notes

### ES Modules
- Noble hashes uses ES modules exclusively
- Ensure your project supports ES modules or use appropriate build tools

### Browser Compatibility
```typescript
// Works in both Node.js and browsers
import { sha256 } from '@noble/hashes/sha2.js';

// Browser-specific optimizations
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('Running in browser');
} else {
  // Node.js environment
  console.log('Running in Node.js');
}
```

### Node.js Configuration
```json
// package.json - if using ES modules
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

## Migration from Node.js crypto

### Before (Node.js crypto)
```typescript
import crypto from 'crypto';

function oldHash(content: string): string {
  return crypto.createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}
```

### After (Noble hashes)
```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

function newHash(content: string): string {
  const contentBytes = new TextEncoder().encode(content);
  const hashBytes = sha256(contentBytes);
  return bytesToHex(hashBytes);
}
```

## Testing

### Unit Test Example
```typescript
import { describe, it, expect } from '@jest/globals';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

describe('Noble Hashes Integration', () => {
  it('should generate consistent hashes', () => {
    const content = 'test content';
    const expected = 'sha256:1eebdf4fdc9fc7bf283031b93f9aef3338de9052ce0e34fb4b93db7b6b8b8d2b';
    
    const contentBytes = new TextEncoder().encode(content);
    const hashBytes = sha256(contentBytes);
    const result = `sha256:${bytesToHex(hashBytes)}`;
    
    expect(result).toBe(expected);
  });

  it('should be deterministic', () => {
    const content = 'test content';
    const hash1 = hashContent(content);
    const hash2 = hashContent(content);
    
    expect(hash1).toBe(hash2);
  });
});
```

## Error Handling

### Common Issues and Solutions
```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

function safeHash(content: string): string | null {
  try {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content: must be non-empty string');
    }
    
    const contentBytes = new TextEncoder().encode(content);
    const hashBytes = sha256(contentBytes);
    return `sha256:${bytesToHex(hashBytes)}`;
    
  } catch (error) {
    console.error('Hash generation failed:', error);
    return null;
  }
}
```

## Security Best Practices

1. **Always validate input** before hashing
2. **Use salts** for content that might be guessable
3. **Store hashes securely** and use constant-time comparison
4. **Regular updates** of the noble-hashes library
5. **Consider HMAC** for additional security when needed

```typescript
// Constant-time comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```