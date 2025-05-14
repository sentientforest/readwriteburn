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
  ArrayNotEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { JSONSchema } from "class-validator-jsonschema";

import { Fire, FireAuthority, FireModerator, FireStarter } from "./Fire";
import { Submission } from "./Submission";
import { Vote } from "./Vote";
import { VoteCount } from "./VoteCount";
import { VoteRanking } from "./VoteRanking";
import { VoterReceipt } from "./VoterReceipt";

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

  constructor(
    slug: string,
    name: string,
    starter: UserRef,
    description?: string,
    authorities?: UserRef[],
    moderators?: UserRef[],
    uniqueKey?: string
  ) {
    super();
    this.slug = slug;
    this.name = name;
    this.starter = starter;
    this.description = description;
    this.authorities = authorities ?? [];
    this.moderators = moderators ?? [];
    this.uniqueKey = uniqueKey;
  }
}

export class FireStarterDto extends SubmitCallDTO {
  @ValidateNested()
  @Type(() => FireDto)
  public fire: FireDto;

  @ValidateNested()
  @Type(() => FeeVerificationDto)
  public fee: FeeVerificationDto;

  constructor(fire: FireDto, fee: FeeVerificationDto, uniqueKey: string) {
    super();
    this.fire = fire;
    this.fee = fee;
    this.uniqueKey = uniqueKey;
  }
}

export class FetchFiresDto extends ChainCallDTO {
  @IsOptional()
  @IsString()
  public slug?: string;

  @IsOptional()
  @IsString()
  public bookmark?: string;

  @IsOptional()
  @IsNumber()
  public limit?: number;

  constructor(slug?: string, bookmark?: string, limit?: number) {
    super();
    this.slug = slug;
    this.bookmark = bookmark;
    this.limit = limit;
  }
}

export class FireResDto extends ChainCallDTO {
  metadata: Fire;
  starter: FireStarter;
  authorities: FireAuthority[];
  moderators: FireModerator[];
}

export class FetchFiresResDto extends ChainCallDTO {
  @JSONSchema({ description: "List of results." })
  @ValidateNested({ each: true })
  @Type(() => Fire)
  results: Fire[];

  @JSONSchema({ description: "Next page bookmark." })
  @IsOptional()
  @IsNotEmpty()
  nextPageBookmark?: string;

  constructor(results: Fire[], nextPageBookmark?: string) {
    super();
    this.results = results;
    this.nextPageBookmark = nextPageBookmark;
  }
}

export class FetchSubmissionsDto extends ChainCallDTO {
  @IsOptional()
  @IsString()
  public fire?: string;

  @IsOptional()
  @IsString()
  public bookmark?: string;

  @IsOptional()
  @IsNumber()
  public limit?: number;

  constructor(fire?: string, bookmark?: string, limit?: number) {
    super();
    this.fire = fire;
    this.bookmark = bookmark;
    this.limit = limit;
  }
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

  constructor(
    name: string,
    fire: string,
    contributor?: string,
    description?: string,
    url?: string,
    uniqueKey?: string
  ) {
    super();
    this.name = name;
    this.fire = fire;
    this.contributor = contributor;
    this.description = description;
    this.url = url;
    this.uniqueKey = uniqueKey;
  }
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

  constructor(submission: SubmissionDto, fee: FeeVerificationDto, uniqueKey: string) {
    super();
    this.submission = submission;
    this.fee = fee;
    this.uniqueKey = uniqueKey;
  }
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

  constructor(entryType: string, entryParent: string, entry: string, quantity: BigNumber) {
    super();
    this.entryType = entryType;
    this.entryParent = entryParent;
    this.entry = entry;
    this.quantity = quantity;
  }
}

export class CastVoteDto extends SubmitCallDTO {
  @IsNotEmpty()
  @IsString()
  vote: VoteDto;

  @ValidateNested()
  @Type(() => FeeVerificationDto)
  fee: FeeVerificationDto;

  constructor(vote: VoteDto, fee: FeeVerificationDto, uniqueKey: string) {
    super();
    this.vote = vote;
    this.fee = fee;
    this.uniqueKey = uniqueKey;
  }
}

export class FetchVotesDto extends ChainCallDTO {
  @IsOptional()
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

  constructor(fire?: string, submission?: string, bookmark?: string, limit?: number, uniqueKey?: string) {
    super();
    this.fire = fire;
    this.submission = submission;
    this.bookmark = bookmark;
    this.limit = limit;
    this.uniqueKey = uniqueKey;
  }
}

@JSONSchema({
  description: "Vote Object Value with Chain Key."
})
export class VoteResult extends ChainCallDTO {
  @JSONSchema({ description: "Chain key identifying object on chain." })
  key: string;

  @JSONSchema({ description: "Chain entry value identified by corresponding key on chain." })
  @ValidateNested()
  @Type(() => Vote)
  value: Vote;

  constructor(key: string, value: Vote) {
    super();
    this.key = key;
    this.value = value;
  }
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
  @IsNotEmpty()
  nextPageBookmark?: string;

  constructor(results: VoteResult[], nextPageBookmark?: string) {
    super();
    this.results = results;
    this.nextPageBookmark = nextPageBookmark;
  }
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

  constructor(votes: string[], uniqueKey: string, fire?: string, submission?: string) {
    super();
    this.fire = fire;
    this.submission = submission;
    this.votes = votes;
    this.uniqueKey = uniqueKey;
  }
}
