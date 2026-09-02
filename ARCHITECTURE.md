# Kriya — System Architecture & Engineering Specification

## 1. Executive Summary

Kriya is built around a decoupled full-stack architecture consisting of a **React 19 single-page client**, an **Express service layer**, a **Pluggable Multi-Database Abstraction Layer**, and a **Model Context Protocol (MCP)** server.

The core design goals of the platform are:
1. **Pluggable Storage & Zero-Downtime Migration**: Support diverse relational (SQLite, PostgreSQL, MySQL, MSSQL) and document-oriented (MongoDB, Firestore) databases with live hot-swapping.
2. **Deterministic Schema Evolution**: Guarantee schema integrity through versioned, SHA-256 fingerprinted migrations for SQL engines and code-level validator transformations for NoSQL document stores.
3. **First-Class AI Agent Interoperability**: Provide standardized Model Context Protocol (MCP) tool bindings over SSE (Server-Sent Events) so LLM agents can inspect, create, toggle, and summarize tasks.
4. **Universal Packaging & Portability**: Enable packaging across desktop (Electron), mobile (Capacitor for Android/iOS), and web (PWA) from a single unified codebase.

---

## 2. System Topography & Component Hierarchy

```
+-------------------------------------------------------------------------+
|                              Client Layer                               |
|   - React 19 + TypeScript + Tailwind CSS v4                             |
|   - State Managers: TaskContext, DatabaseState, TimerManager            |
|   - Views: TaskStream, DetailDrawer, Modals (DB, Test, Docs, Portability)|
+------------------------------------+------------------------------------+
                                     | (REST HTTP / SSE Stream)
+------------------------------------v------------------------------------+
|                         Server Layer (Express)                          |
|   - Server Entry: server.ts (Port 3000 / Ingress Proxy)                 |
|   - Vite Dev Middleware / Static Production File Server                 |
+------------------+-----------------+------------------+-----------------+
|   Tasks & Lists  | Pluggable DB API|  MCP SSE Server  | Installer & QA  |
|   /api/tasks     | /api/db/info    |  /api/mcp/sse    | /api/tests/run  |
|   /api/lists     | /api/db/switch  |  /api/mcp/message| /api/installer  |
|   /api/export/csv| /api/db/schema  |  (Tools Registry)| /api/build-bin  |
+------------------+--------+--------+------------------+-----------------+
                            |
+---------------------------v---------------------------------------------+
|                      Database Factory Layer                             |
|   - DatabaseFactory (Singleton Controller)                              |
|   - Hot-Swap Orchestrator with Bidirectional Data Migration             |
+---------------------------+---------------------------------------------+
                            |
           +----------------+----------------+
           |                                 |
+----------v---------------+      +----------v---------------+
|    GenericSqlAdapter     |      |   GenericNoSqlAdapter    |
| - SQLite 3 (Embedded)    |      | - MongoDB (Document)     |
| - PostgreSQL (JSONB/TZ)  |      | - Cloud Firestore        |
| - MySQL 8 (InnoDB)       |      +--------------------------+
| - MSSQL (T-SQL/Azure)    |      | In-Memory Store Adapter  |
+--------------------------+      | (Ephemeral Fast Testing) |
| SQL Migration Engine     |      +--------------------------+
| (Sequential v1-v5)       |      | NoSQL Schema Validator   |
| SHA-256 Integrity Checks |      | (v1 -> v2 Auto-Migrate)  |
+--------------------------+      +--------------------------+
```

---

## 3. Pluggable Database Abstraction Layer

### 3.1 Database Adapter Contract (`BaseDatabaseAdapter`)
All database drivers implement the `DatabaseAdapter` interface defined in `/server/db/types.ts`. The adapter standardizes all CRUD operations:
- `getTasks(filter?: TaskFilter): Promise<Task[]>`
- `createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task>`
- `updateTask(id: string, updates: Partial<Task>): Promise<Task | null>`
- `deleteTask(id: string): Promise<boolean>`
- `toggleComplete(id: string): Promise<Task | null>`
- `toggleImportant(id: string): Promise<Task | null>`
- `addSubtask(taskId: string, title: string): Promise<Subtask | null>`
- `toggleSubtask(taskId: string, subtaskId: string): Promise<Subtask | null>`
- `startTimer(taskId: string): Promise<Task | null>`
- `pauseTimer(taskId: string): Promise<Task | null>`
- `sync(tasks: Task[], lists: CustomList[]): Promise<void>`
- `getStats(): Promise<TaskStats>`
- `testConnection(): Promise<ConnectionTestResult>`

