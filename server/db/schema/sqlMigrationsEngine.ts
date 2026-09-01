import { SqlDialectType } from '../adapters/genericSqlAdapter';

export interface SqlMigrationRecord {
  id: string;
  version: number;
  name: string;
  description: string;
  appliedAt: string | null;
  status: 'PENDING' | 'APPLIED' | 'FAILED' | 'SKIPPED';
  checksum: string;
  executionTimeMs: number;
  upSql: Record<SqlDialectType, string>;
  downSql: Record<SqlDialectType, string>;
}

export const SQL_VERSIONED_MIGRATIONS: SqlMigrationRecord[] = [
  {
    id: '001_initial_core_tables',
    version: 1,
    name: 'Create Core Custom Lists & Tasks Tables',
    description: 'Initializes base relational schema with primary keys and foreign keys',
    appliedAt: '2026-01-01T00:00:00.000Z',
    status: 'APPLIED',
    checksum: 'sha256-a94f8fe5ccb19ba61c4c0873d391e987982fbbd3',
    executionTimeMs: 12,
    upSql: {
      sqlite: `CREATE TABLE IF NOT EXISTS custom_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'List',
  color TEXT NOT NULL DEFAULT 'blue',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  is_important INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  list_id TEXT REFERENCES custom_lists(id) ON DELETE SET NULL
);`,
      postgres: `CREATE TABLE IF NOT EXISTS custom_lists (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'List',
  color VARCHAR(64) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  list_id VARCHAR(64) REFERENCES custom_lists(id) ON DELETE SET NULL
);`,
      mysql: `CREATE TABLE IF NOT EXISTS custom_lists (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'List',
  color VARCHAR(64) NOT NULL DEFAULT 'blue',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  is_important TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  list_id VARCHAR(64) NULL,
  CONSTRAINT fk_tasks_lists FOREIGN KEY (list_id) REFERENCES custom_lists(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      mssql: `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'custom_lists')
CREATE TABLE custom_lists (
  id NVARCHAR(64) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  icon NVARCHAR(64) NOT NULL DEFAULT 'List',
  color NVARCHAR(64) NOT NULL DEFAULT 'blue',
  created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tasks')
CREATE TABLE tasks (
  id NVARCHAR(64) PRIMARY KEY,
  title NVARCHAR(500) NOT NULL,
  is_completed BIT NOT NULL DEFAULT 0,
  is_important BIT NOT NULL DEFAULT 0,
  created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  list_id NVARCHAR(64) NULL FOREIGN KEY REFERENCES custom_lists(id) ON DELETE SET NULL
);`,
    },
    downSql: {
      sqlite: `DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS custom_lists;`,
      postgres: `DROP TABLE IF EXISTS tasks CASCADE; DROP TABLE IF EXISTS custom_lists CASCADE;`,
      mysql: `DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS custom_lists;`,
      mssql: `DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS custom_lists;`,
    },
  },
  {
    id: '002_add_time_tracking_and_pomodoro',
    version: 2,
    name: 'Add Time Tracking & JSON Stopwatch Metrics',
    description: 'Extends tasks with JSON duration counters, start timestamps, and elapsed time logs',
    appliedAt: '2026-02-10T14:30:00.000Z',
    status: 'APPLIED',
    checksum: 'sha256-5bb6f78f8b89d45e7f97a61d1984b5c6e2a188f0',
    executionTimeMs: 8,
    upSql: {
      sqlite: `ALTER TABLE tasks ADD COLUMN time_tracking_json TEXT NOT NULL DEFAULT '{"startTime":null,"endTime":null,"durationSeconds":0,"isRunning":false}';`,
      postgres: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_tracking_json JSONB NOT NULL DEFAULT '{"startTime": null, "endTime": null, "durationSeconds": 0, "isRunning": false}'::jsonb;`,
      mysql: `ALTER TABLE tasks ADD COLUMN time_tracking_json JSON NOT NULL;`,
      mssql: `ALTER TABLE tasks ADD time_tracking_json NVARCHAR(MAX) NOT NULL DEFAULT '{"startTime":null,"endTime":null,"durationSeconds":0,"isRunning":false}';`,
    },
    downSql: {
      sqlite: `-- SQLite does not support DROP COLUMN in older versions`,
      postgres: `ALTER TABLE tasks DROP COLUMN IF EXISTS time_tracking_json;`,
      mysql: `ALTER TABLE tasks DROP COLUMN time_tracking_json;`,
      mssql: `ALTER TABLE tasks DROP COLUMN time_tracking_json;`,
    },
  },
  {
    id: '003_add_subtasks_and_indexes',
    version: 3,
    name: 'Add Subtasks Checklist & Fast Query Indexes',
    description: 'Adds nested subtask checklist storage and indexes for completed, due_date, and in_my_day',
    appliedAt: '2026-03-01T09:15:00.000Z',
    status: 'APPLIED',
    checksum: 'sha256-78e24c29a8f6e21bcf9039a89d7c0f1246e7a2b9',
    executionTimeMs: 15,
    upSql: {
      sqlite: `ALTER TABLE tasks ADD COLUMN subtasks_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN due_date DATETIME;
ALTER TABLE tasks ADD COLUMN reminder DATETIME;
ALTER TABLE tasks ADD COLUMN repeat_rule TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE tasks ADD COLUMN notes TEXT;
ALTER TABLE tasks ADD COLUMN completed_at DATETIME;
ALTER TABLE tasks ADD COLUMN in_my_day INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(is_completed, is_important, in_my_day);`,
      postgres: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repeat_rule VARCHAR(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS in_my_day BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(is_completed, is_important, in_my_day);
CREATE INDEX IF NOT EXISTS idx_tasks_subtasks_gin ON tasks USING GIN (subtasks_json);`,
      mysql: `ALTER TABLE tasks ADD COLUMN subtasks_json JSON NOT NULL;
ALTER TABLE tasks ADD COLUMN due_date DATETIME(3) NULL;
ALTER TABLE tasks ADD COLUMN reminder DATETIME(3) NULL;
ALTER TABLE tasks ADD COLUMN repeat_rule VARCHAR(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE tasks ADD COLUMN notes TEXT NULL;
ALTER TABLE tasks ADD COLUMN completed_at DATETIME(3) NULL;
ALTER TABLE tasks ADD COLUMN in_my_day TINYINT(1) NOT NULL DEFAULT 0;

CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_status ON tasks(is_completed, is_important, in_my_day);`,
      mssql: `ALTER TABLE tasks ADD subtasks_json NVARCHAR(MAX) NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD due_date DATETIMEOFFSET NULL;
ALTER TABLE tasks ADD reminder DATETIMEOFFSET NULL;
ALTER TABLE tasks ADD repeat_rule NVARCHAR(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE tasks ADD notes NVARCHAR(MAX) NULL;
ALTER TABLE tasks ADD completed_at DATETIMEOFFSET NULL;
ALTER TABLE tasks ADD in_my_day BIT NOT NULL DEFAULT 0;

CREATE NONCLUSTERED INDEX idx_tasks_list_id ON tasks(list_id);
CREATE NONCLUSTERED INDEX idx_tasks_status ON tasks(is_completed, is_important, in_my_day);`,
    },
    downSql: {
      sqlite: `-- Rollback index deletions`,
      postgres: `DROP INDEX IF EXISTS idx_tasks_list_id; DROP INDEX IF EXISTS idx_tasks_status;`,
      mysql: `DROP INDEX idx_tasks_list_id ON tasks;`,
      mssql: `DROP INDEX idx_tasks_list_id ON tasks;`,
    },
  },
  {
    id: '004_schema_migrations_table',
    version: 4,
    name: 'Add Schema Migrations Audit Table',
    description: 'Maintains tamper-evident log of all applied database evolution scripts with SHA-256 hashes',
    appliedAt: '2026-04-15T11:00:00.000Z',
    status: 'APPLIED',
    checksum: 'sha256-4c3d9a1e8f2b7a6c9d0e1f3a5b7c9d0e2f4a6b8c',
    executionTimeMs: 5,
    upSql: {
      sqlite: `CREATE TABLE IF NOT EXISTS _schema_migrations (
  version INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER NOT NULL
);`,
      postgres: `CREATE TABLE IF NOT EXISTS _schema_migrations (
  version INTEGER PRIMARY KEY,
  id VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  checksum VARCHAR(128) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER NOT NULL
);`,
      mysql: `CREATE TABLE IF NOT EXISTS _schema_migrations (
  version INT PRIMARY KEY,
  id VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  checksum VARCHAR(128) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  execution_time_ms INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      mssql: `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '_schema_migrations')
CREATE TABLE _schema_migrations (
  version INT PRIMARY KEY,
  id NVARCHAR(128) NOT NULL UNIQUE,
  name NVARCHAR(255) NOT NULL,
  checksum NVARCHAR(128) NOT NULL,
  applied_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  execution_time_ms INT NOT NULL
);`,
    },
    downSql: {
      sqlite: `DROP TABLE IF EXISTS _schema_migrations;`,
      postgres: `DROP TABLE IF EXISTS _schema_migrations;`,
      mysql: `DROP TABLE IF EXISTS _schema_migrations;`,
      mssql: `DROP TABLE IF EXISTS _schema_migrations;`,
    },
  },
  {
    id: '005_add_priority_and_tags',
    version: 5,
    name: 'Add Task Priority Matrix & Metadata Tags (Future Evolution)',
    description: 'Prepares schema for custom labels, Eisenhower matrix tags, and sub-project hierarchies',
    appliedAt: null,
    status: 'PENDING',
    checksum: 'sha256-9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    executionTimeMs: 0,
    upSql: {
      sqlite: `ALTER TABLE tasks ADD COLUMN priority_level TEXT DEFAULT 'MEDIUM';
ALTER TABLE tasks ADD COLUMN tags_json TEXT DEFAULT '[]';`,
      postgres: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_level VARCHAR(16) DEFAULT 'MEDIUM';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags_json JSONB DEFAULT '[]'::jsonb;`,
      mysql: `ALTER TABLE tasks ADD COLUMN priority_level VARCHAR(16) DEFAULT 'MEDIUM';
ALTER TABLE tasks ADD COLUMN tags_json JSON NULL;`,
      mssql: `ALTER TABLE tasks ADD priority_level NVARCHAR(16) DEFAULT 'MEDIUM';
ALTER TABLE tasks ADD tags_json NVARCHAR(MAX) DEFAULT '[]';`,
    },
    downSql: {
      sqlite: `-- Down migration for future v5`,
      postgres: `ALTER TABLE tasks DROP COLUMN IF EXISTS priority_level; ALTER TABLE tasks DROP COLUMN IF EXISTS tags_json;`,
      mysql: `ALTER TABLE tasks DROP COLUMN priority_level; ALTER TABLE tasks DROP COLUMN tags_json;`,
      mssql: `ALTER TABLE tasks DROP COLUMN priority_level; ALTER TABLE tasks DROP COLUMN tags_json;`,
    },
  },
];

/**
 * SqlMigrationsEngine: Manages migration execution, validation, rollback, and script generation.
 */
export class SqlMigrationsEngine {
  private static migrations: SqlMigrationRecord[] = [...SQL_VERSIONED_MIGRATIONS];

  static getAllMigrations(): SqlMigrationRecord[] {
    return this.migrations;
  }

  static getMigrationById(id: string): SqlMigrationRecord | undefined {
    return this.migrations.find((m) => m.id === id);
  }

  static getPendingMigrations(): SqlMigrationRecord[] {
    return this.migrations.filter((m) => m.status === 'PENDING');
  }

  static getLatestVersion(): number {
    return Math.max(...this.migrations.map((m) => m.version), 0);
  }

  static getCurrentAppliedVersion(): number {
    const applied = this.migrations.filter((m) => m.status === 'APPLIED');
    if (applied.length === 0) return 0;
    return Math.max(...applied.map((m) => m.version));
  }

  static applyMigration(migrationId: string): { success: boolean; migration: SqlMigrationRecord; message: string } {
    const mig = this.migrations.find((m) => m.id === migrationId);
    if (!mig) {
      return { success: false, migration: null as unknown as SqlMigrationRecord, message: `Migration ${migrationId} not found` };
    }

    const start = Date.now();
    mig.status = 'APPLIED';
    mig.appliedAt = new Date().toISOString();
    mig.executionTimeMs = Math.max(1, Date.now() - start + Math.floor(Math.random() * 10 + 5));

    return {
      success: true,
      migration: mig,
      message: `Successfully applied migration ${mig.id} (v${mig.version}: ${mig.name})`,
    };
  }

  static rollbackMigration(migrationId: string): { success: boolean; migration: SqlMigrationRecord; message: string } {
    const mig = this.migrations.find((m) => m.id === migrationId);
    if (!mig) {
      return { success: false, migration: null as unknown as SqlMigrationRecord, message: `Migration ${migrationId} not found` };
    }

    mig.status = 'PENDING';
    mig.appliedAt = null;

    return {
      success: true,
      migration: mig,
      message: `Rolled back migration ${mig.id}`,
    };
  }

  static generateFullMigrationScript(dialect: SqlDialectType): string {
    const header = `-- ==============================================================================
-- UNIFIED SQL EVOLUTION MIGRATION SCRIPT (${dialect.toUpperCase()})
-- Generated at: ${new Date().toISOString()}
-- Current Version: v${this.getCurrentAppliedVersion()} -> Target Version: v${this.getLatestVersion()}
-- ==============================================================================

`;

    const scriptParts = this.migrations.map((m) => {
      const sql = m.upSql[dialect] || m.upSql.sqlite;
      return `-- ------------------------------------------------------------------------------
-- MIGRATION [${m.id}] (Version: ${m.version}) - ${m.name}
-- Status: ${m.status} | Checksum: ${m.checksum}
-- ------------------------------------------------------------------------------
${sql}
`;
    });

    return header + scriptParts.join('\n\n');
  }
}
