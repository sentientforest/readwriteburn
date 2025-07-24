import { ChainKey, ChainObject } from "@gala-chain/api";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export interface ISubmission {
  slug: string;
  uniqueKey: string;
  entryParent: string;
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

  /** Composite key of the fire this submission belongs to */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  slug: string; // todo: limit to alphanumeric, lower case, dashes, no spaces, URL friendly

  /** Parent entry identifier (fire slug for top-level, submission key for replies) */
  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  uniqueKey: string;

  @IsString()
  entryParent: string;

  @IsString()
  entryParentType: string;

  @IsString()
  entryType: string;

  /** Display title of the submission */
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
   */
  constructor(data: ISubmission) {
    super();
    this.slug = data?.slug ?? "none";
    this.entryParent = data?.entryParent ?? "none";
    this.entryParentType = data?.entryParentType ?? "none";
    this.name = data?.name ?? "none";
    this.contributor = data?.contributor;
    this.description = data?.description;
    this.url = data?.url;
  }
}

export class SubmissionByFire extends ChainObject {
  @Exclude()
  static INDEX_KEY = "RWBSBY";

  /** Unique slug that identifies a Fire */
  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsString()
  public fire: string;

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

