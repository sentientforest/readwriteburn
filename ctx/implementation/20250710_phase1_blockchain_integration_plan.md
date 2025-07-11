# Phase 1: Core Blockchain Integration Implementation Plan
Date: July 10, 2025

## Overview
This document provides a detailed implementation plan for Phase 1 of the ReadWriteBurn blockchain integration. The focus is on vertical slices - completing each data structure end-to-end (client → server → chaincode → database) rather than horizontal implementation.

## Implementation Strategy
**Vertical Slice Approach**: For each feature, implement the complete flow from client signing through server validation to chaincode submission and database synchronization.

## Prerequisites
- Chaincode is assumed to be correct and working (as evidenced by passing e2e tests)
- Server has `CHAIN_API` environment variable set to connect to chaincode
- Client has signing infrastructure in place via `ReadWriteBurnConnectClient`

## Task 1: Fire Creation End-to-End Integration

### **CORRECTED State Analysis (Post-User Fixes)**
- ✅ Server: Now correctly submits to chaincode via `submitToChaincode()`
- ✅ Server: Correctly signs `FireStarterDto` with server admin key
- ✅ Client: Has `signFire()` method for signing fire metadata
- ❌ **ARCHITECTURE BUG**: Client sends `FireStarterDto` but should send `FireStarterAuthorizationDto`
- ❌ **WRONG CLIENT SIGNING**: Client shouldn't sign `FireStarterDto`, only child objects
- ❌ Missing cross-channel fee validation flow

### **Implementation Steps**

#### **1.1 COMPLETED: Fix Server Fire Creation Controller** ✅
**File**: `/server/src/controllers/fires.ts`

**What Was Fixed**:
- ✅ Server now submits to chaincode instead of just saving to DB
- ✅ Server correctly signs `FireStarterDto` with admin key  
- ✅ Proper error handling and logging added
- ✅ Database integration for chaincode response

**Current Architecture Issues**:
```typescript
// ISSUE: Server expects FireStarterDto from client
const dto: FireStarterDto = deserialize(FireStarterDto, req.body);

// Should be: Server expects FireStarterAuthorizationDto from client  
const authDto: FireStarterAuthorizationDto = deserialize(FireStarterAuthorizationDto, req.body);
```

#### **1.2 NEW PRIORITY: Fix Client-Server Contract**
**Problem**: Client sends wrong DTO type and signs wrong objects

**Required Changes**:
1. **Client**: Send `FireStarterAuthorizationDto` not `FireStarterDto`
2. **Client**: Only sign `FireDto` (metadata), not the wrapper
3. **Server**: Receive authorization DTO and create final DTO for chaincode

#### **1.2 Create Chaincode Submission Helper**
**File**: `/server/src/controllers/fires.ts` (new function)
**Function**: `submitToChaincode(dto: FireStarterDto)`

**Implementation Pattern** (based on e2e test):
```typescript
async function submitToChaincode(dto: FireStarterDto): Promise<ChainResponse<FireResDto>> {
  const apiBase = process.env.CHAIN_API;
  const product = process.env.PRODUCT_CHANNEL ?? "product";
  
  const url = `${apiBase}/api/${product}/ReadWriteBurn/FireStarter`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: dto.serialize() // Use GalaChain serialization
  });
  
  if (!response.ok) {
    throw new Error(`Chaincode submission failed: ${response.statusText}`);
  }
  
  const result: GalaChainResponse<FireResDto> = await response.json();
  
  if (!GalaChainResponse.isSuccess(result)) {
    throw new Error(`Chaincode error: ${result.Message}`);
  }
  
  return result;
}
```

#### **1.3 Update Database Service**
**File**: `/server/src/db.ts`
**Function**: `createSubfire()`

**Current Issue**: Expects `FireDto` but should accept `Fire` from chaincode response

**Required Change**:
```typescript
// Accept Fire metadata from chaincode instead of FireDto
createSubfire(fireMetadata: Fire): DatabaseFireRecord {
  // Map Fire chaincode object to database record
  // Store composite key for future chaincode lookups
}
```

#### **1.4 Client Integration Verification**
**File**: `/client/src/components/FireStarter.vue`

**Current State**: ✅ Already working - calls `signFireStarter()` and posts to `/api/fires`

**Verification Steps**:
1. Ensure `signFireStarter()` includes all required fields
2. Verify fee creation logic is correct
3. Test error handling for chaincode failures

