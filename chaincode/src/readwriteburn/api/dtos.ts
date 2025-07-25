import {
  BigNumberIsPositive,
  BigNumberProperty,
  ChainCallDTO,
  FeeVerificationDto,
  IsUserRef,
  SubmitCallDTO,
  UserRef
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested
} from "class-validator";
import { JSONSchema } from "class-validator-jsonschema";

import { Fire, FireAuthority, FireModerator, FireStarter } from "./Fire";
import { ISubmission, Submission } from "./Submission";
import { Vote } from "./Vote";
import { VoteCount } from "./VoteCount";
import { VoteRanking } from "./VoteRanking";
import { VoterReceipt } from "./VoterReceipt";

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
    const slug = data?.slug ?? "none";
    this.slug = slug;
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
    this.fee = data?.fee;
    this.uniqueKey = data?.uniqueKey;
  }
}

export interface IFetchFiresDto {
  slug?: string;
  bookmark?: string;
  limit?: number;
}

export class FetchFiresDto extends ChainCallDTO {
  @JSONSchema({
    description: "Optional. "
  })
  @IsOptional()
  @IsString()
  public slug?: string;

  @IsOptional()
  @IsString()
  public bookmark?: string;

  @IsOptional()
  @IsNumber()
  public limit?: number;

  constructor(data: IFetchFiresDto) {
    super();
    this.slug = data?.slug;
    this.bookmark = data?.bookmark;
    this.limit = data?.limit;
  }
}

export interface IFireResDto {
  metadata: Fire;
  starter: FireStarter;
  authorities: FireAuthority[];
  moderators: FireModerator[];
}

export class FireResDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => Fire)
  metadata: Fire;

  @ValidateNested()
  @Type(() => FireStarter)
  starter: FireStarter;

  @ValidateNested({ each: true })
  @Type(() => FireAuthority)
  authorities: FireAuthority[];

  @ValidateNested({ each: true })
  @Type(() => FireModerator)
  moderators: FireModerator[];

  constructor(args: unknown) {
    super();
    const data: IFireResDto = args as IFireResDto;
    this.metadata = data?.metadata;
    this.starter = data?.starter ?? "";
    this.authorities = data?.authorities ?? [];
    this.moderators = data?.moderators ?? [];
  }
}

export interface IFetchFiresResDto {
  results: Fire[];
  nextPageBookmark?: string | undefined;
}

export class FetchFiresResDto extends ChainCallDTO {
  @JSONSchema({ description: "List of results." })
  @ValidateNested({ each: true })
  @Type(() => Fire)
  results: Fire[];

  @JSONSchema({ description: "Next page bookmark." })
  @IsOptional()
  @IsString()
  nextPageBookmark?: string;

  constructor(data: IFetchFiresResDto) {
    super();
    this.results = data?.results;
    this.nextPageBookmark = data?.nextPageBookmark;
  }
}

export interface ISubmissionDto {
  slug: string;
  uniqueKey: string;
  entryParentKey?: string;
  fire: string;
  name: string;
  contributor?: string;
  description?: string;
  url?: string;
}

export class SubmissionDto extends SubmitCallDTO {
  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsString()
  uniqueKey: string;

  @IsOptional()
  @IsString()
  entryParentKey?: string;

  @IsNotEmpty()
  @IsString()
  fire: string;

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

  constructor(data: ISubmissionDto) {
    super();
    this.slug = data?.slug ?? "none";
    this.uniqueKey = data?.uniqueKey ?? "none";
    this.entryParentKey = data?.entryParentKey;
    this.name = data?.name ?? "none";
    this.fire = data?.fire ?? "";
    this.contributor = data?.contributor;
    this.description = data?.description;
    this.url = data?.url;
  }
}

export interface SubmissionResDto {
  id: number;
  entryParent?: string;
  parentEntryType: string;
  name: string;
  contributor: string;
  description: string;
  url: string;
  votes: number;
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

export interface IFetchSubmissionsDto {
  fireKey?: string;
  entryParentKey?: string;
  bookmark?: string;
  limit?: number;
}

export class FetchSubmissionsDto extends ChainCallDTO {
  @IsOptional()
  @IsString()
  public fireKey?: string;

  @IsOptional()
  @IsString()
  public entryParentKey?: string;

  @IsOptional()
  @IsString()
  public bookmark?: string;

  @IsOptional()
  @IsNumber()
  public limit?: number;

  constructor(data: IFetchSubmissionsDto) {
    super();
    this.fireKey = data?.fireKey;
    this.entryParentKey = data?.entryParentKey;
    this.bookmark = data?.bookmark;
    this.limit = data?.limit;
  }
}

export interface ISubmissionWithChildren {
  slug: string;
  uniqueKey: string;
  entryParentKey?: string;
  entryParentType: string;
  name: string;
  contributor?: string;
  description?: string;
  url?: string;
  fireKey: string;
  recency: string;
  submissionKey: string;
  parentKey?: string;
  children?: ISubmissionWithChildren[];
  childrenNextPageBookmark?: string;
}

export class SubmissionWithChildren extends ChainCallDTO {
  @IsNotEmpty()
  @IsString()
  public slug: string;

