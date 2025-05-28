import {
  GalaChainContext,
  getObjectsByPartialCompositeKeyWithPagination,
  takeUntilUndefined
} from "@gala-chain/chaincode";
import { plainToInstance } from "class-transformer";

import { Vote } from "./api/Vote";
import { FetchVotesDto, FetchVotesResDto, VoteResult } from "./api/dtos";

export async function fetchVotes(
  ctx: GalaChainContext,
  dto: FetchVotesDto
): Promise<FetchVotesResDto> {
  const { bookmark, limit } = dto;

  const attributes = takeUntilUndefined(dto.fire, dto.submission);

  const votes = await getObjectsByPartialCompositeKeyWithPagination(
    ctx,
    Vote.INDEX_KEY,
    attributes,
    Vote,
    bookmark,
    limit
  );

  if (!votes || !Array.isArray(votes.results)) {
    return plainToInstance(FetchVotesResDto, { results: [], nextPageBookmark: "" });
  }

  const results: VoteResult[] = votes.results.map((vote: Vote) => {
    return plainToInstance(VoteResult, {
      key: vote.getCompositeKey(),
      value: vote
    });
  });

  const nextPageBookmark = votes.metadata.bookmark;

  const response = plainToInstance(FetchVotesResDto, { results, nextPageBookmark });

  return response;
}