### **Expected Outcome**:
Fire creation will:
1. ✅ Client signs `FireStarterDto` with fee 
2. ✅ Server validates fee via DryRun
3. ✅ Server submits signed DTO to chaincode
4. ✅ Chaincode creates Fire, FireStarter, FireAuthority, FireModerator objects
5. ✅ Server saves Fire metadata to database
6. ✅ Client receives success/error response

---

## Task 2: Submission Creation End-to-End Integration

### **Current State Analysis**
- ✅ Client: Has `signContributeSubmission()` method available
- ❌ Client: **NOT USING SIGNING** - sends plain HTTP requests
- ❌ Server: **NO CHAINCODE INTEGRATION** - only saves to database
- ❌ Data Contract Mismatch: Client sends `SubmissionCreateRequest`, server expects `ContributeSubmissionDto`

### **Implementation Steps**

#### **2.1 Update Client Submission Creation**
**File**: `/client/src/components/NewSubmission.vue`

**Current Implementation**:
```typescript
// BUG: Plain HTTP request without signing
const response = await fetch('/api/submissions', {
  method: 'POST',
  body: JSON.stringify({
    name: submissionData.name,
    description: submissionData.description,
    url: submissionData.url,
    fire: fireSlug,
    contributor: userStore.address
  })
});
```

**Required Change**:
```typescript
// 1. Create SubmissionDto
const submission = new SubmissionDto({
  name: submissionData.name,
  description: submissionData.description, 
  url: submissionData.url,
  fire: fireChainKey, // Use chain key, not slug
  entryParent: parentSubmissionKey || fireChainKey,
  contributor: userStore.address,
  uniqueKey: randomUniqueKey()
});

// 2. Create fee (if required)
const fee = await createFeeVerificationDto();

// 3. Create and sign ContributeSubmissionDto
const dto = new ContributeSubmissionDto({
  submission,
  fee,
  uniqueKey: randomUniqueKey()
});

const signedDto = await metamaskClient.signContributeSubmission(dto);

// 4. Submit signed DTO
const response = await fetch('/api/submissions', {
  method: 'POST',
  body: JSON.stringify(signedDto)
});
```

**Key Requirements**:
- Replace plain HTTP with signed transaction
- Use chaincode composite keys instead of database slugs
- Add fee handling if submissions require fees
- Handle signing errors and validation

#### **2.2 Update Client Data Mapping**
**File**: `/client/src/stores/submissions.ts`

**Current Issue**: Uses database slugs instead of chaincode keys

**Required Changes**:
```typescript
// Map fire slugs to chaincode composite keys
async function getFireChainKey(slug: string): Promise<string> {
  // Query server/chaincode for fire chain key by slug
  const fire = await firesStore.getFireBySlug(slug);
  return fire.chainKey; // Need to store this in database
}

// Update submission creation to use chain keys
async function createSubmission(submissionData, fireSlug, parentId?) {
  const fireChainKey = await getFireChainKey(fireSlug);
  const parentKey = parentId ? await getSubmissionChainKey(parentId) : fireChainKey;
  
  // Use chain keys in SubmissionDto...
}
```

#### **2.3 Implement Server Submission Controller**
**File**: `/server/src/controllers/submissions.ts`
**Function**: `createSubmission()`

**Current Implementation**:
```typescript
// BUG: No chaincode integration, no fee validation
const dto = req.body as ContributeSubmissionDto;
const saved = dbService.saveSubmission(dto.submission);
```

**Required Implementation**:
```typescript
export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Parse and validate signed DTO
    const dto: ContributeSubmissionDto = deserialize(ContributeSubmissionDto, req.body);
    
    // 2. Validate fee if required
    if (dto.fee) {
      await validateSubmissionFee(dto.fee);
    }
    
    // 3. Submit to chaincode
    const chainResponse = await submitSubmissionToChaincode(dto);
    
    if (!chainResponse.success) {
      return res.status(500).json({ error: chainResponse.error });
    }
    
    // 4. Save chaincode result to database
    const submissionResult: Submission = chainResponse.data;
    const saved = dbService.saveSubmission(submissionResult);
    
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
}
```

#### **2.4 Create Submission Chaincode Helper**
**File**: `/server/src/controllers/submissions.ts` (new function)

**Implementation** (based on e2e test pattern):
```typescript
async function submitSubmissionToChaincode(dto: ContributeSubmissionDto): Promise<ChainResponse<Submission>> {
  const apiBase = process.env.CHAIN_API;
  const product = process.env.PRODUCT_CHANNEL ?? "product";
  
  const url = `${apiBase}/api/${product}/ReadWriteBurn/ContributeSubmission`;
  
  const response = await fetch(url, {
    method: "POST", 
    headers: { "Content-Type": "application/json" },
    body: dto.serialize()
  });
  
  // Handle response similar to fire creation...
}
```

