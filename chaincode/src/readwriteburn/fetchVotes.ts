import {
  GalaChainContext,
  getObjectsByPartialCompositeKeyWithPagination,
  takeUntilUndefined
} from "@gala-chain/chaincode";
import { plainToInstance } from "class-transformer";

import { Vote } from "./api/Vote";
import { FetchVotesDto, FetchVotesResDto, VoteResult } from "./api/dtos";

/**
 * Retrieve votes with pagination support
 *
 * This function queries vote data by:
 * 1. Building partial composite key queries from fire and/or submission filters
 * 2. Executing paginated queries against Vote objects
 * 3. Mapping results to VoteResult objects with chain keys
 * 4. Returning paginated response with bookmark for continuation
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Query parameters including optional filters, bookmark, and limit
 * @returns Promise resolving to paginated list of votes with metadata
 *
 * @remarks
 * Supports flexible querying:
 * - Filter by fire only: Returns all votes within that fire
 * - Filter by submission only: Returns all votes for that submission
 * - Both filters: Returns votes for a specific submission within a fire
 * - No filters: Returns all votes (use with caution due to volume)
 *
 * @example
 * ```typescript
 * // Get all votes for a specific submission
 * const result = await fetchVotes(ctx, {
 *   submission: "submission-key",
 *   limit: 100
 * });
 *
 * // Get all votes in a fire
 * const fireVotes = await fetchVotes(ctx, {
 *   fire: "fire-key",
 *   limit: 50
 * });
 * ```
 */
export async function fetchVotes(
  ctx: GalaChainContext,
  dto: FetchVotesDto
): Promise<FetchVotesResDto> {
  const { bookmark, limit } = dto;

  const attributes = takeUntilUndefined(dto.entryType, dto.fire, dto.submission);

  const votes = await getObjectsByPartialCompositeKeyWithPagination(
    ctx,
    Vote.INDEX_KEY,
    attributes,
    Vote,
    bookmark,
    limit || 100 // Default limit if not provided
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
