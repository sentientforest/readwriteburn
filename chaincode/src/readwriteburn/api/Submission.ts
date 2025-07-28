import { ChainKey, ChainObject } from "@gala-chain/api";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export interface ISubmission {
  recency: string;
  slug: string;
  uniqueKey: string;
  fireKey: string;
  entryParentKey: string;
  entryParentType: string;
  entryType: string;
  name: string;
  contributor?: string;
  description?: string;
  url?: string;
}

/**
 * Submission represents user-contributed content within a fire
 *
 * Submissions are the primary content objects in ReadWriteBurn, representing
 * articles, links, comments, or other user contributions to a fire. They support
 * hierarchical organization through the entryParent field, enabling threaded
 * discussions and comment chains.
 *
 * @extends ChainObject
 */
export class Submission extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBS";

  /** Inverse timestamp sorts lexigraphically by most recent first */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  public recency: string;

  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  public slug: string; // todo: limit to alphanumeric, lower case, dashes, no spaces, URL friendly

  /** Parent entry identifier (fire slug for top-level, submission key for replies) */
  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  public uniqueKey: string;

  @IsString()
  public fireKey: string;

  @IsOptional()
  @IsString()
  public entryParentKey?: string;

  @IsString()
  public entryParentType: string;

  @IsString()
  public entryType: string;

  /** Display title of the submission */
  @IsNotEmpty()
  @IsString()
  public name: string;

  /** Optional identifier of the user who contributed this submission */
  @IsOptional()
  @IsString()
  public contributor?: string;

  /** Optional description or body text of the submission */
  @IsOptional()
  @IsString()
  public description?: string;

  /** Optional URL if this submission links to external content */
  @IsOptional()
  @IsString()
  public url?: string;

  /**
   * Create a new Submission instance
   *
   */
  constructor(data: ISubmission) {
    super();
    this.recency = data?.recency ?? "999";
    this.slug = data?.slug ?? "none";
    this.uniqueKey = data?.uniqueKey ?? "none";
    this.fireKey = data?.fireKey ?? "none";
    this.entryParentKey = data?.entryParentKey;
    this.entryParentType = data?.entryParentType ?? "none";
    this.entryType = data?.entryType ?? "none";
    this.name = data?.name ?? "none";
    this.contributor = data?.contributor;
    this.description = data?.description;
    this.url = data?.url;
  }
}

export class SubmissionByFire extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBSBY";

  /** Chain key that identifies a Fire */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  public fireKey: string;

  /** Inverse timestamp sorts lexigraphically by most recent first */
  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  public recency: string;

  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  public submissionKey: string;
}

export class SubmissionByParentEntry extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBSBPE";

  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  public parentKey: string;

  /** Inverse timestamp sorts lexigraphically by most recent first */
  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  public recency: string;

  @ChainKey({ position: 2 })
  @IsNotEmpty()
  @IsString()
  public submissionKey: string;
}
