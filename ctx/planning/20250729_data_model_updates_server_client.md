# Data Model Updates: Server & Client Alignment

**Date**: July 31, 2025
**Scope**: Align server and client applications with updated chaincode data models
**Focus**: Three-tier DTO alignment (Client ↔ Server ↔ Chaincode) with proper fee handling

## Executive Summary

Following significant chaincode data model changes, we need to update the server and client applications to maintain compatibility.
The key changes involve enhanced response DTOs that provide chain keys directly, proper three-tier data flow alignment,
and compound DTO structures for fee authorization/verification flows between client, server, and chaincode.

## Chaincode Changes Summary (Completed)

### Key Model Changes
1. **Enhanced Response DTOs** - `FireResDto` and `ContributeSubmissionResDto` now provide chain keys directly
2. **Submissions auto-parent to Fire** - When `entryParentKey` is undefined, automatically set to Fire
3. **Chain key identifiers in responses** - Eliminate need for client-side key generation
4. **Enhanced fetch logic** - Submissions can be fetched with nested sub-comments included
5. **Compound DTO structures** - Fee verification integrated into submission/fire creation DTOs

### Current Status
- ✅ **Chaincode**: Updated and all tests passing
- ❌ **Server**: DTO misalignment and missing chain key handling
- ❌ **Client**: Outdated API types and missing compound DTO support

## Server Updates Required

### 1. DTO Import and Response Handling (High Priority)

**Issue**: Server lacks chaincode DTO imports and enhanced response handling
**Impact**: Cannot process enhanced response structures or provide chain keys to clients

**Root Cause**: Server needs to import and use chaincode DTOs directly:
- `FireResDto` (includes `fireKey` field)
- `ContributeSubmissionResDto` (includes `submissionKey` field)
- Enhanced compound DTOs with fee verification

**Files to Update**:
- `server/src/types.ts` - Import chaincode DTOs directly
- `server/src/controllers/fires.ts` - Handle `FireResDto` responses with `fireKey`
- `server/src/controllers/submissions.ts` - Handle `ContributeSubmissionResDto` responses with `submissionKey`

**Changes Required**:
```typescript
// Import chaincode DTOs directly in server/src/types.ts
import {
  FireResDto,
  ContributeSubmissionResDto,
  FireStarterDto,
  ContributeSubmissionDto,
  FireStarterAuthorizationDto,
  ContributeSubmissionAuthorizationDto
} from '../chaincode/src/readwriteburn';

// Update fire controller to handle enhanced response
const chainResponse = await submitToChaincode('FireStarter', dto);
const fireResult = chainResponse.data as FireResDto;
// fireResult.fireKey contains the chain composite key
// fireResult.metadata contains the Fire object

// Update submission controller to handle enhanced response
const chainResponse = await submitToChaincode('ContributeSubmission', dto);
const submissionResult = chainResponse.data as ContributeSubmissionResDto;
// submissionResult.submissionKey contains the chain composite key
// submissionResult.submission contains the Submission object
```

**Critical Fix**: Server imports chaincode DTOs directly. Chaincode provides chain keys in response - server no longer generates them.

### 2. Three-Tier DTO Flow Implementation (High Priority)

**Issue**: Complex fee authorization flow requires different DTO handling at each tier
**Impact**: Fee transactions fail due to incorrect DTO transformation between tiers

**Three-Tier Data Flow**:
1. **Client → Server**: Fee Authorization DTOs (client-signed)
2. **Server → Asset Channel**: Fee verification and authorization
3. **Server → Chaincode**: Fee verification + original request (server-signed)

**Root Cause Analysis**:
- Client creates `FireStarterAuthorizationDto` with client-signed fee authorization
- Server must verify fee on assets channel, then send `FireStarterDto` with fee verification to chaincode
- Similar pattern for `ContributeSubmissionAuthorizationDto` → `ContributeSubmissionDto`

**Files to Update**:
- `server/src/types.ts` - Import authorization and submission DTOs from chaincode
- `server/src/controllers/fires.ts` - Handle `FireStarterAuthorizationDto` → `FireStarterDto` transformation
- `server/src/controllers/submissions.ts` - Handle `ContributeSubmissionAuthorizationDto` → `ContributeSubmissionDto` transformation

**Server Changes Required**:
```typescript
// Current implementation in fires.ts (lines 103-146) needs updates:
export async function fireStarter(req: Request, res: Response, next: NextFunction) {
  // 1. Parse client authorization DTO (already implemented)
  const authDto: FireStarterAuthorizationDto = deserialize(FireStarterAuthorizationDto, req.body);
  const { fire, fee } = authDto;

  // 2. Verify fee on assets channel (currently disabled but structure exists)
  // should submit to `FeeAuthorizationDto` to `AuthorizeFee` method on GalaChainTokenContract on assets channel
  const feeVerification = await authorizeFee(fee);

  // 3. Create server-signed submission DTO (already implemented)
  const serverDto = await createValidDTO(FireStarterDto, {
    fire: fire,
    fee: feeVerification, // Add fee verification
    uniqueKey: `readwriteburn-${randomUniqueKey()}`
  }).signed(getAdminPrivateKey());

  // 4. Submit to chaincode and handle FireResDto response
  const chainResponse = await submitToChaincode('FireStarter', serverDto);
  const fireResult = chainResponse.data as FireResDto;

  // 5. Extract chain key and metadata for database storage
  const chainKey = fireResult.fireKey;
  const fireMetadata = fireResult.metadata;
}
```

