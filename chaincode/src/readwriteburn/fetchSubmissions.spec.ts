import {
  ChainUser,
  FeeVerificationDto,
  GalaChainResponse,
  asValidUserRef,
  createValidDTO,
  randomUniqueKey
} from "@gala-chain/api";
import { GalaChainContext, takeUntilUndefined } from "@gala-chain/chaincode";
import { fixture, randomUser, writesMap } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";
import { Fire } from "./api/Fire";
import { Submission } from "./api/Submission";
import { FetchSubmissionsDto, FetchSubmissionsResDto } from "./api/dtos";

describe("fetchSubmissions chaincode call", () => {
  const fireChainKey = "test|fire";

  const submission = new Submission(
    fireChainKey,
    fireChainKey,
    Fire.INDEX_KEY,
    "001",
    "name"
  );
  const comment = new Submission(
    fireChainKey,
    submission.getCompositeKey(),
    Submission.INDEX_KEY,
    "002",
    "submission b"
  );

  const submissions = [submission, comment];

  test("fetchSubmissions", async () => {
    const dto = new FetchSubmissionsDto({
      fire: fireChainKey,
      entryParent: fireChainKey
    });

    const expectedResponse = new FetchSubmissionsResDto({
      results: [submission],
      nextPageBookmark: ""
    });

    const { ctx, contract } = fixture<GalaChainContext, ReadWriteBurnContract>(
      ReadWriteBurnContract
    ).savedState(submission, comment);

    const response = await contract.FetchSubmissions(ctx, dto);

    expect(response).toEqual(GalaChainResponse.Success(expectedResponse));
  });
});
