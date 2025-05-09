import { BigNumberIsPositive, BigNumberProperty, ChainKey, ChainObject } from "@gala-chain/api";
import { generateInverseTimeKey } from "@gala-chain/chaincode";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class VoteRanking extends ChainObject {
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
  id: string;

  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  @IsString()
  entry: string;

  constructor(entryType: string, entryParent: string, quantity: BigNumber, entry: string) {
    super();
    this.entryType = entryType;
    this.entryParent = entryParent;
    this.id = generateInverseTimeKey(quantity.toNumber());
    this.quantity = quantity;
    this.entry = entry;
  }
}
