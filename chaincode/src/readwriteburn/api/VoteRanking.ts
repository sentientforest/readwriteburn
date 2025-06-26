import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainKey,
  ChainObject
} from "@gala-chain/api";
import { generateInverseTimeKey } from "@gala-chain/chaincode";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * VoteRanking enables efficient sorting of entries by their voting weight
 *
 * VoteRanking objects use an inverse-time-based key generation strategy
 * where higher vote quantities receive lower (earlier) timestamps, enabling
 * natural sorting by ranking. This allows for efficient queries to retrieve
 * top-voted entries without complex sorting operations.
 *
 * @extends ChainObject
 */
export class VoteRanking extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBVC";

  /** Type of entry being ranked (e.g., submission, fire) */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  entryType: string;

  /** Parent entry key for hierarchical organization */
  @ChainKey({ position: 1 })
  @IsString()
  entryParent: string;

  /** Inverse-time-based identifier for sorting (lower values = higher ranking) */
  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  id: string;

  /** Total quantity of GALA tokens burned for this entry */
  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  /** Composite key of the entry being ranked */
  @IsString()
  entry: string;

  /**
   * Create a new VoteRanking instance
   *
   * @param entryType - Type of entry being ranked
   * @param entryParent - Parent entry key for hierarchical organization
   * @param quantity - Total quantity of GALA tokens burned for ranking
   * @param entry - Composite key of the entry being ranked
   *
   * @remarks
   * The id is automatically generated using an inverse time key based on the
   * quantity, ensuring that higher vote totals receive better (lower) ranking positions.
   */
  constructor(
    entryType: string,
    entryParent: string,
    quantity: BigNumber,
    entry: string
  ) {
    super();
    this.entryType = entryType;
    this.entryParent = entryParent;
    this.id = generateInverseTimeKey(quantity.toNumber());
    this.quantity = quantity;
    this.entry = entry;
  }
}
