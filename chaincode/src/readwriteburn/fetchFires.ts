import { GalaChainContext } from "@gala-chain/chaincode";

import { Fire } from "./Fire";
import { FetchFiresDto, FetchFiresResDto } from "./dtos";

export async function fetchFires(ctx: GalaChainContext, dto: FetchFiresDto) {
  // todo: implement
  return new FetchFiresResDto({
    results: [],
    nextPageBookmark: ""
  });
}