#### **2.5 Update Database Schema**
**File**: `/server/src/db.ts`

**Required Changes**:
- Store chaincode composite keys for submissions
- Map between database IDs and chaincode keys
- Support querying by fire chain key

### **Expected Outcome**:
Submission creation will:
1. ✅ Client signs `ContributeSubmissionDto` with proper chain keys
2. ✅ Server validates fees (if required)
3. ✅ Server submits to chaincode
4. ✅ Chaincode creates `Submission` object with timestamp-based ID
5. ✅ Server saves `Submission` to database with chain key mapping
6. ✅ Client receives chaincode `Submission` object

---

## Task 3: Vote Signing and Token Burning Integration

### **Current State Analysis**
- ✅ Client: Has `signCastVote()` method available
- ❌ Client: **NOT USING SIGNING** - sends plain `{amount: number}`
- ❌ Server: **NO TOKEN BURNING** - only increments database counter
- ❌ Critical Missing: No actual GALA token burning

### **Implementation Steps**

#### **3.1 Update Client Voting Interface**
**File**: `/client/src/components/ThreadedSubmission.vue`

**Current Implementation**:
```typescript
// BUG: Plain HTTP with no token burning
const response = await fetch(`/api/submissions/${submissionId}/vote`, {
  method: 'POST',
  body: JSON.stringify({ amount: voteAmount })
});
```

**Required Change**:
```typescript
// 1. Create VoteDto with token burning
const vote = new VoteDto({
  entryType: "Submission", // or Submission.INDEX_KEY
  entryParent: fireChainKey,
  entry: submissionChainKey,
  quantity: new BigNumber(voteAmount), // GALA to burn
  uniqueKey: randomUniqueKey()
});

// 2. Create fee for vote transaction
const fee = await createFeeVerificationDto(voteAmount);

// 3. Create and sign CastVoteDto
const dto = new CastVoteDto({
  vote,
  fee,
  uniqueKey: randomUniqueKey()
});

const signedDto = await metamaskClient.signCastVote(dto);

// 4. Submit signed DTO
const response = await fetch(`/api/submissions/${submissionId}/vote`, {
  method: 'POST',
  body: JSON.stringify(signedDto)
});
```

#### **3.2 Implement Server Vote Controller**
**File**: `/server/src/controllers/submissions.ts`
**Function**: `upvoteSubmission()`

**Current Implementation**:
```typescript
// BUG: No token burning, no chaincode
const dto = req.body as CastVoteDto;
const success = dbService.voteSubmission(parseInt(req.params.id));
```

**Required Implementation**:
```typescript
export async function upvoteSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Parse signed vote DTO
    const dto: CastVoteDto = deserialize(CastVoteDto, req.body);
    
    // 2. Validate vote fee and token burning authorization
    await validateVoteFee(dto.fee, dto.vote.quantity);
    
    // 3. Submit to chaincode for token burning
    const chainResponse = await castVoteOnChaincode(dto);
    
    if (!chainResponse.success) {
      return res.status(500).json({ error: chainResponse.error });
    }
    
    // 4. Update local database (for caching)
    await dbService.recordVoteCast(dto.vote);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
```

#### **3.3 Create Vote Chaincode Helper**
**File**: `/server/src/controllers/submissions.ts` (new function)

**Implementation**:
```typescript
async function castVoteOnChaincode(dto: CastVoteDto): Promise<ChainResponse<void>> {
  const apiBase = process.env.CHAIN_API;
  const product = process.env.PRODUCT_CHANNEL ?? "product";
  
  const url = `${apiBase}/api/${product}/ReadWriteBurn/CastVote`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: dto.serialize()
  });
  
  // Handle token burning response...
}
```

### **Expected Outcome**:
Voting will:
1. ✅ Client signs `CastVoteDto` with GALA quantity to burn
2. ✅ Server validates token burning authorization
3. ✅ Chaincode burns actual GALA tokens
4. ✅ Chaincode creates `Vote` object on blockchain
5. ✅ Server records vote in database for aggregation
6. ✅ Client receives confirmation of token burn

---

## Task 4: Vote Counting and Aggregation System

