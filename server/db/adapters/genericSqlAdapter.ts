import { BaseDatabaseAdapter, INITIAL_CUSTOM_LISTS, INITIAL_TASKS } from './baseAdapter';
import {
  Task,
  CustomList,
  Subtask,
  TaskFilter,
  DatabaseDriverType,
  DatabaseConfig,
} from '../types';

export type SqlDialectType = 'sqlite' | 'postgres' | 'mysql' | 'mssql';

export interface SqlDialectConfig {
  dialect: SqlDialectType;
  displayName: string;
  quoteChar: string;
  paramPlaceholder: (index: number) => string;
  booleanType: string;
  jsonType: string;
  timestampType: string;
  idType: string;
  ddlSchema: string;
}

export const SQL_DIALECT_CONFIGS: Record<SqlDialectType, SqlDialectConfig> = {
  sqlite: {
    dialect: 'sqlite',
    displayName: 'SQLite 3 (Embedded File / Memory)',
    quoteChar: '"',
    paramPlaceholder: () => '?',
    booleanType: 'INTEGER',
    jsonType: 'TEXT',
    timestampType: 'DATETIME',
    idType: 'TEXT PRIMARY KEY',
    ddlSchema: `-- ==============================================================================
-- SQLITE 3 DDL SCHEMA MIGRATION (Unified SQL Adapter)
-- ==============================================================================
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS custom_lists (
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
  due_date DATETIME,
  reminder DATETIME,
  repeat_rule TEXT NOT NULL DEFAULT 'NONE',
  subtasks_json TEXT NOT NULL DEFAULT '[]',
  time_tracking_json TEXT NOT NULL DEFAULT '{"startTime":null,"endTime":null,"durationSeconds":0,"isRunning":false}',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  in_my_day INTEGER NOT NULL DEFAULT 0,
  list_id TEXT REFERENCES custom_lists(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_is_important ON tasks(is_important);
CREATE INDEX IF NOT EXISTS idx_tasks_in_my_day ON tasks(in_my_day);`,
  },
  postgres: {
    dialect: 'postgres',
    displayName: 'PostgreSQL (Enterprise SQL / JSONB)',
    quoteChar: '"',
    paramPlaceholder: (i) => `$${i}`,
    booleanType: 'BOOLEAN',
    jsonType: 'JSONB',
    timestampType: 'TIMESTAMPTZ',
    idType: 'VARCHAR(64) PRIMARY KEY',
    ddlSchema: `-- ==============================================================================
-- POSTGRESQL DDL SCHEMA MIGRATION (Unified SQL Adapter)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS custom_lists (
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
  due_date TIMESTAMPTZ,
  reminder TIMESTAMPTZ,
  repeat_rule VARCHAR(32) NOT NULL DEFAULT 'NONE',
  subtasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_tracking_json JSONB NOT NULL DEFAULT '{"startTime": null, "endTime": null, "durationSeconds": 0, "isRunning": false}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  in_my_day BOOLEAN NOT NULL DEFAULT FALSE,
  list_id VARCHAR(64) REFERENCES custom_lists(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(is_completed, is_important, in_my_day);
CREATE INDEX IF NOT EXISTS idx_tasks_subtasks_gin ON tasks USING GIN (subtasks_json);`,
  },
  mysql: {
    dialect: 'mysql',
    displayName: 'MySQL / MariaDB (InnoDB Engine)',
    quoteChar: '`',
    paramPlaceholder: () => '?',
    booleanType: 'TINYINT(1)',
    jsonType: 'JSON',
    timestampType: 'DATETIME(3)',
    idType: 'VARCHAR(64) PRIMARY KEY',
    ddlSchema: `-- ==============================================================================
-- MYSQL / MARIADB DDL SCHEMA MIGRATION (Unified SQL Adapter)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ` + '`custom_lists`' + ` (
  ` + '`id`' + ` VARCHAR(64) NOT NULL,
  ` + '`name`' + ` VARCHAR(255) NOT NULL,
  ` + '`icon`' + ` VARCHAR(64) NOT NULL DEFAULT 'List',
  ` + '`color`' + ` VARCHAR(64) NOT NULL DEFAULT 'blue',
  ` + '`created_at`' + ` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (` + '`id`' + `)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ` + '`tasks`' + ` (
  ` + '`id`' + ` VARCHAR(64) NOT NULL,
  ` + '`title`' + ` VARCHAR(500) NOT NULL,
  ` + '`is_completed`' + ` TINYINT(1) NOT NULL DEFAULT 0,
  ` + '`is_important`' + ` TINYINT(1) NOT NULL DEFAULT 0,
  ` + '`due_date`' + ` DATETIME(3) NULL,
  ` + '`reminder`' + ` DATETIME(3) NULL,
  ` + '`repeat_rule`' + ` VARCHAR(32) NOT NULL DEFAULT 'NONE',
  ` + '`subtasks_json`' + ` JSON NOT NULL,
  ` + '`time_tracking_json`' + ` JSON NOT NULL,
  ` + '`notes`' + ` TEXT NULL,
  ` + '`created_at`' + ` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ` + '`completed_at`' + ` DATETIME(3) NULL,
  ` + '`in_my_day`' + ` TINYINT(1) NOT NULL DEFAULT 0,
  ` + '`list_id`' + ` VARCHAR(64) NULL,
  PRIMARY KEY (` + '`id`' + `),
  INDEX ` + '`idx_tasks_list_id` (`list_id`)' + `,
  INDEX ` + '`idx_tasks_completed` (`is_completed`)' + `,
  INDEX ` + '`idx_tasks_important` (`is_important`)' + `,
  CONSTRAINT ` + '`fk_tasks_custom_lists`' + ` FOREIGN KEY (` + '`list_id`' + `) REFERENCES ` + '`custom_lists`' + ` (` + '`id`' + `) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  mssql: {
    dialect: 'mssql',
    displayName: 'Microsoft SQL Server / Azure SQL (T-SQL)',
    quoteChar: '"',
    paramPlaceholder: (i) => `@p${i}`,
    booleanType: 'BIT',
    jsonType: 'NVARCHAR(MAX)',
    timestampType: 'DATETIMEOFFSET',
    idType: 'NVARCHAR(64) PRIMARY KEY',
    ddlSchema: `-- ==============================================================================
-- MICROSOFT SQL SERVER / AZURE SQL DDL SCHEMA (Unified SQL Adapter)
-- ==============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'custom_lists')
BEGIN
    CREATE TABLE custom_lists (
        id NVARCHAR(64) NOT NULL PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        icon NVARCHAR(64) NOT NULL DEFAULT 'List',
        color NVARCHAR(64) NOT NULL DEFAULT 'blue',
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tasks')
BEGIN
    CREATE TABLE tasks (
        id NVARCHAR(64) NOT NULL PRIMARY KEY,
        title NVARCHAR(500) NOT NULL,
        is_completed BIT NOT NULL DEFAULT 0,
        is_important BIT NOT NULL DEFAULT 0,
        due_date DATETIMEOFFSET NULL,
        reminder DATETIMEOFFSET NULL,
        repeat_rule NVARCHAR(32) NOT NULL DEFAULT 'NONE',
        subtasks_json NVARCHAR(MAX) NOT NULL DEFAULT '[]' CONSTRAINT ck_tasks_subtasks_json CHECK (ISJSON(subtasks_json) = 1),
        time_tracking_json NVARCHAR(MAX) NOT NULL DEFAULT '{"startTime":null,"endTime":null,"durationSeconds":0,"isRunning":false}' CONSTRAINT ck_tasks_timetracking_json CHECK (ISJSON(time_tracking_json) = 1),
        notes NVARCHAR(MAX) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        completed_at DATETIMEOFFSET NULL,
        in_my_day BIT NOT NULL DEFAULT 0,
        list_id NVARCHAR(64) NULL FOREIGN KEY REFERENCES custom_lists(id) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX idx_tasks_list_id ON tasks(list_id);
    CREATE NONCLUSTERED INDEX idx_tasks_status ON tasks(is_completed, is_important, in_my_day);
END;`,
  },
};

/**
 * GenericSqlAdapter: A single unified adapter managing all Relational SQL databases
 * (SQLite, PostgreSQL, MySQL, MSSQL) using Dialect Strategies.
 */
export class GenericSqlAdapter extends BaseDatabaseAdapter {
  readonly dialectConfig: SqlDialectConfig;
  readonly type: DatabaseDriverType;
  readonly name: string;

  private tasksTable: Map<string, Record<string, unknown>> = new Map();
  private listsTable: Map<string, Record<string, unknown>> = new Map();
  private connectionConfig?: DatabaseConfig;

  constructor(dialect: SqlDialectType, config?: DatabaseConfig) {
    super();
    this.type = dialect;
    this.dialectConfig = SQL_DIALECT_CONFIGS[dialect] || SQL_DIALECT_CONFIGS.sqlite;
    this.name = `Unified SQL Adapter [${this.dialectConfig.displayName}]`;
    this.connectionConfig = config;
  }

  async init(): Promise<void> {
    await super.init();

    // Initialize in-engine table state with initial schema records
    for (const l of INITIAL_CUSTOM_LISTS) {
      this.listsTable.set(l.id, {
        id: l.id,
        name: l.name,
        icon: l.icon,
        color: l.color,
        created_at: l.createdAt,
      });
    }

    for (const t of INITIAL_TASKS) {
      this.tasksTable.set(t.id, {
        id: t.id,
        title: t.title,
        is_completed: this.serializeBool(t.isCompleted),
        is_important: this.serializeBool(t.isImportant),
        due_date: t.dueDate,
        reminder: t.reminder,
        repeat_rule: t.repeatRule,
        subtasks_json: JSON.stringify(t.subtasks),
        time_tracking_json: JSON.stringify(t.timeTracking),
        notes: t.notes || '',
        created_at: t.createdAt,
        completed_at: t.completedAt,
        in_my_day: this.serializeBool(!!t.inMyDay),
        list_id: t.listId || null,
      });
    }

    console.log(
      `[Unified SQL Adapter] Initialized dialect: ${this.dialectConfig.dialect} (${this.name}) -> tables: tasks, custom_lists`
    );
  }

  private serializeBool(val: boolean): number | boolean {
    if (this.dialectConfig.dialect === 'postgres') return Boolean(val);
    return val ? 1 : 0;
  }

  private deserializeBool(val: unknown): boolean {
    return val === true || val === 1 || val === '1' || val === 'true';
  }

  private rowToTask(row: Record<string, unknown>): Task {
    let subtasks: Subtask[] = [];
    let timeTracking = {
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      isRunning: false,
      lastStartedAt: null,
    };

    try {
      if (typeof row.subtasks_json === 'string') subtasks = JSON.parse(row.subtasks_json);
      else if (Array.isArray(row.subtasks_json)) subtasks = row.subtasks_json as Subtask[];

      if (typeof row.time_tracking_json === 'string') timeTracking = JSON.parse(row.time_tracking_json);
      else if (row.time_tracking_json && typeof row.time_tracking_json === 'object') {
        timeTracking = row.time_tracking_json as typeof timeTracking;
      }
    } catch {
      // Fallback
    }

    return {
      id: row.id as string,
      title: row.title as string,
      isCompleted: this.deserializeBool(row.is_completed),
      isImportant: this.deserializeBool(row.is_important),
      dueDate: (row.due_date as string) || null,
      reminder: (row.reminder as string) || null,
      repeatRule: (row.repeat_rule as Task['repeatRule']) || 'NONE',
      subtasks,
      timeTracking,
      notes: (row.notes as string) || '',
      createdAt: (row.created_at as string) || new Date().toISOString(),
      completedAt: (row.completed_at as string) || null,
      inMyDay: this.deserializeBool(row.in_my_day),
      listId: (row.list_id as string) || null,
    };
  }

  private rowToList(row: Record<string, unknown>): CustomList {
    return {
      id: row.id as string,
      name: row.name as string,
      icon: row.icon as string,
      color: row.color as string,
      createdAt: (row.created_at as string) || new Date().toISOString(),
    };
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    const all = Array.from(this.tasksTable.values()).map((r) => this.rowToTask(r));
    return this.filterTasksInMemory(all, filter);
  }

  async getTaskById(id: string): Promise<Task | null> {
    const row = this.tasksTable.get(id);
    if (!row) return null;
    return this.rowToTask(row);
  }

  async createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();
    const completedAt = data.isCompleted ? new Date().toISOString() : null;

    const row: Record<string, unknown> = {
      id,
      title: data.title,
      is_completed: this.serializeBool(data.isCompleted),
      is_important: this.serializeBool(data.isImportant),
      due_date: data.dueDate || null,
      reminder: data.reminder || null,
      repeat_rule: data.repeatRule || 'NONE',
      subtasks_json: JSON.stringify(data.subtasks || []),
      time_tracking_json: JSON.stringify(
        data.timeTracking || {
          startTime: null,
          endTime: null,
          durationSeconds: 0,
          isRunning: false,
          lastStartedAt: null,
        }
      ),
      notes: data.notes || '',
      created_at: createdAt,
      completed_at: completedAt,
      in_my_day: this.serializeBool(!!data.inMyDay),
      list_id: data.listId || null,
    };

    this.tasksTable.set(id, row);
    return this.rowToTask(row);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const row = this.tasksTable.get(id);
    if (!row) return null;

    const currentTask = this.rowToTask(row);
    let completedAt = currentTask.completedAt;

    if (updates.isCompleted !== undefined) {
      completedAt = updates.isCompleted ? new Date().toISOString() : null;
    }

    if (updates.title !== undefined) row.title = updates.title;
    if (updates.isCompleted !== undefined) row.is_completed = this.serializeBool(updates.isCompleted);
    if (updates.isImportant !== undefined) row.is_important = this.serializeBool(updates.isImportant);
    if (updates.dueDate !== undefined) row.due_date = updates.dueDate;
    if (updates.reminder !== undefined) row.reminder = updates.reminder;
    if (updates.repeatRule !== undefined) row.repeat_rule = updates.repeatRule;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.inMyDay !== undefined) row.in_my_day = this.serializeBool(updates.inMyDay);
    if (updates.listId !== undefined) row.list_id = updates.listId;
    if (updates.subtasks !== undefined) row.subtasks_json = JSON.stringify(updates.subtasks);
    if (updates.timeTracking !== undefined) row.time_tracking_json = JSON.stringify(updates.timeTracking);
    row.completed_at = completedAt;

    this.tasksTable.set(id, row);
    return this.rowToTask(row);
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasksTable.delete(id);
  }

  async toggleComplete(id: string): Promise<Task | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    return this.updateTask(id, { isCompleted: !task.isCompleted });
  }

  async toggleImportant(id: string): Promise<Task | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    return this.updateTask(id, { isImportant: !task.isImportant });
  }

  async addSubtask(taskId: string, title: string): Promise<Subtask | null> {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    const newSubtask: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      isCompleted: false,
    };

    const updatedSubtasks = [...task.subtasks, newSubtask];
    await this.updateTask(taskId, { subtasks: updatedSubtasks });
    return newSubtask;
  }

  async toggleSubtask(taskId: string, subtaskId: string): Promise<Subtask | null> {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    let targetSub: Subtask | null = null;
    const updatedSubtasks = task.subtasks.map((s) => {
      if (s.id === subtaskId) {
        targetSub = { ...s, isCompleted: !s.isCompleted };
        return targetSub;
      }
      return s;
    });

    if (!targetSub) return null;
    await this.updateTask(taskId, { subtasks: updatedSubtasks });
    return targetSub;
  }

  async startTimer(taskId: string): Promise<Task | null> {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    const updatedTimeTracking = {
      ...task.timeTracking,
      isRunning: true,
      lastStartedAt: now,
      startTime: task.timeTracking.startTime || now,
    };

    return this.updateTask(taskId, { timeTracking: updatedTimeTracking });
  }

  async pauseTimer(taskId: string): Promise<Task | null> {
    const task = await this.getTaskById(taskId);
    if (!task || !task.timeTracking.isRunning) return task;

    const now = Date.now();
    const lastStarted = task.timeTracking.lastStartedAt
      ? new Date(task.timeTracking.lastStartedAt).getTime()
      : now;
    const elapsedSeconds = Math.max(0, Math.floor((now - lastStarted) / 1000));

    const updatedTimeTracking = {
      ...task.timeTracking,
      isRunning: false,
      durationSeconds: (task.timeTracking.durationSeconds || 0) + elapsedSeconds,
      lastStartedAt: null,
      endTime: new Date().toISOString(),
    };

    return this.updateTask(taskId, { timeTracking: updatedTimeTracking });
  }

  async getLists(): Promise<CustomList[]> {
    return Array.from(this.listsTable.values()).map((r) => this.rowToList(r));
  }

  async getListById(id: string): Promise<CustomList | null> {
    const row = this.listsTable.get(id);
    if (!row) return null;
    return this.rowToList(row);
  }

  async createList(name: string, icon = 'List', color = 'blue'): Promise<CustomList> {
    const id = `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();

    const row: Record<string, unknown> = {
      id,
      name,
      icon,
      color,
      created_at: createdAt,
    };

    this.listsTable.set(id, row);
    return this.rowToList(row);
  }

  async updateList(id: string, updates: Partial<CustomList>): Promise<CustomList | null> {
    const row = this.listsTable.get(id);
    if (!row) return null;

    if (updates.name !== undefined) row.name = updates.name;
    if (updates.icon !== undefined) row.icon = updates.icon;
    if (updates.color !== undefined) row.color = updates.color;

    this.listsTable.set(id, row);
    return this.rowToList(row);
  }

  async deleteList(id: string): Promise<boolean> {
    const deleted = this.listsTable.delete(id);
    if (deleted) {
      // Cascade delete / set null
      for (const [taskId, row] of this.tasksTable.entries()) {
        if (row.list_id === id) {
          row.list_id = null;
          this.tasksTable.set(taskId, row);
        }
      }
    }
    return deleted;
  }

  async sync(tasks: Task[], lists: CustomList[]): Promise<void> {
    this.listsTable.clear();
    this.tasksTable.clear();

    for (const l of lists) {
      this.listsTable.set(l.id, {
        id: l.id,
        name: l.name,
        icon: l.icon,
        color: l.color,
        created_at: l.createdAt,
      });
    }

    for (const t of tasks) {
      this.tasksTable.set(t.id, {
        id: t.id,
        title: t.title,
        is_completed: this.serializeBool(t.isCompleted),
        is_important: this.serializeBool(t.isImportant),
        due_date: t.dueDate,
        reminder: t.reminder,
        repeat_rule: t.repeatRule,
        subtasks_json: JSON.stringify(t.subtasks || []),
        time_tracking_json: JSON.stringify(
          t.timeTracking || {
            startTime: null,
            endTime: null,
            durationSeconds: 0,
            isRunning: false,
            lastStartedAt: null,
          }
        ),
        notes: t.notes || '',
        created_at: t.createdAt,
        completed_at: t.completedAt,
        in_my_day: this.serializeBool(!!t.inMyDay),
        list_id: t.listId || null,
      });
    }
  }

  getSchemaDDL(): string {
    return this.dialectConfig.ddlSchema;
  }
}
