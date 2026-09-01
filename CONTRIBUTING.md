# Contributing to TaskMaster Pro

Thank you for contributing to TaskMaster Pro! This guide outlines our development workflow, coding standards, automated test requirements, and procedures for adding new database adapters, migrations, or MCP tools.

---

## 1. Code of Conduct

We are committed to providing a welcoming, inclusive, and professional environment for all contributors. Respectful collaboration and constructive feedback are expected at all times.

---

## 2. Development Workflow & Pull Requests

1. **Fork & Branch**: Create a feature branch off `main` with a descriptive name (e.g., `feat/weekly-calendar-view`, `fix/stopwatch-background-tick`).
2. **Local Verification**: Ensure all linting and test suites pass locally before submitting:
   ```bash
   npm run lint
   npm test
   npm run verify
   ```
3. **Commit Messages**: Follow Conventional Commits:
   - `feat: add Google Drive automatic backup adapter`
   - `fix: resolve race condition in SSE transport session cleanup`
   - `docs: update architecture schema diagram`
   - `test: add unit test suite for recurring rule edge cases`

---

## 3. Code Standards & Architecture Guidelines

- **TypeScript**: Strict mode enabled. Do NOT use `any` unless strictly necessary; declare comprehensive types in `/src/types.ts` or `/server/db/types.ts`.
- **React 19 & Tailwind CSS v4**:
  - Keep components modular. Extract distinct sub-views into `/src/components/`.
  - Use Tailwind CSS utility classes directly. Avoid custom `.css` files.
  - Animate view transitions using `motion` (imported from `motion/react`).
  - Use icons strictly from `lucide-react`.
- **Database Layer**:
  - All database interactions must go through `dbFactory.getAdapter()`. Never call driver-specific APIs directly in UI components.
  - Implement bidirectional synchronization in any new database adapter via the `sync(tasks, lists)` method.

---

## 4. How to Add a New Database Migration (SQL)

To add a new SQL schema migration:
1. Open `/server/db/schema/sqlMigrationsEngine.ts`.
2. Register a new migration entry in `MIGRATION_STEPS`:
   ```ts
   {
     version: 6,
     name: 'add_task_priority_scoring',
     description: 'Adds priority scoring and weighted velocity metrics',
     up: {
       sqlite: 'ALTER TABLE tasks ADD COLUMN priority_score REAL DEFAULT 0.0;',
       postgres: 'ALTER TABLE tasks ADD COLUMN priority_score DOUBLE PRECISION DEFAULT 0.0;',
       mysql: 'ALTER TABLE tasks ADD COLUMN priority_score DOUBLE DEFAULT 0.0;',
       mssql: 'ALTER TABLE tasks ADD COLUMN priority_score FLOAT DEFAULT 0.0;',
     },
     down: {
       sqlite: '-- SQLite lacks ALTER TABLE DROP COLUMN in older versions',
       postgres: 'ALTER TABLE tasks DROP COLUMN priority_score;',
       mysql: 'ALTER TABLE tasks DROP COLUMN priority_score;',
       mssql: 'ALTER TABLE tasks DROP COLUMN priority_score;',
     },
   }
   ```
3. Run `npm test` to verify migration sequence order and update test expectations.
4. Run `npm run verify` to compute and validate the new SHA-256 fingerprint.

---

## 5. How to Add a New MCP Tool

To register a new AI Agent tool:
1. Open `/server/mcpServer.ts`.
2. Call `server.tool()` with a descriptive name, documentation, and Zod parameter schema:
   ```ts
   server.tool(
     'archive_completed_tasks',
     'Moves all completed tasks to an archive list or soft-deletes them',
     {
       olderThanDays: z.number().optional().describe('Archive tasks completed more than X days ago'),
     },
     async ({ olderThanDays = 0 }) => {
       const adapter = dbFactory.getAdapter();
       const tasks = await adapter.getTasks({ status: 'completed' });
       // Logic to archive tasks...
       return {
         content: [{ type: 'text', text: `Successfully archived ${tasks.length} tasks.` }],
       };
     }
   );
   ```
3. Add a corresponding test case in `/test/suites/mcpServer.test.ts`.

---

## 6. Writing Automated Tests

All tests live in `/test/suites/` and are registered in `/test/runTests.ts`:
- Use `createSuite(name, category, description, (suite) => { ... })` and `suite.it(title, fn)`.
- Use the zero-dependency assertion library: `expect(actual).toBe(expected)`, `expect(val).toContain(substring)`, `expect(val).toBeDefined()`, `expect(val).toBeGreaterThan(n)`.
- Strive for 100% deterministic tests (no external network dependencies or unpredictable timers).
