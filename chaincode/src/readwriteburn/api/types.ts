import { ChainObject, ClassConstructor } from "@gala-chain/api";
import { IsNotEmpty, IsString } from "class-validator";

import { Fire } from "./Fire";
import { Submission } from "./Submission";
import { Vote } from "./Vote";
import { VoteCount } from "./VoteCount";
import { VoteRanking } from "./VoteRanking";

/**
 * Base interface for all entry types in the ReadWriteBurn system
 *
 * IEntry provides a common structure for objects that can be voted on,
 * including fires, submissions, and other content types. The entryType
 * field enables polymorphic handling of different entry types.
 *
 * @extends ChainObject
 */
class IEntry extends ChainObject {
  /** Type identifier for the entry (e.g., "RWBF" for Fire, "RWBS" for Submission) */
  @IsNotEmpty()
  @IsString()
  entryType?: string;

  /** Parent entry key for hierarchical organization */
  @IsString()
  entryParent: string;
}

/**
 * Registry mapping index keys to their corresponding class constructors
 *
 * RWB_TYPES enables dynamic instantiation of chain objects based on their
 * INDEX_KEY values. This is used throughout the system for polymorphic
 * handling of different entry types during voting and validation operations.
 *
 * @example
 * ```typescript
 * const EntryClass = RWB_TYPES["RWBS"]; // Returns Submission constructor
 * const entry = await getObjectByKey(ctx, EntryClass, key);
 * ```
 */
const RWB_TYPES: Record<string, ClassConstructor<IEntry>> = {};

// Register all available entry types
RWB_TYPES[Fire.INDEX_KEY] = Fire;
RWB_TYPES[Submission.INDEX_KEY] = Submission;
RWB_TYPES[Vote.INDEX_KEY] = Vote;
RWB_TYPES[VoteCount.INDEX_KEY] = VoteCount;
RWB_TYPES[VoteRanking.INDEX_KEY] = VoteRanking;

export { RWB_TYPES, IEntry };
