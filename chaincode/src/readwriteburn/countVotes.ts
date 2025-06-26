import {
  GalaChainContext,
  ObjectNotFoundError,
  deleteChainObject,
  getObjectByKey,
  putChainObject
} from "@gala-chain/chaincode";
import BigNumber from "bignumber.js";

import { Vote } from "./api/Vote";
import { VoteCount } from "./api/VoteCount";
import { VoteRanking } from "./api/VoteRanking";
import { VoterReceipt } from "./api/VoterReceipt";
import { CountVotesDto } from "./api/dtos";

/**
 * Process and aggregate individual votes into ranking data
 *
 * This function performs the critical vote counting operation by:
 * 1. Processing each vote ID to retrieve the Vote object
 * 2. Creating or updating VoteCount aggregates for each voted entry
 * 3. Updating VoteRanking objects for efficient leaderboard queries
 * 4. Creating VoterReceipt records for audit trails
 * 5. Deleting processed Vote objects to prevent double-counting
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Vote counting parameters including list of vote IDs to process
 * @returns Promise that resolves when all votes are successfully counted
 *
 * @throws {ObjectNotFoundError} When a vote ID does not correspond to an existing Vote
 *
 * @remarks
 * This function can process up to 1000 votes per transaction. The ranking system
 * uses inverse time keys where higher vote totals receive better (lower) ranking positions.
 *
 * @example
 * ```typescript
 * await countVotes(ctx, {
 *   votes: ["vote-key-1", "vote-key-2", "vote-key-3"],
 *   uniqueKey: "unique-count-key"
 * });
 * ```
 */
export async function countVotes(
  ctx: GalaChainContext,
  dto: CountVotesDto
): Promise<void> {
  for (const id of dto.votes) {
    const vote: Vote = await getObjectByKey(ctx, Vote, id);

    const countKey = VoteCount.getCompositeKeyFromParts(VoteCount.INDEX_KEY, [
      vote.entryType,
      vote.entryParent,
      vote.entry
    ]);

    const count: VoteCount = await getObjectByKey(ctx, VoteCount, countKey).catch((e) => {
      if (e instanceof ObjectNotFoundError) {
        return new VoteCount(
          vote.entryType,
          vote.entryParent,
          vote.entry,
          new BigNumber("0")
        );
      } else {
        throw e;
      }
    });

    count.quantity = count.quantity.plus(vote.quantity);

    if (count.ranking) {
      const previousRanking = await getObjectByKey(ctx, VoteRanking, count.ranking);
      deleteChainObject(ctx, previousRanking);
    }

    const ranking: VoteRanking = new VoteRanking(
      vote.entryType,
      vote.entryParent,
      count.quantity,
      vote.entry
    );
    count.ranking = ranking.getCompositeKey();

    const receipt = new VoterReceipt(vote.voter, vote.getCompositeKey(), vote.quantity);

    await putChainObject(ctx, count);
    await putChainObject(ctx, ranking);
    await putChainObject(ctx, receipt);
    await deleteChainObject(ctx, vote);
  }
}
