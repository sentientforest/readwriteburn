# readwriteburn - Sample GalaChain Burn dApp

**Work in progress**. Non-trivial sample application.

Wanna turn up the heat? Slammin!

Burn $GALA to upvote. Submit links, comments, upvotes. Create subtopics.

Let's burn!

The project consists of three main components:

- `chaincode/`: GalaChain chaincode package for smart contract functionality
- `server/`: Express/Node.js backend application. Proxies client requests to chaincode, stores off-chain data as necessary.
- `client/`: Vue.js frontend user interface. Connects with Metamask to handle identity and signing key.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask wallet

## Features

- MetaMask wallet connection
- Automatic user registration with GalaChain if needed
- GALA token balance display (including locked amounts)
- Token burning functionality

## Project Structure

The project is organized into three main directories:

### Chaincode (`chaincode/`)
- GalaChain smart contract implementation
- Contains the business logic for token burning and upvoting

### Backend Server (`server/`)
- Express/Node.js application
- Handles API requests and blockchain interactions
- Environment variables defined in appropriate config files
- Custom API routes and business logic

### Frontend Client (`client/`)
- Vue.js application with the following structure:
  - `src/App.vue` - Main application component
  - `src/components/`
    - `Balance.vue` - Displays GALA balance
    - `BurnGala.vue` - Handles token burning
    - `WalletConnect.vue` - Handles wallet connection
  - Frontend Environment variables defined in `.env`
  - Vite configuration in `vite.config.ts`

## Setup and Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sentientforest/readwriteburn.git
   cd readwriteburn
   ```

2. Bring up the GalaChain network locally:
   ```bash
   cd chaincode
   npm install
   npm run build
   npm run network:up
   ```

3. Start the backend server:
   ```bash
   cd ../server
   npm install
   npm run dev
   ```

4. Finally, start the front-end development server:

   ```bash
   cd ../client
   npm install
   npm run dev
   ```

Load the front-end application at [http://localhost:3001](http://localhost:3001).

## Usage

1. Open your browser and navigate to `http://localhost:3001`
2. Click "Connect Wallet" to connect your MetaMask wallet
3. Once connected, you'll see your GALA balance
4. Enter the amount of GALA you want to burn
5. Click "Burn Tokens" to initiate the transaction
6. Confirm the transaction in MetaMask

## Development

The application is built with:
- Vue 3 (Composition API)
- TypeScript
- Vite
- GalaChain SDK
- Express/Sqlite

## Additional Resources

- [GalaChain Documentation](https://docs.galachain.com)
- [GalaChain Connect Library](https://github.com/GalaChain/sdk)
