import { ConflictError, ValidationFailedError } from "@gala-chain/api";
import {
  GalaChainContext,
  inverseTime,
  objectExists,
  putChainObject
} from "@gala-chain/chaincode";

import { Submission } from "./Submission";
import { ContributeSubmissionDto } from "./dtos";

export async function contributeSubmission(
  ctx: GalaChainContext,
  dto: ContributeSubmissionDto
): Promise<Submission> {
  const { name, fire, entryParent, contributor, description, url } = dto.submission;

  const fireExists = await objectExists(ctx, fire);

  if (!fireExists)
    throw new ValidationFailedError(`Fire with key ${fire} does not exist.`);

  const submissionId = inverseTime(ctx);

  const submission = new Submission(
    fire,
    entryParent,
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
