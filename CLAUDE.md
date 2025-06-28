# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReadWriteBurn is a multi-component dApp built on GalaChain that allows users to burn $GALA tokens to upvote content submissions. The project consists of three main components:

- **chaincode/**: GalaChain smart contract (Hyperledger Fabric) implementation
- **server/**: Express.js backend API with SQLite database
- **client/**: Vue.js frontend with MetaMask integration

## Development Commands

### Chaincode Development
```bash
cd chaincode
npm install
npm run build              # Compile TypeScript to lib/
npm run build:watch        # Watch mode compilation
npm run lint              # ESLint checking
npm run fix               # Auto-fix ESLint issues
npm run format            # Prettier formatting
npm run test              # Run unit tests
npm run test:e2e          # Run end-to-end tests
npm run test:e2e-mocked   # Run e2e tests with mocked chaincode

# Network management
npm run network:up        # Start local GalaChain network
npm run network:start     # Alias for network:up
npm run network:prune     # Clean up network
npm run network:recreate  # Full reset of network
```

### Server Development
```bash
cd server
npm install
npm run build             # Compile TypeScript
npm run dev               # Development server with watch mode
npm run start             # Production server
npm run lint              # ESLint checking
npm run fix               # Auto-fix ESLint issues
npm run test              # Run Mocha tests (includes content hashing utilities)

# Testing specific modules
npm run test -- src/utils/contentHash.spec.ts  # Content hashing tests
npm run test -- src/db.spec.ts                 # Database and migration tests
```

### Client Development
```bash
cd client
npm install
npm run dev               # Development server (Vite)
npm run build             # Production build
npm run serve             # Preview production build
npm run lint              # ESLint checking
npm run fix               # Auto-fix ESLint issues
npm run type-check        # Vue TypeScript checking
```

## Architecture

### Smart Contract Architecture (chaincode/)
- **ReadWriteBurnContract**: Main contract extending GalaContract with 6 core operations
- **Fire**: Topic/community entity with hierarchical organization and moderation controls
- **Submission**: Content submissions with threaded discussion support via entryParent
- **Vote**: Individual token burns - temporary objects processed into aggregates
- **VoteCount**: Aggregated voting weight per entry with ranking references
- **VoteRanking**: Efficient leaderboard queries using inverse-time keys
- **VoterReceipt**: Permanent audit trail of user voting activity
- **Fire Management**: FireStarter, FireAuthority, FireModerator for governance
- Uses GalaChain SDK decorators (@Submit, @UnsignedEvaluate) for transaction types
- Implements fee gates for token burning operations
- Built on Hyperledger Fabric with TypeScript

### Backend Architecture (server/)
- **Hybrid Storage Strategy**: SQLite for moderable content, blockchain for immutable hashes
- **Content Hashing**: SHA-256 with timestamp salting using `@noble/hashes` library
- **Legal Compliance**: DMCA takedown capability while preserving chain integrity
- Express.js with TypeScript and comprehensive error handling
- SQLite database with migration system for schema evolution
- CORS enabled for frontend communication
- **Content Verification API**: Individual and bulk hash verification endpoints
- **Moderation System**: Flag/remove/modify/restore with audit logging
- API routes for fires, submissions, identities, and content management
- Proxy endpoints for direct chaincode interaction
- User registration and wallet management with secp256k1 authentication

### Frontend Architecture (client/)
- **Vue 3 with Composition API** and TypeScript for reactive UI development
- **Vue Router** for client-side navigation with route guards
- **Pinia** for centralized state management (user, fires, submissions, votes, analytics)
- **GalaChain Connect** integration via MetaMask for wallet connectivity
- **Headless UI + Tailwind CSS** for modern, accessible component library
- **Advanced Features**: Threaded discussions, fire hierarchies, analytics dashboard
- **Hybrid Connection Strategy**: Graceful fallback for wallet connection issues
- **Content Verification**: Real-time hash generation and verification system
- **Vite** build system with Node.js polyfills for blockchain libraries

## Key Development Notes

### Environment Configuration
- Chaincode uses `.dev-env` file for network configuration
- Server uses standard `.env` file for database and proxy settings
- Client uses Vite environment variables with proper API separation:
  - `VITE_PROJECT_API` for local server (content management, port 4000)
  - `VITE_GALASWAP_API` for GalaChain operations (blockchain, port 3000)
  - `VITE_BURN_GATEWAY_API` for user registration and identity services

### Testing Strategy
- Chaincode: Jest with e2e tests against actual network (98.1% success rate)
- Server: Mocha with TypeScript support (57 tests covering utilities and database)
  - Content hashing utilities: 24 comprehensive tests with `@noble/hashes`
  - Database operations: 33 tests including migration system verification
  - All tests use Node.js `assert` for consistency
- Client: Vue/Vite testing setup

### Network Setup
The project requires a local GalaChain network. Use `npm run network:up` in chaincode/ directory to start the full multi-channel setup with both product and asset channels.

### Code Style
- All components use ESLint + Prettier
- TypeScript strict mode enabled
- Import sorting via @trivago/prettier-plugin-sort-imports
- Comprehensive TypeDoc annotations for professional API documentation

## Smart Contract Data Flow

### Voting Workflow
1. **CastVote**: Users burn GALA tokens creating temporary Vote objects
2. **CountVotes**: Batch processing (up to 1000 votes) that:
   - Aggregates votes into VoteCount objects
   - Updates VoteRanking for efficient leaderboards
   - Creates VoterReceipt audit records
   - Deletes processed votes to prevent double-counting

### Content Hierarchy
- **Fires** contain **Submissions** 
- **Submissions** can have nested **Submissions** (comments)
- **entryParent** field enables threaded discussions
- All content supports **Votes** for token-weighted ranking

### Key Design Patterns
- **Inverse Time Keys**: Higher vote totals get better (lower) ranking positions
- **Polymorphic Entry Types**: RWB_TYPES registry enables dynamic object instantiation
- **Fee Gate Integration**: Atomic fee credit/debit operations for fire creation
- **Hierarchical Organization**: entryParent enables nested content structures
- **Batch Processing**: Vote counting handles large batches efficiently

### Security Considerations
- **Chain Level**: Unique transaction service prevents replay attacks
- **Authentication**: Required for all state-changing operations with secp256k1 signatures
- **Fee Verification**: Co-signed authorization with atomic credit/debit operations
- **Conflict Detection**: Prevents duplicate fire creation and vote double-counting
- **Validation**: Entry types and existence checks with comprehensive error handling
- **Content Security**: SHA-256 hashing with timestamp salting against rainbow tables
- **Timing Attack Protection**: Constant-time string comparison for hash verification
- **Data Integrity**: Cryptographic proof system enables content authenticity verification

## Development Workflow

### Multi-Service Startup
1. **Start Chaincode Network**: `cd chaincode && npm run network:up`
2. **Start Server**: `cd server && npm run dev` (runs on port 4000)
3. **Start Client**: `cd client && npm run dev` (runs on port 5173)

### Common Issues & Solutions

#### Wallet Connection Errors
- **"Cannot read from private field"**: GalaChain Connect library issue
- **Solution**: Use hybrid connection strategy with graceful fallback
- **Debug**: Try "Connect Basic (Debug)" button for MetaMask-only connection

#### API Configuration Issues
- **Symptom**: 404 errors, `/identities` prefix in URLs, CORS errors
- **Root Cause**: Wrong environment variable usage between local server vs blockchain APIs
- **Solution**: Verify environment variables:
  - Local server endpoints → `VITE_PROJECT_API` (port 4000)
  - Blockchain operations → `VITE_GALASWAP_API` (port 3000)

#### Build Issues
- **Noble hashes import errors**: Use `@noble/hashes/sha256` not `@noble/hashes/sha2.js`
- **TypeScript compilation**: Ensure all interface fields match API responses
- **Missing dependencies**: Run `npm install` in all three directories

### Client Development Patterns
- **Store Usage**: Prefer stores over direct API calls in components
- **Error Handling**: All API calls should have try/catch with user-friendly messages
- **Loading States**: Use store loading states for UI feedback
- **Hash Generation**: Use `@noble/hashes` library for client-side content hashing
- **Environment Variables**: Always use `import.meta.env.VITE_*` for client configuration