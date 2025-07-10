# Server Route Analysis
Date: July 10, 2025

## Overview
This document analyzes the server routes implemented in `/server/src/index.ts` and their 
corresponding controller implementations, comparing them against client expectations and chaincode method signatures.

## Server Route Mapping

### 1. Identity/Authentication Routes

| Route | Method | Controller | Purpose | Chaincode Integration |
|-------|--------|------------|---------|----------------------|
| `/api/identities/new-random-user` | GET | `registerRandomEthUser` | Generate random wallet | **Yes** - Random user is generated and registered on chain |
| `/api/identities/register` | POST | `registerEthUser` | Register user wallet | **Yes** |
| `/identities/CreateHeadlessWallet` | POST | `registerEthUser` | Register user wallet (alt endpoint) | **Yes** |
| `/api/:channel/:contract/:method` | POST | `proxy` | **Proxy to chaincode** | **Yes** - Direct chaincode proxy |

**Client Usage**: 
- Client expects `/api/product/PublicKeyContract/GetPublicKey` (via proxy)
- Client expects `/identities/CreateHeadlessWallet` for registration

**Analysis**: ✅ **COMPLETE** - All client identity endpoints are implemented

### 2. Fire/Community Management Routes

| Route | Method | Controller | Purpose | Chaincode Integration |
|-------|--------|------------|---------|----------------------|
| `/api/fires` | POST | `fireStarter` | Create new fire | **Partial** - Dry run only, saves to DB |
| `/api/fires` | GET | `listFires` | List all fires | **No** - DB only |
| `/api/fires/:slug` | GET | `readFire` | Get specific fire | **No** - DB only |
| `/api/fires/:slug` | PUT | `updateFire` | Update fire | **No** - DB only |
| `/api/fires/:slug` | DELETE | `deleteFire` | Delete fire | **No** - DB only |

**Client Usage**:
- Client calls `POST /api/fires` with signed `FireStarterDto` 
- Client calls `GET /api/fires` for fire list
- Client calls `GET /api/fires/${slug}` for specific fire
- Client expects `/api/product/ReadWriteBurn/DryRun` for fee estimation (via proxy)

**Chaincode Methods**:
- `FireStarter(FireStarterDto)` → `FireResDto` - **@Submit** (requires fees)
- `FetchFires(FetchFiresDto)` → `FetchFiresResDto` - **@UnsignedEvaluate**

**Analysis**: ❌ **MAJOR GAP** - Fire creation only does dry run, doesn't submit to chain

### 3. Submission Management Routes

| Route | Method | Controller | Purpose | Chaincode Integration |
|-------|--------|------------|---------|----------------------|
| `/api/submissions` | GET | `listSubmissions` | List all submissions | **No** - DB only |
| `/api/submissions/:id` | GET | `readSubmission` | Get specific submission | **No** - DB only |
| `/api/submissions` | POST | `createSubmission` | Create new submission | **No** - DB only, TODO fee verification |
| `/api/submissions/:id/vote` | POST | `upvoteSubmission` | Vote on submission | **No** - DB only, TODO fee verification |
| `/api/fires/:slug/submissions` | GET | `listSubmissionsByFire` | Get submissions for fire | **No** - DB only |

**Client Usage**:
- Client calls `POST /api/submissions` with `SubmissionCreateRequest`
- Client calls `POST /api/submissions/${id}/vote` with `{amount: number}`
- Client calls `GET /api/fires/${fireSlug}/submissions` for fire submissions

**Chaincode Methods**:
- `ContributeSubmission(ContributeSubmissionDto)` → `Submission` - **@Submit** (requires fees)
- `CastVote(CastVoteDto)` → `void` - **@Submit** (burns GALA tokens)
- `FetchSubmissions(FetchSubmissionsDto)` → `FetchSubmissionsResDto` - **@UnsignedEvaluate**

**Analysis**: ❌ **CRITICAL GAP** - No chaincode integration for submissions or voting

### 4. Content Verification & Moderation Routes

| Route | Method | Controller | Purpose | Chaincode Integration |
|-------|--------|------------|---------|----------------------|
| `/api/submissions/:id/verify` | GET | `verifySubmissionContent` | Verify content hash | **No** - Server-side verification only |
| `/api/admin/verify-bulk` | POST | `bulkVerifyContent_endpoint` | Bulk verify submissions | **No** - Server-side verification only |
| `/api/admin/submissions/:id/moderate` | POST | `moderateSubmission` | Moderate content | **No** - DB only |
| `/api/admin/submissions/:id/moderation-history` | GET | `getModerationHistory` | Get moderation history | **No** - DB only |
| `/api/admin/verification-stats` | GET | `getVerificationStats` | Get verification stats | **No** - Placeholder implementation |

**Client Usage**:
- Client calls `GET /api/submissions/${id}/verify` for content verification
- Client calls `POST /api/admin/verify-bulk` for bulk verification
- `ModerationPanel.vue` calls `POST /api/admin/submissions/${id}/moderate`

**Chaincode Methods**:
- No direct chaincode methods for content verification/moderation (by design)

**Analysis**: ✅ **APPROPRIATE** - Content moderation is server-side by design

### 5. Vote Management Routes

| Route | Method | Controller | Purpose | Chaincode Integration |
|-------|--------|------------|---------|----------------------|
| `/api/votes` | GET | `fetchVotes` | Get all votes | **No** - Not implemented |
| `/api/votes/count` | POST | `countVotes` | Count/aggregate votes | **No** - Not implemented |
| `/api/votes/counts` | GET | `getVoteCounts` | Get vote counts | **No** - Not implemented |

**Client Usage**:
- No current client usage identified

