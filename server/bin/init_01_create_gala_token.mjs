#!/bin/Node
import "dotenv/config";

import {
  CreateTokenClassDto,
  FetchBalancesDto,
  MintTokenWithAllowanceDto,
  TokenClassKey
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

const galaTokenClassKey = plainToInstance(TokenClassKey, {
  collection: "GALA",
  category: "Unit",
  type: "none",
  additionalKey: "none"
});

const CHAIN_API = process.env.CHAIN_API ?? "http://localhost:3000";
const CHAIN_ADMIN_SK = process.env.CHAIN_ADMIN_SECRET_KEY ?? "";

const assetChannel = process.env.ASSET_CHANNEL ?? "asset";
const productChannel = process.env.PRODUCT_CHANNEL ?? "product";

const createTokenEndpoint = `${CHAIN_API}/api/${assetChannel}/GalaChainToken/CreateTokenClass`;

const dto = plainToInstance(CreateTokenClassDto, {
  network: "GC",
  decimals: 8,
  maxCapacity: new BigNumber(500 * 1000 * 1000000),
  maxSupply: new BigNumber(500 * 1000 * 1000000),
  tokenClass: galaTokenClassKey,
  name: "GALA Local Dev Test Token",
  symbol: "GALA",
  description: "GALA token created for a local development test environment",
  image: "https://app.gala.games/favicon.ico",
  isNonFungible: false,
  uniqueKey: `galachain-dev-token-initialization-${Date.now()}-${Math.floor(Math.random() * 1000)}`
});

export async function createGala() {
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

createGala().then(() => console.log("FINISHED\n\n"));
