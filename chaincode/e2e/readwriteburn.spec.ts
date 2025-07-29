import {
  BatchDto,
  ChainClient,
  ChainUser,
  CommonContractAPI,
  FeeVerificationDto,
  GalaChainResponse,
  GalaChainResponseType,
  asValidUserAlias,
  asValidUserRef,
  commonContractAPI,
  createValidDTO,
  randomUniqueKey
} from "@gala-chain/api";
import {
  AdminChainClients,
  TestClients,
  transactionErrorKey,
  transactionSuccess
} from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

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
  Fire,
  FireAuthority,
  FireDto,
  FireModerator,
  FireResDto,
  FireStarter,
  FireStarterDto,
  IFireResDto,
  IVoteResult,
  RWB_TYPES,
  Submission,
  SubmissionDto,
  SubmissionResDto,
  VoteDto,
  VoteResult
} from "../src/readwriteburn";

describe("Read Write Burn Contract", () => {
  const readwriteburnContractConfig = {
    readwriteburn: {
      channel: "product-channel",
      chaincode: "basic-product",
      contract: "ReadWriteBurn",
      api: readwriteburnContractAPI
    }
  };

  let client: AdminChainClients<typeof readwriteburnContractConfig>;
  let user: ChainUser;
  let user2: ChainUser;
  let fireChainKey: string;
  let fireSlug: string;
  let submissionChainKey: string;
  let commentChainKey: string;
  let uncountedVotes: IVoteResult[] = [];

  beforeAll(async () => {
    client = await TestClients.createForAdmin(readwriteburnContractConfig);
    user = await client.createRegisteredUser();
    user2 = await client.createRegisteredUser();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  test("FireStarter", async () => {
    // Given

    const userRef = asValidUserRef(user.identityKey);

    const fire = new FireDto({
      slug: `test-fire-${randomUniqueKey()}`,
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
    }).signed(client.readwriteburn.privateKey);

    const dto = new FireStarterDto({
      fire: fire,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(client.readwriteburn.privateKey);

    const starter = asValidUserAlias(user.identityKey);

    const expectedMetadata = new Fire(
      fire.slug,
      fire.name,
      asValidUserAlias(fire.starter),
      fire.description
    );

    const expectedFireKey = expectedMetadata.getCompositeKey();

    const startedBy = new FireStarter(starter, expectedFireKey);
    const authority: FireAuthority = new FireAuthority(expectedFireKey, starter);
    const moderator: FireModerator = new FireModerator(expectedFireKey, starter);

    const data: IFireResDto = {
      metadata: expectedMetadata,
      starter: startedBy,
      authorities: [authority],
      moderators: [moderator]
    };

    const expectedResult: FireResDto = await createValidDTO(FireResDto, data);
    // When
    const response = await client.readwriteburn.FireStarter(dto);

    // Then
    expect(response).toEqual(transactionSuccess(expectedResult));

    const metadataResult = response.Data?.metadata as Fire;
    const { slug, name, description } = metadataResult;
    fireSlug = slug;
    fireChainKey =
      new Fire(slug, name, starter, description).getCompositeKey() ?? "";

    expect(fireChainKey).toEqual(expectedFireKey);
  });

  test("ContributeSubmission", async () => {
    // Given
    const submission = new SubmissionDto({
      slug: `test-submission-${randomUniqueKey()}`,
      name: `test submission ${randomUniqueKey()}`,
      fire: fireSlug,
      contributor: "contributor",
      url: "url",
      description: "",
      uniqueKey: randomUniqueKey()
    });

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: randomUniqueKey()
    }).signed(client.readwriteburn.privateKey);

    const dto = new ContributeSubmissionDto({
      submission: submission,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(user.privateKey);

    // When
    const dtoValidation = await dto.validate();
    const response = await client.readwriteburn.ContributeSubmission(dto);

    // Then
    expect(dtoValidation).toEqual([]);
    expect(response).toEqual(transactionSuccess());

    expect(response.Data).toBeDefined();

    const submissionResult = response.Data as Submission;

    const { recency, slug, uniqueKey } = submissionResult;

    submissionChainKey = Submission.getCompositeKeyFromParts(Submission.INDEX_KEY, [recency, slug, uniqueKey]);
  });

  test("CastVote", async () => {
    // Given
    const vote = new VoteDto({
      entryType: Submission.INDEX_KEY,
      entryParent: fireChainKey,
      entry: submissionChainKey,
      quantity: new BigNumber("1"),
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
    }).signed(client.readwriteburn.privateKey);

    const dto = new CastVoteDto({
      vote: vote,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(client.readwriteburn.privateKey);

    // When
    const response = await client.readwriteburn.CastVote(dto);

    // Then
    expect(response).toEqual(transactionSuccess());
  });

  test("Fetch uncounted votes", async () => {
    // Given
    const dto = new FetchVotesDto({});

    // When
    const dtoValidation = await dto.validate();
    const response = await client.readwriteburn.FetchVotes(dto);

    // Then
    expect(dtoValidation).toEqual([]);
    expect(response).toEqual(transactionSuccess());

    uncountedVotes = response.Data?.results ?? [];
  });

  test("CountVotes using previously retrieved chain keys", async () => {
    // Given
    const dto = new CountVotesDto({
      votes: uncountedVotes.map((v) => v.key),
      uniqueKey: randomUniqueKey()
    }).signed(user.privateKey);

    // When
    const response = await client.readwriteburn.CountVotes(dto);

    // Then
    expect(response).toEqual(transactionSuccess());
  });

  test("FetchVotes does not include previously-counted votes", async () => {
    // Given
    const dto = new FetchVotesDto({});

    // When
    const response = await client.readwriteburn.FetchVotes(dto);

    // Then
    expect(response).toEqual(transactionSuccess());
    expect(response.Data?.results).toEqual([]);
  });

  test("Comment on Submission (sub-submission or parent/child submission", async () => {
    // Given
    const submission = new SubmissionDto({
      slug: `test-comment-${randomUniqueKey()}`,
      name: `test comment ${randomUniqueKey()}`,
      fire: fireSlug,
      entryParentKey: submissionChainKey,
      contributor: "contributor",
      url: "url",
      description: "",
      uniqueKey: randomUniqueKey()
    });

    const fee = plainToInstance(FeeVerificationDto, {
      authorization: "",
      authority: asValidUserRef(user.identityKey),
      created: Date.now(),
      txId: "test txid",
      quantity: new BigNumber("1"),
      feeAuthorizationKey: "test key",
      uniqueKey: randomUniqueKey()
    }).signed(client.readwriteburn.privateKey);

    const dto = new ContributeSubmissionDto({
      submission: submission,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(user.privateKey);

    // When
    const dtoValidation = await dto.validate();
    const response = await client.readwriteburn.ContributeSubmission(dto);

    // Then
    expect(dtoValidation).toEqual([]);
    expect(response).toEqual(transactionSuccess());

    expect(response.Data).toBeDefined();

    const submissionResult = response.Data as Submission;

    const { recency, slug, uniqueKey } = submissionResult;

    commentChainKey = Submission.getCompositeKeyFromParts(Submission.INDEX_KEY, [recency, slug, uniqueKey]);
  });

  test("Upvote a comment", async () => {
    // Given
    const vote = new VoteDto({
      entryType: Submission.INDEX_KEY,
      entryParent: submissionChainKey,
      entry: commentChainKey,
      quantity: new BigNumber("1"),
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
    }).signed(client.readwriteburn.privateKey);

    const dto = new CastVoteDto({
      vote: vote,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(client.readwriteburn.privateKey);

    // When
    const response = await client.readwriteburn.CastVote(dto);

    // Then
    expect(response).toEqual(transactionSuccess());
  });

  test("Fetch only top-level submissions for a given category/fire", async () => {
    const dto = new FetchSubmissionsDto({
      fireKey: fireChainKey
    });

    const response = await client.readwriteburn.FetchSubmissions(dto);

    expect(response).toEqual(transactionSuccess());
    expect(response.Data?.results?.length).toBe(1);
  });
});

interface ReadWriteBurnContractAPI {
  FireStarter(dto: FireStarterDto): Promise<GalaChainResponse<FireResDto>>;
  FetchFires(dto: FetchFiresDto): Promise<GalaChainResponse<FetchFiresResDto>>;
  ContributeSubmission(
    dto: ContributeSubmissionDto
  ): Promise<GalaChainResponse<Submission>>;
  FetchSubmissions(
    dto: FetchSubmissionsDto
  ): Promise<GalaChainResponse<FetchSubmissionsResDto>>;
  CastVote(dto: CastVoteDto): Promise<GalaChainResponse<void>>;
  CountVotes(dto: CountVotesDto): Promise<GalaChainResponse<void>>;
  FetchVotes(dto: FetchVotesDto): Promise<GalaChainResponse<FetchVotesResDto>>;
}

function readwriteburnContractAPI(
  client: ChainClient
): ReadWriteBurnContractAPI & CommonContractAPI {
  return {
    ...commonContractAPI(client),

    FireStarter(dto: FireStarterDto) {
      return client.submitTransaction("FireStarter", dto) as Promise<
        GalaChainResponse<FireResDto>
      >;
    },
    FetchFires(dto: FetchFiresDto) {
      return client.evaluateTransaction("FetchFires", dto) as Promise<
        GalaChainResponse<FetchFiresResDto>
      >;
    },
    ContributeSubmission(dto: ContributeSubmissionDto) {
      return client.submitTransaction("ContributeSubmission", dto) as Promise<
        GalaChainResponse<Submission>
      >;
    },
    FetchSubmissions(dto: FetchSubmissionsDto) {
      return client.evaluateTransaction("FetchSubmissions", dto) as Promise<
        GalaChainResponse<FetchSubmissionsResDto>
      >;
    },
    CastVote(dto: CastVoteDto) {
      return client.submitTransaction("CastVote", dto) as Promise<
        GalaChainResponse<void>
      >;
    },
    CountVotes(dto: CountVotesDto) {
      return client.submitTransaction("CountVotes", dto) as Promise<
        GalaChainResponse<void>
      >;
    },
    FetchVotes(dto: FetchVotesDto) {
      return client.submitTransaction("FetchVotes", dto) as Promise<
        GalaChainResponse<FetchVotesResDto>
      >;
    }
  };
}
