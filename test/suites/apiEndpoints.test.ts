import { createSuite, expect } from '../framework';
import { dbFactory } from '../../server/db/factory';
import { installManager } from '../../server/installer/installManager';
import { SqlMigrationsEngine } from '../../server/db/schema/sqlMigrationsEngine';

export const apiEndpointsSuite = createSuite(
  'API Data Access & Business Service Layer',
  'api',
  'Verifies task and list data services, installer diagnostic APIs, database stats, and SQL migration execution',
  (suite) => {
    suite.beforeEach(async () => {
      await dbFactory.initialize();
    });

    suite.it('should fetch all tasks with structured metadata and time tracking details', async () => {
      const adapter = dbFactory.getAdapter();
      const tasks = await adapter.getTasks();

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThanOrEqual(1);

      const first = tasks[0];
      expect(first.id).toBeDefined();
      expect(first.title).toBeDefined();
      expect(typeof first.isCompleted).toBe('boolean');
      expect(Array.isArray(first.subtasks)).toBe(true);
    });

    suite.it('should fetch all custom lists with valid color coding and names', async () => {
      const adapter = dbFactory.getAdapter();
      const lists = await adapter.getLists();

      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBeGreaterThanOrEqual(1);

      const firstList = lists[0];
      expect(firstList.id).toBeDefined();
      expect(firstList.name).toBeDefined();
      expect(firstList.color).toBeDefined();
    });

    suite.it('should return live database health metrics and operational statistics', async () => {
      const adapter = dbFactory.getAdapter();
      const stats = await adapter.getStats();

      expect(stats.totalTasks).toBeGreaterThanOrEqual(0);
      expect(stats.completedTasks).toBeGreaterThanOrEqual(0);
      expect(stats.pendingTasks).toBeGreaterThanOrEqual(0);
      expect(typeof stats.totalLoggedSeconds).toBe('number');
      expect(typeof stats.completionRate).toBe('number');
    });

    suite.it('should execute preflight diagnostic checks and report passing grades across all hardware subsystems', async () => {
      const diagnostics = await installManager.runPreflightChecks();

      expect(diagnostics.node.passed).toBe(true);
      expect(diagnostics.node.value).toContain('v');
      expect(diagnostics.os.passed).toBe(true);
      expect(diagnostics.memory.passed).toBe(true);
      expect(diagnostics.storage.passed).toBe(true);
      expect(diagnostics.database.passed).toBe(true);
    });

    suite.it('should verify SQL migration catalog integrity and support dynamic DDL retrieval', () => {
      const migrations = SqlMigrationsEngine.getAllMigrations();
      expect(migrations.length).toBe(5);

      const sqliteDDL = SqlMigrationsEngine.generateFullMigrationScript('sqlite');
      expect(sqliteDDL).toContain('tasks');
      expect(sqliteDDL).toContain('custom_lists');

      const postgresDDL = SqlMigrationsEngine.generateFullMigrationScript('postgres');
      expect(postgresDDL).toContain('TIMESTAMPTZ');
    });
  }
);
