#!/bin/Node
import "dotenv/config";

import {
  MintTokenWithAllowanceDto,
  TokenInstance,
  TokenInstanceQueryKey,
  asValidUserAlias,
  signatures
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

const galaTokenQueryKey = plainToInstance(TokenInstanceQueryKey, {
  collection: "GALA",
  category: "Unit",
  type: "none",
  additionalKey: "none",
  instance: TokenInstance.FUNGIBLE_TOKEN_INSTANCE
});

const CHAIN_API = process.env.CHAIN_API ?? "http://localhost:3000";
const CHAIN_ADMIN_SK = process.env.CHAIN_ADMIN_SECRET_KEY ?? "";

const assetChannel = process.env.ASSET_CHANNEL ?? "asset";
const mintEndpoint = `${CHAIN_API}/api/${assetChannel}/GalaChainToken/MintTokenWithAllowance`;

// Default values
const DEFAULT_MINT_AMOUNT = new BigNumber(1000);

function printUsage() {
  console.log("Usage: node init_03_mint_gala.mjs [user_address] [amount]");
  console.log("");
  console.log("Arguments:");
  console.log("  user_address  Ethereum address to mint tokens to (optional, defaults to admin)");
  console.log("  amount        Amount of GALA to mint in base units (optional, defaults to 1000 GALA)");
  console.log("");
  console.log("Examples:");
  console.log("  node init_03_mint_gala.mjs");
  console.log("  node init_03_mint_gala.mjs 0x1234567890123456789012345678901234567890");
  console.log("  node init_03_mint_gala.mjs 0x1234567890123456789012345678901234567890 500000000000");
  console.log("");
  console.log("Environment Variables:");
  console.log("  CHAIN_ADMIN_SECRET_KEY  Admin private key for signing transactions");
  console.log("  CHAIN_ADMIN_PUBLIC_KEY  Admin public key for generating user alias");
  console.log("  CHAIN_API               GalaChain API endpoint (default: http://localhost:3000)");
  console.log("  ASSET_CHANNEL           Asset channel name (default: asset)");
}

export async function mintGala(targetUser = null, amount = DEFAULT_MINT_AMOUNT) {
  if (!CHAIN_ADMIN_SK) {
    throw new Error(
      `CHAIN_ADMIN_SECRET_KEY not provided. Set this environment variable with ` +
        `the value provided after the "Dev admin private key which you can ` +
        `use for signing transactions:" message when you start your local chain network.`
    );
  }

  // Determine target user
  let userAlias;
  if (targetUser) {
    // If user provided, validate it's a valid Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetUser)) {
      throw new Error(`Invalid Ethereum address: ${targetUser}`);
    }
    userAlias = asValidUserAlias(`eth|${targetUser}`);
  } else {
    // Default to admin user
    const CHAIN_ADMIN_PK = process.env.CHAIN_ADMIN_PUBLIC_KEY ?? "";
    if (!CHAIN_ADMIN_PK) {
      throw new Error(
        `CHAIN_ADMIN_PUBLIC_KEY not provided when no user specified. ` +
          `Set this environment variable or provide a user address argument.`
      );
    }
    const adminEthAddress = signatures.getEthAddress(CHAIN_ADMIN_PK);
    userAlias = asValidUserAlias(`eth|${adminEthAddress}`);
  }

  const dto = plainToInstance(MintTokenWithAllowanceDto, {
    tokenClass: {
      collection: "GALA",
      category: "Unit",
      type: "none",
      additionalKey: "none"
    },
    tokenInstance: galaTokenQueryKey.instance,
    owner: userAlias,
    quantity: new BigNumber(amount),
    uniqueKey: `galachain-dev-mint-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  });

  console.log(`Minting ${amount.toString()} GALA tokens to user: ${userAlias}`);

  const response = await fetch(mintEndpoint, {
    method: "POST",
    body: dto.signed(CHAIN_ADMIN_SK).serialize(),
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    console.log("Response status:", response.status);
    console.log("Response status text:", response.statusText);
    console.log("Request URL:", response.url);
    const text = await response.text();
    console.log("Response body:", text);
    throw new Error(`Mint request failed for dto: ${dto.serialize()}`);
  }

  const data = await response.json();
  console.log(`MintTokenWithAllowance response: ${JSON.stringify(data, null, 2)}`);
  
  return data;
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const userAddress = args[0] || null;
  const amount = args[1] ? new BigNumber(args[1]) : DEFAULT_MINT_AMOUNT;

  mintGala(userAddress, amount)
    .then((result) => {
      console.log("MINT COMPLETED SUCCESSFULLY\n");
      console.log(`Minted tokens: ${JSON.stringify(result, null, 2)}`);
    })
    .catch((error) => {
      console.error("MINT FAILED:", error.message);
      process.exit(1);
    });
}