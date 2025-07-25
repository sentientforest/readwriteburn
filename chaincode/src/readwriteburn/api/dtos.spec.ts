import {
  ChainUser,
  FeeVerificationDto,
  asValidUserAlias,
  asValidUserRef,
  createValidDTO,
  randomUniqueKey
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { Fire, FireAuthority, FireModerator, FireStarter } from "./Fire";
import { Submission } from "./Submission";
import {
  CastVoteDto,
  ContributeSubmissionDto,
  CountVotesDto,
  FetchFiresDto,
  FetchFiresResDto,
  FetchSubmissionsDto,
  FetchSubmissionsResDto,
  FetchVotesDto,
  FetchVotesResDto,
  FireDto,
  FireResDto,
  FireStarterDto,
  IFireResDto,
  SubmissionDto,
  VoteDto,
  VoteResult
} from "./dtos";

describe("readwriteburn DTOs", () => {
  let fireStarterDto: FireStarterDto;
  let fireDto: FireDto;

  const admin = ChainUser.withRandomKeys();
  const user = ChainUser.withRandomKeys();

  const userRef = asValidUserRef(user.identityKey);
  const userAlias = asValidUserAlias(userRef);

  test("FireDto", async () => {
    fireDto = new FireDto({
      slug: "test-fire",
      name: "Test Fire",
      starter: userRef,
      description: "Test Fire Description",
      authorities: [userRef],
      moderators: [userRef],
      uniqueKey: randomUniqueKey()
    }).signed(user.privateKey);

    const dtoValidation = await fireDto.validate();

    expect(dtoValidation).toEqual([]);
  });

  test("FireDto with class transformer", async () => {
    // Given
    const dto = plainToInstance(FireDto, {
      slug: "test-fire",
      name: "Test Fire",
      starter: userRef,
      description: "Test Fire Description",
      authorities: [userRef],
      moderators: [userRef],
      uniqueKey: randomUniqueKey()
    });

    // When
    const dtoValidation = await dto.validate();

    // Then
    expect(dtoValidation).toEqual([]);
  });

  test("FireStarterDto", async () => {
    const fire = fireDto;

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

  test("FireStarterDto with class transformer", async () => {
    const fire = fireDto;

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const dto = plainToInstance(FireStarterDto, {
      fire: fire,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    expect(dto).toBeDefined();

    const validationResult = await dto.validate();

    expect(validationResult).toEqual([]);

    fireStarterDto = dto;
  });

  test("FetchFiresDto", async () => {
    // Given
    const dto = new FetchFiresDto({});

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("FetchFiresDto with class transformer", async () => {
    // Given
    const dto = plainToInstance(FetchFiresDto, {});

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("FireResDto", async () => {
    const starter = asValidUserAlias("client|abc");

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

    const dto: FireResDto = new FireResDto(data);

    expect(dto).toBeDefined();

    const validationResult = await dto.validate();

    expect(validationResult).toEqual([]);
  });

  test("FireResDto with class transformer", async () => {
    const starter = asValidUserAlias("client|abc");

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

  test("FetchFiresResDto", async () => {
    const starter = asValidUserAlias("client|abc");

    const fire = new Fire(
      "",
      "test-fire",
      "Test Fire",
      starter,
      "Test description summary text"
    );

    const dto: FetchFiresResDto = new FetchFiresResDto({
      results: [fire],
      nextPageBookmark: ""
    });

    const validationResult = await dto.validate();

    expect(validationResult).toEqual([]);
  });

  test("SubmissionDto", async () => {
    const dto = new SubmissionDto({
      name: "test submission",
      fire: "test fire key",
      entryParent: "parent submission",
      parentEntryType: Submission.INDEX_KEY, // Reply to submission, parent is a Submission
      contributor: "test contributor",
      uniqueKey: "test unique key"
    });

    const validationResult = await dto.validate();

    expect(validationResult).toEqual([]);
  });

  test("FetchSubmissionsDto", async () => {
    // Given
    const dto = new FetchSubmissionsDto({
      fire: "test fire key",
      entryParent: "test fire key"
    });

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("FetchSubmissionsDto with class-transformer", async () => {
    // Given
    const dto = plainToInstance(FetchSubmissionsDto, {
      fire: "test fire key",
      entryParent: "test fire key",
      bookmark: "page 2 string key",
      limit: 1
    });

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("FetchSubmissionsResDto", async () => {
    // Given
    const results = [
      new Submission("a", "fireChainKey", Fire.INDEX_KEY, "001", "name"),
      new Submission(
        "b",
        "submission-a-chain-key",
        Submission.INDEX_KEY,
        "002",
        "submission b"
      )
    ];
    const dto = new FetchSubmissionsResDto({ results, nextPageBookmark: "page2" });

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("FetchVotesResDto", async () => {
    const dto = plainToInstance(FetchVotesResDto, { results: [], nextPageBookmark: "" });

    const dtoValidation = await dto.validate();

    expect(dtoValidation).toEqual([]);
  });
});
