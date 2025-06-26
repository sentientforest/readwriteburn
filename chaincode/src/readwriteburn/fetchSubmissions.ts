import {
  GalaChainContext,
  getObjectsByPartialCompositeKeyWithPagination,
  takeUntilUndefined
} from "@gala-chain/chaincode";

import { Submission } from "./api/Submission";
import { FetchSubmissionsDto, FetchSubmissionsResDto } from "./api/dtos";

/**
 * Retrieve submissions from fires with pagination support
 *
 * This function queries submission data by:
 * 1. Building a partial composite key query from fire and/or entryParent filters
 * 2. Executing paginated queries against the chain state
 * 3. Returning results with bookmark for continued pagination
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Query parameters including optional filters, bookmark, and limit
 * @returns Promise resolving to paginated list of submissions
 *
 * @remarks
 * Supports flexible querying:
 * - Filter by fire only: Returns all submissions in that fire
 * - Filter by fire + entryParent: Returns submissions/comments under that parent
 * - No filters: Returns all submissions (use with caution due to volume)
 *
 * @example
 * ```typescript
 * // Get all top-level submissions in a fire
 * const result = await fetchSubmissions(ctx, {
 *   fire: "fire-key",
 *   entryParent: "fire-key", // Same as fire for top-level
 *   limit: 20
 * });
 *
 * // Get comments on a specific submission
 * const comments = await fetchSubmissions(ctx, {
 *   fire: "fire-key",
 *   entryParent: "submission-key",
 *   limit: 50
 * });
 * ```
 */
export async function fetchSubmissions(
  ctx: GalaChainContext,
  dto: FetchSubmissionsDto
): Promise<FetchSubmissionsResDto> {
  const query = takeUntilUndefined(dto.fire, dto.entryParent);

  const { results, metadata } = await getObjectsByPartialCompositeKeyWithPagination(
    ctx,
    Submission.INDEX_KEY,
    query,
    Submission,
    dto.bookmark,
    dto.limit
  );

  return new FetchSubmissionsResDto({
    results,
    nextPageBookmark: metadata.bookmark
  });
}
