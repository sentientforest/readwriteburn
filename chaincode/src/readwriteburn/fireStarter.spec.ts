import {
  ChainUser,
  FeeVerificationDto,
  GalaChainResponse,
  asValidUserRef,
  createValidDTO,
  randomUniqueKey
} from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { fixture, randomUser, writesMap } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";
import { Fire, FireAuthority, FireModerator, FireStarter } from "./api/Fire";
import { FireDto, FireResDto, FireStarterDto, IFireResDto } from "./api/dtos";

describe("fireStarter chaincode call", () => {
  test("fireStarter", async () => {
    // Given
    const admin = randomUser();
    const user = randomUser();

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

    const starter = asValidUserRef(user.identityKey);

    const expectedMetadata = new Fire(
      fire.entryParent,
      fire.slug,
      fire.name,
      fire.starter,
      fire.description
    );

    const fireKey = expectedMetadata.getCompositeKey();

    const startedBy = new FireStarter(starter, fireKey);
    const authority: FireAuthority = new FireAuthority(fireKey, starter);
    const moderator: FireModerator = new FireModerator(fireKey, starter);

    const data: IFireResDto = {
      metadata: expectedMetadata,
      starter: startedBy,
      authorities: [authority],
      moderators: [moderator]
    };

    const expectedResult: FireResDto = await createValidDTO(FireResDto, data);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    ).registeredUsers(admin, user);

    // When
    const result = await contract.FireStarter(ctx, dto);

    expect(result).toEqual(GalaChainResponse.Success(expectedResult));

    // todo: verify writesMap is correct
  });
});
