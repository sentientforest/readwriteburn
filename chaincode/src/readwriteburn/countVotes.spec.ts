import {
  GalaChainResponse,
  NotFoundError,
  asValidUserAlias,
  asValidUserRef,
  randomUniqueKey
} from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { fixture, randomUser } from "@gala-chain/test";
import BigNumber from "bignumber.js";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";
import { Submission } from "./api/Submission";
import { Vote } from "./api/Vote";
import { VoteCount } from "./api/VoteCount";
import { VoteRanking } from "./api/VoteRanking";
import { VoterReceipt } from "./api/VoterReceipt";
import { CountVotesDto } from "./api/dtos";

describe("countVotes chaincode call", () => {
  const admin = randomUser();
  const user1 = randomUser();
  const user2 = randomUser();
  const user1Ref = asValidUserRef(user1.identityKey);
  const user1Alias = asValidUserAlias(user1.identityKey);
  const user2Ref = asValidUserRef(user2.identityKey);
  const user2Alias = asValidUserAlias(user2.identityKey);

  // Create test submission
  const submission = new Submission(
    "test-fire-key",
    "test-fire-key",
    "001",
    "Test Submission",
    user1Alias,
    "Test submission description"
  );

  test("successful vote counting for single vote", async () => {
    // Given
    const vote = new Vote(
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey(),
      "vote-001",
      user1Alias,
      new BigNumber("100")
    );

    const dto = new CountVotesDto({
      votes: [vote.getCompositeKey()],
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission, vote);

    // When
    const result = await contract.CountVotes(ctx, dto);

    // Then
    expect(result).toEqual(GalaChainResponse.Success(undefined));

    // Verify VoteCount was created
    const voteCountKey = VoteCount.getCompositeKeyFromParts(VoteCount.INDEX_KEY, [
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey()
    ]);

    const voteCountState = await ctx.stub.getState(voteCountKey);
    expect(voteCountState).toBeDefined();

    const voteCount = VoteCount.deserialize(
      VoteCount,
      JSON.parse(voteCountState.toString())
    );
    expect(voteCount.quantity.toString()).toBe("100");
    expect(voteCount.ranking).toBeDefined();

    // Verify VoteRanking was created
    const voteRankingState = await ctx.stub.getState(voteCount.ranking!);
    expect(voteRankingState).toBeDefined();

    const voteRanking = VoteRanking.deserialize(
      VoteRanking,
      JSON.parse(voteRankingState.toString())
    );
    expect(voteRanking.quantity.toString()).toBe("100");
    expect(voteRanking.entry).toBe(submission.getCompositeKey());

    // Verify VoterReceipt was created
    const voterReceiptKey = VoterReceipt.getCompositeKeyFromParts(
      VoterReceipt.INDEX_KEY,
      [user1Alias, vote.getCompositeKey()]
    );

    const voterReceiptState = await ctx.stub.getState(voterReceiptKey);
    expect(voterReceiptState).toBeDefined();

    const voterReceipt = VoterReceipt.deserialize(
      VoterReceipt,
      JSON.parse(voterReceiptState.toString())
    );
    expect(voterReceipt.quantity.toString()).toBe("100");

    // Verify original vote was deleted
    const originalVoteState = await ctx.stub.getState(vote.getCompositeKey());
    expect(originalVoteState.length).toBe(0);
  });

  test("successful vote counting for multiple votes", async () => {
    // Given
    const vote1 = new Vote(
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey(),
      "vote-001",
      user1Alias,
      new BigNumber("100")
    );

    const vote2 = new Vote(
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey(),
      "vote-002",
      user2Alias,
      new BigNumber("200")
    );

    const dto = new CountVotesDto({
      votes: [vote1.getCompositeKey(), vote2.getCompositeKey()],
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1, user2)
      .savedState(submission, vote1, vote2);

    // When
    const result = await contract.CountVotes(ctx, dto);

    // Then
    expect(result).toEqual(GalaChainResponse.Success(undefined));

    // Verify VoteCount aggregated correctly
    const voteCountKey = VoteCount.getCompositeKeyFromParts(VoteCount.INDEX_KEY, [
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey()
    ]);

    const voteCountState = await ctx.stub.getState(voteCountKey);
    const voteCount = VoteCount.deserialize(
      VoteCount,
      JSON.parse(voteCountState.toString())
    );
    expect(voteCount.quantity.toString()).toBe("300"); // 100 + 200

    // Verify both votes were deleted
    const vote1State = await ctx.stub.getState(vote1.getCompositeKey());
    const vote2State = await ctx.stub.getState(vote2.getCompositeKey());
    expect(vote1State.length).toBe(0);
    expect(vote2State.length).toBe(0);

    // Verify both voter receipts were created
    const receipt1Key = VoterReceipt.getCompositeKeyFromParts(VoterReceipt.INDEX_KEY, [
      user1Alias,
      vote1.getCompositeKey()
    ]);
    const receipt2Key = VoterReceipt.getCompositeKeyFromParts(VoterReceipt.INDEX_KEY, [
      user2Alias,
      vote2.getCompositeKey()
    ]);

    const receipt1State = await ctx.stub.getState(receipt1Key);
    const receipt2State = await ctx.stub.getState(receipt2Key);
    expect(receipt1State).toBeDefined();
    expect(receipt2State).toBeDefined();
  });

  test("vote counting with existing VoteCount (accumulation)", async () => {
    // Given - Pre-existing VoteCount
    const existingVoteCount = new VoteCount(
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey(),
      new BigNumber("150")
    );

    const existingRanking = new VoteRanking(
      Submission.INDEX_KEY,
      submission.fire,
      new BigNumber("150"),
      submission.getCompositeKey()
    );
    existingVoteCount.ranking = existingRanking.getCompositeKey();

    const newVote = new Vote(
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey(),
      "vote-003",
      user1Alias,
      new BigNumber("50")
    );

    const dto = new CountVotesDto({
      votes: [newVote.getCompositeKey()],
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1)
      .savedState(submission, existingVoteCount, existingRanking, newVote);

    // When
    const result = await contract.CountVotes(ctx, dto);

    // Then
    expect(result).toEqual(GalaChainResponse.Success(undefined));

    // Verify VoteCount was updated
    const voteCountKey = existingVoteCount.getCompositeKey();
    const voteCountState = await ctx.stub.getState(voteCountKey);
    const updatedVoteCount = VoteCount.deserialize(
      VoteCount,
      JSON.parse(voteCountState.toString())
    );
    expect(updatedVoteCount.quantity.toString()).toBe("200"); // 150 + 50

    // Verify old ranking was deleted (new one created)
    const oldRankingState = await ctx.stub.getState(existingRanking.getCompositeKey());
    expect(oldRankingState.length).toBe(0);

    // Verify new ranking was created with updated quantity
    const newRankingState = await ctx.stub.getState(updatedVoteCount.ranking!);
    const newRanking = VoteRanking.deserialize(
      VoteRanking,
      JSON.parse(newRankingState.toString())
    );
    expect(newRanking.quantity.toString()).toBe("200");
  });

  test("vote counting with non-existent vote", async () => {
    // Given
    const dto = new CountVotesDto({
      votes: ["non-existent-vote-key"],
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    ).registeredUsers(admin);

    // When
    const result = await contract.CountVotes(ctx, dto);

    // Then
    expect(result.Status).toBe(0); // Error status
    expect(result.Message).toContain("No object with id non-existent-vote-key exists");
  });

  test("vote counting with empty votes array", async () => {
    // Given
    const dto = new CountVotesDto({
      votes: [],
      uniqueKey: randomUniqueKey()
    });

    // When & Then
    const validationResult = await dto.validate();
    expect(validationResult.length).toBeGreaterThan(0);
    expect(validationResult.some((error) => error.property === "votes")).toBe(true);
  });

  test("vote counting with maximum votes (1000)", async () => {
    // Given
    const votes: Vote[] = [];
    const voteKeys: string[] = [];

    // Create 1000 votes
    for (let i = 0; i < 1000; i++) {
      const vote = new Vote(
        Submission.INDEX_KEY,
        submission.fire,
        submission.getCompositeKey(),
        `vote-${i.toString().padStart(3, "0")}`,
        user1Alias,
        new BigNumber("1")
      );
      votes.push(vote);
      voteKeys.push(vote.getCompositeKey());
    }

    const dto = new CountVotesDto({
      votes: voteKeys,
      uniqueKey: randomUniqueKey()
    }).signed(admin.privateKey);

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    )
      .registeredUsers(admin, user1)
      .savedState(submission, ...votes);

    // When
    const result = await contract.CountVotes(ctx, dto);

    // Then
    expect(result).toEqual(GalaChainResponse.Success(undefined));

    // Verify final vote count
    const voteCountKey = VoteCount.getCompositeKeyFromParts(VoteCount.INDEX_KEY, [
      Submission.INDEX_KEY,
      submission.fire,
      submission.getCompositeKey()
    ]);

    const voteCountState = await ctx.stub.getState(voteCountKey);
    const voteCount = VoteCount.deserialize(
      VoteCount,
      JSON.parse(voteCountState.toString())
    );
    expect(voteCount.quantity.toString()).toBe("1000");
  });

  test("vote counting exceeding maximum votes (1001) should fail validation", async () => {
    // Given
    const voteKeys: string[] = [];
    for (let i = 0; i < 1001; i++) {
      voteKeys.push(`vote-${i}`);
    }

    const dto = new CountVotesDto({
      votes: voteKeys,
      uniqueKey: randomUniqueKey()
    });

    // When & Then
    const validationResult = await dto.validate();
    expect(validationResult.length).toBeGreaterThan(0);

    // Check that validation error mentions the constraint
    const hasRelevantError = validationResult.some((error) => {
      const errorString = error.toString();
      return (
        errorString.includes("votes") ||
        errorString.includes("maxSize") ||
        errorString.includes("1000")
      );
    });
    expect(hasRelevantError).toBe(true);
  });
});
