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
  entryType: string;

  @ChainKey({ position: 1 })
  @IsString()
  entryParent: string;

  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  entry: string;

  @ChainKey({ position: 3 })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ChainKey({ position: 4 })
  @IsUserRef()
  voter: UserRef;

  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

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
