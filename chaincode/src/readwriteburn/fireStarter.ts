import { ConflictError, ValidationFailedError, createValidDTO } from "@gala-chain/api";
import {
  GalaChainContext,
  ensureIsAuthenticatedBy,
  objectExists,
  putChainObject
} from "@gala-chain/chaincode";

import { Fire, FireAuthority, FireModerator, FireStarter } from "./Fire";
import { FireResDto, FireStarterDto, IFireResDto } from "./dtos";

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

  await ensureIsAuthenticatedBy(ctx, dto.fire, starter);

  const fire = new Fire(entryParent, slug, name, starter, description);

  const fireKey = fire.getCompositeKey();

  const conflict = await objectExists(ctx, fireKey);

  if (conflict) throw new ConflictError(`Fire with key ${fireKey} already exists.`);

  await putChainObject(ctx, fire);

  const startedBy = new FireStarter(starter, fireKey);

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
        const fireAuthority = new FireAuthority(fireKey, identity);

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
        const fireModerator = new FireModerator(fireKey, identity);

        await putChainObject(ctx, fireModerator);
        fireRes.moderators.push(fireModerator);
      }
    }
  } catch (e) {
    throw new ValidationFailedError(`Failed to save moderators to chain: ${moderators}`);
  }

  return createValidDTO(FireResDto, fireRes);
}
