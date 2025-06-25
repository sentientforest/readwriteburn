#!/bin/Node
import "dotenv/config";

import { FeeVerificationDto, asValidUserAlias, signatures } from "@gala-chain/api";
import { plainToInstance } from "class-transformer";

const CHAIN_API = process.env.CHAIN_API ?? "http://localhost:3000";
const CHAIN_ADMIN_SK = process.env.CHAIN_ADMIN_SECRET_KEY ?? "";

const productChannel = process.env.PRODUCT_CHANNEL ?? "product";
const fireStarterEndpoint = `${CHAIN_API}/api/${productChannel}/ReadWriteBurn/FireStarter`;

// Default Fire configuration
const DEFAULT_FIRE_CONFIG = {
  slug: "showcase",
  name: "Showcase Competition",
  description: "A showcase competition for demonstrating project submissions and community voting",
  entryParent: ""
};

function printUsage() {
  console.log("Usage: node init_04_fires.mjs [slug] [name] [description] [starter_address]");
  console.log("");
  console.log("Arguments:");
  console.log("  slug             Fire URL slug (optional, defaults to 'showcase')");
  console.log("  name             Fire display name (optional, defaults to 'Showcase Competition')");
  console.log("  description      Fire description (optional, defaults to competition description)");
  console.log("  starter_address  Ethereum address of fire starter (optional, defaults to admin)");
  console.log("");
  console.log("Examples:");
  console.log("  node init_04_fires.mjs");
  console.log("  node init_04_fires.mjs gaming-contest");
  console.log('  node init_04_fires.mjs gaming-contest "Gaming Contest" "Submit your best gaming projects"');
  console.log(
    '  node init_04_fires.mjs showcase "Showcase" "Description" 0x1234567890123456789012345678901234567890'
  );
  console.log("");
  console.log("Environment Variables:");
  console.log("  CHAIN_ADMIN_SECRET_KEY  Admin private key for signing transactions");
  console.log("  CHAIN_ADMIN_PUBLIC_KEY  Admin public key for generating user alias");
  console.log("  CHAIN_API               GalaChain API endpoint (default: http://localhost:3000)");
  console.log("  PRODUCT_CHANNEL         Product channel name (default: product)");
}

export async function createFire(
  slug = DEFAULT_FIRE_CONFIG.slug,
  name = DEFAULT_FIRE_CONFIG.name,
  description = DEFAULT_FIRE_CONFIG.description,
  starterAddress = null
) {
  if (!CHAIN_ADMIN_SK) {
    throw new Error(
      `CHAIN_ADMIN_SECRET_KEY not provided. Set this environment variable with ` +
        `the value provided after the "Dev admin private key which you can ` +
        `use for signing transactions:" message when you start your local chain network.`
    );
  }

  // Determine starter user
  let starterAlias;
  if (starterAddress) {
    // If user provided, validate it's a valid Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(starterAddress)) {
      throw new Error(`Invalid Ethereum address: ${starterAddress}`);
    }
    starterAlias = asValidUserAlias(`eth|${starterAddress}`);
  } else {
    // Default to admin user
    const CHAIN_ADMIN_PK = process.env.CHAIN_ADMIN_PUBLIC_KEY ?? "";
    if (!CHAIN_ADMIN_PK) {
      throw new Error(
        `CHAIN_ADMIN_PUBLIC_KEY not provided when no starter specified. ` +
          `Set this environment variable or provide a starter address argument.`
      );
    }
    const adminEthAddress = signatures.getEthAddress(CHAIN_ADMIN_PK);
    starterAlias = asValidUserAlias(`eth|${adminEthAddress}`);
  }

  // Create FireDto
  const fireDto = {
    entryParent: DEFAULT_FIRE_CONFIG.entryParent,
    slug: slug,
    name: name,
    starter: starterAlias,
    description: description,
    authorities: [], // Will default to starter as authority
    moderators: [], // Will default to starter as moderator
    uniqueKey: `fire-init-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };

  // Create fee verification (empty for now - may need to be updated based on fee requirements)
  const feeDto = plainToInstance(FeeVerificationDto, {
    feeCode: "NO_FEE", // This may need to be adjusted based on actual fee requirements
    uniqueKey: `fee-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  });

  // Create FireStarterDto
  const fireStarterDto = {
    fire: fireDto,
    fee: feeDto,
    uniqueKey: `fire-starter-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };

  console.log(`Creating fire: "${name}" with slug "${slug}"`);
  console.log(`Fire starter: ${starterAlias}`);
  console.log(`Description: ${description || "No description provided"}`);

  // Convert to DTO instance for proper serialization
  const dto = plainToInstance(Object, fireStarterDto);

  const response = await fetch(fireStarterEndpoint, {
    method: "POST",
    body: JSON.stringify(dto),
    headers: {
      "Content-Type": "application/json",
      "X-Signature": await signRequest(JSON.stringify(dto), CHAIN_ADMIN_SK)
    }
  });

  if (!response.ok) {
    console.log("Response status:", response.status);
    console.log("Response status text:", response.statusText);
    console.log("Request URL:", response.url);
    const text = await response.text();
    console.log("Response body:", text);
    throw new Error(`Fire creation failed for slug: ${slug}`);
  }

  const data = await response.json();
  console.log(`FireStarter response: ${JSON.stringify(data, null, 2)}`);

  return data;
}

// Simple signature helper (may need to be adjusted based on GalaChain requirements)
async function signRequest(payload, privateKey) {
  // This is a placeholder - actual signing implementation may be more complex
  // based on how GalaChain expects signed requests for the FireStarter endpoint
  return `signed-${Date.now()}`;
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const slug = args[0] || DEFAULT_FIRE_CONFIG.slug;
  const name = args[1] || DEFAULT_FIRE_CONFIG.name;
  const description = args[2] || DEFAULT_FIRE_CONFIG.description;
  const starterAddress = args[3] || null;

  createFire(slug, name, description, starterAddress)
    .then((result) => {
      console.log("FIRE CREATION COMPLETED SUCCESSFULLY\n");
      console.log(`Created fire: ${JSON.stringify(result, null, 2)}`);
    })
    .catch((error) => {
      console.error("FIRE CREATION FAILED:", error.message);
      process.exit(1);
    });
}
