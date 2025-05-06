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
  id: string;

  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  constructor(quantity: BigNumber) {
    super();
    this.id = generateInverseTimeKey(quantity.toNumber());
    this.quantity = quantity;
  }
}