  @IsNotEmpty()
  @IsString()
  public uniqueKey: string;

  @IsOptional()
  @IsString()
  public entryParentKey?: string;

  @IsString()
  public entryParentType: string;

  @IsNotEmpty()
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public contributor?: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsString()
  public url?: string;

  @IsNotEmpty()
  @IsString()
  public fireKey: string;

  @IsNotEmpty()
  @IsString()
  public recency: string;

  @IsNotEmpty()
  @IsString()
  public submissionKey: string;

  @IsNotEmpty()
  @IsString()
  public parentKey?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SubmissionWithChildren)
  public children?: ISubmissionWithChildren[];

  @IsOptional()
  @IsString()
  childrenNextPageBookmark?: string;

  constructor(data: ISubmissionWithChildren) {
    super();
    this.slug = data?.slug;
  }
}

export interface IFetchSubmissionsResDto {
  results: SubmissionWithChildren[];
  nextPageBookmark?: string | undefined;
}

export class FetchSubmissionsResDto extends ChainCallDTO {
  @JSONSchema({ description: "List of results." })
  @ValidateNested({ each: true })
  @Type(() => Submission)
  results: SubmissionWithChildren[];

  @JSONSchema({ description: "Next page bookmark." })
  @IsOptional()
  @IsNotEmpty()
  nextPageBookmark?: string;

  constructor(data: IFetchSubmissionsResDto) {
    super();
    this.results = data?.results;
    this.nextPageBookmark = data?.nextPageBookmark;
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
    this.entryType = data?.entryType ?? "none";
    this.entryParent = data?.entryParent ?? "";
    this.entry = data?.entry ?? "none";
    this.quantity = data?.quantity ?? new BigNumber(0);
    this.uniqueKey = data?.uniqueKey ?? "none";
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

export interface IFetchVotesDto {
  entryType?: string;
  fire?: string;
  submission?: string;
  bookmark?: string;
  limit?: number;
}

export class FetchVotesDto extends ChainCallDTO {
  @JSONSchema({ description: "Optional, but required if fire is provided." })
  @ValidateIf((dto) => !!dto.entryType || !!dto.fire)
  @IsString()
  entryType?: string;

  @JSONSchema({ description: "Optional, but required if submission is provided." })
  @ValidateIf((dto) => !!dto.fire || !!dto.submission)
  @IsString()
  fire?: string;

  @IsOptional()
  @IsString()
  submission?: string;

  @JSONSchema({ description: "Next page bookmark." })
  @IsOptional()
  @IsNotEmpty()
  bookmark?: string;

  @JSONSchema({
    description: "Limit number of results. Useful for pagination queries."
  })
  @IsOptional()
  @IsNumber()
  limit?: number;

  constructor(data: IFetchVotesDto) {
    super();
    this.entryType = data?.entryType;
    this.fire = data?.fire;
    this.submission = data?.submission;
    this.bookmark = data?.bookmark;
    this.limit = data?.limit;
  }
}

export interface IVoteResult {
  key: string;
  value: Vote;
}

@JSONSchema({
  description: "Vote Object Value with Chain Key."
})
export class VoteResult extends ChainCallDTO {
  @JSONSchema({ description: "Chain key identifying object on chain." })
  key: string;

  @JSONSchema({
    description: "Chain entry value identified by corresponding key on chain."
  })
  @ValidateNested()
  @Type(() => Vote)
  value: Vote;

  constructor(data: IVoteResult) {
    super();
    this.key = data?.key;
    this.value = data?.value;
  }
}

export interface IFetchVotesResDto {
  results: VoteResult[];
  nextPageBookmark?: string;
}

@JSONSchema({
  description: "Response DTO from a successful FetchVotes request."
})
export class FetchVotesResDto extends ChainCallDTO {
  @JSONSchema({ description: "List of vote results." })
  @ValidateNested({ each: true })
  @Type(() => VoteResult)
  results: VoteResult[];

  @JSONSchema({ description: "Next page bookmark." })
  @IsOptional()
  @IsString()
  nextPageBookmark?: string;

  constructor(data: IFetchVotesResDto) {
    super();
    this.results = data?.results ?? [];
    this.nextPageBookmark = data?.nextPageBookmark;
  }
}

export interface ICountVotesDto {
  fire?: string;
  submission?: string;
  votes: string[];
  uniqueKey: string;
}

export class CountVotesDto extends SubmitCallDTO {
  @IsOptional()
  @IsString()
  fire?: string;

  @IsOptional()
  @IsString()
  submission?: string;

  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  votes: string[];

  constructor(data: ICountVotesDto) {
    super();
    this.fire = data?.fire;
    this.submission = data?.submission;
    this.votes = data?.votes;
    this.uniqueKey = data?.uniqueKey;
  }
}
