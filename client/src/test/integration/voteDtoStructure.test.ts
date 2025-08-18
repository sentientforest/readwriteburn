import { Fire, Submission, VoteDto } from "@/types/fire";
import { randomUniqueKey } from "@/utils";
import BigNumber from "bignumber.js";
import { describe, expect, it } from "vitest";

describe("Vote DTO Structure Validation", () => {
  describe("Fire Vote DTO", () => {
    it("should create valid fire vote DTO structure", () => {
      const fireSlug = "test-fire";
      const fireChainKey = `\x00RWBF\x00${fireSlug}\x00`;

      const voteDto = new VoteDto({
        entryType: Fire.INDEX_KEY,
        entryParent: "", // Empty string for top-level content
        entry: fireChainKey,
        quantity: new BigNumber(10),
        uniqueKey: randomUniqueKey()
      });

      // Verify structure matches chaincode expectations
      expect(voteDto.entryType).toBe("RWBF");
      expect(voteDto.entryParent).toBe("");
      expect(voteDto.entry).toBe(fireChainKey);
      expect(voteDto.quantity).toBeInstanceOf(BigNumber);
      expect(voteDto.quantity.toString()).toBe("10");
      expect(voteDto.uniqueKey).toBeTruthy();
      expect(voteDto.uniqueKey.length).toBeGreaterThan(10);
    });

    it("should handle fire chain key format correctly", () => {
      const testSlugs = ["my-fire", "test-123", "fire-with-dashes"];

      testSlugs.forEach((slug) => {
        const expectedKey = `\x00RWBF\x00${slug}\x00`;
        const voteDto = new VoteDto({
          entryType: Fire.INDEX_KEY,
          entryParent: "",
          entry: expectedKey,
          quantity: new BigNumber(1),
          uniqueKey: randomUniqueKey()
        });

        expect(voteDto.entry).toBe(expectedKey);
        // Verify null byte separators
        expect(voteDto.entry.startsWith("\x00")).toBe(true);
        expect(voteDto.entry.endsWith("\x00")).toBe(true);
        expect(voteDto.entry.includes("RWBF")).toBe(true);
      });
    });
  });

  describe("Submission Vote DTO", () => {
    it("should create valid top-level submission vote DTO", () => {
      const fireSlug = "test-fire";
      const fireChainKey = `\x00RWBF\x00${fireSlug}\x00`;
      const submissionChainKey = `\x00RWBS\x00999\x00submission-123\x00unique-456\x00`;

      const voteDto = new VoteDto({
        entryType: Submission.INDEX_KEY,
        entryParent: fireChainKey, // Fire is parent for top-level
        entry: submissionChainKey,
        quantity: new BigNumber(5),
        uniqueKey: randomUniqueKey()
      });

      // Verify structure
      expect(voteDto.entryType).toBe("RWBS");
      expect(voteDto.entryParent).toBe(fireChainKey);
      expect(voteDto.entry).toBe(submissionChainKey);
      expect(voteDto.quantity.toString()).toBe("5");
    });

    it("should create valid reply submission vote DTO", () => {
      const parentSubmissionKey = `\x00RWBS\x00999\x00parent-sub\x00unique-123\x00`;
      const replyChainKey = `\x00RWBS\x00998\x00reply-sub\x00unique-789\x00`;

      const voteDto = new VoteDto({
        entryType: Submission.INDEX_KEY,
        entryParent: parentSubmissionKey, // Parent submission for replies
        entry: replyChainKey,
        quantity: new BigNumber(3),
        uniqueKey: randomUniqueKey()
      });

      // Verify structure
      expect(voteDto.entryType).toBe("RWBS");
      expect(voteDto.entryParent).toBe(parentSubmissionKey);
      expect(voteDto.entry).toBe(replyChainKey);
      expect(voteDto.quantity.toString()).toBe("3");
    });

    it("should validate submission chain key format", () => {
      // Valid submission chain key format: \x00RWBS\x00{recency}\x00{slug}\x00{uniqueKey}\x00
      const validKey = `\x00RWBS\x00999\x00test-submission\x00abc123\x00`;

      const parts = validKey.split("\x00").filter((p) => p);
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe("RWBS");
      expect(parts[1]).toBe("999"); // recency
      expect(parts[2]).toBe("test-submission"); // slug
      expect(parts[3]).toBe("abc123"); // uniqueKey
    });
  });

  describe("Vote DTO Serialization", () => {
    it("should serialize vote DTO correctly for signing", () => {
      const voteDto = new VoteDto({
        entryType: Fire.INDEX_KEY,
        entryParent: "",
        entry: `\x00RWBF\x00test-fire\x00`,
        quantity: new BigNumber(10),
        uniqueKey: "unique-123"
      });

      // Verify all required fields are present
      const serialized = JSON.parse(JSON.stringify(voteDto));
      expect(serialized).toHaveProperty("entryType");
      expect(serialized).toHaveProperty("entryParent");
      expect(serialized).toHaveProperty("entry");
      expect(serialized).toHaveProperty("quantity");
      expect(serialized).toHaveProperty("uniqueKey");

      // Verify quantity serialization
      expect(serialized.quantity).toBe("10"); // BigNumber should serialize to string
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty entryParent for fires", () => {
      const voteDto = new VoteDto({
        entryType: Fire.INDEX_KEY,
        entryParent: "", // Must be empty string, not null or undefined
        entry: `\x00RWBF\x00fire\x00`,
        quantity: new BigNumber(1),
        uniqueKey: randomUniqueKey()
      });

      expect(voteDto.entryParent).toBe("");
      expect(voteDto.entryParent).not.toBeNull();
      expect(voteDto.entryParent).not.toBeUndefined();
    });

    it("should handle large vote quantities", () => {
      const largeQuantity = new BigNumber("1000000000000000000"); // 1e18

      const voteDto = new VoteDto({
        entryType: Fire.INDEX_KEY,
        entryParent: "",
        entry: `\x00RWBF\x00fire\x00`,
        quantity: largeQuantity,
        uniqueKey: randomUniqueKey()
      });

      expect(voteDto.quantity.toString()).toBe("1000000000000000000");
      expect(voteDto.quantity.isFinite()).toBe(true);
    });

    it("should maintain binary format in chain keys", () => {
      const binaryKey = `\x00RWBF\x00test\x00`;

      const voteDto = new VoteDto({
        entryType: Fire.INDEX_KEY,
        entryParent: "",
        entry: binaryKey,
        quantity: new BigNumber(1),
        uniqueKey: randomUniqueKey()
      });

      // Verify binary format is preserved
      expect(voteDto.entry).toBe(binaryKey);
      expect(voteDto.entry.charCodeAt(0)).toBe(0); // Null byte
      expect(voteDto.entry.charCodeAt(voteDto.entry.length - 1)).toBe(0); // Null byte
    });
  });
});
