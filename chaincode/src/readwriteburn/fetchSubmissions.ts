import {
  GalaChainContext,
  getObjectsByPartialCompositeKeyWithPagination,
  takeUntilUndefined
} from "@gala-chain/chaincode";

import { Submission } from "./api/Submission";
import { FetchSubmissionsDto, FetchSubmissionsResDto } from "./api/dtos";

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
