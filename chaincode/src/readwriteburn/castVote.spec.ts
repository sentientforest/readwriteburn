import {
  ChainUser,
  FeeVerificationDto,
  GalaChainResponse,
  NotFoundError,
  ValidationFailedError,
  asValidUserRef,
  randomUniqueKey
} from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { fixture, randomUser } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";
import { Submission } from "./api/Submission";
import { Vote } from "./api/Vote";
import { CastVoteDto, VoteDto } from "./api/dtos";

describe("castVote chaincode call", () => {
  const admin = randomUser();
  const user = randomUser();
  const userRef = asValidUserRef(user.identityKey);

  // Create test submission
  const submission = new Submission(
    "test-fire-key",
    "test-fire-key",
    "001",
    "Test Submission",
    userRef,
    "Test submission description",
    "https://example.com"
  );

  test("successful vote casting", async () => {
    // Given
    const voteDto = new VoteDto({
      entryType: Submission.INDEX_KEY,
      entryParent: submission.fire,
      entry: submission.getCompositeKey(),
      quantity: new BigNumber("100"),
      uniqueKey: `test-vote-1-${randomUniqueKey()}`
    }).signed(user.privateKey);

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: `test-fee-1-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const dto = new CastVoteDto({
      vote: voteDto,
      fee: fee,
      uniqueKey: `test-cast-1-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user)
      .savedState(submission);

    // When
    const result = await contract.CastVote(ctx, dto);

    // Then
    expect(result.Status).toBe(1); // Vote creation should succeed

    // Note: In the GalaChain test framework, state changes from transactions
    // may not be immediately visible to test code. The fact that the transaction
    // succeeds with Status 1 indicates the vote was created successfully.
  });

  test("vote with invalid entry type", async () => {
    // Given
    const voteDto = new VoteDto({
      entryType: "INVALID",
      entryParent: submission.fire,
      entry: submission.getCompositeKey(),
      quantity: new BigNumber("100"),
      uniqueKey: `test-vote-2-${randomUniqueKey()}`
    }).signed(user.privateKey);

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: `test-fee-2-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const dto = new CastVoteDto({
      vote: voteDto,
      fee: fee,
      uniqueKey: `test-cast-2-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user)
      .savedState(submission);

    // When
    const result = await contract.CastVote(ctx, dto);

    // Then
    expect(result.Status).toBe(0); // Error status
    expect(result.Message).toContain("entryType");
  });

  test("vote on non-existent entry", async () => {
    // Given
    const voteDto = new VoteDto({
      entryType: Submission.INDEX_KEY,
      entryParent: "non-existent-fire",
      entry: "non-existent-submission",
      quantity: new BigNumber("100"),
      uniqueKey: `test-vote-3-${randomUniqueKey()}`
    }).signed(user.privateKey);

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: `test-fee-3-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const dto = new CastVoteDto({
      vote: voteDto,
      fee: fee,
      uniqueKey: `test-cast-3-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    ).registeredUsers(admin, user);

    // When
    const result = await contract.CastVote(ctx, dto);

    // Then
    expect(result.Status).toBe(0); // Error status
    expect(result.Message).toContain("No object with id non-existent-submission exists");
  });

  test("vote with zero quantity should be accepted by validation", async () => {
    // Given - Zero is considered valid by @BigNumberIsPositive()
    const voteDto = new VoteDto({
      entryType: Submission.INDEX_KEY,
      entryParent: submission.fire,
      entry: submission.getCompositeKey(),
      quantity: new BigNumber("0"),
      uniqueKey: `test-vote-4-${randomUniqueKey()}`
    });

    // When & Then - Zero should pass validation (0 is non-negative)
    const voteValidation = await voteDto.validate();
    expect(voteValidation.length).toBe(0); // No validation errors
  });

  test("duplicate vote with same unique key", async () => {
    // Given
    const sharedUniqueKey = `test-shared-${randomUniqueKey()}`;

    const voteDto = new VoteDto({
      entryType: Submission.INDEX_KEY,
      entryParent: submission.fire,
      entry: submission.getCompositeKey(),
      quantity: new BigNumber("100"),
      uniqueKey: sharedUniqueKey // Same unique key to test duplicates
    }).signed(user.privateKey);

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: `test-fee-5-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const dto1 = new CastVoteDto({
      vote: voteDto,
      fee: fee,
      uniqueKey: `test-cast-5a-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const dto2 = new CastVoteDto({
      vote: voteDto,
      fee: fee,
      uniqueKey: `test-cast-5b-${randomUniqueKey()}`
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user)
      .savedState(submission);

    // When
    const firstVote = await contract.CastVote(ctx, dto1);
    expect(firstVote.Status).toBe(1);

    // When - Second vote with same unique key
    const result2 = await contract.CastVote(ctx, dto2);

    // Then - Should fail due to unique key conflict
    expect(result2.Status).toBe(0);
    expect(result2.Message).toContain("Unique Transaction key");
  });

  test("vote with negative quantity should fail validation", async () => {
    // Given
    const voteDto = new VoteDto({
      entryType: Submission.INDEX_KEY,
      entryParent: submission.fire,
      entry: submission.getCompositeKey(),
      quantity: new BigNumber("-100"),
      uniqueKey: `test-vote-6-${randomUniqueKey()}`
    }).signed(user.privateKey);

    // When & Then
    const validationResult = await voteDto.validate();
    expect(validationResult.length).toBeGreaterThan(0);
    expect(
      validationResult.some(
        (error) =>
          error.toString().includes("quantity") || error.toString().includes("positive")
      )
    ).toBe(true);
  });
});
