import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainKey,
  ChainObject
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * VoteCount aggregates the total voting weight for a specific entry
 *
 * VoteCount objects are created and updated during the vote counting process,
 * accumulating the total GALA tokens burned in support of a particular entry.
 * Each VoteCount maintains a reference to its corresponding VoteRanking object
 * for efficient ranking queries.
 *
 * @extends ChainObject
 */
export class VoteCount extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBVC";

  /** Type of entry being counted (e.g., submission, fire) */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  entryType: string;

  /** Parent entry key for hierarchical organization */
  @ChainKey({ position: 1 })
  @IsString()
  entryParent: string;

  /** Composite key of the entry being counted */
  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  entry: string;

  /** Total quantity of GALA tokens burned for this entry */
  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  /** Optional reference to the corresponding VoteRanking object */
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  ranking?: string;

  /**
   * Create a new VoteCount instance
   *
   * @param entryType - Type of entry being counted
   * @param entryParent - Parent entry key for hierarchical organization
   * @param entry - Composite key of the entry being counted
   * @param quantity - Total quantity of GALA tokens burned
   * @param ranking - Optional reference to the corresponding VoteRanking object
   */
  constructor(
    entryType: string,
    entryParent: string,
    entry: string,
    quantity: BigNumber,
    ranking?: string
  ) {
    super();
    this.entryType = entryType;
    this.entryParent = entryParent;
    this.entry = entry;
    this.quantity = quantity;
    this.ranking = ranking;
  }
}
