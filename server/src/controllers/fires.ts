import {
  DryRunDto,
  DryRunResultDto,
  FeeAuthorizationDto,
  FeeAuthorizationResDto,
  GalaChainResponse,
  createValidDTO,
  deserialize
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { NextFunction, Request, Response } from "express";
import assert from "node:assert";

import { dbService } from "../db";
import { FireDto, FireStarterDto } from "../types";
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
  return new BigNumber("10");
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
  const dto: FireStarterDto = deserialize(FireStarterDto, req.body);

  const { fire, fee } = dto;

  const feeQty = await fireStarterFee(fire);

  if (fee && fee.quantity.isLessThan(feeQty)) {
    const msg =
      `Chain requires fee of ${feeQty.toString()}, ` +
      `fire starter only authorized: ${fee.quantity.toString()}`;

    console.log(msg);
    return res.status(500).send(msg);
  }

  // todo: implement cross-channel fee authorization
  // const { authorization } = await authorizeFee(fee);

  try {
    const subfire = req.body as FireDto;
    const created = dbService.createSubfire(subfire);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function listFires(req: Request, res: Response, next: NextFunction) {
  try {
    const subfires = dbService.getAllSubfires();
    res.json(subfires);
  } catch (error) {
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
