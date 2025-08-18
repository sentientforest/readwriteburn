# Vote System Test Suite

This directory contains comprehensive tests for the ReadWriteBurn vote system, covering client-side services, end-to-end voting flows, and DTO structure validation.

## Test Structure

### End-to-End Tests (`e2e/`)

**`voteSystem.test.ts`** - Complete vote system integration tests
- Fire voting with chain key lookup
- Submission voting (top-level and replies)
- Error handling for network issues, missing data, and signing failures
- Vote DTO validation
- Chain key endpoint integration

### Integration Tests (`integration/`)

**`voteDtoStructure.test.ts`** - Vote DTO structure validation
- Fire vote DTO construction and serialization
- Submission vote DTO for top-level and reply content
- Chain key format validation
- Edge case handling (large quantities, binary formats)

### Manual Tests (`manual/`)

**`testVoteFlow.ts`** - Manual testing scripts for live systems
- Interactive vote flow testing
- Chain key endpoint verification
- Validation testing
- Prerequisites checker

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Files
```bash
# End-to-end vote system tests
npm test -- src/test/e2e/voteSystem.test.ts

# DTO structure validation
npm test -- src/test/integration/voteDtoStructure.test.ts

# Both vote system test files
npm test -- src/test/e2e/voteSystem.test.ts src/test/integration/voteDtoStructure.test.ts
```

### Manual Testing
```bash
# Run manual test script (requires running server)
npm run dev
# In another terminal:
npm run test:manual
```

## Test Coverage

### Vote Service Tests
- ✅ Fire voting with server-side chain key lookup
- ✅ Submission voting with metadata retrieval
- ✅ Error handling for failed lookups
- ✅ Network error resilience
- ✅ MetaMask signing error handling
- ✅ Server submission error handling

### DTO Structure Tests
- ✅ Fire vote DTO format validation
- ✅ Submission vote DTO format validation
- ✅ Chain key format verification
- ✅ Binary data preservation
- ✅ BigNumber serialization
- ✅ Edge case handling

### Chain Key Endpoint Tests
- ✅ Fire chain key construction
- ✅ Submission chain key lookup with metadata
- ✅ Top-level vs reply submission identification
- ✅ Error handling for missing entities

### Validation Tests
- ✅ Vote quantity validation
- ✅ User authentication checks
- ✅ Required field validation
- ✅ Data format validation

## Key Test Scenarios

### Fire Voting Flow
1. Client requests fire chain key from server
2. Server returns composite key: `\\x00RWBF\\x00{fireSlug}\\x00`
3. VoteService constructs DTO with empty entryParent
4. MetaMask signs the vote
5. Server submits to chaincode

### Submission Voting Flow (Top-level)
1. Client requests submission metadata from server
2. Server returns chain key, fire slug, and hierarchy info
3. VoteService constructs DTO with fire as entryParent
4. MetaMask signs the vote
5. Server submits to chaincode

### Submission Voting Flow (Reply)
1. Client requests submission metadata from server
2. Server returns parent submission chain key
3. VoteService constructs DTO with parent submission as entryParent
4. MetaMask signs the vote
5. Server submits to chaincode

## Test Data Formats

### Fire Chain Key
- Format: `\\x00RWBF\\x00{fireSlug}\\x00`
- Example: `\\x00RWBF\\x00test-fire\\x00`

### Submission Chain Key
- Format: `\\x00RWBS\\x00{recency}\\x00{slug}\\x00{uniqueKey}\\x00`
- Example: `\\x00RWBS\\x00999\\x00submission-123\\x00unique-456\\x00`

### Vote DTO Structure

**Fire Vote:**
```json
{
  "entryType": "RWBF",
  "entryParent": "",
  "entry": "\\x00RWBF\\x00fire-slug\\x00",
  "quantity": "10",
  "uniqueKey": "generated-unique-key"
}
```

**Top-level Submission Vote:**
```json
{
  "entryType": "RWBS",
  "entryParent": "\\x00RWBF\\x00fire-slug\\x00",
  "entry": "\\x00RWBS\\x00999\\x00submission\\x00unique\\x00",
  "quantity": "5",
  "uniqueKey": "generated-unique-key"
}
```

**Reply Submission Vote:**
```json
{
  "entryType": "RWBS",
  "entryParent": "\\x00RWBS\\x00999\\x00parent\\x00unique\\x00",
  "entry": "\\x00RWBS\\x00998\\x00reply\\x00unique\\x00",
  "quantity": "3",
  "uniqueKey": "generated-unique-key"
}
```

## Debugging

### Common Issues

1. **Chain Key Format Mismatch**: Ensure consistent use of escaped null bytes
2. **MetaMask Connection**: Verify global metamask client is properly mocked
3. **Server Endpoints**: Confirm server is running and endpoints are accessible
4. **DTO Validation**: Check that all required fields are present and correctly typed

### Test Environment

- Node.js test environment with jsdom
- Mocked fetch API for server communication
- Mocked MetaMask client for signing operations
- Vitest test runner with TypeScript support

### Mock Data

Tests use consistent mock data:
- Fire slug: `test-fire`
- Submission IDs: 123 (top-level), 456 (reply)
- Vote quantities: 1-10 tokens
- Chain keys: Follow proper binary format with escaped null bytes