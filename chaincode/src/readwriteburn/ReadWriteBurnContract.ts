import {
  Evaluate,
  GalaChainContext,
  GalaContract,
  GalaTransaction,
  SUBMIT,
  Submit
} from "@gala-chain/chaincode";

import { version } from "../../package.json";
import { FireStarterDto } from "./dtos";
import { fireStarter } from "./fireStarter";

export class ReadWriteBurnContract extends GalaContract {
  constructor() {
    super("ReadWriteBurn", version);
  }

  @GalaTransaction({
    type: SUBMIT,
    verifySignature: true,
    enforceUniqueKey: true,
    in: FireStarterDto
  })
  public async FireStarter(ctx: GalaChainContext, dto: FireStarterDto): Promise<void> {
    return fireStarter(ctx, dto);
  }
}
