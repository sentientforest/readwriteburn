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

export class FireStarterDto extends SubmitCallDTO {
  @ValidateNested()
  @Type(() => FireDto)
  public fire: FireDto;

  @ValidateNested()
  @Type(() => FeeVerificationDto)
  public fee: FeeVerificationDto;
}

export class SubmissionDto extends ChainCallDTO {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  fire: string;

  @IsOptional()
  @IsString()
  contributor?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
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

export class ContributeSubmissionDto extends SubmitCallDTO {
  @ValidateNested()
  @Type(() => SubmissionDto)
  submission: SubmissionDto;

  @ValidateNested()
  @Type(() => FeeVerificationDto)
  fee: FeeVerificationDto;
}

export class CastVoteDto extends ChainCallDTO {
  @IsNotEmpty()
  @IsString()
  entry: string;

  @ValidateNested()
  @Type(() => FeeVerificationDto)
  fee: FeeVerificationDto;
}
