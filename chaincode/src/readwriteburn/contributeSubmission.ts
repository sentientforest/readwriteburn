import { ConflictError, ValidationFailedError } from "@gala-chain/api";
import { GalaChainContext, inverseTime, objectExists, putChainObject } from "@gala-chain/chaincode";

import { Fire } from "./Fire";
import { Submission } from "./Submission";
import { ContributeSubmissionDto } from "./dtos";

export async function contributeSubmission(
  ctx: GalaChainContext,
  dto: ContributeSubmissionDto
): Promise<void> {
  const { name, fire, contributor, description, url } = dto.submission;

  const badRequest = await objectExists(ctx, fire);

  if (badRequest) throw new ValidationFailedError(`Fire with key ${fire} does not exist.`);

  const submissionId = inverseTime(ctx);

  const submission = new Submission(fire, submissionId, name, contributor, description, url);

  const conflict = await objectExists(ctx, submission.getCompositeKey());

  if (conflict) {
    throw new ConflictError(`Submission with key ${submission.getCompositeKey()} already exists.`);
  }

  await putChainObject(ctx, submission);
}
