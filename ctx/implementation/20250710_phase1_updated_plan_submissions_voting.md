# Phase 1 Updated Plan: Submissions and Voting End-to-End
Date: July 10, 2025

## Status Update

✅ **FIRE CREATION IS WORKING END-TO-END!** 
- Client signs `FireDto` and sends `FireStarterAuthorizationDto` to server
- Server creates and signs `FireStarterDto` and submits to chaincode
- Chaincode creates fire and returns metadata
- Server stores metadata in database
- Full end-to-end flow confirmed working

## Updated Priority: Get Core Operations Working First

**New Strategy**: Implement submissions and voting with same pattern as fire creation, **defer fee implementation until all core operations work**.

## Task 2: Submission Creation End-to-End (No Fees)

### **Current State Analysis**
- ✅ Client: Has `signContributeSubmission()` method available (needs adjustment)
- ✅ Server: Has submission controller but only saves to database
- ✅ Types: `ContributeSubmissionDto` and authorization DTOs exist
- ❌ Client sends plain HTTP request, not signed DTO
- ❌ Server doesn't submit to chaincode
- ❌ No chain key management for submissions

### **Implementation Pattern (Following Fire Creation)**

#### **2.1 Update Client Submission Creation**
**File**: `/client/src/components/NewSubmission.vue`

**Current Code**:
```typescript
// Plain HTTP request without signing
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

**Required Changes**:
```typescript
// 1. Get fire chain key (need to store this when creating fires)
const fireChainKey = await getFireChainKey(fireSlug);

// 2. Create SubmissionDto
const submissionDto = new SubmissionDto({
  name: submissionData.name,
  description: submissionData.description,
  url: submissionData.url,
  fire: fireChainKey,  // Use chain key, not slug
  entryParent: parentSubmissionKey || fireChainKey,
  contributor: userStore.address,
  uniqueKey: randomUniqueKey()
});

// 3. Sign the submission DTO
const signedSubmission = await metamaskClient.signSubmission(submissionDto);

// 4. Create authorization DTO (no fee for now)
const authDto = new ContributeSubmissionAuthorizationDto({
  submission: signedSubmission
});

// 5. Send to server
const response = await fetch('/api/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(authDto)
});
```

#### **2.2 Add Client Signing Method**
**File**: `/client/src/services/ReadWriteBurnConnectClient.ts`

**Add Method**:
```typescript
async signSubmission(
  submissionDto: SubmissionDto,
  signingType: SigningType = SigningType.SIGN_TYPED_DATA
): Promise<SubmissionDto & { signature: string; prefix: string }> {
  // Similar pattern to signFire()
  // Sign just the SubmissionDto, not the wrapper
}
```

#### **2.3 Create Authorization DTO Type**
**File**: `/client/src/types/fire.ts` or `/server/src/types.ts`

**Add Type**:
```typescript
export class ContributeSubmissionAuthorizationDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => SubmissionDto)
  public submission: SubmissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee?: FeeAuthorizationDto;
}
```

#### **2.4 Update Server Submission Controller**
**File**: `/server/src/controllers/submissions.ts`

**Current Code**:
```typescript
export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  const dto = req.body as ContributeSubmissionDto;
  const saved = dbService.saveSubmission(dto.submission);
  res.status(201).json(saved);
}
```

**Required Changes**:
```typescript
export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Parse authorization DTO from client
    const authDto: ContributeSubmissionAuthorizationDto = deserialize(
      ContributeSubmissionAuthorizationDto, 
      req.body
    );

    // 2. Create server-signed ContributeSubmissionDto
    const serverDto = await createValidDTO(ContributeSubmissionDto, {
      submission: authDto.submission,  // client-signed submission
      uniqueKey: `submission-${randomUniqueKey()}`
    });

    // 3. Sign with server key
    const signedDto = serverDto.signed(getAdminPrivateKey());

    // 4. Submit to chaincode
    console.log("Submitting submission to chaincode...");
    const chainResponse = await submitToChaincode("ContributeSubmission", signedDto);

    if (!chainResponse.success) {
      console.error("Chaincode submission failed:", chainResponse.error);
      return res.status(500).json({ 
        error: `Submission creation failed: ${chainResponse.error}` 
      });
    }

    // 5. Extract Submission object from chaincode response
    const submissionResult = chainResponse.data as Submission;
    
    // 6. Save to database with chain key
    const created = dbService.saveSubmission(submissionResult);
    
    console.log("Submission created successfully:", {
      id: submissionResult.id,
      name: submissionResult.name,
      chainKey: submissionResult.getCompositeKey ? submissionResult.getCompositeKey() : 'unknown'
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Submission creation error:", error);
    next(error);
  }
}
```

#### **2.5 Update Database to Store Chain Keys**
**File**: `/server/src/db.ts`

**Add Column**:
```sql
ALTER TABLE submissions ADD COLUMN chain_key TEXT;
```

**Update Save Method**:
```typescript
saveSubmission: (submissionData: any): SubmissionResDto => {
  // Handle both chaincode Submission objects and DTOs
  const chainKey = submissionData.getCompositeKey ? 
    submissionData.getCompositeKey() : 
    submissionData.chain_key;
  
  // Save with chain key for future lookups
}
```

### **Expected Outcome**:
1. Client signs `SubmissionDto` with metadata
2. Client sends `ContributeSubmissionAuthorizationDto` to server
3. Server creates and signs `ContributeSubmissionDto`
4. Server submits to chaincode
5. Chaincode creates `Submission` with timestamp-based ID
6. Server saves submission with chain key to database

---

## Task 3: Vote Casting End-to-End (No Fees, No Token Burning Yet)

### **Current State Analysis**
- ✅ Client: Has `signCastVote()` method available
- ✅ Server: Has vote controller but only updates database
- ✅ Types: `CastVoteDto` and `VoteDto` exist
- ❌ Client sends plain `{amount: number}` not signed DTO
- ❌ Server doesn't submit to chaincode
- ❌ No actual token burning (will be added with fees later)

### **Implementation Pattern (Following Fire/Submission Pattern)**

#### **3.1 Update Client Voting**
**File**: `/client/src/components/ThreadedSubmission.vue`

**Current Code**:
```typescript
// Plain HTTP with just amount
const response = await fetch(`/api/submissions/${submissionId}/vote`, {
  method: 'POST',
  body: JSON.stringify({ amount: voteAmount })
});
```

**Required Changes**:
```typescript
// 1. Get submission chain key (need to track this)
const submissionChainKey = await getSubmissionChainKey(submissionId);
const fireChainKey = await getFireChainKeyForSubmission(submissionId);

