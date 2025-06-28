import {
  ChainCallDTO,
  FeeAuthorization,
  FeeAuthorizationDto,
  IsUserRef,
  SubmitCallDTO,
  UserRef
} from "@gala-chain/api";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";

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

  @IsString({ each: true })
  public authorities: string[];

  @IsString({ each: true })
  public moderators: string[];
}

export class FireStarterDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => FireDto)
  public fire: FireDto;

  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee: FeeAuthorizationDto;
}

export class SubmissionDto extends ChainCallDTO {
  name: string;
  fire: string;
  contributor?: string;
  description?: string;
  url?: string;
}

export interface SubmissionResDto {
  id: number;
  name: string;
  contributor: string;
  description: string;
  url: string;
  votes: number;
  // Content hashing fields
  content_hash?: string;
  hash_verified?: boolean;
  content_timestamp?: number;
  moderation_status?: string;
  created_at?: string;
}

export class ContributeSubmissionDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => SubmissionDto)
  submission: SubmissionDto;

  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  fee: FeeAuthorizationDto;
}

export class CastVoteDto extends ChainCallDTO {
  @IsNotEmpty()
  @IsString()
  entry: string;

  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  fee: FeeAuthorizationDto;
}

// Content verification and moderation types
export interface ContentVerificationDto {
  submissionId: number;
  sqliteHash: string;
  chainHash?: string;
  currentHash: string;
  verified: boolean;
  moderationStatus: string;
  lastModified?: string;
}

export interface BulkVerificationRequestDto {
  submissionIds: number[];
}

export interface BulkVerificationResultDto {
  results: Array<{
    id: number;
    status: "verified" | "hash_mismatch" | "not_found" | "error";
    sqliteHash?: string;
    currentHash?: string;
    error?: string;
  }>;
}

export interface ModerationRequestDto {
  action: "flagged" | "removed" | "modified" | "restored";
  reason?: string;
  newContent?: string;
}

export interface ModerationResponseDto {
  success: boolean;
  action: string;
  originalHash?: string;
  newHash?: string;
}

export interface ModerationLogDto {
  id: number;
  submissionId: number;
  action: string;
  reason?: string;
  adminUser: string;
  originalHash?: string;
  newHash?: string;
  createdAt: string;
}

// Vote-related DTOs for chaincode integration
export class FetchVotesDto extends ChainCallDTO {
  @IsOptional()
  @IsString()
  public entryType?: string;

  @IsOptional()
  @IsString()
  public fire?: string;

  @IsOptional()
  @IsString()
  public submission?: string;

  @IsOptional()
  @IsString()
  public bookmark?: string;

  @IsOptional()
  public limit?: number;
}

export interface VoteResult {
  key: string;
  value: {
    entryType: string;
    entryParent: string;
    entry: string;
    id: string;
    voter: UserRef;
    quantity: string; // BigNumber as string
  };
}

export interface FetchVotesResDto {
  results: VoteResult[];
  nextPageBookmark?: string;
}

export class CountVotesDto extends ChainCallDTO {
  @IsOptional()
  @IsString()
  public fire?: string;

  @IsOptional()
  @IsString()
  public submission?: string;

  @IsArray()
  @IsString({ each: true })
  public votes: string[];

  // uniqueKey is inherited from ChainCallDTO, no need to redeclare
}
