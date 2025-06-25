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
- **ReadWriteBurnContract**: Main contract extending GalaContract
- **Fire**: Topic/community entity with submission management
- **Submission**: Content submissions within fires
- **Vote**: Token burning mechanism for upvoting
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