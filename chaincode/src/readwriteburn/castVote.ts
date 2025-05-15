import { ChainObject, ValidationFailedError, asValidUserRef } from "@gala-chain/api";
import {
  GalaChainContext,
  UniqueTransactionService,
  authenticate,
  getObjectByKey,
  inverseTime,
  putChainObject
} from "@gala-chain/chaincode";

import { Vote } from "./Vote";
import { CastVoteDto } from "./dtos";
import { IEntry, RWB_TYPES } from "./types";

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
    existingEntry.entryParent,
    entry,
    voteId,
    asValidUserRef(voter.alias),
    quantity
  );

  await putChainObject(ctx, vote);
}
