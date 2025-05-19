import { ChainKey, ChainObject, IsUserRef, UserRef } from "@gala-chain/api";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class Fire extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBF";

  @ChainKey({ position: 0 })
  @IsString()
  public entryParent: string;

  @ChainKey({ position: 0 })
  @IsString()
  public slug: string;

  @IsNotEmpty()
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsUserRef()
  public starter: UserRef;

  constructor(
    entryParent: string,
    slug: string,
    name: string,
    starter: UserRef,
    description: string | undefined
  ) {
    super();
    this.entryParent = entryParent ?? "";
    this.slug = slug;
    this.name = name;
    this.starter = starter;
    this.description = description;
  }
}

export class FireStarter extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBFS";

  @ChainKey({ position: 0 })
  @IsUserRef()
  public identity: UserRef;

  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  public fire: string;

  constructor(identity: UserRef, fire: string) {
    super();
    this.identity = identity;
    this.fire = fire;
  }
}

export class FireAuthority extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBFA";

  @ChainKey({ position: 0 })
  @IsString()
  public fire: string;

  @ChainKey({ position: 1 })
  @IsUserRef()
  public identity: UserRef;

  constructor(fire: string, identity: UserRef) {
    super();
    this.fire = fire;
    this.identity = identity;
  }
}

export class FireModerator extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBFM";

  @ChainKey({ position: 0 })
  @IsString()
  public fire: string;

  @ChainKey({ position: 1 })
  @IsUserRef()
  public identity: UserRef;

  constructor(fire: string, identity: UserRef) {
    super();
    this.fire = fire;
    this.identity = identity;
  }
}