### **Current State Analysis**
- ✅ Chaincode: Has `CountVotes()` and `FetchVotes()` methods
- ❌ Server: **NO VOTE MANAGEMENT** - controllers exist but not implemented
- ❌ Missing: Automated vote counting system
- ❌ Missing: Vote aggregation cron job

### **Implementation Steps**

#### **4.1 Implement Vote Fetching**
**File**: `/server/src/controllers/votes.ts`
**Function**: `fetchVotes()`

**Current State**: Not implemented

**Required Implementation**:
```typescript
export async function fetchVotes(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Create FetchVotesDto from query params
    const dto = new FetchVotesDto({
      fire: req.query.fire as string,
      entryParent: req.query.entryParent as string,
      bookmark: req.query.bookmark as string,
      limit: parseInt(req.query.limit as string) || 100
    });
    
    // 2. Fetch uncounted votes from chaincode
    const chainResponse = await fetchVotesFromChaincode(dto);
    
    if (!chainResponse.success) {
      return res.status(500).json({ error: chainResponse.error });
    }
    
    res.json(chainResponse.data);
  } catch (error) {
    next(error);
  }
}
```

#### **4.2 Implement Vote Counting**
**File**: `/server/src/controllers/votes.ts` 
**Function**: `countVotes()`

**Implementation**:
```typescript
export async function countVotes(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Get uncounted votes from chaincode
    const votesFetch = await fetchVotesFromChaincode(new FetchVotesDto({}));
    const uncountedVotes = votesFetch.data?.results || [];
    
    if (uncountedVotes.length === 0) {
      return res.json({ message: "No votes to count", counted: 0 });
    }
    
    // 2. Create CountVotesDto with vote keys
    const dto = new CountVotesDto({
      votes: uncountedVotes.map(v => v.key),
      uniqueKey: randomUniqueKey()
    });
    
    // 3. Submit to chaincode for aggregation
    const chainResponse = await countVotesOnChaincode(dto);
    
    if (!chainResponse.success) {
      return res.status(500).json({ error: chainResponse.error });
    }
    
    // 4. Update local database vote counts
    await updateLocalVoteCounts(uncountedVotes);
    
    res.json({ 
      success: true, 
      counted: uncountedVotes.length 
    });
  } catch (error) {
    next(error);
  }
}
```

#### **4.3 Create Vote Aggregation Cron Job**
**File**: `/server/src/cron/voteAggregation.ts` (new file)

**Implementation**:
```typescript
import cron from 'node-cron';
import { countVotes } from '../controllers/votes';

// Run every 15 seconds
export function startVoteAggregationCron() {
  cron.schedule('*/15 * * * * *', async () => {
    try {
      console.log('Running vote aggregation...');
      
      // Create mock request/response for controller
      const mockReq = { body: {} } as any;
      const mockRes = {
        json: (data: any) => console.log('Vote aggregation result:', data),
        status: (code: number) => ({ json: (data: any) => console.error('Vote aggregation error:', data) })
      } as any;
      
      await countVotes(mockReq, mockRes, (error: any) => {
        console.error('Vote aggregation failed:', error);
      });
    } catch (error) {
      console.error('Vote aggregation cron failed:', error);
    }
  });
}
```

#### **4.4 Start Cron Job in Server**
**File**: `/server/src/index.ts`

**Addition**:
```typescript
import { startVoteAggregationCron } from './cron/voteAggregation';

// Start vote aggregation after server starts
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  startVoteAggregationCron();
});
```

### **Expected Outcome**:
Vote management will:
1. ✅ Fetch uncounted votes from chaincode every 15 seconds
2. ✅ Aggregate votes into `VoteCount` objects on chaincode  
3. ✅ Update `VoteRanking` for leaderboards
4. ✅ Create `VoterReceipt` audit records
5. ✅ Update local database with vote totals
6. ✅ Provide API endpoints for vote data

---

## Task 5: Update All Server Controllers for Chaincode Integration

### **Implementation Steps**

#### **5.1 Create Shared Chaincode Helper**
**File**: `/server/src/utils/chaincode.ts` (new file)

**Purpose**: Centralize chaincode communication patterns

**Implementation**:
```typescript
import { GalaChainResponse } from '@gala-chain/api';

export interface ChainResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function submitToChaincode<T>(
  method: string,
  dto: any,
  channel: string = 'product'
): Promise<ChainResponse<T>> {
  const apiBase = process.env.CHAIN_API;
  const url = `${apiBase}/api/${channel}/ReadWriteBurn/${method}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: dto.serialize()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: GalaChainResponse<T> = await response.json();
    
    if (!GalaChainResponse.isSuccess(result)) {
      return {
        success: false,
        error: `Chaincode error: ${result.Message}`
      };
    }
    
    return {
      success: true,
      data: result.Data
    };
  } catch (error) {
    return {
      success: false,
      error: `Chaincode submission failed: ${(error as Error).message}`
    };
  }
}

