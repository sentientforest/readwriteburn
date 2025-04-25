import Database from "better-sqlite3";

import { SubfireDto, SubfireResDto, SubmissionDto, SubmissionResDto } from "./types";

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
}

export const dbService = {
  closeDatabase,
  // Subfire methods
  createSubfire: (subfire: SubfireDto): SubfireResDto => {
    const insertSubfire = getDb().prepare(`
      INSERT INTO subfires (slug, name, description)
      VALUES (?, ?, ?)
    `);

    const insertRole = db.prepare(`
      INSERT INTO subfire_roles (subfire_id, user_id, role)
      VALUES (?, ?, ?)
    `);

    getDb().transaction(() => {
      insertSubfire.run(subfire.slug, subfire.name, subfire.description);

      // Add authorities
      for (const authority of subfire.authorities) {
        insertRole.run(subfire.slug, authority, "authority");
      }

      // Add moderators
      for (const moderator of subfire.moderators) {
        insertRole.run(subfire.slug, moderator, "moderator");
      }

      return subfire.slug;
    })();

    return dbService.getSubfire(subfire.slug)!;
  },

  getSubfire: (slug: string): SubfireResDto | null => {
    const subfire = getDb()
      .prepare(
        `
      SELECT *
      FROM subfires
      WHERE slug = ?
    `
      )
      .get(slug);

    if (!subfire) return null;

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
      ...subfire,
      authorities,
      moderators
    } as SubfireResDto;
  },

  getAllSubfires: (): SubfireResDto[] => {
    interface SubfireRow {
      slug: string;
    }
    const subfires = getDb().prepare("SELECT slug FROM subfires").all();
    return subfires.map((s: unknown) => dbService.getSubfire((s as SubfireRow).slug)!);
  },

  updateSubfire: (slug: string, subfire: SubfireDto): SubfireResDto => {
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
  saveSubmission: (submission: SubmissionDto): SubmissionResDto => {
    const insertSubmission = getDb().prepare(`
      INSERT INTO submissions (name, contributor, description, url, subfire_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertVotes = getDb().prepare(`
      INSERT INTO votes (submission_id, count)
      VALUES (?, 0)
    `);

    const submissionId = getDb().transaction(() => {
      const result = insertSubmission.run(
        submission.name,
        submission.contributor,
        submission.description,
        submission.url,
        submission.subfire
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
        s.created_at
      FROM submissions s
      LEFT JOIN votes v ON s.id = v.submission_id
      JOIN subfires sf ON s.subfire_id = sf.slug
      WHERE s.subfire_id = ?
      ORDER BY s.created_at DESC
    `
      )
      .all(subfireId) as SubmissionResDto[];
  }
};

// Initialize the database when this module is imported
initializeDatabase();
