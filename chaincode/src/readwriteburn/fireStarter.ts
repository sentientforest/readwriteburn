import {
  ConflictError,
  ValidationFailedError,
  asValidUserAlias,
  createValidDTO
} from "@gala-chain/api";
import {
  GalaChainContext,
  ensureIsAuthenticatedBy,
  objectExists,
  putChainObject
} from "@gala-chain/chaincode";

import { Fire, FireAuthority, FireModerator, FireStarter } from "./api/Fire";
import { FireResDto, FireStarterDto, IFireResDto } from "./api/dtos";

/**
 * Create a new community fire with moderation controls
 *
 * This function processes fire creation requests by:
 * 1. Validating the fire data and authenticating the creator
 * 2. Creating the Fire object and checking for naming conflicts
 * 3. Establishing FireStarter, FireAuthority, and FireModerator relationships
 * 4. Returning comprehensive fire metadata including all associated roles
 *
 * @param ctx - The GalaChain transaction context
 * @param dto - Fire creation parameters including metadata, authorities, and moderators
 * @returns Promise resolving to complete fire information with all relationships
 *
 * @throws {ValidationFailedError} When DTO is missing required fire property or validation fails
 * @throws {ConflictError} When a fire with the same composite key already exists
 *
 * @example
 * ```typescript
 * const result = await fireStarter(ctx, {
 *   fire: new FireDto({
 *     slug: "crypto-discussion",
 *     name: "Cryptocurrency Discussion",
 *     starter: userRef,
 *     authorities: [userRef],
 *     moderators: [userRef]
 *   }),
 *   fee: feeVerificationDto,
 *   uniqueKey: "unique-tx-key"
 * });
 * ```
 */
export async function fireStarter(
  ctx: GalaChainContext,
  dto: FireStarterDto
): Promise<FireResDto> {
  if (!dto.fire) {
    throw new ValidationFailedError(`DTO missing fire property: ${dto.serialize()}`);
  }
  const { entryParent, slug, name, starter, description } = dto.fire;
  const authorities = dto.fire.authorities;
  const moderators = dto.fire.moderators;

  const starterAlias = asValidUserAlias(starter);

  if (!ctx.isDryRun) {
    await ensureIsAuthenticatedBy(ctx, dto.fire, starterAlias);
  }

  const fire = new Fire(entryParent, slug, name, starterAlias, description);

  const fireKey = fire.getCompositeKey();

  const conflict = await objectExists(ctx, fireKey);

  if (conflict) throw new ConflictError(`Fire with key ${fireKey} already exists.`);

  await putChainObject(ctx, fire);

  const startedBy = new FireStarter(starterAlias, fireKey);

  const fireRes: IFireResDto = {
    metadata: fire,
    starter: startedBy,
    authorities: [],
    moderators: []
  };

  if (starter !== startedBy.identity) {
    throw new ValidationFailedError(
      `Mistmatch between callingUser ${ctx.callingUser} and stated fire starter ${starter}`
    );
  }

  await putChainObject(ctx, startedBy);

  try {
    if (!Array.isArray(authorities)) {
      throw new ValidationFailedError(
        `FireDto missing authorities array: ${authorities}`
      );
    } else if (authorities.length < 1) {
      const fireAuthority = new FireAuthority(fireKey, ctx.callingUser);

      await putChainObject(ctx, fireAuthority);
      fireRes.authorities.push(fireAuthority);
    } else {
      for (const identity of authorities) {
        const fireAuthority = new FireAuthority(fireKey, asValidUserAlias(identity));

        await putChainObject(ctx, fireAuthority);
        fireRes.authorities.push(fireAuthority);
      }
    }
  } catch (e) {
    throw new ValidationFailedError(
      `Failed to save authorities to chain: ${authorities}`
    );
  }

  try {
    if (moderators.length < 1) {
      const fireModerator = new FireModerator(fireKey, ctx.callingUser);

      await putChainObject(ctx, fireModerator);
      fireRes.moderators.push(fireModerator);
    } else {
      for (const identity of moderators) {
        const fireModerator = new FireModerator(fireKey, asValidUserAlias(identity));

        await putChainObject(ctx, fireModerator);
        fireRes.moderators.push(fireModerator);
      }
    }
  } catch (e) {
    throw new ValidationFailedError(`Failed to save moderators to chain: ${moderators}`);
  }

  return createValidDTO(FireResDto, fireRes);
}
