import { ChainObject, UserAlias } from "@gala-chain/api";
import {
  GalaChainContext,
  getObjectByKey,
  getObjectsByPartialCompositeKey,
  getObjectsByPartialCompositeKeyWithPagination,
  takeUntilUndefined
} from "@gala-chain/chaincode";

import { Fire, FireAuthority, FireModerator, FireStarter, FetchFiresDto, FetchFiresResDto, FireResDto } from "./api";

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

  const responses = await Promise.all(results.map((fire) => fetchFireMetadata(ctx, fire)));

  return new FetchFiresResDto({
    results: responses,
    nextPageBookmark: metadata.bookmark
  });
}

export async function fetchFireMetadata(ctx: GalaChainContext, metadata: Fire): Promise<FireResDto> {
  const fireKey = metadata.getCompositeKey();

  const starter: FireStarter = await getObjectByKey(
    ctx,
    FireStarter,
    ChainObject.getCompositeKeyFromParts(FireStarter.INDEX_KEY, [metadata.starter, fireKey])
  );

  const authorities = await getObjectsByPartialCompositeKey(
    ctx,
    FireAuthority.INDEX_KEY,
    [fireKey],
    FireAuthority
  );

  const moderators = await getObjectsByPartialCompositeKey(
    ctx,
    FireModerator.INDEX_KEY,
    [fireKey],
    FireModerator
  );

  const res = new FireResDto({ fireKey, metadata, starter, authorities, moderators });

  return res;
}