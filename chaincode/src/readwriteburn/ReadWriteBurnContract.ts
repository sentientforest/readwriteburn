import {
  Evaluate,
  GalaChainContext,
  GalaContract,
  GalaTransaction,
  SUBMIT,
  Submit,
  UnsignedEvaluate
} from "@gala-chain/chaincode";

import { version } from "../../package.json";
import { castVote } from "./castVote";
import { contributeSubmission } from "./contributeSubmission";
import { countVotes } from "./countVotes";
import {
  CastVoteDto,
  ContributeSubmissionDto,
  CountVotesDto,
  FetchFiresDto,
  FetchFiresResDto,
  FetchVotesDto,
  FetchVotesResDto,
  FireResDto,
  FireStarterDto
} from "./dtos";
import { fetchFires } from "./fetchFires";
import { fetchVotes } from "./fetchVotes";
import { fireStarter } from "./fireStarter";

export class ReadWriteBurnContract extends GalaContract {
  constructor() {
    super("ReadWriteBurn", version);
  }

  @Submit({
    in: FireStarterDto,
    out: FireResDto
  })
  public async FireStarter(
    ctx: GalaChainContext,
    dto: FireStarterDto
  ): Promise<FireResDto> {
    return fireStarter(ctx, dto);
  }

  @UnsignedEvaluate({
    in: FetchFiresDto,
    out: FetchFiresResDto
  })
  public async FetchFires(
    ctx: GalaChainContext,
    dto: FetchFiresDto
  ): Promise<FetchFiresResDto> {
    return fetchFires(ctx, dto);
  }

  @Submit({
    in: ContributeSubmissionDto
  })
  public async ContributeSubmission(
    ctx: GalaChainContext,
    dto: ContributeSubmissionDto
  ): Promise<void> {
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

  @Evaluate({
    in: FetchVotesDto,
    out: FetchVotesResDto
  })
  public async FetchVotes(
    ctx: GalaChainContext,
    dto: FetchVotesDto
  ): Promise<FetchVotesResDto> {
    return fetchVotes(ctx, dto);
  }
}