export async function evaluateChaincode<T>(
  method: string,
  dto: any,
  channel: string = 'product'
): Promise<ChainResponse<T>> {
  // Similar implementation for evaluate operations
}
```

#### **5.2 Update Fire Controllers to Use Shared Helper**
**File**: `/server/src/controllers/fires.ts`

**Changes**:
```typescript
import { submitToChaincode } from '../utils/chaincode';

export async function fireStarter(req: Request, res: Response, next: NextFunction) {
  try {
    const dto: FireStarterDto = deserialize(FireStarterDto, req.body);
    
    // Validate fee
    const feeQty = await fireStarterFee(dto.fire);
    if (dto.fee && dto.fee.quantity.isLessThan(feeQty)) {
      return res.status(400).json({ error: 'Insufficient fee authorization' });
    }
    
    // Submit to chaincode
    const chainResponse = await submitToChaincode<FireResDto>('FireStarter', dto);
    
    if (!chainResponse.success) {
      return res.status(500).json({ error: chainResponse.error });
    }
    
    // Save to database
    const created = dbService.createSubfire(chainResponse.data!.metadata);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}
```

#### **5.3 Add Chaincode Read Operations**
**File**: `/server/src/controllers/fires.ts`

**New Function**: `fetchFiresFromChaincode()`
```typescript
export async function listFires(req: Request, res: Response, next: NextFunction) {
  try {
    // Try chaincode first, fall back to database
    const dto = new FetchFiresDto({
      slug: req.query.slug as string,
      bookmark: req.query.bookmark as string,
      limit: parseInt(req.query.limit as string) || 100
    });
    
    const chainResponse = await evaluateChaincode<FetchFiresResDto>('FetchFires', dto);
    
    if (chainResponse.success) {
      res.json(chainResponse.data);
    } else {
      // Fall back to database
      const subfires = dbService.getAllSubfires();
      res.json(subfires);
    }
  } catch (error) {
    next(error);
  }
}
```

## **Implementation Timeline**

### **Week 1: Core Infrastructure**
- **Day 1-2**: Implement shared chaincode helper and fix fire creation (Task 1)
- **Day 3-4**: Update submission creation end-to-end (Task 2.1-2.3)  
- **Day 5**: Testing and bug fixes for fire and submission creation

### **Week 2: Token Integration**
- **Day 1-2**: Implement vote signing and token burning (Task 3)
- **Day 3-4**: Implement vote counting and aggregation (Task 4)
- **Day 5**: Testing and performance optimization

### **Week 3: Finalization**  
- **Day 1-2**: Update all controllers with shared chaincode helper (Task 5)
- **Day 3-4**: End-to-end testing and error handling
- **Day 5**: Documentation and deployment preparation

## **Success Criteria**

Each task is complete when:

1. **Fire Creation**: ✅ Client → Server → Chaincode → Database flow works
2. **Submissions**: ✅ Signed submissions submitted to chaincode with proper chain keys  
3. **Voting**: ✅ Actual GALA token burning occurs on chaincode
4. **Vote Counting**: ✅ 15-second aggregation cron runs successfully
5. **All Controllers**: ✅ Consistent chaincode integration patterns

## **Risk Mitigation**

### **High Risk Items**:
- **Environment Configuration**: Ensure `CHAIN_API` is properly configured
- **Fee Handling**: Complex cross-channel fee authorization may need simplification
- **Error Handling**: Chaincode errors need proper mapping to user-friendly messages

### **Mitigation Strategies**:
- Test each task independently before integration
- Implement comprehensive error logging
- Create fallback mechanisms for chaincode failures
- Add health checks for chaincode connectivity

## **Questions for Clarification**

1. **Fee Requirements**: Do submissions require fees, or only fire creation? The e2e tests show fees for both.

2. **Chain Key Storage**: Should the database store chaincode composite keys for efficient lookups?

3. **Error Handling**: What should happen if chaincode is unavailable? Fall back to database-only operations?

4. **Vote Aggregation**: Should the 15-second cron be configurable, or is this frequency appropriate?

5. **Database Sync**: Should the server periodically sync all data from chaincode to database, or only cache user-created content?