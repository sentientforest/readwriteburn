import assert from "assert";
import Database from "better-sqlite3";
import { unlinkSync } from "fs";
import { existsSync } from "fs";
import "mocha";

import { dbService, initializeDatabase } from "./db";
import { SubfireDto, SubfireResDto, SubmissionDto } from "./types";

let db: Database.Database;

const TEST_DB = "test.db";

describe("Database Service", () => {
  beforeEach(() => {
    // Delete test database if it exists
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
    // Initialize fresh test database
    process.env.DB_FILE = TEST_DB;
    // Close any existing connection
    dbService.closeDatabase();
    initializeDatabase();
  });

  afterEach(() => {
    // Clean up test database
    dbService.closeDatabase();
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  describe("Subfire Management", () => {
    it("should create a subfire with authorities and moderators", () => {
      const subfire: SubfireDto = {
        slug: "test-subfire-create",
        name: "TestSubfire-Create",
        description: "A test subfire",
        authorities: ["auth1", "auth2"],
        moderators: ["mod1", "mod2"]
      };

      const result = dbService.createSubfire(subfire);

      assert(result !== null);
      assert.strictEqual(result.name, subfire.name);
      assert.strictEqual(result.description, subfire.description);
      assert.deepStrictEqual(new Set(result.authorities), new Set(subfire.authorities));
      assert.deepStrictEqual(new Set(result.moderators), new Set(subfire.moderators));
    });

    it("should get a subfire by id", () => {
      const subfire: SubfireDto = {
        slug: "test-subfire-get",
        name: "TestSubfire-Get",
        description: "A test subfire",
        authorities: ["auth1"],
        moderators: ["mod1"]
      };

      const created: SubfireResDto = dbService.createSubfire(subfire);
      const result: SubfireResDto | null = dbService.getSubfire(created.slug);

      assert(result !== null);
      assert.strictEqual(result!.slug, created.slug);
      assert.strictEqual(result!.name, subfire.name);
    });

    it("should return null for non-existent subfire", () => {
      const result = dbService.getSubfire("999");
      assert.strictEqual(result, null);
    });

    it("should update a subfire", () => {
      const subfire: SubfireDto = {
        slug: "test-subfire-update",
        name: "TestSubfire-Update",
        description: "Original description",
        authorities: ["auth1"],
        moderators: ["mod1"]
      };

      const created = dbService.createSubfire(subfire);

      const updated: SubfireDto = {
        slug: "test-subfire-update-new",
        name: "TestSubfire-Update-New",
        description: "Updated description",
        authorities: ["auth2"],
        moderators: ["mod2"]
      };

      const result = dbService.updateSubfire(created.slug, updated);

      assert.strictEqual(result.name, updated.name);
      assert.strictEqual(result.description, updated.description);
      assert.deepStrictEqual(new Set(result.authorities), new Set(updated.authorities));
      assert.deepStrictEqual(new Set(result.moderators), new Set(updated.moderators));
    });

    it("should delete a subfire", () => {
      const subfire: SubfireDto = {
        slug: "test-subfire-delete",
        name: "TestSubfire-Delete",
        description: "A test subfire",
        authorities: ["auth1"],
        moderators: ["mod1"]
      };

      const created: SubfireResDto = dbService.createSubfire(subfire);
      // Create and then delete a submission to test cascade
      const submission: SubmissionDto = {
        name: "Test Submission",
        subfire: created.slug
      };
      const savedSubmission = dbService.saveSubmission(submission);
      // Delete the submission first
      dbService.deleteSubmission(savedSubmission.id);
      // Now delete the subfire
      const deleteResult = dbService.deleteSubfire(created.slug);
      const getResult = dbService.getSubfire(created.slug);

      assert.strictEqual(deleteResult, true);
      assert.strictEqual(getResult, null);
    });
  });

  describe("Submission Management", () => {
    let testSubfireId: string;
    let testCounter = 0;

    beforeEach(() => {
      const subfire = dbService.createSubfire({
        slug: `TestSubfire-Submission-${++testCounter}`,
        name: `TestSubfire-Submission-${++testCounter}`,
        description: "Test subfire for submissions",
        authorities: [],
        moderators: []
      });
      testSubfireId = subfire.slug;
    });

    it("should create a submission", () => {
      const submission: SubmissionDto = {
        name: "Test Submission",
        description: "A test submission",
        contributor: "tester",
        url: "http://test.com",
        subfire: `${testSubfireId}`
      };

      const result = dbService.saveSubmission(submission);

      assert(result !== null);
      assert.strictEqual(result.name, submission.name);
      assert.strictEqual(result.description, submission.description);
      assert.strictEqual(result.contributor, submission.contributor);
      assert.strictEqual(result.url, submission.url);
      assert.strictEqual(result.votes, 0);
    });

    it("should get a submission by id", () => {
      const submission: SubmissionDto = {
        name: "Test Submission",
        description: "A test submission",
        contributor: "tester",
        url: "http://test.com",
        subfire: `${testSubfireId}`
      };

      const created = dbService.saveSubmission(submission);
      const result = dbService.getSubmission(created.id);

      assert(result !== null);
      assert.strictEqual(result!.id, created.id);
      assert.strictEqual(result!.name, submission.name);
    });

    it("should vote on a submission", () => {
      const submission: SubmissionDto = {
        name: "Test Submission",
        description: "A test submission",
        contributor: "tester",
        url: "http://test.com",
        subfire: `${testSubfireId}`
      };

      const created = dbService.saveSubmission(submission);
      const voteResult = dbService.voteSubmission(created.id);
      const updated = dbService.getSubmission(created.id);

      assert.strictEqual(voteResult, true);
      assert.strictEqual(updated!.votes, 1);
    });

    it("should get submissions by subfire", () => {
      const submission1: SubmissionDto = {
        name: "Test Submission 1",
        subfire: `${testSubfireId}`
      };

      const submission2: SubmissionDto = {
        name: "Test Submission 2",
        subfire: `${testSubfireId}`
      };

      dbService.saveSubmission(submission1);
      dbService.saveSubmission(submission2);

      const results = dbService.getSubmissionsBySubfire(testSubfireId);

      assert.strictEqual(results.length, 2);
      assert.deepStrictEqual(
        new Set(results.map((s) => s.name)),
        new Set([submission1.name, submission2.name])
      );
    });
  });
});
