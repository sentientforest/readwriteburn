import {
  ChainCallDTO,
  FeeAuthorizationDto,
  FeeVerificationDto,
  IsUserRef,
  SubmitCallDTO,
  UserRef
} from "@gala-chain/api";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";

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
  public authorities: UserRef[];

  @IsString({ each: true })
  public moderators: UserRef[];
}

export class FireStarterDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => FireDto)
  public fire: FireDto;

  @ValidateNested()
  @Type(() => FeeVerificationDto)
  public fee: FeeVerificationDto;
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
