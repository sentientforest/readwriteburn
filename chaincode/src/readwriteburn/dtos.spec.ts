import {
  ChainUser,
  FeeVerificationDto,
  asValidUserRef,
  createValidDTO,
  randomUniqueKey
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { Fire, FireAuthority, FireModerator, FireStarter } from "./Fire";
import { FireDto, FireResDto, FireStarterDto, IFireResDto } from "./dtos";

describe("readwriteburn DTOs", () => {
  let fireStarterDto: FireStarterDto;

  test("FireStarterDto", async () => {
    const admin = ChainUser.withRandomKeys();
    const user = ChainUser.withRandomKeys();

    const userRef = asValidUserRef(user.identityKey);

    const fire = new FireDto({
      slug: "test-fire",
      name: "Test Fire",
      starter: userRef,
      description: "Test Fire Description",
      authorities: [userRef],
      moderators: [userRef],
      uniqueKey: randomUniqueKey()
    }).signed(user.privateKey);

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const dto = new FireStarterDto({
      fire: fire,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    expect(dto).toBeDefined();

    const validationResult = await dto.validate();

    expect(validationResult).toEqual([]);

    fireStarterDto = dto;
  });

  test("FireResDto", async () => {
    const starter = asValidUserRef("client|abc");

    const fire = new Fire(
      "",
      "test-fire",
      "Test Fire",
      starter,
      "Test description summary text"
    );

    const fireKey = fire.getCompositeKey();

    const startedBy = new FireStarter(starter, fireKey);
    const authority: FireAuthority = new FireAuthority(fireKey, starter);
    const moderator: FireModerator = new FireModerator(fireKey, starter);

    const data: IFireResDto = {
      metadata: fire,
      starter: startedBy,
      authorities: [authority],
      moderators: [moderator]
    };

    const dto: FireResDto = await createValidDTO(FireResDto, data);

    expect(dto).toBeDefined();

    const validationResult = await dto.validate();

    expect(validationResult).toEqual([]);
  });
});
