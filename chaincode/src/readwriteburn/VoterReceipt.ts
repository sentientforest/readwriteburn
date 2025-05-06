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

export class VoterReceipt extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBVR";

  @ChainKey({ position: 0 })
  @IsUserRef()
  voter: UserRef;

  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  id: string;

  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  constructor(voter: UserRef, id: string, quantity: BigNumber) {
    super();
    this.voter = voter;
    this.id = id;
    this.quantity = quantity;
  }
}
