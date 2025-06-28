import assert from "assert";
import { describe, it } from "mocha";

import {
  type HashableContent,
  bulkVerifyContent,
  constantTimeEqual,
  createHashableContent,
  extractHash,
  formatHash,
  generateContentHash,
  hashModifiedContent,
  hashSubmissionContent,
  isValidHashFormat,
  prepareContentForHashing,
  verifyContentHash
} from "./contentHash";

describe("Content Hashing Utilities", () => {
  const testContent: HashableContent = {
    title: "Test Submission",
    description: "This is a test submission description",
    url: "https://example.com",
    timestamp: 1640995200000 // Fixed timestamp for deterministic tests
  };

  describe("prepareContentForHashing", () => {
    it("should normalize and stringify content", () => {
      const result = prepareContentForHashing(testContent);
      const parsed = JSON.parse(result);

      assert.strictEqual(parsed.title, "Test Submission");
      assert.strictEqual(parsed.description, "This is a test submission description");
      assert.strictEqual(parsed.url, "https://example.com");
      assert.strictEqual(parsed.timestamp, 1640995200000);
    });

    it("should trim whitespace from title and description", () => {
      const contentWithWhitespace: HashableContent = {
        title: "  Test Title  ",
        description: "  Test Description  ",
        url: "  https://example.com  ",
        timestamp: 1640995200000
      };

      const result = prepareContentForHashing(contentWithWhitespace);
      const parsed = JSON.parse(result);

      assert.strictEqual(parsed.title, "Test Title");
      assert.strictEqual(parsed.description, "Test Description");
      assert.strictEqual(parsed.url, "https://example.com");
    });

    it("should handle missing URL", () => {
      const contentWithoutUrl: HashableContent = {
        title: "Test Title",
        description: "Test Description",
        timestamp: 1640995200000
      };

      const result = prepareContentForHashing(contentWithoutUrl);
      const parsed = JSON.parse(result);

      assert.strictEqual(parsed.url, "");
    });
  });

  describe("generateContentHash", () => {
    it("should generate consistent SHA-256 hashes", () => {
      const hash1 = generateContentHash(testContent);
      const hash2 = generateContentHash(testContent);

      assert.strictEqual(hash1, hash2);
      assert.match(hash1, /^sha256:[a-f0-9]{64}$/);
    });

    it("should generate different hashes for different content", () => {
      const content1 = { ...testContent, title: "Title 1" };
      const content2 = { ...testContent, title: "Title 2" };

      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);

      assert.notStrictEqual(hash1, hash2);
    });

    it("should generate different hashes for different timestamps", () => {
      const content1 = { ...testContent, timestamp: 1000 };
      const content2 = { ...testContent, timestamp: 2000 };

      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);

      assert.notStrictEqual(hash1, hash2);
    });
  });

  describe("verifyContentHash", () => {
    it("should verify correct hashes", () => {
      const hash = generateContentHash(testContent);
      const verified = verifyContentHash(testContent, hash);

      assert.strictEqual(verified, true);
    });

    it("should reject incorrect hashes", () => {
      const hash = generateContentHash(testContent);
      const modifiedContent = { ...testContent, title: "Modified Title" };
      const verified = verifyContentHash(modifiedContent, hash);

      assert.strictEqual(verified, false);
    });
  });

  describe("constantTimeEqual", () => {
    it("should return true for equal strings", () => {
      const result = constantTimeEqual("test123", "test123");
      assert.strictEqual(result, true);
    });

    it("should return false for different strings", () => {
      const result = constantTimeEqual("test123", "test456");
      assert.strictEqual(result, false);
    });

    it("should return false for strings of different lengths", () => {
      const result = constantTimeEqual("test", "test123");
      assert.strictEqual(result, false);
    });
  });

  describe("hash format utilities", () => {
    describe("extractHash", () => {
      it("should extract hash from prefixed string", () => {
        const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        const prefixed = `sha256:${hash}`;

        assert.strictEqual(extractHash(prefixed), hash);
      });

      it("should return hash as-is if no prefix", () => {
        const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

        assert.strictEqual(extractHash(hash), hash);
      });
    });

    describe("formatHash", () => {
      it("should add prefix to unprefixed hash", () => {
        const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        const expected = `sha256:${hash}`;

        assert.strictEqual(formatHash(hash), expected);
      });

      it("should not double-prefix already prefixed hash", () => {
        const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        const prefixed = `sha256:${hash}`;

        assert.strictEqual(formatHash(prefixed), prefixed);
      });
    });

    describe("isValidHashFormat", () => {
      it("should validate correct hash format", () => {
        const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

        assert.strictEqual(isValidHashFormat(hash), true);
        assert.strictEqual(isValidHashFormat(`sha256:${hash}`), true);
      });

      it("should reject invalid hash formats", () => {
        assert.strictEqual(isValidHashFormat("invalid"), false);
        assert.strictEqual(isValidHashFormat("abcdef123"), false); // Too short
        assert.strictEqual(isValidHashFormat("xyz123" + "a".repeat(58)), false); // Invalid chars
      });
    });
  });

  describe("hashSubmissionContent", () => {
    it("should generate hash and timestamp", () => {
      const { hash, timestamp } = hashSubmissionContent(
        "Test Title",
        "Test Description",
        "https://example.com"
      );

      assert.match(hash, /^sha256:[a-f0-9]{64}$/);
      assert.strictEqual(typeof timestamp, "number");
      assert(timestamp > 0);
    });

    it("should use provided timestamp", () => {
      const fixedTimestamp = 1640995200000;
      const { hash, timestamp } = hashSubmissionContent(
        "Test Title",
        "Test Description",
        "https://example.com",
        fixedTimestamp
      );

      assert.strictEqual(timestamp, fixedTimestamp);

      // Should be deterministic with fixed timestamp
      const { hash: hash2 } = hashSubmissionContent(
        "Test Title",
        "Test Description",
        "https://example.com",
        fixedTimestamp
      );

      assert.strictEqual(hash, hash2);
    });
  });

  describe("createHashableContent", () => {
    it("should create hashable content structure", () => {
      const content = createHashableContent("Title", "Description", "https://example.com", 1640995200000);

      assert.strictEqual(content.title, "Title");
      assert.strictEqual(content.description, "Description");
      assert.strictEqual(content.url, "https://example.com");
      assert.strictEqual(content.timestamp, 1640995200000);
    });

    it("should generate timestamp if not provided", () => {
      const before = Date.now();
      const content = createHashableContent("Title", "Description");
      const after = Date.now();

      assert(content.timestamp >= before);
      assert(content.timestamp <= after);
    });
  });

  describe("bulkVerifyContent", () => {
    it("should verify multiple items", () => {
      const items = [
        {
          id: 1,
          content: testContent,
          expectedHash: generateContentHash(testContent)
        },
        {
          id: 2,
          content: { ...testContent, title: "Different Title" },
          expectedHash: generateContentHash(testContent) // Wrong hash
        }
      ];

      const results = bulkVerifyContent(items);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].verified, true);
      assert.strictEqual(results[1].verified, false);
      assert.strictEqual(results[0].id, 1);
      assert.strictEqual(results[1].id, 2);
    });
  });

  describe("hashModifiedContent", () => {
    it("should generate hash for modified content", () => {
      const originalHash = generateContentHash(testContent);
      const modifiedHash = hashModifiedContent(testContent, "Modified description");

      assert.notStrictEqual(modifiedHash, originalHash);
      assert.match(modifiedHash, /^sha256:[a-f0-9]{64}$/);
    });

    it("should preserve original metadata except description", () => {
      const modifiedHash = hashModifiedContent(testContent, "New description");

      const expectedModifiedContent: HashableContent = {
        ...testContent,
        description: "New description"
      };
      const expectedHash = generateContentHash(expectedModifiedContent);

      assert.strictEqual(modifiedHash, expectedHash);
    });
  });
});
