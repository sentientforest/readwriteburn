import {
  DryRunDto,
  DryRunResultDto,
  FeeAuthorizationDto,
  FeeAuthorizationResDto,
  FeeVerificationDto,
  GalaChainResponse,
  createValidDTO,
  deserialize
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { NextFunction, Request, Response } from "express";
import assert from "node:assert";

import { dbService } from "../db";
import { FireDto, FireStarterAuthorizationDto, FireStarterDto } from "../types";
import { evaluateChaincode, submitToChaincode } from "../utils/chaincode";
import { getAdminPrivateKey, randomUniqueKey } from "./identities";

// Helper function to verify burn DTO
export async function authorizeFee(dto: FeeAuthorizationDto): Promise<FeeAuthorizationResDto> {
  const apiBase = process.env.CHAIN_API;
  const asset = process.env.ASSET_CHANNEL ?? "asset";

  const url = `${apiBase}/api/${asset}/GalaChainFee/AuthorizeFee`;

  const chainRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: dto.serialize()
  });

  if (!chainRes.ok) {
    const msg = `DryRun failed: ${url}, with dto: ${dto.serialize()}`;

    console.log(msg);
    throw new Error(msg);
  }

  const result: GalaChainResponse<FeeAuthorizationResDto> = await chainRes.json();

  if (!GalaChainResponse.isSuccess(result)) {
    const msg = `Chaincode Error: ${result.Status}, ${result.Message}`;

    console.log(`authorizeFee failed with error: ${msg}`);
    throw new Error(msg);
  }

  const feeAuthorization: FeeAuthorizationResDto = result.Data;

  return feeAuthorization;
}

export function extractFeeQtyFromDryRun(result: DryRunResultDto): BigNumber {
  // todo: parse response, writes etc. to extract on-chain fee accounting for user usage etc.
  return new BigNumber("0");
}

export async function fireStarterFee(fire: FireDto): Promise<BigNumber> {
  const apiBase = process.env.CHAIN_API;
  const asset = process.env.ASSET_CHANNEL ?? "asset";
  const product = process.env.PRODUCT_CHANNEL ?? "product";

  const url = `${apiBase}/api/${product}/readwriteburn/DryRun`;

  const dto = await createValidDTO(DryRunDto, {
    callerPublicKey: fire.starter,
    method: "FireStarter",
    dto: fire
  });

  const chainRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: dto.serialize()
  });

  if (!chainRes.ok) {
    const msg = `DryRun failed: ${url}, with dto: ${dto.serialize()}`;

    console.log(msg);
    throw new Error(msg);
  }

  const result: DryRunResultDto = await chainRes.json();

  const feeQuantity = extractFeeQtyFromDryRun(result);

  return feeQuantity;
}

export async function fireStarter(req: Request, res: Response, next: NextFunction) {
  try {
    const dto: FireStarterDto = deserialize(FireStarterDto, req.body);
    const { fire, fee } = dto;

    console.log(
      "Fire creation request:",
      JSON.stringify(
        {
          slug: fire.slug,
          name: fire.name,
          starter: fire.starter,
          hasFee: !!fee
        },
        null,
        2
      )
    );

    // For now, skip fee validation to focus on basic integration
    // TODO: Re-enable fee validation once basic flow works
    // const feeQty = await fireStarterFee(fire);
    // if (fee && fee.quantity.isLessThan(feeQty)) {
    //   const msg = `Chain requires fee of ${feeQty.toString()}, fire starter only authorized: ${fee.quantity.toString()}`;
    //   console.log(msg);
    //   return res.status(400).json({ error: msg });
    // }

    // let feeVerification: FeeVerificationDto;

    const serverDto = await createValidDTO(FireStarterDto, {
      fire: fire,
      uniqueKey: `readwriteburn-${randomUniqueKey()}`
    });

    // if (feeVerification !== undefined) {
    //   serverDto.fee = feeVerification;
    // }

    const serverAdminKey = getAdminPrivateKey();

    const signedDto = serverDto.signed(serverAdminKey);

    // Submit the signed DTO to chaincode
    console.log("Submitting fire creation to chaincode...");
    const chainResponse = await submitToChaincode("FireStarter", signedDto);

    if (!chainResponse.success) {
      console.error("Chaincode submission failed:", chainResponse.error);
      return res.status(500).json({
        error: `Fire creation failed: ${chainResponse.error}`
      });
    }

    console.log("Chaincode submission successful:", chainResponse.data);

    // Extract Fire metadata from chaincode response
    const fireResult = chainResponse.data as any; // FireResDto
    const fireMetadata = fireResult.metadata; // Fire object

    // Save Fire metadata to database for quick lookups
    const created = dbService.createSubfire(fireMetadata);

    console.log("Fire created successfully:", {
      slug: created.slug,
      name: created.name,
      chainKey: fireMetadata.getCompositeKey ? fireMetadata.getCompositeKey() : "unknown"
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Fire creation error:", error);
    next(error);
  }
}

export async function listFires(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("Fetching fires - Query params:", req.query);

    // Create FetchFiresDto from query parameters
    const fetchDto = {
      slug: req.query.slug as string,
      bookmark: req.query.bookmark as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    console.log("Fetching fires from chaincode with:", fetchDto);

    // Try to fetch from chaincode first
    const chainResponse = await evaluateChaincode("FetchFires", fetchDto);

    if (chainResponse.success && chainResponse.data) {
      console.log("Successfully fetched fires from chaincode:", chainResponse.data);
      const fetchResult = chainResponse.data as any; // FetchFiresResDto
      res.json(fetchResult);
    } else {
      console.warn("Chaincode fetch failed, falling back to database:", chainResponse.error);
      // Fall back to database if chaincode is unavailable
      const subfires = dbService.getAllSubfires();
      res.json({
        results: subfires,
        nextPageBookmark: undefined
      });
    }
  } catch (error) {
    console.error("Error fetching fires:", error);
    next(error);
  }
}

export async function readFire(req: Request, res: Response, next: NextFunction) {
  try {
    const subfire = dbService.getSubfire(req.params.slug);
    if (!subfire) {
      return res.status(404).json({ error: "Subfire not found" });
    }
    res.json(subfire);
  } catch (error) {
    next(error);
  }
}

export async function updateFire(req: Request, res: Response, next: NextFunction) {
  try {
    const subfire = req.body as FireDto;
    const updated = dbService.updateSubfire(req.params.slug, subfire);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteFire(req: Request, res: Response, next: NextFunction) {
  try {
    const success = dbService.deleteSubfire(req.params.slug);
    if (!success) {
      return res.status(404).json({ error: "Subfire not found" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