**Critical Fix**: Use proper compound DTO flow - do NOT bypass fee verification.

### 3. Nested Submission API Endpoints (Medium Priority)

**Issue**: No API support for fetching nested submissions
**Impact**: Client needs this to display threaded discussions efficiently

**New Endpoints Required**:
```typescript
GET /api/submissions/:chainKey/replies  // Fetch child submissions
GET /api/fires/:slug/submissions?depth=1    // Top-level only
GET /api/fires/:slug/submissions?depth=all  // Include nested
```

### 4. Database Chain Key Storage (Low Priority)

**Issue**: Verification needed for chain key persistence
**Impact**: Chain keys may not persist correctly

**Current Status**: Database schema already includes `chain_key` columns:
- `db.ts:103-104`: `INSERT ... chain_key` for fires
- `db.ts:352`: `chain_key, chain_id` columns for submissions
- Migration system exists and is functional

**Action Required**: Verification only - no changes needed
**Files to Review**: `migrations.ts`, `db.ts` (existing implementation)

### 5. Vote Processing Updates (Low Priority - Future Phase)

**Issue**: Vote controller assumes `entryParent` is always Fire
**Impact**: Votes on nested submissions may not process correctly

**Note**: Deferred to voting phase as per requirements

## Client Updates Required

### 1. Chain Key Response Handling (High Priority)

**Issue**: Client API types don't include chain keys from enhanced server responses
**Impact**: Client cannot access composite keys needed for voting and threading

**Files to Update**:
- `client/src/types/api.ts` - Add `chainKey` fields to response interfaces
- `stores/fires.ts` - Use server-provided chain keys
- `stores/submissions.ts` - Use server-provided chain keys

**Changes Required**:
```typescript
// Update client/src/types/api.ts (lines 12-21, 35-50)
interface FireResponse {
  slug: string;
  name: string;
  description?: string;
  created_at: string;
  starter: string;
  authorities: string[];
  moderators: string[];
  entryParent?: string;
  chainKey: string;  // NEW: Chain composite key from server
}

interface SubmissionResponse {
  id: number;
  name: string;
  description: string;
  url?: string;
  contributor: string;
  subfire_id: string;
  content_hash: string;
  hash_verified: boolean;
  moderation_status: "active" | "flagged" | "removed" | "modified";
  content_timestamp: number;
  created_at: string;
  updated_at?: string;
  votes?: number;
  entryParent?: string;
  chainKey: string;  // NEW: Chain composite key from server
}
```

### 2. Compound DTO Handling (High Priority)

**Issue**: Client needs to create authorization DTOs with proper fee structure
**Impact**: Fee authorization flow fails without proper compound DTO structure

**Files to Update**:
- `components/FireStarter.vue` - Create `FireStarterAuthorizationDto`
- `components/NewSubmission.vue` - Create `ContributeSubmissionAuthorizationDto`
- Client voting components - Create `CastVoteAuthorizationDto`

**Changes Required**:
```typescript
// Client must create authorization DTOs, not submission DTOs directly
// FireStarter.vue
const authDto = new FireStarterAuthorizationDto({
  fire: new FireDto({
    slug: fireSlug,
    name: fireName,
    starter: userRef,
    // ... other fields
  }).signed(userPrivateKey),
  fee: new FeeAuthorizationDto({
    // client-signed fee authorization
  }).signed(userPrivateKey)
});

// Submit authorization DTO to server
const response = await api.post('/fires', authDto);
// Server returns enhanced response with chainKey
const fireResult: FireResponse = response.data;
const chainKey = fireResult.chainKey;
```

### 3. Voting Chain Key Usage (Medium Priority)

**Issue**: Components must use server-provided chain keys for voting, not client-constructed keys
**Impact**: Vote transactions fail with invalid entry references

**Files to Update**:
- `SubmissionList.vue` (voting logic)
- `ThreadedSubmission.vue` (voting logic)
- Voting components

**Changes Required**:
```typescript
// Use server-provided chain keys in vote DTOs
const voteDto = new CastVoteAuthorizationDto({
  vote: new VoteDto({
    entry: submission.chainKey,     // From server response
    entryParent: fire.chainKey,    // From server response
    entryType: "RWBS",            // Submission type
    quantity: burnAmount,
    // ... other fields
  }).signed(userPrivateKey),
  fee: feeAuthorizationDto  // Client-signed fee
});
```

### 4. Nested Submission Display (Medium Priority)

**Issue**: Components may not properly handle the new nested submission API responses
**Impact**: Threading and reply functionality broken

**Files to Update**:
- `SubmissionList.vue` (nested display logic)
- `ThreadedSubmission.vue` (child submission handling)

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. **Server API Response Enhancement**
   - Add chain key identifiers to Fire and Submission responses
   - Update database queries to include chain keys
   - Test API responses include proper composite keys

