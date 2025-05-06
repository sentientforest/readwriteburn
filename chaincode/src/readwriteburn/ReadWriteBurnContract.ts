import {
  Evaluate,
  GalaChainContext,
  GalaContract,
  GalaTransaction,
  SUBMIT,
  Submit
} from "@gala-chain/chaincode";

import { version } from "../../package.json";
import { castVote } from "./castVote";
import { contributeSubmission } from "./contributeSubmission";
import { countVotes } from "./countVotes";
import {
  CastVoteDto,
  ContributeSubmissionDto,
  CountVotesDto,
  FetchVotesDto,
  FetchVotesResDto,
  FireStarterDto
} from "./dtos";
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

  @Submit({
    in: CastVoteDto
  })
  public async CastVote(ctx: GalaChainContext, dto: CastVoteDto): Promise<void> {
    return castVote(ctx, dto);
  }

  @Submit({
    in: CountVotesDto
  })
  public async CountVotes(ctx: GalaChainContext, dto: CountVotesDto): Promise<void> {
    return countVotes(ctx, dto);
  }
}
