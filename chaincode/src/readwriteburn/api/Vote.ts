import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainKey,
  ChainObject,
  IsUserRef,
  UserRef
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * Vote represents a user's token burn to support a submission
 *
 * Votes are created when users burn GALA tokens to express support for submissions.
 * Each vote records the specific quantity burned and links to the voted entry.
 * Votes are temporary objects that get processed into VoteCount aggregates
 * and VoterReceipt records during the counting phase.
 *
 * @extends ChainObject
 */
export class Vote extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBV";

  /** Type of entry being voted on (e.g., submission, fire) */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  entryType: string;

  /** Parent entry key for hierarchical organization */
  @ChainKey({ position: 1 })
  @IsString()
  entryParent: string;

  /** Composite key of the entry being voted on */
  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  entry: string;

  /** Unique identifier for this vote (typically inverse timestamp) */
  @ChainKey({ position: 3 })
  @IsNotEmpty()
  @IsString()
  id: string;

  /** User reference of the voter */
  @ChainKey({ position: 4 })
  @IsUserRef()
  voter: UserRef;

  /** Amount of GALA tokens burned for this vote */
  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  /**
   * Create a new Vote instance
   *
   * @param entryType - Type of entry being voted on
   * @param entryParent - Parent entry key for hierarchical organization
   * @param entry - Composite key of the entry being voted on
   * @param id - Unique identifier for this vote
   * @param voter - User reference of the voter
   * @param quantity - Amount of GALA tokens burned for this vote
   */
  constructor(
    entryType: string,
    entryParent: string,
    entry: string,
    id: string,
    voter: UserRef,
    quantity: BigNumber
  ) {
    super();
    this.entryType = entryType;
    this.entryParent = entryParent;
    this.entry = entry;
    this.id = id;
    this.voter = voter;
    this.quantity = quantity;
  }
}
