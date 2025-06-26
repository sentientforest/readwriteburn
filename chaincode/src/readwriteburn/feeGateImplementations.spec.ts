import { FeeVerificationDto, asValidUserRef, randomUniqueKey } from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { fixture, randomUser } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { ReadWriteBurnContract } from "./ReadWriteBurnContract";
import { FireDto, FireStarterDto } from "./api/dtos";
import { ReadWriteBurnFeeGateCodes, fireStarterFeeGate } from "./feeGateImplementations";

describe("feeGateImplementations", () => {
  const admin = randomUser();
  const user = randomUser();
  const userRef = asValidUserRef(user.identityKey);

  describe("ReadWriteBurnFeeGateCodes", () => {
    test("should have correct enum values", () => {
      expect(ReadWriteBurnFeeGateCodes.Unknown).toBe("");
      expect(ReadWriteBurnFeeGateCodes.FireStarter).toBe("FireStarter");
    });
  });

  describe("fireStarterFeeGate", () => {
    test("function exists and can be imported", () => {
      // Given/When/Then - Function should be importable and callable
      expect(typeof fireStarterFeeGate).toBe("function");
    });

    test("fee gate processing basic validation", async () => {
      // Given - Invalid fee DTO should fail validation before processing
      const invalidFee = plainToInstance(FeeVerificationDto, {
        authorization: "",
        authority: "", // Invalid empty authority
        created: Date.now(),
        txId: "", // Invalid empty txId
        quantity: new BigNumber("-1"), // Invalid negative quantity
        feeAuthorizationKey: "", // Invalid empty key
        uniqueKey: "" // Invalid empty unique key
      });

      // When
      const validationResult = await invalidFee.validate();

      // Then - Should have validation errors
      expect(validationResult.length).toBeGreaterThan(0);
    });

    test("fee DTO validation with valid data", async () => {
      // Given
      const validFee = plainToInstance(FeeVerificationDto, {
        authorization: "valid-auth",
        authority: asValidUserRef(user.identityKey),
        created: Date.now(),
        txId: "test-txid",
        quantity: new BigNumber("1"),
        feeAuthorizationKey: "test-key",
        uniqueKey: randomUniqueKey()
      });

      // When
      const validResult = await validFee.validate();

      // Then
      expect(validResult).toHaveLength(0);
    });
  });
});
