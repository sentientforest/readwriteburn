import Database from 'better-sqlite3';
import { SubmissionDto, SubmissionResDto, SubfireDto, SubfireResDto } from './types';

const db = new Database('readwriteburn.db');

export function initializeDatabase() {
  db.exec(`
    -- Create tables
    CREATE TABLE IF NOT EXISTS subfires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subfire_roles (
      subfire_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('authority', 'moderator')),
      PRIMARY KEY (subfire_id, user_id, role),
      FOREIGN KEY (subfire_id) REFERENCES subfires(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contributor TEXT,
      description TEXT,
      url TEXT,
      subfire_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subfire_id) REFERENCES subfires(id)
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
  // Subfire methods
  createSubfire: (subfire: SubfireDto): SubfireResDto => {
    const insertSubfire = db.prepare(`
      INSERT INTO subfires (name, description)
      VALUES (?, ?)
    `);

    const insertRole = db.prepare(`
      INSERT INTO subfire_roles (subfire_id, user_id, role)
      VALUES (?, ?, ?)
    `);

    const subfireId = db.transaction(() => {
      const result = insertSubfire.run(subfire.name, subfire.description);
      const newId = result.lastInsertRowid as number;

      // Add authorities
      for (const authority of subfire.authorities) {
        insertRole.run(newId, authority, 'authority');
      }

      // Add moderators
      for (const moderator of subfire.moderators) {
        insertRole.run(newId, moderator, 'moderator');
      }

      return newId;
    })();

    return dbService.getSubfire(subfireId)!;
  },

  getSubfire: (id: number): SubfireResDto | null => {
    const subfire = db.prepare(`
      SELECT id, name, description
      FROM subfires
      WHERE id = ?
    `).get(id);

    if (!subfire) return null;

    interface RoleRow {
      user_id: string;
    }

    const authorities = db.prepare(`
      SELECT user_id
      FROM subfire_roles
      WHERE subfire_id = ? AND role = 'authority'
    `).all(id).map((row) => (row as RoleRow).user_id);

    const moderators = db.prepare(`
      SELECT user_id
      FROM subfire_roles
      WHERE subfire_id = ? AND role = 'moderator'
    `).all(id).map((row) => (row as RoleRow).user_id);

    return {
      ...subfire,
      authorities,
      moderators
    } as SubfireResDto;
  },

  getAllSubfires: (): SubfireResDto[] => {
    interface SubfireRow {
      id: number;
    }
    const subfires = db.prepare('SELECT id FROM subfires').all();
    return subfires.map((s) => dbService.getSubfire((s as SubfireRow).id)!);
  },

  updateSubfire: (id: number, subfire: SubfireDto): SubfireResDto => {
    const updateSubfire = db.prepare(`
      UPDATE subfires
      SET name = ?, description = ?
      WHERE id = ?
    `);

    const deleteRoles = db.prepare(`
      DELETE FROM subfire_roles
      WHERE subfire_id = ?
    `);

    const insertRole = db.prepare(`
      INSERT INTO subfire_roles (subfire_id, user_id, role)
      VALUES (?, ?, ?)
    `);

    db.transaction(() => {
      updateSubfire.run(subfire.name, subfire.description, id);
      deleteRoles.run(id);

      for (const authority of subfire.authorities) {
        insertRole.run(id, authority, 'authority');
      }
      for (const moderator of subfire.moderators) {
        insertRole.run(id, moderator, 'moderator');
      }
    })();

    return dbService.getSubfire(id)!;
  },

  deleteSubfire: (id: number): boolean => {
    const deleteSubfire = db.prepare('DELETE FROM subfires WHERE id = ?');
    const result = deleteSubfire.run(id);
    return result.changes > 0;
  },

  // Submission methods
  saveSubmission: (submission: SubmissionDto): SubmissionResDto => {
    const insertSubmission = db.prepare(`
      INSERT INTO submissions (name, contributor, description, url, subfire_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertVotes = db.prepare(`
      INSERT INTO votes (submission_id, count)
      VALUES (?, 0)
    `);

    const submissionId = db.transaction(() => {
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
    return db.prepare(`
      SELECT s.*, v.count as votes
      FROM submissions s
      LEFT JOIN votes v ON s.id = v.submission_id
      WHERE s.id = ?
    `).get(id) as SubmissionResDto | null;
  },

  // Get all submissions
  getAllSubmissions: (): SubmissionResDto[] => {
    return db.prepare(`
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
    `).all() as SubmissionResDto[];
  },
  // Vote for a submission
  voteSubmission: (id: number) => {
    const result = db.prepare(`
      INSERT INTO votes (submission_id, count)
      VALUES (?, 1)
      ON CONFLICT(submission_id) DO UPDATE SET
      count = count + 1
      WHERE submission_id = ?
    `).run(id, id);
    
    return result.changes > 0;
  },

  // Get submissions by subfire
  getSubmissionsBySubfire: (subfireId: number): SubmissionResDto[] => {
    return db.prepare(`
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
      WHERE s.subfire_id = ?
      ORDER BY s.created_at DESC
    `).all(subfireId) as SubmissionResDto[];
  }
};

// Initialize the database when this module is imported
initializeDatabase();
