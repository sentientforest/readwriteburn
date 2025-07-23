import { asValidUserRef, createValidDTO } from "@gala-chain/api";
import assert from "assert";
import Database from "better-sqlite3";
import { unlinkSync } from "fs";
import { existsSync } from "fs";
import "mocha";

import { dbService, initializeDatabase } from "./db";
import { FireDto, SubmissionDto } from "./types";

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
    it("should create a subfire with authorities and moderators", async () => {
      const subfire = new FireDto({
        slug: "test-subfire-create",
        name: "TestSubfire-Create",
        description: "A test subfire",
        starter: asValidUserRef("client|test-starter"),
        authorities: [asValidUserRef("client|auth1"), asValidUserRef("client|auth2")],
        moderators: [asValidUserRef("client|mod1"), asValidUserRef("client|mod2")]
      });

      const result = dbService.createSubfire(subfire);

      assert(result !== null);
      assert.strictEqual(result.name, subfire.name);
      assert.strictEqual(result.description, subfire.description);
      assert.deepStrictEqual(new Set(result.authorities), new Set(subfire.authorities));
      assert.deepStrictEqual(new Set(result.moderators), new Set(subfire.moderators));
    });

    it("should get a subfire by id", async () => {
      const fire = new FireDto({
        slug: "test-subfire-get",
        name: "TestSubfire-Get",
        description: "A test subfire",
        starter: asValidUserRef("client|test-starter"),
        authorities: [asValidUserRef("client|auth1")],
        moderators: [asValidUserRef("client|mod1")]
      });

      const created: FireDto = dbService.createSubfire(fire);
      const result: FireDto | null = dbService.getSubfire(created.slug);

      assert(result !== null);
      assert.strictEqual(result!.slug, created.slug);
      assert.strictEqual(result!.name, fire.name);
    });

    it("should return null for non-existent subfire", () => {
      const result = dbService.getSubfire("999");
      assert.strictEqual(result, null);
    });

    it("should update a subfire", async () => {
      const fire = new FireDto({
        slug: "test-subfire-update",
        name: "TestSubfire-Update",
        description: "Original description",
        starter: asValidUserRef("client|test-starter"),
        authorities: [asValidUserRef("client|auth1")],
        moderators: [asValidUserRef("client|mod1")]
      });

      const created = dbService.createSubfire(fire);

      const updated = new FireDto({
        slug: "test-subfire-update-new",
        name: "TestSubfire-Update-New",
        description: "Updated description",
        starter: asValidUserRef("client|test-starter-updated"),
        authorities: [asValidUserRef("client|auth2")],
        moderators: [asValidUserRef("client|mod2")]
      });

      const result = dbService.updateSubfire(created.slug, updated);

      assert.strictEqual(result.name, updated.name);
      assert.strictEqual(result.description, updated.description);
      assert.deepStrictEqual(new Set(result.authorities), new Set(updated.authorities));
      assert.deepStrictEqual(new Set(result.moderators), new Set(updated.moderators));
    });

    it("should delete a subfire", async () => {
      const fire = new FireDto({
        slug: "test-subfire-delete",
        name: "TestSubfire-Delete",
        description: "A test subfire",
        starter: asValidUserRef("client|test-starter"),
        authorities: [asValidUserRef("client|auth1")],
        moderators: [asValidUserRef("client|mod1")]
      });

      const created: FireDto = dbService.createSubfire(fire);
      // Create and then delete a submission to test cascade
      const submission: SubmissionDto = await createValidDTO(SubmissionDto, {
        name: "Test Submission",
        fire: created.slug,
        entryParent: created.slug,
        parentEntryType: "RWBF"
      });

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

    beforeEach(async () => {
      const dto = new FireDto({
        slug: `TestSubfire-Submission-${++testCounter}`,
        name: `TestSubfire-Submission-${++testCounter}`,
        description: "Test subfire for submissions",
        starter: asValidUserRef("client|test-starter"),
        authorities: [],
        moderators: []
      });
      const fire = dbService.createSubfire(dto);
      testSubfireId = fire.slug;
    });

    it("should create a submission", async () => {
      const submission: SubmissionDto = await createValidDTO(SubmissionDto, {
        name: "Test Submission",
        description: "A test submission",
        contributor: "tester",
        url: "http://test.com",
        fire: `${testSubfireId}`,
        entryParent: `${testSubfireId}`,
        parentEntryType: "RWBF"
      });

      const result = dbService.saveSubmission(submission);

      assert(result !== null);
      assert.strictEqual(result.name, submission.name);
      assert.strictEqual(result.description, submission.description);
      assert.strictEqual(result.contributor, submission.contributor);
      assert.strictEqual(result.url, submission.url);
      assert.strictEqual(result.votes, 0);
    });

    it("should get a submission by id", async () => {
      const submission: SubmissionDto = await createValidDTO(SubmissionDto, {
        name: "Test Submission",
        description: "A test submission",
        contributor: "tester",
        url: "http://test.com",
        fire: `${testSubfireId}`,
        entryParent: `${testSubfireId}`,
        parentEntryType: "RWBF"
      });

      const created = dbService.saveSubmission(submission);
      const result = dbService.getSubmission(created.id);

      assert(result !== null);
      assert.strictEqual(result!.id, created.id);
      assert.strictEqual(result!.name, submission.name);
    });

    it("should vote on a submission", async () => {
      const submission: SubmissionDto = await createValidDTO(SubmissionDto, {
        name: "Test Submission",
        description: "A test submission",
        contributor: "tester",
        url: "http://test.com",
        fire: `${testSubfireId}`,
        entryParent: `${testSubfireId}`,
        parentEntryType: "RWBF"
      });

      const created = dbService.saveSubmission(submission);
      const voteResult = dbService.voteSubmission(created.id);
      const updated = dbService.getSubmission(created.id);

      assert.strictEqual(voteResult, true);
      assert.strictEqual(updated!.votes, 1);
    });

    it("should get submissions by subfire", async () => {
      const submission1: SubmissionDto = await createValidDTO(SubmissionDto, {
        name: "Test Submission 1",
        fire: `${testSubfireId}`,
        entryParent: `${testSubfireId}`,
        parentEntryType: "RWBF"
      });

      const submission2: SubmissionDto = await createValidDTO(SubmissionDto, {
        name: "Test Submission 2",
        fire: `${testSubfireId}`,
        entryParent: `${testSubfireId}`,
        parentEntryType: "RWBF"
      });

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
