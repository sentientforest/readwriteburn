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
import { Submission } from "./api/Submission";
import {
  CastVoteDto,
  ContributeSubmissionDto,
  CountVotesDto,
  FetchFiresDto,
  FetchFiresResDto,
  FetchSubmissionsDto,
  FetchSubmissionsResDto,
  FetchVotesDto,
  FetchVotesResDto,
  FireDto,
  FireResDto,
  FireStarterDto
} from "./api/dtos";
import { castVote } from "./castVote";
import { contributeSubmission } from "./contributeSubmission";
import { countVotes } from "./countVotes";
import { fetchFires } from "./fetchFires";
import { fetchSubmissions } from "./fetchSubmissions";
import { fetchVotes } from "./fetchVotes";
import { fireStarter } from "./fireStarter";

/**
 * ReadWriteBurn Smart Contract for GalaChain
 *
 * A decentralized application contract that allows users to burn $GALA tokens
 * to upvote content submissions within community-driven "fires" (topics).
 *
 * Core functionality includes:
 * - Creating community fires (topics) with moderation controls
 * - Contributing submissions to fires
 * - Voting on submissions by burning GALA tokens
 * - Tracking vote counts and rankings
 *
 * @extends GalaContract
 */
export class ReadWriteBurnContract extends GalaContract {
  /**
   * Initialize the ReadWriteBurn contract
   */
  constructor() {
    super("ReadWriteBurn", version);
  }

  /**
   * Create a new community fire (topic) with moderation controls
   *
   * @param ctx - The GalaChain transaction context
   * @param dto - Fire creation parameters including metadata, authorities, and moderators
   * @returns Promise resolving to the created fire with associated metadata
   *
   * @remarks
   * This is a Submit transaction that requires fee payment and creates:
   * - A Fire object with the specified metadata
   * - FireStarter association linking the creator to the fire
   * - FireAuthority entries for designated authorities
   * - FireModerator entries for designated moderators
   */
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

  /**
   * Retrieve fires (topics) with pagination support
   *
   * @param ctx - The GalaChain transaction context
   * @param dto - Query parameters including optional slug filter, bookmark, and limit
   * @returns Promise resolving to paginated list of fires
   *
   * @remarks
   * This is an unsigned evaluate operation that supports:
   * - Filtering by fire slug
   * - Pagination via bookmark and limit parameters
   * - Read-only access without transaction fees
   */
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

  /**
   * Submit content to a fire (topic)
   *
   * @param ctx - The GalaChain transaction context
   * @param dto - Submission data including content metadata and target fire
   * @returns Promise resolving to the created submission object
   *
   * @remarks
   * This is a Submit transaction that:
   * - Validates the target fire exists
   * - Creates a new Submission with unique timestamp-based ID
   * - Supports nested submissions (comments) via entryParent
   * - Requires fee payment for submission creation
   */
  @Submit({
    in: ContributeSubmissionDto,
    out: Submission
  })
  public async ContributeSubmission(
    ctx: GalaChainContext,
    dto: ContributeSubmissionDto
  ): Promise<Submission> {
    return contributeSubmission(ctx, dto);
  }

  /**
   * Retrieve submissions from fires with pagination support
   *
   * @param ctx - The GalaChain transaction context
   * @param dto - Query parameters including fire/parent filters, bookmark, and limit
   * @returns Promise resolving to paginated list of submissions
   *
   * @remarks
   * This is an unsigned evaluate operation that supports:
   * - Filtering by fire (topic) and/or entry parent (for nested submissions)
   * - Pagination via bookmark and limit parameters
   * - Read-only access without transaction fees
   */
  @UnsignedEvaluate({
    in: FetchSubmissionsDto,
    out: FetchSubmissionsResDto
  })
  public async FetchSubmissions(
    ctx: GalaChainContext,
    dto: FetchSubmissionsDto
  ): Promise<FetchSubmissionsResDto> {
    return fetchSubmissions(ctx, dto);
  }

  /**
   * Cast a vote on a submission by burning GALA tokens
   *
   * @param ctx - The GalaChain transaction context
   * @param dto - Vote data including target submission and GALA quantity to burn
   * @returns Promise that resolves when vote is successfully cast
   *
   * @remarks
   * This is a Submit transaction that:
   * - Burns the specified quantity of GALA tokens as vote weight
   * - Creates a Vote object linking the voter to the submission
   * - Validates the target submission exists
   * - Requires proper authentication and fee payment
   */
  @Submit({
    in: CastVoteDto
  })
  public async CastVote(ctx: GalaChainContext, dto: CastVoteDto): Promise<void> {
    return castVote(ctx, dto);
  }

  /**
   * Process and aggregate votes for ranking calculations
   *
   * @param ctx - The GalaChain transaction context
   * @param dto - Vote counting parameters including list of vote IDs to process
   * @returns Promise that resolves when votes are successfully counted
   *
   * @remarks
   * This is a Submit transaction that:
   * - Aggregates individual votes into VoteCount objects
   * - Updates submission rankings based on total vote weight
   * - Creates VoterReceipt objects for vote tracking
   * - Deletes processed Vote objects to prevent double-counting
   * - Handles up to 1000 votes per transaction
   */
  @Submit({
    in: CountVotesDto
  })
  public async CountVotes(ctx: GalaChainContext, dto: CountVotesDto): Promise<void> {
    return countVotes(ctx, dto);
  }

  /**
   * Retrieve votes with pagination support
   *
   * @param ctx - The GalaChain transaction context
   * @param dto - Query parameters including fire/submission filters, bookmark, and limit
   * @returns Promise resolving to paginated list of votes with metadata
   *
   * @remarks
   * This is an unsigned evaluate operation that supports:
   * - Filtering by fire (topic) and/or specific submission
   * - Pagination via bookmark and limit parameters
   * - Returns vote objects with their chain keys for reference
   * - Read-only access without transaction fees
   */
  @UnsignedEvaluate({
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
