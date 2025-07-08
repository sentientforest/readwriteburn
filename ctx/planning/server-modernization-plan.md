# Server Modernization Plan

**Date:** 2025-06-26  
**Status:** Planning  
**Priority:** High

## Overview

Plan to modernize the `server/` application to provide complete JSON API coverage for the updated `chaincode/` functionality, implementing a hybrid storage strategy for legal compliance and data integrity.

## Current State Analysis

### Chaincode Contract Methods (6 total)
1. **`FireStarter`** - Create fires/communities ✅ *Has server endpoint*
2. **`FetchFires`** - Get fires with pagination ✅ *Has server endpoint*  
3. **`ContributeSubmission`** - Create submissions ✅ *Has server endpoint*
4. **`FetchSubmissions`** - Get submissions with pagination ✅ *Has server endpoint*
5. **`CastVote`** - Vote on submissions by burning tokens ⚠️ *Partial server support*
6. **`FetchVotes`** - Get votes with pagination ❌ *Missing server endpoint*

### Server vs Chaincode Comparison

#### ✅ Implemented (but may need updates)
- **Fire Management**: Server has CRUD operations for fires, chaincode has `FireStarter` and `FetchFires`
- **Submission Management**: Server has CRUD operations, chaincode has `ContributeSubmission` and `FetchSubmissions`
- **Basic Voting**: Server has voting endpoint, chaincode has `CastVote`

#### ❌ Missing Server Endpoints
- **`FetchVotes`**: No server endpoint to retrieve votes
- **`CountVotes`**: No server endpoint to process vote aggregation
- **Vote Management**: No server endpoints for vote lifecycle management

#### ⚠️ Inconsistencies to Fix
1. **DTO Mismatch**: Server uses custom DTOs, chaincode uses different DTOs
2. **Fee Handling**: Server has incomplete fee verification logic
3. **Database vs Chain**: Dual storage creates data consistency issues
4. **Response Types**: Server returns custom formats, chaincode returns GalaChain responses

## Hybrid Storage Strategy

### Architecture Principle
- **SQLite**: User-generated content that may need moderation/removal (descriptions, potentially copyrighted material)
- **Blockchain**: Verifiable hashes, vote counts, immutable proof-of-existence
- **Verification**: Content hash validation ensures SQLite data matches chain hashes

### Key Benefits
- **Legal Compliance**: Can remove illegal content from SQLite without affecting chain
- **Data Integrity**: Hashes prove content authenticity  
- **Scalability**: SQLite handles high-frequency content operations
- **Immutability**: Vote counts and proofs remain permanently on chain
- **Moderation**: Can handle DMCA takedowns and content disputes

## Implementation Plan

### Phase 1: Critical Missing Features (High Priority)

#### 1. Content Hashing System
- Implement SHA-256 hashing for submission descriptions
- Store content in SQLite, hash on chain via chaincode
- Add hash verification endpoints for data integrity

#### 2. Add `FetchVotes` API Endpoint
- Create `/api/votes` GET endpoint with pagination
- Pure chaincode data (no content to worry about)
- Support fire/submission filtering

#### 3. Add `CountVotes` API Endpoint 
- Create `/api/votes/count` POST endpoint
- Aggregate votes and update rankings on chain
- Trigger from server after vote verification

### Phase 2: Data Integrity & Verification (High Priority)

#### 4. Content Verification System
- `/api/submissions/:id/verify` - Verify SQLite content matches chain hash
- Automatic hash validation on content retrieval
- Content moderation support (DMCA, etc.)

#### 5. Enhanced Submission Flow
- Hash content before sending to chaincode
- Store full content in SQLite with reference to chain submission
- Link SQLite records to chain composite keys

### Phase 3: Complete API Coverage (Medium Priority)

#### 6. Update `CastVote` Implementation
- Fix fee verification and chaincode integration
- Pure chain operation (no content storage needed)

#### 7. Synchronize DTOs Appropriately
- Use chaincode DTOs for chain operations
- Keep server DTOs for SQLite operations
- Clear separation of concerns

### Phase 4: Administrative & Moderation Features

#### 8. Content Moderation Endpoints
- `/api/admin/submissions/:id/moderate` - Mark content for review
- `/api/admin/content/takedown` - Handle DMCA requests
- Content flagging and removal from SQLite (chain hash remains)

#### 9. Data Consistency Tools
- Bulk hash verification endpoints
- Data migration tools for content/hash separation
- Chain-to-SQLite synchronization utilities

## Next Steps

1. Write detailed design documents for each phase
2. Start with Phase 1 implementation
3. Update existing endpoints to use hybrid storage
4. Add missing API endpoints
5. Implement content verification system

## Notes

- Keep SQLite for now; consider rsqlite for future scaling
- Focus on sophisticated example over high-traffic production
- Ensure all user-generated content has moderation capabilities
- Maintain backward compatibility where possible