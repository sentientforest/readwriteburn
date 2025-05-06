import { ValidationFailedError, asValidUserRef } from "@gala-chain/api";
import {
  GalaChainContext,
  UniqueTransactionService,
  authenticate,
  inverseTime,
  objectExists,
  putChainObject
} from "@gala-chain/chaincode";

import { Vote } from "./Vote";
import { CastVoteDto } from "./dtos";

export async function castVote(ctx: GalaChainContext, dto: CastVoteDto): Promise<void> {
  const { entry, quantity } = dto.vote;

  const existingEntry = await objectExists(ctx, entry);

  if (!existingEntry) {
    throw new ValidationFailedError(`Vote received for non-existent entry: ${entry}`);
  }

  const voteId = inverseTime(ctx);

  await UniqueTransactionService.ensureUniqueTransaction(ctx, dto.vote.uniqueKey);
  const voter = await authenticate(ctx, dto.vote);

  const vote = new Vote(entry, voteId, asValidUserRef(voter.alias), quantity);

  await putChainObject(ctx, vote);
}
