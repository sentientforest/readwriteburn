import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainCallDTO,
  ChainKey,
  ChainObject,
  FeeAuthorizationDto,
  FeeVerificationDto,
  IsUserAlias,
  IsUserRef,
  SubmitCallDTO,
  UserAlias
} from "@gala-chain/api";
import type { UserRef } from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude, Type } from "class-transformer";
import { ArrayMinSize, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";

export interface AssociativeId {
  id: string;
  quantity?: number;
}

export interface AssociativeEntity extends AssociativeId {
  name: string;
  description?: string;
}

export interface TokenInstanceKey {
  collection: string;
  category: string;
  type: string;
  additionalKey: string;
  instance: string;
}

export interface IFireDto {
  slug: string;
  name: string;
  starter: UserRef;
  description?: string;
  authorities?: UserRef[];
  moderators?: UserRef[];
  uniqueKey?: string;
}

export class FireDto extends ChainCallDTO {
  @IsNotEmpty()
  @IsString()
  public slug: string;

  @IsNotEmpty()
  @IsString()
  public name: string;

  @IsUserRef()
  public starter: UserRef;

  @IsOptional()
  @IsString()
  public description?: string;

  @ArrayMinSize(0)
  @IsUserRef({ each: true })
  public authorities: UserRef[];

  @ArrayMinSize(0)
  @IsUserRef({ each: true })
  public moderators: UserRef[];

  constructor(data: IFireDto) {
    super();
    this.slug = data?.slug ?? "none";
    this.name = data?.name ?? "";
    this.starter = data?.starter ?? "";
    this.description = data?.description ?? "";
    this.authorities = data?.authorities ?? [];
    this.moderators = data?.moderators ?? [];
    this.uniqueKey = data?.uniqueKey ?? "";
  }
}

export interface IFireStarterDto {
  fire: FireDto;
  fee?: FeeVerificationDto;
  uniqueKey: string;
}

export class FireStarterDto extends SubmitCallDTO {
  @ValidateNested()
  @Type(() => FireDto)
  public fire: FireDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeVerificationDto)
  public fee?: FeeVerificationDto;

  constructor(data: IFireStarterDto) {
    super();
    this.fire = data?.fire;
    if (data?.fee) {
      this.fee = data?.fee;
    }
    this.uniqueKey = data?.uniqueKey;
  }
}

export class FireStarterAuthorizationDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => FireDto)
  public fire: FireDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee?: FeeAuthorizationDto;
}

export interface ISubmissionDto {
  name: string;
  fire: string;
  entryParent: string;
  contributor?: string;
  description?: string;
  url?: string;
  uniqueKey?: string;
}

export class SubmissionDto extends ChainCallDTO {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  fire: string;

  @IsString()
  entryParent: string;

  @IsOptional()
  @IsString()
  contributor?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  url?: string;

  constructor(data: ISubmissionDto) {
    super();
    this.name = data?.name;
    this.fire = data?.fire;
    this.entryParent = data?.entryParent || "";
    this.contributor = data?.contributor;
    this.description = data?.description;
    this.url = data?.url;
    this.uniqueKey = data?.uniqueKey;
  }
}

export interface SubmissionResDto {
  id: number;
  name: string;
  contributor: string;
  description: string;
  url: string;
  votes: number;
  hash_verified?: boolean;
  moderation_status?: "active" | "flagged" | "removed" | "modified";
  content_hash?: string;
  content_timestamp?: number;
  created_at?: string;
}

export interface IContributeSubmissionDto {
  submission: SubmissionDto;
  fee?: FeeVerificationDto;
  uniqueKey: string;
}

export class ContributeSubmissionDto extends SubmitCallDTO {
  @ValidateNested()
  @Type(() => SubmissionDto)
  submission: SubmissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeVerificationDto)
  fee?: FeeVerificationDto;

  constructor(data: IContributeSubmissionDto) {
    super();
    this.submission = data?.submission;
    this.fee = data?.fee;
    this.uniqueKey = data?.uniqueKey;
  }
}

export class ContributeSubmissionAuthorizationDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => SubmissionDto)
  public submission: SubmissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee?: FeeAuthorizationDto;

  constructor(data?: any) {
    super();
    if (data) {
      this.submission = data.submission;
      this.fee = data.fee;
    }
  }
}

