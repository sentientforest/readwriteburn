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

export class Vote extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBV";

  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  fire: string;

  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  submission: string;

  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ChainKey({ position: 3 })
  @IsUserRef()
  voter: UserRef;

  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  constructor(submission: string, id: string, voter: UserRef, quantity: BigNumber) {
    super();
    this.submission = submission;
    this.id = id;
    this.voter = voter;
    this.quantity = quantity;
  }
}