### 3.2 Unified SQL Adapter (`GenericSqlAdapter`)
The `GenericSqlAdapter` unifies relational database engines using dialect strategy configurations (`SQL_DIALECT_CONFIGS`):
- **SQLite 3**: Native embedded mode, file-backed or in-memory, WAL journal mode enabled.
- **PostgreSQL**: Dialect with `TIMESTAMPTZ`, JSONB column formatting, and parameterized indices.
- **MySQL 8**: Dialect with `DATETIME(3)`, native `JSON`, and InnoDB constraints.
- **MSSQL / Azure SQL**: Dialect with `NVARCHAR(MAX)`, `DATETIMEOFFSET`, and `@p1` parameterization.

### 3.3 Zero-Downtime Hot-Swapping (`dbFactory.switchDriver`)
When changing the active database via `POST /api/db/switch`:
1. The factory instantiates and initializes the new adapter candidate.
2. If `migrateData = true`, existing tasks and custom lists are extracted from the active adapter in memory.
3. The records are validated and transformed via `NoSqlSchemaValidator` to ensure all fields are conformant.
4. The new adapter's `sync(tasks, lists)` method is invoked to seed the target engine.
5. The old adapter is safely closed, and the active reference is atomically updated.

---

## 4. Sequential Evolution Engine & Schema Validation

### 4.1 SQL Evolution Engine (`SqlMigrationsEngine`)
The migration engine tracks 5 versioned evolutions with strict sequential ordering:
- **v1 (Initial Schema)**: Core `tasks` and `custom_lists` tables with basic status and priority flags.
- **v2 (Subtasks & Time Tracking)**: Adds JSON-encoded subtask hierarchies and timer duration tracking columns.
- **v3 (Eisenhower Matrix & Priority)**: Introduces `in_my_day`, `urgency`, and `importance` indices.
- **v4 (Recurrence & Reminders)**: Adds recurring scheduling rules (`repeat_rule`) and reminder timestamps.
- **v5 (Performance Indexing)**: Adds compound indices (`idx_tasks_status`, `idx_tasks_list_id`) for sub-millisecond query execution.

**SHA-256 Checksums**: Every migration step is hashed. The verification gate (`npm run verify`) rejects deployments if any applied migration has been tampered with or modified out of sequence.

### 4.2 NoSQL Code-Level Validator (`NoSqlSchemaValidator`)
For document databases (MongoDB, Firestore), schema enforcement occurs at the application code layer:
- Detects legacy v1 documents without schema versioning or time tracking.
- Automatically injects default structures (`_schemaVersion: 2`, `timeTracking`, subtask arrays).
- Sanitizes corrupted inputs, neutralizes XSS payloads, and validates hex color codes.

---

## 5. Model Context Protocol (MCP) Server Architecture

Kriya embeds an MCP Server compliant with Model Context Protocol specification v1.30:
- **Transport**: Server-Sent Events (SSE) mounted at `/api/mcp/sse` with bidirectional messaging via `/api/mcp/messages?sessionId=<id>`.
- **Tool Registrations**:
  - `list_tasks`: Retrieves tasks filtered by status (`all`, `pending`, `completed`), list, or search query.
  - `create_task`: Adds new tasks with title, due dates, priority, list assignment, and initial subtasks.
  - `toggle_task`: Changes completion status or toggles importance.
  - `filter_tasks`: Performs multi-criteria queries (e.g., Eisenhower matrix quadrants, overdue tasks).
  - `time_summary`: Aggregates logged work hours, active stopwatch status, and productivity statistics.

---

## 6. Portability & Packaging Matrix

The codebase contains turnkey packaging recipes in `/server/packaging/platformConfigs.ts`:
- **Desktop (Electron Builder)**: Windows NSIS installer (`.exe`), macOS Apple Silicon/Intel disk image (`.dmg`), Linux AppImage (`.AppImage`).
- **Mobile (Capacitor)**: iOS project with splash screens/icons, Android Gradle project with target SDK 34.
- **Web (PWA)**: Web App Manifest (`manifest.json`) and offline service worker caching strategy.
- **CI/CD Pipeline**: Pre-configured GitHub Actions workflow compiling multi-platform release artifacts.

---

## 7. Testing & Quality Assurance Architecture

The test harness is implemented in `/test/framework.ts` without external dependencies:
- **Execution Speed**: Full test suite runs in under 100ms.
- **Dual Runtime**: Executable both from CLI (`npm test`) and via HTTP API (`/api/tests/run`) for the in-app Test & QA Hub modal.
- **Quality Gates**: Pre-deployment scripts (`npm run verify` and `npm run build:installer`) automatically run before binary artifact generation.
