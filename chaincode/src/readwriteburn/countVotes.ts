import {
  GalaChainContext,
  ObjectNotFoundError,
  deleteChainObject,
  getObjectByKey,
  putChainObject
} from "@gala-chain/chaincode";
import BigNumber from "bignumber.js";

import { Vote } from "./Vote";
import { VoteCount } from "./VoteCount";
import { VoteRanking } from "./VoteRanking";
import { VoterReceipt } from "./VoterReceipt";
import { CountVotesDto } from "./dtos";

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
