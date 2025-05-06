import {
  Evaluate,
  GalaChainContext,
  GalaContract,
  GalaTransaction,
  SUBMIT,
  Submit
} from "@gala-chain/chaincode";

import { version } from "../../package.json";
import { contributeSubmission } from "./contributeSubmission";
import { ContributeSubmissionDto, FireStarterDto } from "./dtos";
import { fireStarter } from "./fireStarter";

export class ReadWriteBurnContract extends GalaContract {
  constructor() {
    super("ReadWriteBurn", version);
  }

  @Submit({
    in: FireStarterDto
  })
  public async FireStarter(ctx: GalaChainContext, dto: FireStarterDto): Promise<void> {
    return fireStarter(ctx, dto);
  }

  @Submit({
    in: ContributeSubmissionDto
  })
  public async ContributeSubmission(ctx: GalaChainContext, dto: ContributeSubmissionDto): Promise<void> {
    return contributeSubmission(ctx, dto);
  }
}
