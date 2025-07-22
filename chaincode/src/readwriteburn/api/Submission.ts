import { ChainKey, ChainObject } from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

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
