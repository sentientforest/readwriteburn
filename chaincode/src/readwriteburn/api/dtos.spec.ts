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
  SubmissionWithChildren,
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
      slug: "test-submission",
      uniqueKey: "test-unique-key",
      entryParentKey: "parent-key",
      fire: "test-fire-key",
      name: "test submission",
      contributor: "test contributor",
      description: "Test description",
      url: "https://example.com"
    });

    const validationResult = await dto.validate();

    expect(validationResult).toEqual([]);
  });

  test("FetchSubmissionsDto", async () => {
    // Given
    const dto = new FetchSubmissionsDto({
      fireKey: "test-fire-key",
      entryParentKey: "test-parent-key"
    });

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("FetchSubmissionsDto with class-transformer", async () => {
    // Given
    const dto = plainToInstance(FetchSubmissionsDto, {
      fireKey: "test-fire-key",
      entryParentKey: "test-parent-key",
      bookmark: "page-2-string-key",
      limit: 1
    });

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("FetchSubmissionsResDto", async () => {
    // Given
    const submissionWithChildren1 = new SubmissionWithChildren({
      slug: "submission-1",
      uniqueKey: "001",
      entryParentKey: "test-fire-key",
      entryParentType: Fire.INDEX_KEY,
      name: "First Submission",
      contributor: "test-user-1",
      description: "Description for first submission",
      fireKey: "test-fire-key",
      recency: "999999999999",
      submissionKey: "submission-1-key",
      parentKey: "test-fire-key"
    });

    const submissionWithChildren2 = new SubmissionWithChildren({
      slug: "submission-2",
      uniqueKey: "002",
      entryParentKey: "submission-1-key",
      entryParentType: Submission.INDEX_KEY,
      name: "Second Submission",
      contributor: "test-user-2",
      description: "Description for second submission",
      fireKey: "test-fire-key",
      recency: "999999999998",
      submissionKey: "submission-2-key",
      parentKey: "submission-1-key"
    });

    const results = [submissionWithChildren1, submissionWithChildren2];
    const dto = new FetchSubmissionsResDto({ results, nextPageBookmark: "page2" });

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
  });

  test("SubmissionWithChildren", async () => {
    // Given
    const childSubmission = new SubmissionWithChildren({
      slug: "child-submission",
      uniqueKey: "child-001",
      entryParentKey: "parent-submission-key",
      entryParentType: Submission.INDEX_KEY,
      name: "Child Submission",
      contributor: "test-user",
      description: "A child submission",
      fireKey: "test-fire-key",
      recency: "999999999999",
      submissionKey: "child-submission-key",
      parentKey: "parent-submission-key"
    });

    const parentSubmission = new SubmissionWithChildren({
      slug: "parent-submission",
      uniqueKey: "parent-001",
      entryParentKey: "test-fire-key",
      entryParentType: Fire.INDEX_KEY,
      name: "Parent Submission",
      contributor: "test-user",
      description: "A parent submission",
      fireKey: "test-fire-key",
      recency: "999999999998",
      submissionKey: "parent-submission-key",
      parentKey: "test-fire-key",
      children: [childSubmission],
      childrenNextPageBookmark: ""
    });

    // When
    const validationResult = await parentSubmission.validate();

    // Then
    expect(validationResult).toEqual([]);
    expect(parentSubmission.children).toHaveLength(1);
    expect(parentSubmission.children![0].name).toEqual("Child Submission");
  });

  test("ContributeSubmissionDto", async () => {
    // Given
    const submissionDto = new SubmissionDto({
      slug: "contribute-test",
      uniqueKey: "contrib-001",
      entryParentKey: "fire-key",
      fire: "test-fire-key",
      name: "Contribution Test",
      contributor: userRef,
      description: "Test contribution"
    });

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const dto = new ContributeSubmissionDto({
      submission: submissionDto,
      fee: fee,
      uniqueKey: randomUniqueKey()
    });

    // When
    const validationResult = await dto.validate();

    // Then
    expect(validationResult).toEqual([]);
    expect(dto.submission.name).toEqual("Contribution Test");
    expect(dto.fee).toBeDefined();
  });

  test("FetchVotesResDto", async () => {
    const dto = plainToInstance(FetchVotesResDto, { results: [], nextPageBookmark: "" });

    const dtoValidation = await dto.validate();

    expect(dtoValidation).toEqual([]);
  });
});
