import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainCallDTO,
  FeeVerificationDto,
  IsUserRef,
  SubmitCallDTO
} from "@gala-chain/api";
import type { UserRef } from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Type } from "class-transformer";
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
  entryParent?: string | undefined;
  slug: string;
  name: string;
  starter: UserRef;
  description?: string;
  authorities?: UserRef[];
  moderators?: UserRef[];
  uniqueKey?: string;
}

export class FireDto extends ChainCallDTO {
  @IsOptional()
  @IsString()
  public entryParent: string;

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
    this.entryParent = data?.entryParent ?? "";
    this.slug = data?.slug ?? "";
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
