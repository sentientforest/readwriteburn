import { GalaChainContext } from "@gala-chain/chaincode";

import { Submission } from "./Submission";
import { FetchSubmissionsDto, FetchSubmissionsResDto } from "./dtos";

export async function fetchSubmissions(
  ctx: GalaChainContext,
  dto: FetchSubmissionsDto
): Promise<FetchSubmissionsResDto> {
  // todo: implement
  return new FetchSubmissionsResDto({
    results: [],
    nextPageBookmark: ""
  });
}
