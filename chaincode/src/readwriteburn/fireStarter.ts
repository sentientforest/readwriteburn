import { ConflictError, ValidationFailedError } from "@gala-chain/api";
import { GalaChainContext, objectExists, putChainObject } from "@gala-chain/chaincode";

import { Fire, FireAuthority, FireModerator, FireStarter } from "./Fire";
import { FireStarterDto } from "./dtos";

export async function fireStarter(ctx: GalaChainContext, dto: FireStarterDto): Promise<void> {
  const { slug, name, starter, description, authorities, moderators } = dto.fire;

  const fire = new Fire(slug, name, starter, description);

  const fireKey = fire.getCompositeKey();

  const conflict = await objectExists(ctx, fireKey);

  if (conflict) throw new ConflictError(`Fire with key ${fireKey} already exists.`);

  await putChainObject(ctx, fire);

  const startedBy = new FireStarter(ctx.callingUser, fireKey);

  if (starter !== startedBy.identity) {
    throw new ValidationFailedError(
      `Mistmatch between callingUser ${ctx.callingUser} and stated fire starter ${starter}`
    );
  }

  await putChainObject(ctx, startedBy);

  if (authorities.length < 1) {
    const fireAuthority = new FireAuthority(fireKey, ctx.callingUser);

    await putChainObject(ctx, fireAuthority);
  } else {
    for (const identity of authorities) {
      const fireAuthority = new FireAuthority(fireKey, identity);

      await putChainObject(ctx, fireAuthority);
    }
  }

  if (moderators.length < 1) {
    const fireModerator = new FireModerator(fireKey, ctx.callingUser);

    await putChainObject(ctx, fireModerator);
  } else {
    for (const identity of moderators) {
      const fireModerator = new FireModerator(fireKey, identity);

      await putChainObject(ctx, fireModerator);
    }
  }
}