export interface IVoteDto {
  entryType: string;
  entryParent: string;
  entry: string;
  quantity: BigNumber;
  uniqueKey: string;
}

export class VoteDto extends SubmitCallDTO {
  @IsNotEmpty()
  @IsString()
  entryType: string;

  @IsString()
  entryParent: string;

  @IsNotEmpty()
  @IsString()
  entry: string;

  @BigNumberIsPositive()
  @BigNumberProperty()
  quantity: BigNumber;

  constructor(data: IVoteDto) {
    super();
    this.entryType = data?.entryType;
    this.entryParent = data?.entryParent || "";
    this.entry = data?.entry;
    this.quantity = data?.quantity;
    this.uniqueKey = data?.uniqueKey;
  }
}

export interface ICastVoteDto {
  vote: VoteDto;
  fee?: FeeVerificationDto;
  uniqueKey: string;
}

export class CastVoteDto extends SubmitCallDTO {
  @ValidateNested()
  @Type(() => VoteDto)
  vote: VoteDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeVerificationDto)
  fee?: FeeVerificationDto;

  constructor(data: ICastVoteDto) {
    super();
    this.vote = data?.vote;
    this.fee = data?.fee;
    this.uniqueKey = data?.uniqueKey;
  }
}

export class CastVoteAuthorizationDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => VoteDto)
  public vote: VoteDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee?: FeeAuthorizationDto;

  constructor(data?: any) {
    super();
    if (data) {
      this.vote = data.vote;
      this.fee = data.fee;
    }
  }
}

export class Fire extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBF";

  /** Unique slug identifier for the fire (now the primary key) */
  @ChainKey({ position: 0 })
  @IsString()
  public slug: string;

  /** Display name of the fire */
  @IsNotEmpty()
  @IsString()
  public name: string;

  /** Optional description of the fire's purpose and rules */
  @IsOptional()
  @IsString()
  public description?: string;

  /** User alias of the fire creator */
  @IsUserAlias()
  public starter: UserAlias;

  /**
   * Create a new Fire instance
   *
   * @param slug - Unique slug identifier
   * @param name - Display name
   * @param starter - User reference of the creator
   * @param description - Optional description
   */
  constructor(
    slug: string,
    name: string,
    starter: UserAlias,
    description: string | undefined
  ) {
    super();
    this.slug = slug;
    this.name = name;
    this.starter = starter;
    this.description = description;
  }
}

export class Submission extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBS";

  /** Fire slug this submission belongs to */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  fire: string;

  /** Parent entry identifier (fire slug for top-level, submission key for replies) */
  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  entryParent: string;

  /** Type of the parent entry (Fire.INDEX_KEY or Submission.INDEX_KEY) */
  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  parentEntryType: string;

  /** Unique identifier for this submission (typically inverse timestamp) */
  @ChainKey({ position: 3 })
  @IsNotEmpty()
  @IsString()
  id: string;

  /** Display title of the submission */
  @ChainKey({ position: 4 })
  @IsNotEmpty()
  @IsString()
  name: string;

  /** Optional identifier of the user who contributed this submission */
  @IsOptional()
  @IsString()
  contributor?: string;

  /** Optional description or body text of the submission */
  @IsOptional()
  @IsString()
  description?: string;

  /** Optional URL if this submission links to external content */
  @IsOptional()
  @IsString()
  url?: string;

  /**
   * Create a new Submission instance
   *
   * @param fire - Fire slug this submission belongs to
   * @param entryParent - Parent entry identifier (fire slug or submission key)
   * @param parentEntryType - Type of parent (Fire.INDEX_KEY or Submission.INDEX_KEY)
   * @param id - Unique identifier for this submission
   * @param name - Display title of the submission
   * @param contributor - Optional user identifier of the contributor
   * @param description - Optional description or body text
   * @param url - Optional URL for external content
   */
  constructor(
    fire: string,
    entryParent: string,
    parentEntryType: string,
    id: string,
    name: string,
    contributor?: string | undefined,
    description?: string | undefined,
    url?: string | undefined
  ) {
    super();
    this.fire = fire;
    this.entryParent = entryParent;
    this.parentEntryType = parentEntryType;
    this.id = id;
    this.name = name;
    this.contributor = contributor;
    this.description = description;
    this.url = url;
  }
}
