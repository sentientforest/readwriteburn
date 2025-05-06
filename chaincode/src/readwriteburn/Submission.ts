import { ChainKey, ChainObject, IsUserRef, UserRef } from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class Submission extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBS";

  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  fire: string;

  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contributor?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  url?: string;

  constructor(
    fire: string,
    id: string,
    name: string,
    contributor?: string | undefined,
    description?: string | undefined,
    url?: string | undefined
  ) {
    super();
    this.fire = fire;
    this.id = id;
    this.name = name;
    this.contributor = contributor;
    this.description = description;
    this.url = url;
  }
}
