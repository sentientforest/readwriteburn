import Database from "better-sqlite3";

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "Add content hashing support to submissions",
    up: (db: Database.Database) => {
      db.exec(`
        -- Add content hashing fields to submissions table
        ALTER TABLE submissions ADD COLUMN content_hash TEXT;
        ALTER TABLE submissions ADD COLUMN hash_verified BOOLEAN DEFAULT TRUE;
        ALTER TABLE submissions ADD COLUMN content_timestamp INTEGER;
        ALTER TABLE submissions ADD COLUMN moderation_status TEXT DEFAULT 'active';

        -- Create content moderation audit log
        CREATE TABLE IF NOT EXISTS content_moderation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          submission_id INTEGER NOT NULL,
          action TEXT NOT NULL CHECK(action IN ('flagged', 'removed', 'modified', 'restored')),
          reason TEXT,
          admin_user TEXT NOT NULL,
          original_hash TEXT,
          new_hash TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (submission_id) REFERENCES submissions(id)
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_submissions_hash ON submissions(content_hash);
        CREATE INDEX IF NOT EXISTS idx_submissions_moderation ON submissions(moderation_status);
        CREATE INDEX IF NOT EXISTS idx_submissions_hash_verified ON submissions(hash_verified);
        CREATE INDEX IF NOT EXISTS idx_content_moderation_submission ON content_moderation(submission_id);
        CREATE INDEX IF NOT EXISTS idx_content_moderation_action ON content_moderation(action);
        CREATE INDEX IF NOT EXISTS idx_content_moderation_created_at ON content_moderation(created_at);
      `);
    },
    down: (db: Database.Database) => {
      db.exec(`
        -- Remove indexes
        DROP INDEX IF EXISTS idx_submissions_hash;
        DROP INDEX IF EXISTS idx_submissions_moderation;
        DROP INDEX IF EXISTS idx_submissions_hash_verified;
        DROP INDEX IF EXISTS idx_content_moderation_submission;
        DROP INDEX IF EXISTS idx_content_moderation_action;
        DROP INDEX IF EXISTS idx_content_moderation_created_at;

        -- Remove content moderation table
        DROP TABLE IF EXISTS content_moderation;

        -- Remove columns (SQLite doesn't support DROP COLUMN, so we'd need to recreate the table)
        -- For now, we'll leave the columns in place for safety
      `);
    }
  },
  {
    version: 2,
    description: "Add chaincode integration fields",
    up: (db: Database.Database) => {
      db.exec(`
        -- Add chaincode key fields to submissions table
        ALTER TABLE submissions ADD COLUMN chain_key TEXT;
        ALTER TABLE submissions ADD COLUMN chain_id TEXT;
        ALTER TABLE submissions ADD COLUMN entry_parent TEXT;

        -- Add chaincode key fields to subfires table
        ALTER TABLE subfires ADD COLUMN chain_key TEXT;

        -- Create indexes for chaincode lookups
        CREATE INDEX IF NOT EXISTS idx_submissions_chain_key ON submissions(chain_key);
        CREATE INDEX IF NOT EXISTS idx_submissions_chain_id ON submissions(chain_id);
        CREATE INDEX IF NOT EXISTS idx_submissions_entry_parent ON submissions(entry_parent);
        CREATE INDEX IF NOT EXISTS idx_subfires_chain_key ON subfires(chain_key);
      `);
    },
    down: (db: Database.Database) => {
      db.exec(`
        -- Remove indexes
        DROP INDEX IF EXISTS idx_submissions_chain_key;
        DROP INDEX IF EXISTS idx_submissions_chain_id;
        DROP INDEX IF EXISTS idx_submissions_entry_parent;
        DROP INDEX IF EXISTS idx_subfires_chain_key;

        -- Note: We don't remove columns in SQLite for safety
      `);
    }
  },
  {
    version: 3,
    description: "Add entryParent column to fires table for hierarchical organization",
    up: (db: Database.Database) => {
      db.exec(`
        -- Add entryParent field to subfires table for hierarchical fire organization
        ALTER TABLE subfires ADD COLUMN entry_parent TEXT;

        -- Create index for hierarchical lookups
        CREATE INDEX IF NOT EXISTS idx_subfires_entry_parent ON subfires(entry_parent);
      `);
    },
    down: (db: Database.Database) => {
      db.exec(`
        -- Remove index
        DROP INDEX IF EXISTS idx_subfires_entry_parent;
        
        -- Note: We don't remove the column in SQLite for safety
      `);
    }
  },
  {
    version: 4,
    description: "Simplify architecture: flatten Fire hierarchy and add parentEntryType to Submissions",
    up: (db: Database.Database) => {
      db.exec(`
        -- Add parentEntryType column to submissions for new flat architecture
        ALTER TABLE submissions ADD COLUMN parent_entry_type TEXT DEFAULT 'RWBF';

        -- Update existing data: all existing submissions are top-level (Fire parents)
        UPDATE submissions SET parent_entry_type = 'RWBF' WHERE parent_entry_type IS NULL;

        -- For any existing submissions with entry_parent (replies), set to Submission parent type
        UPDATE submissions SET parent_entry_type = 'RWBS' WHERE entry_parent IS NOT NULL;

        -- Set all fires to have NULL entry_parent (flatten fire hierarchy)
        UPDATE subfires SET entry_parent = NULL;

        -- Create index for new column
        CREATE INDEX IF NOT EXISTS idx_submissions_parent_entry_type ON submissions(parent_entry_type);
      `);
    },
    down: (db: Database.Database) => {
      db.exec(`
        -- Remove index
        DROP INDEX IF EXISTS idx_submissions_parent_entry_type;
        
        -- Note: We don't remove the column in SQLite for safety
        -- The parent_entry_type column will remain but won't be used
      `);
    }
  }
];

export function createMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function getCurrentVersion(db: Database.Database): number {
  createMigrationsTable(db);

  const result = db
    .prepare(
      `
    SELECT MAX(version) as version FROM schema_migrations
  `
    )
    .get() as { version: number | null };

  return result.version || 0;
}

export function runMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log("No pending migrations");
    return;
  }

  console.log(`Running ${pendingMigrations.length} pending migrations...`);

  for (const migration of pendingMigrations) {
    try {
      console.log(`Applying migration ${migration.version}: ${migration.description}`);

      db.transaction(() => {
        migration.up(db);

        db.prepare(
          `
          INSERT INTO schema_migrations (version, description)
          VALUES (?, ?)
        `
        ).run(migration.version, migration.description);
      })();

      console.log(`✅ Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  console.log("All migrations completed successfully");
}

export function rollbackMigration(db: Database.Database, targetVersion: number): void {
  const currentVersion = getCurrentVersion(db);

  if (targetVersion >= currentVersion) {
    console.log("Target version is current or higher, no rollback needed");
    return;
  }

  const migrationsToRollback = migrations
    .filter((m) => m.version > targetVersion && m.version <= currentVersion)
    .sort((a, b) => b.version - a.version); // Descending order for rollback

  console.log(`Rolling back ${migrationsToRollback.length} migrations...`);

  for (const migration of migrationsToRollback) {
    if (!migration.down) {
      console.warn(`⚠️ Migration ${migration.version} has no rollback function, skipping`);
      continue;
    }

    try {
      console.log(`Rolling back migration ${migration.version}: ${migration.description}`);

      db.transaction(() => {
        migration.down!(db);

        db.prepare(
          `
          DELETE FROM schema_migrations WHERE version = ?
        `
        ).run(migration.version);
      })();

      console.log(`✅ Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      console.error(`❌ Rollback of migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  console.log("Rollback completed successfully");
}
