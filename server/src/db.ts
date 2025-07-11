import Database from "better-sqlite3";

import { runMigrations } from "./migrations";
import { FireDto, ModerationLogDto, SubmissionDto, SubmissionResDto } from "./types";
import { type HashableContent, hashSubmissionContent } from "./utils/contentHash";

let db: Database.Database;

function getDb() {
  if (!db) {
    const dbFile = process.env.DB_FILE || "readwriteburn.db";
    db = new Database(dbFile);
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null as any;
  }
}

export function initializeDatabase() {
  const db = getDb();

  // Create base tables
  db.exec(`
    -- Create tables
    CREATE TABLE IF NOT EXISTS subfires (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subfire_roles (
      subfire_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('authority', 'moderator')),
      PRIMARY KEY (subfire_id, user_id, role),
      FOREIGN KEY (subfire_id) REFERENCES subfires(slug)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contributor TEXT,
      description TEXT,
      url TEXT,
      subfire_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subfire_id) REFERENCES subfires(slug)
    );

    CREATE TABLE IF NOT EXISTS votes (
      submission_id INTEGER NOT NULL,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (submission_id),
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    -- Create indexes for subfires
    CREATE INDEX IF NOT EXISTS idx_subfires_name ON subfires(name);
    CREATE INDEX IF NOT EXISTS idx_subfires_created_at ON subfires(created_at);

    -- Create indexes for subfire_roles
    CREATE INDEX IF NOT EXISTS idx_subfire_roles_subfire_id ON subfire_roles(subfire_id);
    CREATE INDEX IF NOT EXISTS idx_subfire_roles_user_id ON subfire_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_subfire_roles_role ON subfire_roles(role);

    -- Create indexes for submissions
    CREATE INDEX IF NOT EXISTS idx_submissions_name ON submissions(name);
    CREATE INDEX IF NOT EXISTS idx_submissions_contributor ON submissions(contributor);
    CREATE INDEX IF NOT EXISTS idx_submissions_url ON submissions(url);
    CREATE INDEX IF NOT EXISTS idx_submissions_subfire_id ON submissions(subfire_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

    -- Create indexes for votes
    CREATE INDEX IF NOT EXISTS idx_votes_submission_id ON votes(submission_id);
    CREATE INDEX IF NOT EXISTS idx_votes_count ON votes(count);
  `);

  // Run migrations to add new features
  runMigrations(db);
}

