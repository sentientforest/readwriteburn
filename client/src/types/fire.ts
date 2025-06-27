import { ChainCallDTO, FeeAuthorization, FeeAuthorizationDto, SubmitCallDTO } from "@gala-chain/api";
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
  hash_verified?: boolean;
  moderation_status?: 'active' | 'flagged' | 'removed' | 'modified';
  content_hash?: string;
  content_timestamp?: number;
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
