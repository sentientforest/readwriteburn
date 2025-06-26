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
npm run test              # Run Mocha tests
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
- Express.js with TypeScript
- SQLite database using better-sqlite3
- CORS enabled for frontend communication
- API routes for fires, submissions, and identities
- Proxy endpoints for chaincode interaction
- User registration and wallet management

### Frontend Architecture (client/)
- Vue 3 with Composition API and TypeScript
- Vue Router for navigation
- GalaChain Connect integration via MetaMask
- Components for wallet connection, balance display, and token burning
- Vite build system with Node.js polyfills for blockchain libraries

## Key Development Notes

### Environment Configuration
- Chaincode uses `.dev-env` file for network configuration
- Server uses standard `.env` file
- Client uses Vite environment variables (VITE_ prefix)

### Testing Strategy
- Chaincode: Jest with e2e tests against actual network
- Server: Mocha with TypeScript support
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
- Unique transaction service prevents replay attacks
- Authentication required for all state-changing operations
- Fee verification with co-signed authorization
- Conflict detection prevents duplicate fire creation
- Validation of entry types and existence checks