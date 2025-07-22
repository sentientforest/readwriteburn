import {
  asValidUserRef,
  ChainCallDTO,
  ChainKey,
  ChainObject,
  FeeAuthorization,
  FeeAuthorizationDto,
  FeeVerificationDto,
  IsUserAlias,
  IsUserRef,
  SubmitCallDTO,
  UserAlias,
  UserRef
} from "@gala-chain/api";
import { Exclude, Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

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

/**
 * Fire represents a top-level community topic or discussion thread
 *
 * Fires are the core organizational unit of the ReadWriteBurn platform,
 * serving as containers for related submissions and discussions.
 * Each fire has a unique slug identifier and can have multiple authorities
 * and moderators for content governance.
 * 
 * Note: Fires are always top-level - no hierarchical organization.
 * Use Submissions for threaded discussions within a Fire.
 *
 * @extends ChainObject
 */
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

  constructor(data?: IFireDto) {
    super();
    this.slug = data?.slug ?? "none";
    this.name = data?.name ?? "";
    this.starter = asValidUserRef(data?.starter ?? "service|null");
    this.description = data?.description ?? "";
    this.authorities = data?.authorities ?? [];
    this.moderators = data?.moderators ?? [];
    this.uniqueKey = data?.uniqueKey ?? "";
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

export class FireStarterDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => FireDto)
  public fire: FireDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeVerificationDto)
  public fee?: FeeVerificationDto;
}

export interface IFetchFiresDto {
  slug?: string;
  bookmark?: string;
  limit?: number;
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

  constructor(data: IFetchFiresDto = {}) {
    super();
    this.slug = data?.slug;
    this.bookmark = data?.bookmark;
    this.limit = data?.limit;
  }
}

export interface IFetchFiresResDto {
  results: FireDto[];
  nextPageBookmark?: string;
}

export class FetchFiresResDto extends ChainCallDTO {
  @ValidateNested({ each: true })
  @Type(() => FireDto)
  results: FireDto[];

  @IsOptional()
  @IsString()
  nextPageBookmark?: string;

  constructor(data: IFetchFiresResDto) {
    super();
    this.results = data?.results || [];
    this.nextPageBookmark = data?.nextPageBookmark;
  }
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

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeVerificationDto)
  fee?: FeeVerificationDto;
}

export class ContributeSubmissionAuthorizationDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => SubmissionDto)
  public submission: SubmissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee?: FeeAuthorizationDto;
}


export class VoteDto extends ChainCallDTO {
  @IsNotEmpty()
  @IsString()
  entryType: string;

  @IsString()
  entryParent: string;

  @IsNotEmpty()
  @IsString()
  entry: string;

  @IsNotEmpty()
  quantity: any; // BigNumber - will be properly typed when imported

  constructor(data?: any) {
    super();
    // entryType should always be the INDEX_KEY of the class being voted on
    // For now, default to Submission.INDEX_KEY as that's the most common case
    this.entryType = data?.entryType || Submission.INDEX_KEY;
    this.entryParent = data?.entryParent || "";
    this.entry = data?.entry || "";
    this.quantity = data?.quantity;
    this.uniqueKey = data?.uniqueKey || "";
  }
}

export class CastVoteDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => VoteDto)
  vote: VoteDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeVerificationDto)
  fee?: FeeVerificationDto;
}

export class CastVoteAuthorizationDto extends ChainCallDTO {
  @ValidateNested()
  @Type(() => VoteDto)
  public vote: VoteDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeAuthorizationDto)
  public fee?: FeeAuthorizationDto;
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
  @IsString()
  public entryType: string;

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
