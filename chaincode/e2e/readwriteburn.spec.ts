import {
  BatchDto,
  ChainClient,
  ChainUser,
  CommonContractAPI,
  FeeVerificationDto,
  GalaChainResponse,
  GalaChainResponseType,
  asValidUserRef,
  commonContractAPI,
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
  FetchVotesDto,
  FetchVotesResDto,
  Fire,
  FireDto,
  FireResDto,
  FireStarterDto,
  IVoteResult,
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
  let submissionChainKey: string;
  let uncountedVotes: IVoteResult[];

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
      slug: "test-fire",
      name: "Test Fire",
      starter: userRef,
      description: "Test Fire Description",
      authorities: [userRef],
      moderators: [userRef],
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

    const dto = new FireStarterDto({
      fire: fire,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(client.readwriteburn.privateKey);

    const expectedResult = new Fire(fire.slug, fire.name, fire.starter, fire.description);

    const expectedFireKey = expectedResult.getCompositeKey();

    // When
    const response = await client.readwriteburn.FireStarter(dto);

    // Then
    expect(response).toEqual(transactionSuccess(expectedResult));

    fireChainKey = response.Data?.metadata.getCompositeKey() ?? "";

    expect(fireChainKey).toEqual(expectedFireKey);
  });

  test("ContributeSubmission", async () => {
    // Given
    const submission = new SubmissionDto({
      name: "test submission",
      fire: fireChainKey,
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
    const response = await client.readwriteburn.ContributeSubmission(dto);

    // Then
    expect(response).toEqual(transactionSuccess());

    expect(response.Data).toBeDefined();

    submissionChainKey = response.Data?.getCompositeKey() ?? "";
  });

  test("CastVote", async () => {
    // Given
    const vote = new VoteDto({
      entryType: "",
      entryParent: "",
      entry: "",
      quantity: new BigNumber("1"),
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

    const dto = new CastVoteDto({
      vote: vote,
      fee: fee,
      uniqueKey: randomUniqueKey()
    }).signed(user.privateKey);

    // When
    const response = await client.readwriteburn.CastVote(dto);

    // Then
    expect(response).toEqual(transactionSuccess());
  });

  test("Fetch uncounted votes", async () => {
    // Given
    const dto = new FetchVotesDto({});

    // When
    const response = await client.readwriteburn.FetchVotes(dto);

    // Then
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
});

interface ReadWriteBurnContractAPI {
  FireStarter(dto: FireStarterDto): Promise<GalaChainResponse<FireResDto>>;
  FetchFires(dto: FetchFiresDto): Promise<GalaChainResponse<FetchFiresResDto>>;
  ContributeSubmission(
    dto: ContributeSubmissionDto
  ): Promise<GalaChainResponse<Submission>>;
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