**Chaincode Methods**:
- `CountVotes(CountVotesDto)` → `void` - **@Submit** (aggregates votes)
- `FetchVotes(FetchVotesDto)` → `FetchVotesResDto` - **@UnsignedEvaluate**

**Analysis**: ❌ **NOT IMPLEMENTED** - Vote controllers exist but not implemented

### 6. Missing Analytics Routes

**Client Expectations**:
- `GET /api/analytics/overview?timeRange=${range}`
- `GET /api/analytics/trends?timeRange=${range}`
- `GET /api/health`

**Server Implementation**: ❌ **MISSING** - No analytics routes implemented

## Controller Implementation Analysis

### Fire Controller (`controllers/fires.ts`)

**Current Implementation**:
```typescript
export async function fireStarter(req: Request, res: Response, next: NextFunction) {
  const dto: FireStarterDto = deserialize(FireStarterDto, req.body);
  const { fire, fee } = dto;
  
  const feeQty = await fireStarterFee(fire); // Calls chaincode DryRun
  
  if (fee && fee.quantity.isLessThan(feeQty)) {
    // Fee validation error
  }
  
  // TODO: implement cross-channel fee authorization
  
  const subfire = req.body as FireDto;
  const created = dbService.createSubfire(subfire); // Saves to DB only
  res.status(201).json(created);
}
```

**Issues**:
1. ✅ Validates fees via chaincode DryRun
2. ❌ **CRITICAL**: Never actually submits to chaincode
3. ❌ **BUG**: Uses `req.body as FireDto` instead of parsed `dto.fire`
4. ❌ TODO comment indicates incomplete fee authorization

### Submission Controller (`controllers/submissions.ts`)

**Current Implementation**:
```typescript
export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  const dto = req.body as ContributeSubmissionDto;
  
  // TODO: Implement fee verification
  // verifyBurnDto(dto.fee, 10);
  
  const saved = dbService.saveSubmission(dto.submission);
  res.status(201).json(saved);
}
```

**Issues**:
1. ❌ **CRITICAL**: No chaincode integration at all
2. ❌ **CRITICAL**: No fee verification (commented out TODO)
3. ❌ **CRITICAL**: Only saves to local database

### Proxy Controller (`controllers/proxy.ts`)

**Current Implementation**:
```typescript
export async function proxy(req: Request, res: Response) {
  const apiBase = process.env.CHAIN_API ?? "";
  const channel = req.params.channel;
  const contract = req.params.contract;
  const method = req.params.method;
  
  const url = `${apiBase}/api/${channel}/${contract}/${method}`;
  
  const chainRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body)
  });
  
  return res.status(chainRes.status).json(await chainRes.json());
}
```

**Analysis**: ✅ **COMPLETE** - Proper proxy implementation for direct chaincode access

## Data Flow Analysis

### Current Architecture

```
Client → Server → Local Database (SQLite)
Client → Server → Chaincode (Proxy only)
```

### Expected Architecture

```
Client → Server → Chaincode → Database (for caching/indexing)
Client → Server → Database (for moderation/verification)
```

## Critical Integration Gaps

### 1. Fire Creation Flow
- **Current**: Client signs transaction → Server validates fee → **Saves to DB only**
- **Expected**: Client signs transaction → Server validates fee → **Submits to chaincode** → Saves to DB
- **Impact**: Fires exist in local DB but not on blockchain

### 2. Submission Creation Flow  
- **Current**: Client sends data → **Server saves to DB only**
- **Expected**: Client signs transaction → Server validates → **Submits to chaincode** → Saves to DB
- **Impact**: Submissions not on blockchain, no token burning

### 3. Voting Flow
- **Current**: Client sends vote amount → **Server increments DB counter**
- **Expected**: Client signs transaction → Server validates → **Burns GALA tokens on chain** → Updates DB
- **Impact**: No actual token burning, fake vote weights

### 4. Data Synchronization
- **Current**: DB and chaincode are completely disconnected
- **Expected**: Server should sync chaincode data to local DB for fast queries
- **Impact**: Client sees local data that doesn't match blockchain state

## Required Implementations

### High Priority (Broken Functionality)

1. **Complete Fire Creation**: Update `fireStarter` controller to actually submit to chaincode
2. **Implement Submission Creation**: Add chaincode submission in `createSubmission`
3. **Implement Voting**: Add GALA token burning in `upvoteSubmission`
4. **Add Data Sync**: Implement chaincode → database synchronization

### Medium Priority (Missing Features)

1. **Analytics Endpoints**: Implement `/api/analytics/*` and `/api/health`
2. **Vote Management**: Implement vote controllers (`fetchVotes`, `countVotes`, `getVoteCounts`)
3. **Fee Authorization**: Complete cross-channel fee authorization

### Low Priority (Enhancements)

1. **Error Handling**: Improve chaincode error handling and user feedback
2. **Caching**: Add intelligent caching for chaincode read operations
3. **Rate Limiting**: Add rate limiting for expensive chaincode operations

## Environment Configuration Required

**Missing Environment Variables** (likely needed):
- `CHAIN_API` - Chaincode API base URL (referenced in code but may not be set)
- `ASSET_CHANNEL` - Asset channel name (defaults to "asset")
- `PRODUCT_CHANNEL` - Product channel name (defaults to "product")

## Next Steps for Integration

1. **Examine chaincode API format** - Check how signed DTOs should be submitted
2. **Verify environment setup** - Ensure server can connect to chaincode
3. **Implement fire creation chain submission** - Start with smallest working integration
4. **Add comprehensive error handling** - Handle chaincode failures gracefully
5. **Implement data synchronization** - Keep DB in sync with chaincode state