2. **Client Chain Key Handling**
   - Update API response types to include chain keys
   - Modify stores to use server-provided keys
   - Fix composite key construction in voting components

### Phase 2: DTO Alignment & Submission Logic (Week 2)
1. **Server DTO Standardization**
   - Update server SubmissionDto to match chaincode interface
   - Remove server-side parent assignment logic (let chaincode handle)
   - Add nested submission API endpoints
   - Test submission creation and retrieval

2. **Client Parent Relationship Fixes**
   - Update client to use optional entryParentKey field
   - Remove any client-side parent logic (chaincode handles)
   - Test submission creation and reply functionality

### Phase 3: Nested Display & Polish (Week 3)
1. **Server Nested Submission Support**
   - Complete nested submission API endpoints
   - Add depth parameter support for submission fetching
   - Performance optimization for deep nesting

2. **Client Nested Display**
   - Update SubmissionList for nested submissions
   - Enhance ThreadedSubmission for proper threading
   - UI polish and UX improvements

### Phase 4: Integration Testing (Week 4)
1. **End-to-End Testing**
   - Fire creation and management
   - Top-level submission creation
   - Sub-comment/reply creation
   - Nested submission display
   - Cross-component integration

2. **Performance & Polish**
   - API response optimization
   - Client-side caching improvements
   - Error handling and edge cases

## Success Criteria

### Fire Functionality
- ✅ Create new fires (flat structure, no hierarchy)
- ✅ List and browse fires
- ✅ Fire responses include chain key identifiers

### Submission Functionality
- ✅ Create top-level submissions in fires
- ✅ Automatic Fire parent assignment when undefined
- ✅ Submission responses include chain key identifiers
- ✅ Proper composite key usage in all operations

### Sub-comment Functionality
- ✅ Create replies to submissions (nested structure)
- ✅ Display threaded discussions correctly
- ✅ Fetch submissions with configurable nesting depth
- ✅ Proper parent-child relationships maintained

### Integration Quality
- ✅ Consistent chain key handling across all components
- ✅ No client-side composite key generation required
- ✅ Proper error handling for all edge cases
- ✅ Performance acceptable for reasonable nesting depths

## Technical Corrections & Unknowns

### Critical Error Corrections Made
1. **Server Parent Assignment Logic**: REMOVED - Chaincode handles this automatically in `contributeSubmission.ts:66-69`
2. **Database Schema Uncertainty**: RESOLVED - Chain key storage already implemented in `db.ts`
3. **DTO Import Strategy**: FIXED - Server must import chaincode DTOs directly, not define separate interfaces
4. **Three-Tier DTO Flow**: DOCUMENTED - Client → Authorization DTOs → Server → Submission DTOs → Chaincode
5. **Chain Key Generation**: CORRECTED - Server receives keys from chaincode responses, never generates them

### Unknowns Requiring Investigation
1. **Fee Authorization Implementation**: Current fires.ts has fee verification disabled (lines 120-127) - needs re-enabling
2. **Client State Migration**: What happens to existing client state when API response structure changes?
3. **Database Chain Key Storage**: Server needs to store `fireKey` and `submissionKey` from chaincode responses
4. **Error Handling Gaps**: How should server handle chaincode validation errors with new response DTOs?

### Investigation Action Items
- [ ] Test current server behavior with undefined `entryParentKey`
- [ ] Verify chaincode response objects include method calls
- [ ] Check existing client error handling for DTO validation failures
- [ ] Confirm database foreign key constraints for fire slug references

## Risk Mitigation

### Database Schema Risks
- **Risk**: Missing `chain_key` columns in database
- **Mitigation**: Create migration script before API updates
- **Validation**: Test database operations in development environment

### Client Breaking Changes
- **Risk**: Existing client state becomes invalid
- **Mitigation**: Implement graceful fallbacks and cache invalidation
- **Validation**: Test with existing user sessions and data

### Composite Key Complexity
- **Risk**: Key generation inconsistencies between server and client
- **Mitigation**: Server provides all chain keys, client never generates
- **Validation**: Comprehensive testing of all key-dependent operations

## Future Considerations

### Voting Phase (Next)
Once Fire/Submission functionality is stable, implement:
- Vote casting on nested submissions
- Vote aggregation for threaded discussions
- Vote count display in nested contexts

### Performance Optimization
- Implement submission pagination for large threads
- Add caching for frequently accessed nested structures
- Consider denormalization for deep nesting performance

### Enhanced Features
- Real-time updates for nested submissions
- Advanced threading controls (collapse/expand)
- Submission search within threads

---

**Next Steps**:
1. **Immediate**: Investigate unknown items above to validate corrected analysis
2. **Phase 1**: Fix DTO mismatch between server and chaincode (highest priority)
3. **Phase 1**: Add chain key identifiers to API responses
4. **Phase 2**: Update client to handle corrected DTO structure

**Critical**: Do NOT implement server-side parent assignment logic - the chaincode handles this automatically.
