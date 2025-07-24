import {
  GalaChainContext,
  getObjectsByPartialCompositeKeyWithPagination,
  takeUntilUndefined
} from "@gala-chain/chaincode";

import { Fire } from "./api/Fire";
import { FetchFiresDto, FetchFiresResDto } from "./api/dtos";

/**
 * Retrieve fires (community topics) with pagination support
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Query parameters including optional slug filter, bookmark, and limit
 * @returns Promise resolving to paginated list of fires
 *
 * @remarks
 * Supports:
 * - Filtering by fire slug
 * - Pagination via bookmark and limit parameters
 *
 */
export async function fetchFires(ctx: GalaChainContext, dto: FetchFiresDto) {
  const query = takeUntilUndefined(dto.slug);

  const { results, metadata } = await getObjectsByPartialCompositeKeyWithPagination(
    ctx,
    Fire.INDEX_KEY,
    query,
    Fire,
    dto.bookmark,
    dto.limit
  );

  return new FetchFiresResDto({
    results,
    nextPageBookmark: metadata.bookmark
  });
}
