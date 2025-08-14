# Vote System Alignment Plan
**Date**: 2025-08-14  
**Author**: AI Assistant  
**Context**: Following significant data model changes to Fires and Submissions, the voting system needs updates to maintain consistency across chaincode, server, and client.

## Executive Summary

The voting system requires updates to align with the new data models where:
- **Fire**: Uses simple `slug` as primary key
- **Submission**: Uses complex composite keys with `recency`, `slug`, and `uniqueKey`
- Both entities now have different approaches to hierarchical organization

## Current State Analysis

### 1. Chaincode Vote Structure
- **Vote Objects**: Reference entries using `entryType` + `entry` (composite key)
- **Hierarchical Organization**: Uses `entryParent` field for content hierarchy
- **Key Pattern**: `[entryType, entryParent, entry, id, voter]`
- **Processing**: Batch aggregation into VoteCount → VoteRanking → VoterReceipt

### 2. Server Implementation
- Vote controller handles raw votes and count processing
- Uses `entryParent` field (line 69) assuming it represents the fire
- Missing proper handling of new Fire/Submission composite key structures
- Vote endpoints expect database IDs, not chain keys

### 3. Client Implementation
- **Fire Voting**: Creates composite key incorrectly - uses only `[Fire.INDEX_KEY, slug]`
- **Submission Voting**: Uses server-provided `chainKey` correctly
- **Parent References**: Inconsistent handling between fire and submission votes

## Key Issues Identified

### 1. Composite Key Inconsistencies
- Fire composite key construction varies between components
- Current: `Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, [slug])`
- Should be: `Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, ["", slug])` (matching chaincode)

### 2. Parent Reference Confusion
- Fire votes use `slug` as `entryParent`
- Submission votes calculate complex parent logic
- Server assumes `entryParent` is always the fire

### 3. Missing Server Endpoints
- No `/api/fires/{slug}/vote` endpoint exists
- Vote endpoints use database IDs instead of chain keys
- No endpoint to fetch submissions by chain key

### 4. Type Safety Issues
- VoteDto construction uses different patterns across components
- Missing validation for composite key formats
- Inconsistent handling of BigNumber for quantities

## Proposed Changes

### Phase 1: Chaincode Updates (No changes needed)
The chaincode vote system is well-designed and flexible enough to handle the new data model. The key insight is that it uses composite keys consistently.

### Phase 2: Server Updates

#### 2.1 Add Fire Vote Endpoint
```typescript
// server/src/routes/fires.ts
router.post("/fires/:slug/vote", upvoteFire);

// server/src/controllers/fires.ts
export async function upvoteFire(req: Request, res: Response, next: NextFunction) {
  // Implementation similar to upvoteSubmission but for fires
}
```

#### 2.2 Update Vote Processing Logic
- Fix `entryParent` interpretation in vote controllers
- Add proper composite key validation
- Support both database ID and chain key references

#### 2.3 Add Chain Key Lookup Endpoints
```typescript
// GET /api/submissions/by-chain-key/:chainKey
// GET /api/fires/by-chain-key/:chainKey
```

### Phase 3: Client Updates

#### 3.1 Fix Fire Vote Composite Keys
```typescript
// FireList.vue - line 211
const fireCompositeKey = Fire.getCompositeKeyFromParts(Fire.INDEX_KEY, ["", slug]);
```

#### 3.2 Standardize Parent Reference Logic
- Fire votes: `entryParent` should be empty string (top-level)
- Submission votes: `entryParent` should be the fire's composite key
- Reply votes: `entryParent` should be the parent submission's composite key

#### 3.3 Create Shared Vote Service
```typescript
// client/src/services/voteService.ts
export class VoteService {
  static createFireVoteDto(fire: FireResponse, quantity: BigNumber): VoteDto
  static createSubmissionVoteDto(submission: SubmissionResponse, fireSlug: string, quantity: BigNumber): VoteDto
  static async submitVote(authDto: CastVoteAuthorizationDto, entryType: string, entryId: string): Promise<void>
}
```

### Phase 4: Data Migration Considerations

#### 4.1 Existing Vote Data
- Analyze existing votes for correct composite key formats
- Create migration script if needed
- Ensure backward compatibility

#### 4.2 Vote Count Integrity
- Verify VoteCount objects match new entry keys
- Update VoteRanking references
- Maintain audit trail in VoterReceipt

## Implementation Priority

1. **Critical** (Week 1)
   - Add fire vote endpoint
   - Fix fire composite key construction
   - Standardize entryParent logic

2. **Important** (Week 2)
   - Create shared vote service
   - Add chain key lookup endpoints
   - Improve error handling

3. **Nice to Have** (Week 3)
   - Add vote analytics endpoints
   - Implement vote caching
   - Create admin vote management UI

## Testing Strategy

### 1. Unit Tests
- Vote DTO construction with various entry types
- Composite key generation
- Parent reference logic

### 2. Integration Tests
- Fire voting end-to-end
- Submission voting end-to-end
- Reply voting with proper threading
- Vote counting and aggregation

### 3. Migration Tests
- Existing vote data compatibility
- Vote count accuracy
- Ranking preservation

## Risk Mitigation

### 1. Data Integrity
- Implement vote validation before processing
- Add composite key format checks
- Log all vote operations for audit

### 2. Performance
- Batch vote processing remains efficient
- Index vote queries by entry type
- Cache frequently accessed vote counts

### 3. User Experience
- Provide clear error messages
- Show vote processing status
- Enable vote verification

## Success Criteria

1. **Functional**: All vote operations work correctly with new data model
2. **Consistent**: Same composite key format across all components
3. **Performant**: Vote processing completes within 2 seconds
4. **Reliable**: No lost votes during migration
5. **Maintainable**: Clear separation of concerns with shared services

## Next Steps

1. Review and approve this plan
2. Create detailed technical specifications
3. Set up test environment with sample data
4. Implement Phase 1 changes
5. Test thoroughly before proceeding to next phases

## Appendix: Key Code Locations

### Chaincode
- `/chaincode/src/readwriteburn/api/Vote.ts` - Vote entity
- `/chaincode/src/readwriteburn/api/VoteCount.ts` - Aggregated votes
- `/chaincode/src/readwriteburn/castVote.ts` - Vote processing logic
- `/chaincode/src/readwriteburn/countVotes.ts` - Vote aggregation

### Server
- `/server/src/controllers/votes.ts` - Vote endpoints
- `/server/src/controllers/submissions.ts` - Submission vote handler
- `/server/src/types.ts` - Vote DTOs

### Client
- `/client/src/components/FireList.vue` - Fire voting
- `/client/src/components/SubmissionList.vue` - Submission voting
- `/client/src/services/ReadWriteBurnConnectClient.ts` - Vote signing