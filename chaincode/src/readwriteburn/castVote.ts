import {
  ChainObject,
  ValidationFailedError,
  asValidUserAlias,
  asValidUserRef
} from "@gala-chain/api";
import {
  GalaChainContext,
  UniqueTransactionService,
  authenticate,
  getObjectByKey,
  inverseTime,
  putChainObject
} from "@gala-chain/chaincode";

import { Vote } from "./api/Vote";
import { CastVoteDto } from "./api/dtos";
import { IEntry, RWB_TYPES } from "./api/types";

/**
 * Cast a vote by burning GALA tokens in support of an entry
 *
 * This function processes voting transactions by:
 * 1. Validating the target entry exists and entry type is supported
 * 2. Ensuring transaction uniqueness and authenticating the voter
 * 3. Creating a Vote object with the burned token quantity
 * 4. Storing the vote on-chain for later aggregation
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Vote data including target entry and GALA quantity to burn
 * @returns Promise that resolves when vote is successfully recorded
 *
 * @throws {ValidationFailedError} When entry type is not supported or validation fails
 * @throws {ObjectNotFoundError} When the target entry does not exist
 *
 * @example
 * ```typescript
 * await castVote(ctx, {
 *   vote: {
 *     entryType: "RWBS",
 *     entry: "submission-key",
 *     quantity: new BigNumber("100"),
 *     uniqueKey: "unique-vote-key"
 *   },
 *   fee: feeVerificationDto,
 *   uniqueKey: "unique-tx-key"
 * });
 * ```
 */
export async function castVote(ctx: GalaChainContext, dto: CastVoteDto): Promise<void> {
  const { entry, entryType, quantity } = dto.vote;

  if (RWB_TYPES[entryType] === undefined)
    throw new ValidationFailedError(`VoteDto missing entryType`);

  const existingEntry: ChainObject & IEntry = await getObjectByKey(
    ctx,
    RWB_TYPES[entryType],
    entry
  );

  await UniqueTransactionService.ensureUniqueTransaction(ctx, dto.vote.uniqueKey);
  const voter = await authenticate(ctx, dto.vote);

  const voteId = inverseTime(ctx);

  const vote = new Vote(
    entryType,
    existingEntry.entryParent ?? entry,
    entry,
    voteId,
    asValidUserAlias(voter.alias),
    quantity
  );

  await putChainObject(ctx, vote);
}
