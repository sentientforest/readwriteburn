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
import {
  CastVoteAuthorizationDto,
  CastVoteDto,
  FetchFiresDto,
  FetchFiresResDto,
  FireDto,
  FireResDto,
  FireStarterAuthorizationDto,
  FireStarterDto
} from "../types";
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
    // Client sends FireStarterAuthorizationDto with signed FireDto
    const authDto: FireStarterAuthorizationDto = deserialize(FireStarterAuthorizationDto, req.body);
    const { fire, fee } = authDto;

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

    // Re-enabled fee verification as per development plan
    let feeVerification: FeeVerificationDto | undefined;

    if (fee) {
      console.log("Processing fee authorization...");
      try {
        const feeAuthorizationRes = await authorizeFee(fee);

        // Transform FeeAuthorizationResDto to FeeVerificationDto
        feeVerification = {
          authorization: feeAuthorizationRes.authorization,
          authority: feeAuthorizationRes.authority,
          created: feeAuthorizationRes.created,
          txId: feeAuthorizationRes.txId,
          quantity: feeAuthorizationRes.quantity,
          feeAuthorizationKey: feeAuthorizationRes.feeAuthorizationKey,
          uniqueKey: feeAuthorizationRes.uniqueKey || `fee-verification-${randomUniqueKey()}`
        } as FeeVerificationDto;

        console.log("Fee authorization successful");
      } catch (error) {
        console.error("Fee authorization failed:", error);
        return res.status(400).json({
          error: `Fee authorization failed: ${error}`
        });
      }
    }

    const serverDto = await createValidDTO(FireStarterDto, {
      fire: fire,
      fee: feeVerification,
      uniqueKey: `readwriteburn-${randomUniqueKey()}`
    });

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

    console.log("Chaincode submission successful:", JSON.stringify(chainResponse.data, null, 2));

    // Extract Fire metadata from chaincode response
    const fireResult = chainResponse.data as FireResDto;
    const chainKey = fireResult.fireKey;
    const fireMetadata = fireResult.metadata;

    console.log(
      "Fire response data:",
      JSON.stringify(
        {
          fireKey: chainKey,
          metadata: fireMetadata
        },
        null,
        2
      )
    );

    // Save Fire metadata to database with provided chain key
    const created = dbService.createSubfire(fireMetadata, chainKey);

    console.log("Fire created successfully:", {
      slug: created.slug,
      name: created.name,
      chainKey: chainKey
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
    const fetchDto = new FetchFiresDto({
      slug: req.query.slug ? (req.query.slug as string) : undefined,
      bookmark: req.query.bookmark ? (req.query.bookmark as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    });

    console.log("Fetching fires from chaincode with:", JSON.stringify(fetchDto, null, 2));

    // Try to fetch from chaincode first
    const chainResponse = await evaluateChaincode<FetchFiresResDto>("FetchFires", fetchDto);

    if (chainResponse.success && chainResponse.data) {
      console.log("Successfully fetched fires from chaincode:", JSON.stringify(chainResponse.data, null, 2));
      const fetchResult = chainResponse.data as any; // FetchFiresResDto

      // Ensure we have the correct response structure
      const response = {
        results: fetchResult.results || fetchResult,
        nextPageBookmark: fetchResult.nextPageBookmark
      };

      res.json(response);
    } else {
      console.warn("Chaincode fetch failed, falling back to database:", chainResponse.error);
      // Fall back to database if chaincode is unavailable
      const subfires = dbService.getAllSubfires();
      console.log("Database fallback - found subfires:", JSON.stringify(subfires, null, 2));
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

export async function voteOnFire(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("Raw fire vote request body:", JSON.stringify(req.body, null, 2));

    // 1. Parse authorization DTO from client
    const authDto: CastVoteAuthorizationDto = deserialize(CastVoteAuthorizationDto, req.body);

    console.log("Deserialized fire vote authDto:", JSON.stringify(authDto, null, 2));

    // Check if vote exists and has required fields
    if (!authDto.vote) {
      return res.status(400).json({
        error: "Missing vote data in authorization DTO"
      });
    }

    if (!authDto.vote.entryType) {
      return res.status(400).json({
        error: "VoteDto missing entryType field",
        receivedVote: JSON.stringify(authDto.vote, null, 2)
      });
    }

    // Verify this is a fire vote (entryType should be "RWBF")
    if (authDto.vote.entryType !== "RWBF") {
      return res.status(400).json({
        error: `Invalid entryType for fire vote. Expected "RWBF", got "${authDto.vote.entryType}"`
      });
    }

    console.log(
      "Fire vote casting request:",
      JSON.stringify(
        {
          fireSlug: req.params.slug,
          entry: authDto.vote.entry,
          entryType: authDto.vote.entryType,
          entryParent: authDto.vote.entryParent,
          quantity: authDto.vote.quantity.toString(),
          hasFee: !!authDto.fee
        },
        null,
        2
      )
    );

    // 2. Create server-signed CastVoteDto
    const serverDto = await createValidDTO(CastVoteDto, {
      vote: authDto.vote, // client-signed vote
      uniqueKey: `fire-vote-${randomUniqueKey()}`
    });

    // 3. Sign with server key
    const signedDto = serverDto.signed(getAdminPrivateKey());

    // 4. Submit to chaincode
    console.log("Submitting fire vote to chaincode...");
    console.log("Fire Vote DTO being submitted:", JSON.stringify(signedDto, null, 2));
    const chainResponse = await submitToChaincode("CastVote", signedDto);

    if (!chainResponse.success) {
      console.error("Chaincode fire vote submission failed:", chainResponse.error);
      return res.status(500).json({
        error: `Fire vote casting failed: ${chainResponse.error}`
      });
    }

    console.log("Chaincode fire vote submission successful");

    // 5. Update local database if we have fire metadata
    const fireSlug = req.params.slug;
    const fire = dbService.getSubfire(fireSlug);
    if (fire) {
      // Optional: Record fire vote in a separate table or update fire vote count
      console.log("Fire vote recorded for fire:", fireSlug);
    }

    console.log("Fire vote cast successfully:", {
      fireSlug: fireSlug,
      entry: authDto.vote.entry,
      quantity: authDto.vote.quantity.toString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Fire vote casting error:", error);
    next(error);
  }
}
