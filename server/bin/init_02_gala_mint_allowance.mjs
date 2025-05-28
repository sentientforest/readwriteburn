#!/bin/Node
import "dotenv/config";

import {
  AllowanceType,
  GrantAllowanceDto,
  GrantAllowanceQuantity,
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
const CHAIN_ADMIN_PK = process.env.CHAIN_ADMIN_PUBLIC_KEY ?? "";

const assetChannel = process.env.ASSET_CHANNEL ?? "asset";
const productChannel = process.env.PRODUCT_CHANNEL ?? "product";

const createTokenEndpoint = `${CHAIN_API}/api/${assetChannel}/GalaChainToken/HighThroughputMintAllowance`;

if (!CHAIN_ADMIN_PK) {
  throw new Error(
    `CHAIN_ADMIN_PUBLIC_KEY not provided. Set this environment variable in a .env file with ` +
      `the public key or a valid alias for the admin created with your test network. ` +
      `Typically this value can be found in the "test-network/dev-admin-key/dev-admin.pub.hex.txt" ` +
      ` file with your local chaincode instance. `
  );
}

console.log(CHAIN_ADMIN_PK);
const adminPk = signatures.getEthAddress(CHAIN_ADMIN_PK);
console.log(adminPk);

const adminQuantity = plainToInstance(GrantAllowanceQuantity, {
  user: asValidUserAlias(`eth|${adminPk}`),
  quantity: new BigNumber(1000 * 1000 * 1000)
});

const dto = plainToInstance(GrantAllowanceDto, {
  allowanceType: AllowanceType.Mint,
  uses: adminQuantity.quantity,
  tokenInstance: galaTokenQueryKey,
  quantities: [adminQuantity],
  uniqueKey: `galachain-dev-token-initialization-${Date.now()}-${Math.floor(Math.random() * 1000)}`
});

export async function grantAdminMintAllowance() {
  if (!CHAIN_ADMIN_SK) {
    throw new Error(
      `CHAIN_ADMIN_SECRET_KEY not provided. Set this environment variable with ` +
        `the value provided after the "Dev admin private key which you can ` +
        `use for signing transactions:" message when you start your local chain network. `
    );
  }
  const response = await fetch(createTokenEndpoint, {
    method: "POST",
    body: dto.signed(CHAIN_ADMIN_SK).serialize(),
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    console.log(response.status);
    console.log(response.statusText);
    console.log(response.url);
    const text = await response.text();
    console.log(text);
    throw new Error(`Request failed for dto: ${dto.serialize()}`);
  }

  const data = await response.json();

  console.log(`CreateTokenClass response: ${JSON.stringify(data)}`);
}

grantAdminMintAllowance().then(() => console.log("FINISHED\n\n"));
