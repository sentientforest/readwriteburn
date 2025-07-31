import {
  ConflictError,
  FeeVerificationDto,
  GalaChainResponse,
  ValidationFailedError,
  asValidUserAlias,
  asValidUserRef,
  randomUniqueKey
} from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { fixture, randomUser } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";
import { Fire } from "./api/Fire";
import { Submission } from "./api/Submission";
import {
  ContributeSubmissionDto,
  ContributeSubmissionResDto,
  SubmissionDto
} from "./api/dtos";

describe("contributeSubmission chaincode call", () => {
  const admin = randomUser();
  const user = randomUser();
  const userAlias = asValidUserAlias(user.identityKey);
  const userRef = asValidUserRef(user.identityKey);
  // Create test fire
  const fire = new Fire("test-fire", "Test Fire", userAlias, "Test fire description");
  const fireSlug = "test-fire";
  const fireKey = fire.getCompositeKey();

  test("successful submission creation", async () => {
    // Given
    const submissionDto = new SubmissionDto({
      slug: "test-submission",
      name: "Test Submission",
      fire: fireSlug,
      contributor: userRef,
      description: "Test submission description",
      url: "https://example.com/article",
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

    const dto = new ContributeSubmissionDto({
      submission: submissionDto,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user)
      .savedState(fire);

    // When
    const result = await contract.ContributeSubmission(ctx, dto);

    // Then
    expect(result.Status).toBe(1); // Success
    expect(result.Data).toBeInstanceOf(ContributeSubmissionResDto);

    const response = result.Data as ContributeSubmissionResDto;
    expect(response.submission).toBeInstanceOf(Submission);
    expect(response.submissionKey).toBeDefined();

    const submission = response.submission;
    expect(submission.name).toBe("Test Submission");
    expect(submission.fireKey).toBe(fireKey);
    expect(submission.entryParentKey).toBe(fireKey);
    expect(submission.contributor).toBe(userAlias);
    expect(submission.description).toBe("Test submission description");
    expect(submission.url).toBe("https://example.com/article");
    expect(submission.uniqueKey).toBeDefined();
  });

  test("submission to non-existent fire", async () => {
    // Given
    const submissionDto = new SubmissionDto({
      slug: "test-submission",
      name: "Test Submission",
      fire: "non-existent-fire",
      contributor: userRef,
      description: "Test submission description",
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

    const dto = new ContributeSubmissionDto({
      submission: submissionDto,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    ).registeredUsers(admin, user);

    // When
    const result = await contract.ContributeSubmission(ctx, dto);

    // Then - Should return error response, not throw
    expect(result.Status).toBe(0); // Error status
    expect(result.ErrorKey).toBe("VALIDATION_FAILED");
  });

  test("nested submission (comment)", async () => {
    // Given - Create parent submission first
    const parentSubmission = new Submission({
      recency: "999999999999",
      slug: "parent-submission",
      uniqueKey: "001",
      fireKey: fireKey,
      entryParentKey: fireKey,
      entryParentType: Fire.INDEX_KEY,
      entryType: Submission.INDEX_KEY,
      name: "Parent Submission",
      contributor: userAlias,
      description: "Parent submission description"
    });

    const submissionDto = new SubmissionDto({
      slug: "comment-submission",
      name: "Comment on parent",
      fire: fireSlug,
      entryParentKey: parentSubmission.getCompositeKey(),
      contributor: userRef,
      description: "This is a comment",
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

    const dto = new ContributeSubmissionDto({
      submission: submissionDto,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user)
      .savedState(fire, parentSubmission);

    // When
    const result = await contract.ContributeSubmission(ctx, dto);

    // Then
    expect(result.Status).toBe(1);
    const response = result.Data as ContributeSubmissionResDto;
    const submission = response.submission;
    expect(submission.entryParentKey).toBe(parentSubmission.getCompositeKey());
    expect(submission.fireKey).toBe(fireKey);
    expect(submission.name).toBe("Comment on parent");
  });

  test("submission with minimal data", async () => {
    // Given
    const submissionDto = new SubmissionDto({
      slug: "minimal-submission",
      name: "Minimal Submission",
      fire: fireSlug,
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

    const dto = new ContributeSubmissionDto({
      submission: submissionDto,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user)
      .savedState(fire);

    // When
    const result = await contract.ContributeSubmission(ctx, dto);

    // Then
    expect(result.Status).toBe(1);
    const response = result.Data as ContributeSubmissionResDto;
    const submission = response.submission;
    expect(submission.name).toBe("Minimal Submission");
    expect(submission.contributor).toBeUndefined();
    expect(submission.description).toBeUndefined();
    expect(submission.url).toBeUndefined();
  });

  test("submission with empty name should fail validation", async () => {
    // Given
    const submissionDto = new SubmissionDto({
      slug: "empty-name-test",
      name: "",
      fire: fireSlug,
      uniqueKey: randomUniqueKey()
    });

    // When & Then
    const validationResult = await submissionDto.validate();
    expect(validationResult.length).toBeGreaterThan(0);
    expect(validationResult.some((error) => error.property === "name")).toBe(true);
  });

  test("submission with empty fire should fail validation", async () => {
    // Given
    const submissionDto = new SubmissionDto({
      slug: "empty-fire-test",
      name: "Test Submission",
      fire: "",
      uniqueKey: randomUniqueKey()
    });

    // When & Then
    const validationResult = await submissionDto.validate();
    expect(validationResult.length).toBeGreaterThan(0);
    expect(validationResult.some((error) => error.property === "fire")).toBe(true);
  });

  test("submission with long description", async () => {
    // Given
    const longDescription = "A".repeat(10000); // Very long description

    const submissionDto = new SubmissionDto({
      slug: "long-description-submission",
      name: "Long Description Submission",
      fire: fireSlug,
      contributor: userRef,
      description: longDescription,
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

    const dto = new ContributeSubmissionDto({
      submission: submissionDto,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user)
      .savedState(fire);

    // When
    const result = await contract.ContributeSubmission(ctx, dto);

    // Then
    expect(result.Status).toBe(1);
    const response = result.Data as ContributeSubmissionResDto;
    const submission = response.submission;
    expect(submission.description).toBe(longDescription);
  });
});
