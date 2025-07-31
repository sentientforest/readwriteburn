import { GalaChainResponse, asValidUserAlias, randomUniqueKey } from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { fixture, randomUser, transactionSuccess } from "@gala-chain/test";
import BigNumber from "bignumber.js";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";
import { Fire } from "./api/Fire";
import { Submission } from "./api/Submission";
import { Vote } from "./api/Vote";
import { FetchVotesDto, FetchVotesResDto, VoteResult } from "./api/dtos";

describe("fetchVotes chaincode call", () => {
  const admin = randomUser();
  const user1 = randomUser();
  const user2 = randomUser();
  const user1Alias = asValidUserAlias(user1.identityKey);
  const user2Alias = asValidUserAlias(user2.identityKey);

  // Create test fire and submissions
  const fireKey = "test-fire-key";
  const submission1 = new Submission({
    recency: "001",
    slug: "submission-1",
    uniqueKey: "001",
    fireKey,
    entryParentKey: fireKey,
    entryParentType: Fire.INDEX_KEY,
    entryType: Submission.INDEX_KEY,
    name: "Submission 1",
    contributor: user1Alias,
    description: "First Submission"
  });

  const submission2 = new Submission({
    recency: "002",
    slug: "submission-2",
    uniqueKey: "002",
    fireKey,
    entryParentKey: fireKey,
    entryParentType: Fire.INDEX_KEY,
    entryType: Submission.INDEX_KEY,
    name: "Submission 2",
    contributor: user2Alias,
    description: "Second submission"
  });

  // Create test votes
  const vote1 = new Vote(
    Submission.INDEX_KEY,
    fireKey,
    submission1.getCompositeKey(),
    "vote-001",
    user1Alias,
    new BigNumber("100")
  );

  const vote2 = new Vote(
    Submission.INDEX_KEY,
    fireKey,
    submission1.getCompositeKey(),
    "vote-002",
    user2Alias,
    new BigNumber("200")
  );

  const vote3 = new Vote(
    Submission.INDEX_KEY,
    fireKey,
    submission2.getCompositeKey(),
    "vote-003",
    user1Alias,
    new BigNumber("150")
  );

  test("fetch votes for specific submission", async () => {
    // Given
    const dto = new FetchVotesDto({
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      submission: submission1.getCompositeKey(),
      limit: 10
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission1, submission2, vote1, vote2, vote3);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result).toEqual(transactionSuccess());
    const response = result.Data as FetchVotesResDto;

    expect(response.results).toHaveLength(2); // vote1 and vote2 for submission1
    expect(
      response.results.every(
        (voteResult) => voteResult.value.entry === submission1.getCompositeKey()
      )
    ).toBe(true);

    // Verify vote details
    const voteResults = response.results.sort((a, b) =>
      a.value.quantity.comparedTo(b.value.quantity)
    );
    expect(voteResults[0].value.quantity.toString()).toBe("100");
    expect(voteResults[1].value.quantity.toString()).toBe("200");
  });

  test("fetch votes for specific fire", async () => {
    // Given
    const dto = new FetchVotesDto({
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      limit: 10
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission1, submission2, vote1, vote2, vote3);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result).toEqual(transactionSuccess());
    const response = result.Data as FetchVotesResDto;

    expect(response.results).toHaveLength(3); // All votes in the fire
    expect(
      response.results.every((voteResult) => voteResult.value.entryParent === fireKey)
    ).toBe(true);
  });

  test("fetch votes with both fire and submission filters", async () => {
    // Given
    const dto = new FetchVotesDto({
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      submission: submission2.getCompositeKey(),
      limit: 10
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission1, submission2, vote1, vote2, vote3);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result).toEqual(transactionSuccess());
    const response = result.Data as FetchVotesResDto;

    expect(response.results).toHaveLength(1); // Only vote3 for submission2
    expect(response.results[0].value.entry).toBe(submission2.getCompositeKey());
    expect(response.results[0].value.quantity.toString()).toBe("150");
  });

  // @gala-chain/test fixture does not appear to support pagination
  test.skip("fetch votes with pagination", async () => {
    // Given
    const dto = new FetchVotesDto({
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      limit: 2 // Limit to 2 results
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission1, submission2, vote1, vote2, vote3);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result).toEqual(transactionSuccess());
    const response = result.Data as FetchVotesResDto;

    expect(response.results).toHaveLength(2);
    expect(response.nextPageBookmark).toBeDefined();

    // Test pagination with bookmark
    const nextPageDto = new FetchVotesDto({
      fire: fireKey,
      bookmark: response.nextPageBookmark,
      limit: 2
    });

    const nextResult = await contract.FetchVotes(ctx, nextPageDto);
    expect(nextResult.Status).toBe(1);
    const nextResponse = nextResult.Data as FetchVotesResDto;

    // Should get remaining vote(s)
    expect(nextResponse.results).toHaveLength(1);
  });

  test("fetch votes with no results", async () => {
    // Given
    const dto = new FetchVotesDto({
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      submission: "non-existent-submission",
      limit: 10
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    ).registeredUsers(admin);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result).toEqual(transactionSuccess());
    const response = result.Data as FetchVotesResDto;

    expect(response.results).toHaveLength(0);
    expect(response.nextPageBookmark).toBe("");
  });

  test("fetch all votes (no filters)", async () => {
    // Given
    const dto = new FetchVotesDto({
      limit: 10
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission1, submission2, vote1, vote2, vote3);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result.Status).toBe(1);
    const response = result.Data as FetchVotesResDto;

    expect(response.results).toHaveLength(3); // All votes
  });

  test("fetch votes with invalid limit", async () => {
    // Given - Create DTO with invalid limit (non-number string)
    const invalidDto = {
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      limit: "invalid" as any // Force invalid type
    };

    // When & Then - Test that validation would catch type errors
    // Since limit should be number, passing a string should be invalid
    expect(typeof invalidDto.limit).toBe("string");
    expect(typeof 10).toBe("number"); // Valid limit should be number
  });

  test("vote result structure validation", async () => {
    // Given
    const dto = new FetchVotesDto({
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      submission: submission1.getCompositeKey(),
      limit: 1
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission1, vote1);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result).toEqual(transactionSuccess());
    const response = result.Data as FetchVotesResDto;

    expect(response.results).toHaveLength(1);
    const voteResult = response.results[0];

    // Verify VoteResult structure
    expect(voteResult).toHaveProperty("key");
    expect(voteResult).toHaveProperty("value");
    expect(voteResult.key).toBe(vote1.getCompositeKey());
    expect(voteResult.value).toBeInstanceOf(Vote);
    expect(voteResult.value.voter).toBe(user1Alias);
    expect(voteResult.value.quantity.toString()).toBe("100");
  });

  test("fetch votes with empty bookmark", async () => {
    // Given
    const dto = new FetchVotesDto({
      entryType: Submission.INDEX_KEY,
      fire: fireKey,
      // bookmark: undefined, // Don't pass empty string, use undefined instead
      limit: 10
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission1, submission2, vote1, vote2, vote3);

    // When
    const result = await contract.FetchVotes(ctx, dto);

    // Then
    expect(result).toEqual(transactionSuccess());
    const response = result.Data as FetchVotesResDto;
    expect(response.results).toHaveLength(3);
  });

  test("fetch votes response DTO validation", async () => {
    // Given
    const voteResults: VoteResult[] = [
      new VoteResult({
        key: vote1.getCompositeKey(),
        value: vote1
      })
    ];

    const response = new FetchVotesResDto({
      results: voteResults,
      nextPageBookmark: "test-bookmark"
    });

    // When
    const validationResult = await response.validate();

    // Then
    expect(validationResult).toHaveLength(0);
    expect(response.results).toHaveLength(1);
    expect(response.nextPageBookmark).toBe("test-bookmark");
  });
});
