import { GalaChainContext, creditFeeBalance, galaFeeGate } from "@gala-chain/chaincode";

import { FireStarterDto } from "./api/dtos";

export enum ReadWriteBurnFeeGateCodes {
  Unknown = "",
  FireStarter = "FireStarter"
}

export async function fireStarterFeeGate(ctx: GalaChainContext, dto: FireStarterDto) {
  const { fee } = dto;

  // FireStarterDto should contain FeeVerificationDto co-signed by fee verifier
  // alongside FireDto signed by the FireStarter identity.
  // We credit the fee balance and debit via the standard fee gate to atomically
  // process two steps in one, avoiding the need for a separate `creditFeeBalance` call.
  await creditFeeBalance(ctx, fee);

  return galaFeeGate(ctx, { feeCode: ReadWriteBurnFeeGateCodes.FireStarter });
}
