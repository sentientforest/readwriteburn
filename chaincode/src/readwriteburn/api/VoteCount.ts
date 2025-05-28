import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainKey,
  ChainObject
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class VoteCount extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBVC";

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

  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  ranking?: string;

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
