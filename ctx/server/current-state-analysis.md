# Server Current State Analysis

**Date:** 2025-06-26  
**Analysis of:** `/server/` directory  
**Status:** Complete

## Overview

Analysis of the existing Express.js server application that provides JSON API endpoints and integrates with the GalaChain chaincode.

## Dependencies and Architecture

### Core Dependencies
- **Express.js** with TypeScript for web framework
- **SQLite** database using `better-sqlite3` for local storage  
- **GalaChain API** integration (`@gala-chain/api` v2.2.0)
- **CORS** enabled for frontend communication
- **Dotenv** for environment configuration
- **secp256k1** for cryptographic operations

### Development Dependencies
- **Mocha** for testing framework
- **TypeScript** compilation
- **ESLint** and **Prettier** for code quality

## Current API Endpoints

### Identity Management
| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/api/identities/new-random-user` | GET | Generate random user with keys |
| `/api/identities/register` | POST | Register user with provided public key |
| `/identities/CreateHeadlessWallet` | POST | Alternative registration endpoint |

### Generic Proxy
| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/api/:channel/:contract/:method` | POST | Generic chaincode proxy |

### Fire (Community) Management  
| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/api/fires` | POST | Create new fire/community |
| `/api/fires` | GET | List all fires |
| `/api/fires/:slug` | GET | Get specific fire by slug |
| `/api/fires/:slug` | PUT | Update fire |
| `/api/fires/:slug` | DELETE | Delete fire |

### Submission Management
| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/api/submissions` | GET | List all submissions |
| `/api/submissions/:id` | GET | Get specific submission |
| `/api/submissions` | POST | Create new submission |
| `/api/submissions/:id/vote` | POST | Upvote submission |
| `/api/fires/:slug/submissions` | GET | Get submissions for specific fire |

## Database Schema

### subfires (Communities/Topics)
```sql
CREATE TABLE subfires (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### subfire_roles (Authorities/Moderators)  
```sql
CREATE TABLE subfire_roles (
  subfire_id TEXT,
  user_id TEXT,
  role TEXT CHECK(role IN ('authority', 'moderator')),
  PRIMARY KEY (subfire_id, user_id, role)
)
```

### submissions (Content Posts)
```sql
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contributor TEXT,
  description TEXT,
  url TEXT,
  subfire_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subfire_id) REFERENCES subfires(slug)
)
```

### votes (Vote Counts)
```sql
CREATE TABLE votes (
  submission_id INTEGER PRIMARY KEY,
  count INTEGER DEFAULT 0,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
)
```

## Chaincode Integration Patterns

### Authentication & User Management
- Uses **secp256k1** key pairs for user identity
- Supports named identities (`client|name`) and Ethereum addresses (`eth|address`)
- Admin key management via environment variables:
  - `CHAIN_ADMIN_SECRET_KEY`
  - `CHAIN_ADMIN_PUBLIC_KEY`

### Data Transfer Objects (DTOs)
Server defines custom DTOs in `/src/types.ts`:
- `FireDto` - Fire creation data
- `FireStarterDto` - Fire creation with fee authorization
- `SubmissionDto` - Submission data
- `ContributeSubmissionDto` - Submission with fee
- `CastVoteDto` - Vote casting with fee

### Fee Authorization Pattern
- `authorizeFee()` function validates fee authorizations with chaincode
- `fireStarterFee()` calculates required fees via dry-run
- Fee verification before operations

### Proxy Integration
- Generic proxy endpoint for direct chaincode calls
- Forwards requests to `${CHAIN_API}/api/${channel}/${contract}/${method}`
- Bypasses server logic for direct chaincode access

## Current Integration Issues

### 1. Missing Implementation
- **`verifyBurnDto` Function**: Referenced in submissions controller but not implemented
- **Incomplete Fee Verification**: Fee logic is partially implemented

### 2. DTO Mismatch
- Server DTOs don't match chaincode DTOs in `/chaincode/lib/src/readwriteburn/api/dtos.d.ts`
- Inconsistent data structures between server and chaincode

### 3. Dual Storage Complexity
- Data stored in both SQLite and potentially on chaincode
- No clear strategy for data consistency
- Potential for data drift between systems

### 4. Response Format Inconsistency
- Server returns custom JSON formats
- Chaincode returns GalaChain response format
- Client needs to handle different response types

## Environment Configuration

### Required Environment Variables
```bash
CHAIN_API=https://localhost:3010         # GalaChain API endpoint
CHAIN_ADMIN_SECRET_KEY=abc123...         # Admin private key
CHAIN_ADMIN_PUBLIC_KEY=def456...         # Admin public key  
PRODUCT_CHANNEL=product-channel          # Product channel name
ASSET_CHANNEL=asset-channel              # Asset channel name
DB_FILE=./database.sqlite               # SQLite database file path
PORT=3000                               # Server port
```

## Initialization Scripts

Located in `/bin` directory:
- `init_01_create_gala_token.mjs` - Token creation
- `init_02_gala_mint_allowance.mjs` - Mint allowances
- `init_03_mint_gala.mjs` - Initial token minting  
- `init_04_fires.mjs` - Default fire/community creation

## Strengths

1. **Working Foundation**: Basic CRUD operations implemented
2. **Authentication**: Proper key-based authentication system
3. **Database Layer**: SQLite provides fast local storage
4. **Generic Proxy**: Allows direct chaincode access when needed
5. **CORS Support**: Ready for frontend integration

## Weaknesses

1. **Incomplete Implementation**: Missing key functions and endpoints
2. **DTO Inconsistency**: Server and chaincode use different data structures  
3. **No Content Verification**: No hash-based integrity checking
4. **Limited Vote Management**: Basic voting without proper lifecycle
5. **No Moderation Features**: Cannot handle content takedowns
6. **Dual Storage Issues**: Unclear data consistency strategy

## Missing Chaincode Integration

### Endpoints Not Implemented
- **`FetchVotes`**: No server endpoint to retrieve votes
- **`CountVotes`**: No server endpoint to process vote aggregation

### Partial Implementation
- **`CastVote`**: Basic voting exists but may not match chaincode implementation
- **Fee Verification**: Incomplete token burning validation

## Recommendations

1. **Add Missing Endpoints**: Implement `FetchVotes` and `CountVotes` APIs
2. **Fix DTO Alignment**: Use chaincode DTOs or create proper mapping
3. **Implement Content Hashing**: Add SHA-256 verification system
4. **Complete Fee Logic**: Finish `verifyBurnDto` implementation
5. **Add Moderation**: Implement content takedown capabilities
6. **Standardize Responses**: Consistent error handling and response formats