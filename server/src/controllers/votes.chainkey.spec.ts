import assert from "assert";
import "mocha";
import { getFireChainKey } from "./fires";
import { getSubmissionChainKey } from "./submissions";
import { dbService } from "../db";

describe("Vote System Chain Key Endpoints", () => {
  describe("Fire Chain Key Construction", () => {
    it("should construct proper fire chain key format", () => {
      // Test various fire slugs
      const testCases = [
        { slug: "test-fire", expected: "\\x00RWBF\\x00test-fire\\x00" },
        { slug: "my-fire-123", expected: "\\x00RWBF\\x00my-fire-123\\x00" },
        { slug: "fire", expected: "\\x00RWBF\\x00fire\\x00" }
      ];
      
      testCases.forEach(({ slug, expected }) => {
        // Mock dbService
        const originalGetSubfire = dbService.getSubfire;
        dbService.getSubfire = (s: string) => {
          if (s === slug) {
            return { slug, name: `${slug} name` };
          }
          return null;
        };
        
        let result: any;
        const req = { params: { slug } } as any;
        const res = {
          json: (data: any) => { result = data; },
          status: () => res
        } as any;
        const next = () => {};
        
        getFireChainKey(req, res, next);
        
        assert.strictEqual(result.chainKey, expected);
        assert.strictEqual(result.indexKey, "RWBF");
        assert.strictEqual(result.fireSlug, slug);
        
        // Restore original
        dbService.getSubfire = originalGetSubfire;
      });
    });
    
    it("should return 404 for non-existent fire", (done) => {
      const originalGetSubfire = dbService.getSubfire;
      dbService.getSubfire = () => null;
      
      const req = { params: { slug: "nonexistent" } } as any;
      const res = {
        json: (data: any) => {
          assert.deepStrictEqual(data, { error: "Fire not found" });
          dbService.getSubfire = originalGetSubfire;
          done();
        },
        status: (code: number) => {
          assert.strictEqual(code, 404);
          return res;
        }
      } as any;
      const next = () => {};
      
      getFireChainKey(req, res, next);
    });
  });
  
  describe("Submission Chain Key Lookup", () => {
    it("should return chain key with metadata for top-level submission", (done) => {
      const originalGetSubmissionById = dbService.getSubmissionById;
      dbService.getSubmissionById = (id: number) => {
        if (id === 123) {
          return {
            id: 123,
            name: "Test Submission",
            chainKey: "\\x00RWBS\\x00999\\x00submission-123\\x00unique-456\\x00",
            fire_slug: "test-fire",
            entryParent: null
          };
        }
        return null;
      };
      
      const req = { params: { id: "123" } } as any;
      const res = {
        json: (data: any) => {
          assert.strictEqual(data.submissionId, 123);
          assert.strictEqual(data.chainKey, "\\x00RWBS\\x00999\\x00submission-123\\x00unique-456\\x00");
          assert.strictEqual(data.indexKey, "RWBS");
          assert.strictEqual(data.fireSlug, "test-fire");
          assert.strictEqual(data.entryParent, null);
          assert.strictEqual(data.isTopLevel, true);
          
          dbService.getSubmissionById = originalGetSubmissionById;
          done();
        },
        status: () => res
      } as any;
      const next = () => {};
      
      getSubmissionChainKey(req, res, next);
    });
    
    it("should return chain key with metadata for reply submission", (done) => {
      const originalGetSubmissionById = dbService.getSubmissionById;
      const parentKey = "\\x00RWBS\\x00999\\x00parent-sub\\x00unique-123\\x00";
      
      dbService.getSubmissionById = (id: number) => {
        if (id === 456) {
          return {
            id: 456,
            name: "Reply Submission",
            chainKey: "\\x00RWBS\\x00998\\x00reply-sub\\x00unique-789\\x00",
            fire_slug: "test-fire",
            entryParent: parentKey
          };
        }
        return null;
      };
      
      const req = { params: { id: "456" } } as any;
      const res = {
        json: (data: any) => {
          assert.strictEqual(data.submissionId, 456);
          assert.strictEqual(data.chainKey, "\\x00RWBS\\x00998\\x00reply-sub\\x00unique-789\\x00");
          assert.strictEqual(data.indexKey, "RWBS");
          assert.strictEqual(data.fireSlug, "test-fire");
          assert.strictEqual(data.entryParent, parentKey);
          assert.strictEqual(data.isTopLevel, false);
          
          dbService.getSubmissionById = originalGetSubmissionById;
          done();
        },
        status: () => res
      } as any;
      const next = () => {};
      
      getSubmissionChainKey(req, res, next);
    });
    
    it("should handle NaN submission ID gracefully", (done) => {
      const originalGetSubmissionById = dbService.getSubmissionById;
      dbService.getSubmissionById = () => null;
      
      const req = { params: { id: "not-a-number" } } as any;
      const res = {
        json: (data: any) => {
          assert.deepStrictEqual(data, { error: "Submission not found" });
          dbService.getSubmissionById = originalGetSubmissionById;
          done();
        },
        status: (code: number) => {
          assert.strictEqual(code, 404);
          return res;
        }
      } as any;
      const next = () => {};
      
      getSubmissionChainKey(req, res, next);
    });
  });
  
  describe("Chain Key Format Validation", () => {
    it("should validate fire chain key format", () => {
      const validKeys = [
        "\\x00RWBF\\x00fire-1\\x00",
        "\\x00RWBF\\x00test\\x00",
        "\\x00RWBF\\x00my-awesome-fire\\x00"
      ];
      
      validKeys.forEach(key => {
        const parts = key.split("\\x00").filter(p => p);
        assert.strictEqual(parts[0], "RWBF", "First part should be RWBF");
        assert.strictEqual(parts.length, 2, "Should have exactly 2 parts");
      });
    });
    
    it("should validate submission chain key format", () => {
      const validKeys = [
        "\\x00RWBS\\x00999\\x00submission-slug\\x00unique-123\\x00",
        "\\x00RWBS\\x00998\\x00reply-slug\\x00unique-456\\x00"
      ];
      
      validKeys.forEach(key => {
        const parts = key.split("\\x00").filter(p => p);
        assert.strictEqual(parts[0], "RWBS", "First part should be RWBS");
        assert.strictEqual(parts.length, 4, "Should have exactly 4 parts");
        assert.ok(/^\d+$/.test(parts[1]), "Second part should be numeric (recency)");
      });
    });
  });
});