export const dbService = {
  closeDatabase,
  // Subfire methods
  createSubfire: (fireData: FireDto | any): FireDto => {
    // Handle both FireDto and Fire chaincode objects
    const slug = fireData.slug;
    const name = fireData.name;
    const description = fireData.description || "";
    const authorities = fireData.authorities || [];
    const moderators = fireData.moderators || [];

    console.log("Creating subfire in database:", { slug, name, description, authorities, moderators });

    const insertSubfire = getDb().prepare(`
      INSERT OR REPLACE INTO subfires (slug, name, description)
      VALUES (?, ?, ?)
    `);

    const deleteRoles = getDb().prepare(`
      DELETE FROM subfire_roles WHERE subfire_id = ?
    `);

    const insertRole = getDb().prepare(`
      INSERT INTO subfire_roles (subfire_id, user_id, role)
      VALUES (?, ?, ?)
    `);

    getDb().transaction(() => {
      insertSubfire.run(slug, name, description);

      // Clear existing roles and re-add
      deleteRoles.run(slug);

      // Add authorities
      for (const authority of authorities) {
        insertRole.run(slug, authority, "authority");
      }

      // Add moderators
      for (const moderator of moderators) {
        insertRole.run(slug, moderator, "moderator");
      }

      return slug;
    })();

    return dbService.getSubfire(slug)!;
  },

  getSubfire: (slug: string): FireDto | null => {
    const fire = getDb()
      .prepare(
        `
      SELECT *
      FROM subfires
      WHERE slug = ?
    `
      )
      .get(slug);

    if (!fire) return null;

    interface RoleRow {
      user_id: string;
    }

    const authorities = getDb()
      .prepare(
        `
      SELECT user_id
      FROM subfire_roles
      WHERE subfire_id = ? AND role = 'authority'
    `
      )
      .all(slug)
      .map((row: unknown) => (row as RoleRow).user_id);

    const moderators = getDb()
      .prepare(
        `
      SELECT user_id
      FROM subfire_roles
      WHERE subfire_id = ? AND role = 'moderator'
    `
      )
      .all(slug)
      .map((row: unknown) => (row as RoleRow).user_id);

    return {
      ...fire,
      authorities,
      moderators
    } as FireDto;
  },

  getAllSubfires: (): FireDto[] => {
    interface FireRow {
      slug: string;
    }
    const subfires = getDb().prepare("SELECT slug FROM subfires").all();
    return subfires.map((s: unknown) => dbService.getSubfire((s as FireRow).slug)!);
  },

  updateSubfire: (slug: string, subfire: FireDto): FireDto => {
    const updateSubfire = getDb().prepare(`
      UPDATE subfires
      SET name = ?, description = ?
      WHERE slug = ?
    `);

    const deleteRoles = getDb().prepare(`
      DELETE FROM subfire_roles
      WHERE subfire_id = ?
    `);

    const insertRole = db.prepare(`
      INSERT INTO subfire_roles (subfire_id, user_id, role)
      VALUES (?, ?, ?)
    `);

    getDb().transaction(() => {
      updateSubfire.run(subfire.name, subfire.description ?? "", slug);
      deleteRoles.run(slug);

      for (const authority of subfire.authorities) {
        insertRole.run(slug, authority, "authority");
      }
      for (const moderator of subfire.moderators) {
        insertRole.run(slug, moderator, "moderator");
      }
    })();

    return dbService.getSubfire(slug)!;
  },

  deleteSubfire: (slug: string): boolean => {
    const db = getDb();
    const deleteRoles = db.prepare("DELETE FROM subfire_roles WHERE subfire_id = ?");
    const deleteVotes = db.prepare(
      "DELETE FROM votes WHERE submission_id IN (SELECT id FROM submissions WHERE subfire_id = ?)"
    );
    const deleteSubmissions = db.prepare("DELETE FROM submissions WHERE subfire_id = ?");
    const deleteSubfire = db.prepare("DELETE FROM subfires WHERE slug = ?");

    return db.transaction(() => {
      deleteRoles.run(slug);
      deleteVotes.run(slug);
      deleteSubmissions.run(slug);
      const result = deleteSubfire.run(slug);
      return result.changes > 0;
    })();
  },

  // Submission methods
  saveSubmission: (submissionData: SubmissionDto | any): SubmissionResDto => {
    // Handle both SubmissionDto and chaincode Submission objects
    const name = submissionData.name;
    const contributor = submissionData.contributor || "";
    const description = submissionData.description || "";
    const url = submissionData.url || "";
    const fire = submissionData.fire;
    const entryParent = submissionData.entryParent || fire;
    const chainKey = submissionData.getCompositeKey ? submissionData.getCompositeKey() : null;
    const chainId = submissionData.id || null; // Chaincode ID (timestamp-based)

    console.log("Saving submission to database:", {
      name,
      fire,
      chainKey,
      chainId,
      entryParent
    });

    // Generate content hash
    const { hash, timestamp } = hashSubmissionContent(name, description, url);

    const insertSubmission = getDb().prepare(`
      INSERT OR REPLACE INTO submissions (
        name, contributor, description, url, subfire_id, 
        content_hash, content_timestamp, hash_verified, moderation_status,
        chain_key, chain_id, entry_parent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVotes = getDb().prepare(`
      INSERT OR IGNORE INTO votes (submission_id, count)
      VALUES (?, 0)
    `);

    const submissionId = getDb().transaction(() => {
      const result = insertSubmission.run(
        name,
        contributor,
        description,
        url,
        fire,
        hash,
        timestamp,
        1, // hash_verified (boolean as integer)
        "active", // moderation_status
        chainKey,
        chainId,
        entryParent
      );
      const newId = result.lastInsertRowid as number;
      insertVotes.run(newId);
      return newId;
    })();

    return dbService.getSubmission(submissionId)!;
  },

  // Get a submission by ID
  getSubmission: (id: number): SubmissionResDto | null => {
    return db
      .prepare(
        `
      SELECT s.*, v.count as votes
      FROM submissions s
      LEFT JOIN votes v ON s.id = v.submission_id
      WHERE s.id = ?
    `
      )
      .get(id) as SubmissionResDto | null;
  },

  // Get all submissions
  getAllSubmissions: (): SubmissionResDto[] => {
    return db
      .prepare(
        `
      SELECT
        s.id,
        s.name,
        s.contributor,
        s.description,
        s.url,
        sf.name as subfire,
        v.count as votes,
        s.created_at
      FROM submissions s
      LEFT JOIN votes v ON s.id = v.submission_id
      JOIN subfires sf ON s.subfire_id = sf.id
      ORDER BY s.created_at DESC
    `
      )
      .all() as SubmissionResDto[];
  },
  // Vote for a submission
  voteSubmission: (id: number) => {
    const result = db
      .prepare(
        `
      INSERT INTO votes (submission_id, count)
      VALUES (?, 1)
      ON CONFLICT(submission_id) DO UPDATE SET
      count = count + 1
      WHERE submission_id = ?
    `
      )
      .run(id, id);

    return result.changes > 0;
  },

  // Get submissions by subfire
  deleteSubmission: (id: number): boolean => {
    const db = getDb();
    const deleteVotes = db.prepare("DELETE FROM votes WHERE submission_id = ?");
    const deleteSubmission = db.prepare("DELETE FROM submissions WHERE id = ?");

    return db.transaction(() => {
      deleteVotes.run(id);
      const result = deleteSubmission.run(id);
      return result.changes > 0;
    })();
  },

  getSubmissionsBySubfire: (subfireId: string): SubmissionResDto[] => {
    return db
      .prepare(
        `
      SELECT
        s.id,
        s.name,
        s.contributor,
        s.description,
        s.url,
        sf.name as subfire,
        v.count as votes,
        s.created_at,
        s.content_hash,
        s.hash_verified,
        s.content_timestamp,
        s.moderation_status
      FROM submissions s
      LEFT JOIN votes v ON s.id = v.submission_id
      JOIN subfires sf ON s.subfire_id = sf.slug
      WHERE s.subfire_id = ?
      ORDER BY s.created_at DESC
    `
      )
      .all(subfireId) as SubmissionResDto[];
  },

  // Content hashing and moderation methods
  getSubmissionForVerification: (id: number): HashableContent | null => {
    const submission = db
      .prepare(
        `
      SELECT name, description, url, content_timestamp
      FROM submissions
      WHERE id = ?
    `
      )
      .get(id) as { name: string; description: string; url: string; content_timestamp: number } | null;

    if (!submission) return null;

    return {
      title: submission.name,
      description: submission.description || "",
      url: submission.url,
      timestamp: submission.content_timestamp
    };
  },

  moderateSubmission: (
    id: number,
    action: string,
    reason: string | undefined,
    adminUser: string,
    newContent?: string
  ): { success: boolean; originalHash?: string; newHash?: string } => {
    const getSubmission = db.prepare(`
      SELECT content_hash, name, description, url, content_timestamp
      FROM submissions
      WHERE id = ?
    `);

    const updateSubmission = db.prepare(`
      UPDATE submissions
      SET description = ?, moderation_status = ?, hash_verified = ?
      WHERE id = ?
    `);

    const logModeration = db.prepare(`
      INSERT INTO content_moderation (submission_id, action, reason, admin_user, original_hash, new_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    return db.transaction(() => {
      const submission = getSubmission.get(id) as any;
      if (!submission) {
        return { success: false };
      }

      const originalHash = submission.content_hash;
      let newHash = originalHash;
      let newDescription = submission.description;
      let moderationStatus = submission.moderation_status;
      let hashVerified = true;

      switch (action) {
        case "remove":
          newDescription = "[Content removed by moderator]";
          moderationStatus = "removed";
          hashVerified = false;
          break;
        case "modify":
          if (newContent) {
            newDescription = newContent;
            const { hash } = hashSubmissionContent(
              submission.name,
              newContent,
              submission.url,
              submission.content_timestamp
            );
            newHash = hash;
            moderationStatus = "modified";
            hashVerified = false;
          }
          break;
        case "flag":
          moderationStatus = "flagged";
          break;
        case "restore":
          moderationStatus = "active";
          hashVerified = true;
          break;
      }

      updateSubmission.run(newDescription, moderationStatus, hashVerified ? 1 : 0, id);
      logModeration.run(id, action, reason, adminUser, originalHash, newHash);

      return {
        success: true,
        originalHash,
        newHash: newHash !== originalHash ? newHash : undefined
      };
    })();
  },

  getModerationHistory: (submissionId: number): ModerationLogDto[] => {
    return db
      .prepare(
        `
      SELECT *
      FROM content_moderation
      WHERE submission_id = ?
      ORDER BY created_at DESC
    `
      )
      .all(submissionId) as ModerationLogDto[];
  },

  bulkGetSubmissionsForVerification: (
    ids: number[]
  ): Array<{
    id: number;
    content: HashableContent;
    storedHash: string;
  }> => {
    const placeholders = ids.map(() => "?").join(",");
    const query = `
      SELECT id, name, description, url, content_timestamp, content_hash
      FROM submissions
      WHERE id IN (${placeholders})
    `;

    const results = db.prepare(query).all(...ids) as Array<{
      id: number;
      name: string;
      description: string;
      url: string;
      content_timestamp: number;
      content_hash: string;
    }>;

    return results.map((row) => ({
      id: row.id,
      content: {
        title: row.name,
        description: row.description || "",
        url: row.url,
        timestamp: row.content_timestamp
      },
      storedHash: row.content_hash
    }));
  },

  // Vote casting method for local cache updates
  recordVoteCast: async (submissionId: number, quantity: any): Promise<boolean> => {
    try {
      const updateVotes = getDb().prepare(`
        UPDATE votes 
        SET count = count + ?
        WHERE submission_id = ?
      `);

      // Convert BigNumber to number for database storage
      const voteAmount =
        typeof quantity === "object" && quantity.toString
          ? parseInt(quantity.toString())
          : parseInt(quantity);

      const result = updateVotes.run(voteAmount, submissionId);
      return result.changes > 0;
    } catch (error) {
      console.error("Error recording vote cast:", error);
      return false;
    }
  }
};

// Initialize the database when this module is imported
initializeDatabase();
