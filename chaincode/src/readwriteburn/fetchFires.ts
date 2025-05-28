import { GalaChainContext } from "@gala-chain/chaincode";

import { Fire } from "./api/Fire";
import { FetchFiresDto, FetchFiresResDto } from "./api/dtos";

export async function fetchFires(ctx: GalaChainContext, dto: FetchFiresDto) {
  // todo: implement
  return new FetchFiresResDto({
    results: [],
    nextPageBookmark: ""
  });
}
