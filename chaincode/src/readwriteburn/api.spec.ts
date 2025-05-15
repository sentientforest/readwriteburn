import { fixture, transactionSuccess } from "@gala-chain/test";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";

test(`${ReadWriteBurnContract.name} API should match snapshot`, async () => {
  // Given
  const { contract, ctx } = fixture(ReadWriteBurnContract);

  // When
  const contractApi = await contract.GetContractAPI(ctx);

  // Then
  expect(contractApi).toEqual(transactionSuccess());
  expect({ ...contractApi.Data, contractVersion: "?.?.?" }).toMatchSnapshot();
});
