# Client API Endpoint Analysis
Date: July 10, 2025

## Overview
Analysis of all API endpoints called by the Vue.js client application, organized by functionality and component usage.

## Environment Configuration
- **VITE_PROJECT_API**: `http://localhost:4000` (main server API)
- **Base URL Pattern**: `${import.meta.env.VITE_PROJECT_API}`

## Client API Endpoints by Category

### 1. User Management & Authentication
**Source**: `client/src/stores/user.ts`

| Endpoint | Method | Purpose | Request Data | Component Usage |
|----------|--------|---------|--------------|-----------------|
| `/api/product/PublicKeyContract/GetPublicKey` | POST | Check if user is registered | `{ user: address }` | App.vue (wallet connection) |
| `/identities/CreateHeadlessWallet` | POST | Register new user | `{ publicKey: string }` | App.vue (auto-registration) |

### 2. Fire/Community Management  
**Source**: `client/src/stores/fires.ts`, `client/src/components/FireStarter.vue`

| Endpoint | Method | Purpose | Request Data | Component Usage |
|----------|--------|---------|--------------|-----------------|
| `/api/fires` | GET | Fetch all fires | None | FireList.vue |
| `/api/fires/${slug}` | GET | Fetch specific fire | None | SubmissionList.vue |
| `/api/fires` | POST | Create new fire | Signed `FireStarterDto` | FireStarter.vue |
| `/api/product/ReadWriteBurn/DryRun` | POST | Estimate fees for fire creation | `{ callerPublicKey, method: "FireStarter", dto }` | FireStarter.vue |

### 3. Submission Management
**Source**: `client/src/stores/submissions.ts`, `client/src/components/NewSubmission.vue`

| Endpoint | Method | Purpose | Request Data | Component Usage |
|----------|--------|---------|--------------|-----------------|
| `/api/fires/${fireSlug}/submissions` | GET | Fetch submissions for fire | None | SubmissionList.vue |
| `/api/submissions/${id}` | GET | Fetch specific submission | None | NewSubmission.vue (replies) |
| `/api/submissions` | POST | Create new submission | `SubmissionCreateRequest` | NewSubmission.vue |
| `/api/submissions/${id}/vote` | POST | Vote on submission | `{ amount: number }` | ThreadedSubmission.vue |

### 4. Content Verification
**Source**: Various components

| Endpoint | Method | Purpose | Request Data | Component Usage |
|----------|--------|---------|--------------|-----------------|
| `/api/submissions/${id}/verify` | GET | Verify content hash | None | ContentVerificationBadge.vue |
| `/api/admin/verify-bulk` | POST | Bulk verify submissions | `{ submissionIds: number[] }` | Admin components |

### 5. Analytics & Monitoring
**Source**: `client/src/stores/analytics.ts`

| Endpoint | Method | Purpose | Request Data | Component Usage |
|----------|--------|---------|--------------|-----------------|
| `/api/analytics/overview` | GET | Get analytics overview | `?timeRange=${range}` | AnalyticsDashboard.vue |
| `/api/analytics/trends` | GET | Get trend data | `?timeRange=${range}` | AnalyticsDashboard.vue |
| `/api/health` | GET | Check API health | None | AdminDashboard.vue |

## Key Request/Response Structures

### Fire Creation Flow
```typescript
// Request to /api/fires (POST)
interface SignedFireStarterDto {
  fire: {
    entryParent: string;
    slug: string;
    name: string;
    starter: string; // UserRef format: "eth|address"
    description: string;
    authorities: string[];
    moderators: string[];
    uniqueKey: string;
  };
  fee?: FeeVerificationDto;
  uniqueKey: string;
  signature: string;
  prefix: string;
  types?: any;
  domain?: any;
}
```

### Submission Creation Flow
```typescript
// Request to /api/submissions (POST)
interface SubmissionCreateRequest {
  name: string;
  description: string;
  url?: string;
  fire: string; // fire slug
  contributor: string; // UserRef format: "eth|address"
  entryParent?: string; // submission ID for replies
}
```

### Vote Casting Flow
```typescript
// Request to /api/submissions/${id}/vote (POST)
interface VoteRequest {
  amount: number; // GALA amount to burn
}
```

## Authentication Patterns

### Wallet-Based Authentication
1. **MetaMask Connection**: Client connects to MetaMask via `ReadWriteBurnConnectClient`
2. **Public Key Registration**: Client POSTs public key to `/identities/CreateHeadlessWallet`
3. **Registration Check**: Client checks registration status via `/api/product/PublicKeyContract/GetPublicKey`

### Transaction Signing
1. **Client-Side Signing**: Uses `ReadWriteBurnConnectClient.signFireStarter()` etc.
2. **Signed Payload**: Includes EIP712 signature, types, and domain
3. **Server Verification**: Server must verify signatures before blockchain submission

## Data Flow Patterns

### 1. Fire Creation
```
Client (FireStarter.vue) 
→ signFireStarter() 
→ POST /api/fires 
→ Server should validate & submit to chain
```

### 2. Submission Creation  
```
Client (NewSubmission.vue) 
→ POST /api/submissions 
→ Server should create submission record
```

### 3. Voting
```
Client (ThreadedSubmission.vue) 
→ POST /api/submissions/${id}/vote 
→ Server should process vote (may need chain interaction)
```

## Identified Issues

### 1. Inconsistent Transaction Signing
- Fire creation uses blockchain signing (`signFireStarter`)
- Submission creation uses simple HTTP POST (no signing)
- Voting uses simple HTTP POST (no signing)

### 2. Missing Chain Integration
- Only fire creation appears to target blockchain
- Submissions and votes may be server-only operations
- Need to verify if this is intended architecture

### 3. Mixed Data Sources
- Some endpoints expect direct server operations
- Others expect blockchain proxy operations
- Unclear which operations should be on-chain vs off-chain

## Next Steps
1. Analyze server route implementations
2. Check chaincode method signatures
3. Identify missing server endpoints
4. Map required data transformations
5. Document integration gaps