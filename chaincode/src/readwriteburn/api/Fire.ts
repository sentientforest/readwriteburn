import { ChainKey, ChainObject, IsUserRef, UserRef } from "@gala-chain/api";
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Fire represents a community topic or discussion thread
 *
 * Fires are the core organizational unit of the ReadWriteBurn platform,
 * serving as containers for related submissions and discussions.
 * Each fire has a unique slug identifier and can have multiple authorities
 * and moderators for content governance.
 *
 * @extends ChainObject
 */
export class Fire extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBF";

  /** Parent fire identifier for hierarchical organization */
  @ChainKey({ position: 0 })
  @IsString()
  public entryParent: string;

  /** Unique slug identifier for the fire */
  @ChainKey({ position: 1 })
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

  /** User reference of the fire creator */
  @IsUserRef()
  public starter: UserRef;

  /**
   * Create a new Fire instance
   *
   * @param entryParent - Parent fire identifier (empty string for top-level fires)
   * @param slug - Unique slug identifier
   * @param name - Display name
   * @param starter - User reference of the creator
   * @param description - Optional description
   */
  constructor(
    entryParent: string,
    slug: string,
    name: string,
    starter: UserRef,
    description: string | undefined
  ) {
    super();
    this.entryParent = entryParent ?? "";
    this.slug = slug;
    this.name = name;
    this.starter = starter;
    this.description = description;
  }
}

/**
 * FireStarter associates a user with a fire they created
 *
 * This object tracks the relationship between users and the fires
 * they have started, enabling queries for user-created content
 * and establishing creator privileges.
 *
 * @extends ChainObject
 */
export class FireStarter extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBFS";

  /** User reference of the fire creator */
  @ChainKey({ position: 0 })
  @IsUserRef()
  public identity: UserRef;

  /** Composite key of the fire that was started */
  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  public fire: string;

  /**
   * Create a new FireStarter association
   *
   * @param identity - User reference of the fire creator
   * @param fire - Composite key of the fire
   */
  constructor(identity: UserRef, fire: string) {
    super();
    this.identity = identity;
    this.fire = fire;
  }
}

/**
 * FireAuthority grants administrative privileges to users for a specific fire
 *
 * Authorities have elevated permissions within a fire, typically including
 * the ability to moderate content, manage fire settings, and potentially
 * designate additional moderators or authorities.
 *
 * @extends ChainObject
 */
export class FireAuthority extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBFA";

  /** Composite key of the fire being governed */
  @ChainKey({ position: 0 })
  @IsString()
  public fire: string;

  /** User reference of the authority */
  @ChainKey({ position: 1 })
  @IsUserRef()
  public identity: UserRef;

  /**
   * Create a new FireAuthority relationship
   *
   * @param fire - Composite key of the fire
   * @param identity - User reference of the authority
   */
  constructor(fire: string, identity: UserRef) {
    super();
    this.fire = fire;
    this.identity = identity;
  }
}

/**
 * FireModerator grants content moderation privileges to users for a specific fire
 *
 * Moderators can manage submissions and enforce community guidelines within
 * a fire. They typically have permissions to remove inappropriate content,
 * warn users, and maintain the quality of discussions.
 *
 * @extends ChainObject
 */
export class FireModerator extends ChainObject {
  /** Index key for chain object type identification */
  @Exclude()
  static INDEX_KEY = "RWBFM";

  /** Composite key of the fire being moderated */
  @ChainKey({ position: 0 })
  @IsString()
  public fire: string;

  /** User reference of the moderator */
  @ChainKey({ position: 1 })
  @IsUserRef()
  public identity: UserRef;

  /**
   * Create a new FireModerator relationship
   *
   * @param fire - Composite key of the fire
   * @param identity - User reference of the moderator
   */
  constructor(fire: string, identity: UserRef) {
    super();
    this.fire = fire;
    this.identity = identity;
  }
}
