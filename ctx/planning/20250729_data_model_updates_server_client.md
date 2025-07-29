# Data Model Updates: Server & Client Alignment

**Date**: January 29, 2025  
**Scope**: Align server and client applications with updated chaincode data models  
**Focus**: Fire, Submission, and Sub-comment functionality (vertical slice)  

## Executive Summary

Following significant chaincode data model changes, we need to update the server and client applications to maintain compatibility. The key changes involve flattening the Fire hierarchy, automatic parent assignment for Submissions, and enhanced chain key identifier support for consuming applications.

## Chaincode Changes Summary

### Key Model Changes
1. **Fires are now flat** - No longer hierarchical (no `entryParent`)
2. **Submissions auto-parent to Fire** - When `entryParentKey` is undefined, automatically set to Fire
3. **Chain key identifiers in responses** - Provide composite keys to avoid client-side key generation
4. **Enhanced fetch logic** - Submissions can be fetched with nested sub-comments included

### Current Status
- ✅ **Chaincode**: Updated and all tests passing
- ❌ **Server**: Out of sync with chaincode models  
- ❌ **Client**: Partially updated but has composite key issues

## Server Updates Required

### 1. API Response Enhancement (High Priority)

**Issue**: Missing chain key identifiers in API responses
**Impact**: Clients must recreate complex composite key generation logic

**Files to Update**:
- `controllers/fires.ts` (line 174)
- `controllers/submissions.ts` (line 82)
- `db.ts` (lines 182-186)

**Changes**:
```typescript
// Add to all Fire responses
{
  ...fireData,
  chainKey: fire.getCompositeKey()
}

// Add to all Submission responses  
{
  ...submissionData,
  chainKey: submission.getCompositeKey()
}
```

### 2. Submission Parent Logic (High Priority)

**Issue**: Missing automatic Fire parent assignment
**Impact**: Submissions may not properly inherit Fire parent when undefined

**Files to Update**:
- `controllers/submissions.ts` (submission creation logic)

**Changes**:
```typescript
// Auto-set entryParent to Fire when undefined
if (!submissionDto.entryParent) {
  submissionDto.entryParent = submissionDto.fire;
  submissionDto.parentEntryType = Fire.INDEX_KEY;
}
```

### 3. Nested Submission API Endpoints (Medium Priority)

**Issue**: No API support for fetching nested submissions
**Impact**: Client cannot display threaded discussions

**New Endpoints Required**:
```typescript
GET /api/submissions/:chainKey/replies  // Fetch child submissions
GET /api/fires/:slug/submissions?depth=1    // Top-level only
GET /api/fires/:slug/submissions?depth=all  // Include nested
```

### 4. Database Schema Verification (Medium Priority)

**Issue**: Uncertain if `chain_key` column exists for proper storage
**Impact**: Chain keys may not persist correctly

**Files to Update**:
- `migrations.ts` (add migration if needed)
- Verify `subfires` and `submissions` tables have `chain_key` columns

### 5. Vote Processing Updates (Low Priority - Future Phase)

**Issue**: Vote controller assumes `entryParent` is always Fire
**Impact**: Votes on nested submissions may not process correctly

**Note**: Deferred to voting phase as per requirements

## Client Updates Required

### 1. Chain Key Response Handling (High Priority)

**Issue**: Components construct composite keys instead of using server-provided keys
**Impact**: Key mismatch errors and voting failures

**Files to Update**:
- `stores/fires.ts`
- `stores/submissions.ts`
- `types/api.ts`

**Changes**:
```typescript
// Update API response types
interface FireResponse {
  // ... existing fields
  chainKey: string;  // Add chain key from server
}

interface SubmissionResponse {
  // ... existing fields  
  chainKey: string;  // Add chain key from server
}
```

### 2. Composite Key Construction Fixes (High Priority)

**Issue**: Components incorrectly construct composite keys for voting
**Impact**: Vote transactions fail with invalid entry references

**Files to Update**:
- `SubmissionList.vue` (voting logic)
- `ThreadedSubmission.vue` (voting logic)

**Changes**:
```typescript
// Use server-provided chain keys instead of constructing
const voteDto = {
  entry: submission.chainKey,  // From server response
  entryParent: fire.chainKey,  // From server response
  // ... other fields
}
```

### 3. Parent Relationship Logic Standardization (Medium Priority)

**Issue**: Inconsistent handling of Fire vs Submission parents across components
**Impact**: UI inconsistencies and potential data corruption

**Files to Update**:
- `NewSubmission.vue` (verify current implementation)
- `ThreadedSubmission.vue` (parent reference logic)

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

### Phase 2: Submission Logic (Week 2)
1. **Server Submission Parent Logic**
   - Implement auto-parent assignment to Fire
   - Add nested submission API endpoints
   - Test submission creation and retrieval

2. **Client Parent Relationship Fixes**
   - Standardize Fire vs Submission parent handling
   - Update NewSubmission component for proper parent assignment
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

**Next Steps**: Begin Phase 1 with server API response enhancement, followed immediately by client chain key handling updates.