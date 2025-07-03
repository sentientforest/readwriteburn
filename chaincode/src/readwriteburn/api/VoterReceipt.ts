import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainKey,
  ChainObject,
  IsUserAlias,
  UserAlias
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * VoterReceipt provides a permanent record of a user's voting activity
 *
 * VoterReceipt objects are created after votes are processed and counted,
 * serving as immutable proof that a user burned a specific quantity of
 * GALA tokens to support a particular entry. This enables user vote
 * history queries and prevents double-counting of votes.
 *
 * @extends ChainObject
 */
export class VoterReceipt extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBVR";

  /** User reference of the voter */
  @ChainKey({ position: 0 })
  @IsUserAlias()
  voter: UserAlias;

  /** Reference to the original vote's composite key */
  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  id: string;

  /** Quantity of GALA tokens burned in the original vote */
  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  /**
   * Create a new VoterReceipt instance
   *
   * @param voter - User reference of the voter
   * @param id - Reference to the original vote's composite key
   * @param quantity - Quantity of GALA tokens burned in the original vote
   */
  constructor(voter: UserAlias, id: string, quantity: BigNumber) {
    super();
    this.voter = voter;
    this.id = id;
    this.quantity = quantity;
  }
}
