import { ConflictError, ValidationFailedError } from "@gala-chain/api";
import {
  GalaChainContext,
  inverseTime,
  objectExists,
  putChainObject
} from "@gala-chain/chaincode";

import { Submission } from "./api/Submission";
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
 * @example
 * ```typescript
 * const submission = await contributeSubmission(ctx, {
 *   submission: {
 *     name: "Interesting Article",
 *     fire: "fire-slug",
 *     entryParent: "fire-slug", // Fire slug for top-level submissions
 *     parentEntryType: "RWBF", // Fire.INDEX_KEY for top-level submissions
 *     description: "A detailed analysis of...",
 *     url: "https://example.com/article",
 *     uniqueKey: "unique-submission-key"
 *   },
 *   fee: feeVerificationDto,
 *   uniqueKey: "unique-tx-key"
 * });
 * ```
 */
export async function contributeSubmission(
  ctx: GalaChainContext,
  dto: ContributeSubmissionDto
): Promise<Submission> {
  const { name, fire, entryParent, parentEntryType, contributor, description, url } = dto.submission;

  const fireExists = await objectExists(ctx, fire);

  if (!fireExists)
    throw new ValidationFailedError(`Fire with key ${fire} does not exist.`);

  const submissionId = inverseTime(ctx);

  const submission = new Submission(
    fire,
    entryParent,
    parentEntryType,
    submissionId,
    name,
    contributor,
    description,
    url
  );

  const conflict = await objectExists(ctx, submission.getCompositeKey());

  if (conflict) {
    throw new ConflictError(
      `Submission with key ${submission.getCompositeKey()} already exists.`
    );
  }

  await putChainObject(ctx, submission);

  return submission;
}
