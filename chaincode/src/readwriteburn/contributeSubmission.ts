import { ChainObject, ConflictError, ValidationFailedError } from "@gala-chain/api";
import {
  GalaChainContext,
  inverseTime,
  objectExists,
  putChainObject
} from "@gala-chain/chaincode";
import { plainToInstance } from "class-transformer";

import { Fire, Submission, SubmissionByFire, SubmissionByParentEntry } from "./api";
import { ContributeSubmissionDto } from "./api/dtos";

/**
 * Create a new submission within a fire
 *
 * This function processes submission creation by:
 * 1. Validating the target fire exists
 * 2. Generating a unique timestamp-based ID for the submission
 * 3. Creating the Submission object with provided metadata
 * 4. Checking for conflicts and storing on-chain
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Submission data including content metadata and target fire
 * @returns Promise resolving to the created Submission object
 *
 * @throws {ValidationFailedError} When the target fire does not exist
 * @throws {ConflictError} When a submission with the same composite key already exists
 *
 */
export async function contributeSubmission(
  ctx: GalaChainContext,
  dto: ContributeSubmissionDto
): Promise<Submission> {
  const { slug, uniqueKey, fire, name, contributor, description, url } = dto.submission;

  const fireKey = ChainObject.getCompositeKeyFromParts(Fire.INDEX_KEY, [fire]);

  const fireExists = await objectExists(ctx, fireKey);

  if (!fireExists) {
    throw new ValidationFailedError(`Fire with key ${fireKey} does not exist.`);
  }

  const entryType = Submission.INDEX_KEY;
  let entryParentType: string;
  let entryParentKey = dto.submission.entryParentKey;
  let parentKey: string | undefined;
  if (entryParentKey !== undefined) {
    const parentSubmissionExists = await objectExists(ctx, entryParentKey);

    if (!parentSubmissionExists) {
      throw new ValidationFailedError(
        `Parent submission identified by key: ${entryParentKey} does not exist`
      );
    }

    if (!entryParentKey.slice(0, 6).includes(Submission.INDEX_KEY)) {
      throw new ValidationFailedError(
        `contributeSubmission called with entryParent that does not match ` +
          `Submission INDEX_KEY (${Submission.INDEX_KEY}): ${entryParentKey}`
      );
    }

    entryParentType = Submission.INDEX_KEY;
    parentKey = entryParentKey;
  } else {
    entryParentKey = fireKey;
    entryParentType = Fire.INDEX_KEY;
  }

  const recency = inverseTime(ctx);

  const submission: Submission = new Submission({
    recency,
    slug,
    uniqueKey,
    fireKey,
    entryParentKey,
    entryParentType,
    entryType,
    name,
    contributor,
    description,
    url
  });

  const submissionKey = submission.getCompositeKey();

  const conflict = await objectExists(ctx, submissionKey);

  if (conflict) {
    throw new ConflictError(`Submission with key ${submissionKey} already exists.`);
  }

  await putChainObject(ctx, submission);

  // Top-level submissions are indexed by Fire/Category
  // Sub-level submissions / comments are indexed by parent
  if (parentKey !== undefined) {
    const submissionByParentEntry = plainToInstance(SubmissionByParentEntry, {
      parentKey,
      recency,
      submissionKey
    });

    await putChainObject(ctx, submissionByParentEntry);
  } else {
    const submissionByFire = plainToInstance(SubmissionByFire, {
      fireKey,
      recency,
      submissionKey
    });

    await putChainObject(ctx, submissionByFire);
  }

  return submission;
}
