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
  createSubfire: (fireMetadata: any, chainKey: string): FireDto => {
    // Extract Fire metadata properties
    const slug = fireMetadata.slug;
    const name = fireMetadata.name;
    const description = fireMetadata.description || "";
    const authorities = fireMetadata.authorities || [];
    const moderators = fireMetadata.moderators || [];

    console.log("Creating subfire in database:", {
      slug,
      name,
      description,
      authorities,
      moderators,
      chainKey
    });

    const insertSubfire = getDb().prepare(`
      INSERT OR REPLACE INTO subfires (slug, name, description, chain_key)
      VALUES (?, ?, ?, ?)
    `);

    const deleteRoles = getDb().prepare(`
      DELETE FROM subfire_roles WHERE subfire_id = ?
    `);

    const insertRole = getDb().prepare(`
      INSERT INTO subfire_roles (subfire_id, user_id, role)
      VALUES (?, ?, ?)
    `);

    getDb().transaction(() => {
      const result = insertSubfire.run(slug, name, description, chainKey);
      console.log("Subfire insert result:", {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      });

      // Clear existing roles and re-add
      deleteRoles.run(slug);

      // Add authorities
      for (const authority of authorities) {
        const roleResult = insertRole.run(slug, authority, "authority");
        console.log("Authority role insert:", { authority, changes: roleResult.changes });
      }

      // Add moderators
      for (const moderator of moderators) {
        const roleResult = insertRole.run(slug, moderator, "moderator");
        console.log("Moderator role insert:", { moderator, changes: roleResult.changes });
      }

      return slug;
    })();

    const created = dbService.getSubfire(slug);
    console.log("Created subfire retrieved from DB:", JSON.stringify(created, null, 2));
    return created!;
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
      moderators,
      chainKey: (fire as any).chain_key
    } as unknown as FireDto;
  },

  getAllSubfires: (): FireDto[] => {
    interface FireRow {
      slug: string;
    }
    const subfires = getDb().prepare("SELECT slug FROM subfires").all();
    console.log("getAllSubfires - raw DB result:", JSON.stringify(subfires, null, 2));
    const result = subfires.map((s: unknown) => dbService.getSubfire((s as FireRow).slug)!);
    console.log("getAllSubfires - mapped result:", JSON.stringify(result, null, 2));
    return result;
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

  getSubfireByChainKey: (chainKey: string): FireDto | null => {
    const fire = getDb()
      .prepare(
        `
      SELECT * FROM subfires WHERE chain_key = ?
    `
      )
      .get(chainKey);

    if (!fire) {
      return null;
    }

    const authorities = getDb()
      .prepare(
        `
      SELECT user_id FROM subfire_roles
      WHERE subfire_id = ? AND role = 'authority'
    `
      )
      .all((fire as any).slug)
      .map((row: any) => row.user_id);

    const moderators = getDb()
      .prepare(
        `
      SELECT user_id FROM subfire_roles
      WHERE subfire_id = ? AND role = 'moderator'
    `
      )
      .all((fire as any).slug)
      .map((row: any) => row.user_id);

    return {
      ...fire,
      authorities,
      moderators,
      chainKey: (fire as any).chain_key
    } as unknown as FireDto;
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
  saveSubmission: (submission: any, chainKey: string): SubmissionResDto => {
    // Extract Submission object properties (chaincode structure)
    const name = submission.name;
    const contributor = submission.contributor || "";
    const description = submission.description || "";
    const url = submission.url || "";
    const fire = submission.fire; // This might be undefined 
    const fireKey = submission.fireKey; // This is the composite key like '\x00RWBF\x001\x00'
    const entryParent = submission.entryParentKey || fireKey; // Use entryParentKey if present, fallback to fireKey
    const parentEntryType = submission.entryParentType || "RWBF"; // Default to Fire parent
    const chainId = submission.recency || null; // Chaincode uses recency for ID

    // Extract fire slug from fireKey composite key: '\x00RWBF\x001\x00'
    let fireSlug = fire; // Try fire field first
    if (!fireSlug && fireKey) {
      // Parse the binary composite key format: \x00RWBF\x00{fireSlug}\x00
      const parts = fireKey.split("\x00").filter((part: string) => part.length > 0);
      console.log("Parsing fireKey composite parts:", parts);
      
      // Find RWBF index and get the fire slug (should be after RWBF)
      const rwbfIndex = parts.findIndex((part: string) => part === "RWBF");
      if (rwbfIndex >= 0 && parts.length > rwbfIndex + 1) {
        fireSlug = parts[rwbfIndex + 1]; // Fire slug is right after RWBF
      }
    }

    console.log("Saving submission to database:", {
      name,
      fire,
      fireKey,
      fireSlug,
      chainKey,
      chainId,
      entryParent,
      parentEntryType,
      contributor,
      description,
      url
    });

    // Generate content hash
    const { hash, timestamp } = hashSubmissionContent(name, description, url);

    const insertSubmission = getDb().prepare(`
      INSERT OR REPLACE INTO submissions (
        name, contributor, description, url, subfire_id, 
        content_hash, content_timestamp, hash_verified, moderation_status,
        chain_key, chain_id, entry_parent, parent_entry_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        fireSlug,
        hash,
        timestamp,
        1, // hash_verified (boolean as integer)
        "active", // moderation_status
        chainKey,
        chainId,
        entryParent,
        parentEntryType
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
        s.moderation_status,
        s.chain_key,
        s.entry_parent
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
  },

  // Get submission by database ID for chain key lookup
  getSubmissionById: (id: number): any => {
    const db = getDb();
    const submission = db
      .prepare(
        `
        SELECT 
          s.id,
          s.name,
          s.contributor,
          s.description,
          s.url,
          s.chain_key as chainKey,
          s.entry_parent as entryParent,
          sf.slug as fire_slug,
          s.created_at
        FROM submissions s
        JOIN subfires sf ON s.subfire_id = sf.id
        WHERE s.id = ?
      `
      )
      .get(id);

    return submission;
  }
};

// Initialize the database when this module is imported
initializeDatabase();
