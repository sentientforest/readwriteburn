import { GalaChainContext, creditFeeBalance, galaFeeGate } from "@gala-chain/chaincode";

import { FireStarterDto } from "./api/dtos";

/**
 * Enumeration of fee gate codes for ReadWriteBurn operations
 *
 * These codes identify different types of fee-paying operations
 * within the ReadWriteBurn contract system.
 */
export enum ReadWriteBurnFeeGateCodes {
  /** Default/unknown fee gate code */
  Unknown = "",
  /** Fee gate code for fire creation operations */
  FireStarter = "FireStarter"
}

/**
 * Process fee payments for fire creation operations
 *
 * This function handles the two-step fee payment process for fire creation:
 * 1. Credits the user's fee balance based on the co-signed FeeVerificationDto
 * 2. Debits the fee via the standard GALA fee gate mechanism
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Fire creation DTO containing the co-signed fee verification
 * @returns Promise that resolves when fee processing is complete
 *
 * @remarks
 * The FireStarterDto must contain a FeeVerificationDto that is co-signed
 * by an authorized fee verifier alongside the FireDto signed by the fire
 * starter. This ensures atomic processing of both fee credit and debit
 * operations without requiring separate transaction calls.
 *
 * @throws Various fee-related errors if verification fails or insufficient balance
 *
 * @example
 * ```typescript
 * await fireStarterFeeGate(ctx, {
 *   fire: signedFireDto,
 *   fee: coSignedFeeVerificationDto,
 *   uniqueKey: "unique-tx-key"
 * });
 * ```
 */
export async function fireStarterFeeGate(ctx: GalaChainContext, dto: FireStarterDto) {
  const { fee } = dto;

  // FireStarterDto should contain FeeVerificationDto co-signed by fee verifier
  // alongside FireDto signed by the FireStarter identity.
  // We credit the fee balance and debit via the standard fee gate to atomically
  // process two steps in one, avoiding the need for a separate `creditFeeBalance` call.
  // To continue supporting fee exemptions and dry run fee estimation, we make the fee
  // optional in the DTO and defer enforcement to the `galaFeeGate` rather than in DTO validation.
  if (fee !== undefined) {
    await creditFeeBalance(ctx, fee);
  }

  return galaFeeGate(ctx, { feeCode: ReadWriteBurnFeeGateCodes.FireStarter });
}