// 2. Create VoteDto
const voteDto = new VoteDto({
  entryType: "Submission",  // or Submission.INDEX_KEY
  entryParent: fireChainKey,
  entry: submissionChainKey,
  quantity: new BigNumber(voteAmount),
  uniqueKey: randomUniqueKey()
});

// 3. Sign the vote DTO
const signedVote = await metamaskClient.signVote(voteDto);

// 4. Create authorization DTO (no fee for now)
const authDto = new CastVoteAuthorizationDto({
  vote: signedVote
});

// 5. Send to server
const response = await fetch(`/api/submissions/${submissionId}/vote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(authDto)
});
```

#### **3.2 Add Client Vote Signing Method**
**File**: `/client/src/services/ReadWriteBurnConnectClient.ts`

**Add Method**:
```typescript
async signVote(
  voteDto: VoteDto,
  signingType: SigningType = SigningType.SIGN_TYPED_DATA
): Promise<VoteDto & { signature: string; prefix: string }> {
  // Similar pattern to signFire() and signSubmission()
  // Sign just the VoteDto, not the wrapper
}
```

#### **3.3 Create Vote Authorization DTO**
**File**: `/client/src/types/fire.ts` or `/server/src/types.ts`

**Add Type**:
```typescript
export class CastVoteAuthorizationDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => VoteDto)
  public vote: VoteDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee?: FeeAuthorizationDto;
}
```

#### **3.4 Update Server Vote Controller**
**File**: `/server/src/controllers/submissions.ts`

**Current Code**:
```typescript
export async function upvoteSubmission(req: Request, res: Response, next: NextFunction) {
  const dto = req.body as CastVoteDto;
  const success = dbService.voteSubmission(parseInt(req.params.id));
  if (!success) {
    return res.status(404).json({ error: "Submission not found" });
  }
  res.json({ success: true });
}
```

**Required Changes**:
```typescript
export async function upvoteSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Parse authorization DTO from client
    const authDto: CastVoteAuthorizationDto = deserialize(
      CastVoteAuthorizationDto,
      req.body
    );

    // 2. Create server-signed CastVoteDto
    const serverDto = await createValidDTO(CastVoteDto, {
      vote: authDto.vote,  // client-signed vote
      uniqueKey: `vote-${randomUniqueKey()}`
    });

    // 3. Sign with server key
    const signedDto = serverDto.signed(getAdminPrivateKey());

    // 4. Submit to chaincode
    console.log("Submitting vote to chaincode...");
    const chainResponse = await submitToChaincode("CastVote", signedDto);

    if (!chainResponse.success) {
      console.error("Chaincode vote submission failed:", chainResponse.error);
      return res.status(500).json({ 
        error: `Vote casting failed: ${chainResponse.error}` 
      });
    }

    // 5. Update local database vote count (for caching)
    // Note: The submission ID from URL needs to map to chain key
    const submissionId = parseInt(req.params.id);
    await dbService.recordVoteCast(submissionId, authDto.vote.quantity);

    console.log("Vote cast successfully:", {
      entry: authDto.vote.entry,
      quantity: authDto.vote.quantity.toString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Vote casting error:", error);
    next(error);
  }
}
```

### **Expected Outcome**:
1. Client signs `VoteDto` with vote details
2. Client sends `CastVoteAuthorizationDto` to server
3. Server creates and signs `CastVoteDto`
4. Server submits to chaincode
5. Chaincode creates `Vote` object (no token burning yet)
6. Server updates local vote cache

---

## Task 4: Vote Counting and Aggregation

### **Simple Implementation (Manual Trigger First)**

Before implementing the 15-second cron job, let's create a manual endpoint to test vote counting:

#### **4.1 Implement Vote Counting Controller**
**File**: `/server/src/controllers/votes.ts`

```typescript
export async function countVotes(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Fetch uncounted votes from chaincode
    const fetchDto = { limit: 1000 };  // Process up to 1000 votes at a time
    const fetchResponse = await evaluateChaincode("FetchVotes", fetchDto);
    
    if (!fetchResponse.success) {
      return res.status(500).json({ error: fetchResponse.error });
    }

    const voteResults = fetchResponse.data?.results || [];
    
    if (voteResults.length === 0) {
      return res.json({ message: "No votes to count", counted: 0 });
    }

    // 2. Create CountVotesDto with vote keys
    const countDto = await createValidDTO(CountVotesDto, {
      votes: voteResults.map(v => v.key),
      uniqueKey: randomUniqueKey()
    });

    // 3. Sign and submit to chaincode
    const signedDto = countDto.signed(getAdminPrivateKey());
    const countResponse = await submitToChaincode("CountVotes", signedDto);

    if (!countResponse.success) {
      return res.status(500).json({ error: countResponse.error });
    }

    // 4. Update local database with aggregated counts
    // This creates VoteCount and VoteRanking objects on chain
    
    res.json({ 
      success: true,
      counted: voteResults.length,
      message: `Successfully counted ${voteResults.length} votes`
    });
  } catch (error) {
    console.error("Vote counting error:", error);
    next(error);
  }
}
```

#### **4.2 Add Route**
**File**: `/server/src/index.ts`

```typescript
// Add to vote routes
app.post("/api/votes/count", countVotes);
```

#### **4.3 Later: Add Cron Job**
Once manual counting works, add automated 15-second cron job.

---

## Implementation Timeline

### **Day 1: Submission Creation** (2-3 hours)
1. Add `signSubmission()` method to client
2. Update NewSubmission component to use signed DTOs
3. Create `ContributeSubmissionAuthorizationDto` type
4. Update server controller to submit to chaincode
5. Update database to store chain keys
6. Test end-to-end submission creation

### **Day 2: Vote Casting** (2-3 hours)
1. Add `signVote()` method to client
2. Update voting UI to use signed DTOs
3. Create `CastVoteAuthorizationDto` type
4. Update server controller to submit votes to chaincode
5. Test end-to-end vote casting

### **Day 3: Vote Counting** (1-2 hours)
1. Implement manual vote counting endpoint
2. Test vote aggregation
3. Add cron job for automated counting
4. Verify VoteCount and VoteRanking creation

## Success Criteria

Each feature is complete when:

1. **Submissions**: 
   - ✅ Client signs and sends authorization DTO
   - ✅ Server submits to chaincode
   - ✅ Submission stored on chain and in database
   - ✅ Can fetch submissions by fire

2. **Voting**:
   - ✅ Client signs and sends vote authorization
   - ✅ Server submits vote to chaincode
   - ✅ Vote recorded on chain
   - ✅ Local vote counts updated

3. **Vote Counting**:
   - ✅ Manual counting endpoint works
   - ✅ Votes aggregated into VoteCount objects
   - ✅ Rankings updated
   - ✅ Automated cron job runs every 15 seconds

## Key Technical Considerations

### **Chain Key Management**
- Need to store chain keys when creating fires/submissions
- Map between database IDs and chain keys
- Use chain keys for all chaincode operations

### **Signing Pattern Consistency**
- Client signs child DTOs (Fire, Submission, Vote)
- Client sends authorization DTOs
- Server creates and signs wrapper DTOs
- Server submits to chaincode

### **Error Handling**
- Handle chaincode submission failures
- Provide meaningful error messages
- Log all operations for debugging

## Next Phase (After Core Operations Work)

Once fires, submissions, and voting work end-to-end:

1. **Add Fee Support**:
   - Implement cross-channel fee validation
   - Add FeeAuthorizationDto signing on client
   - Create FeeVerificationDto on server
   - Test with actual token burning

2. **Add Missing Features**:
   - Fetch operations (fires, submissions, votes)
   - Pagination support
   - Search and filtering
   - Analytics endpoints

3. **Performance Optimization**:
   - Caching strategies
   - Batch operations
   - Rate limiting

The goal is to get the core functionality working first, then layer on fees and advanced features.