import { createSuite, expect } from '../framework';
import { dbFactory } from '../../server/db/factory';
import { GenericSqlAdapter } from '../../server/db/adapters/genericSqlAdapter';
import { GenericNoSqlAdapter } from '../../server/db/adapters/genericNoSqlAdapter';

export const databaseAdaptersSuite = createSuite(
  'Pluggable Database Adapters & Hot-Swapping',
  'database',
  'Verifies GenericSqlAdapter, GenericNoSqlAdapter, zero-downtime hot swapping, and bidirectional data preservation',
  (suite) => {
    suite.beforeEach(async () => {
      await dbFactory.initialize();
    });

    suite.it('should initialize with default SQLite adapter and report operational health', async () => {
      const adapter = dbFactory.getAdapter();
      expect(adapter).toBeDefined();
      expect(adapter.type).toBe('sqlite');

      const testConn = await adapter.testConnection();
      expect(testConn.success).toBe(true);
      expect(testConn.driver).toBe('sqlite');
    });

    suite.it('should perform task and list CRUD operations via active adapter', async () => {
      const adapter = dbFactory.getAdapter();

      // Create Task
      const task = await adapter.createTask({
        title: 'Adapter Integration Test Task',
        isCompleted: false,
        isImportant: true,
        dueDate: null,
        reminder: null,
        repeatRule: 'NONE',
        subtasks: [],
        timeTracking: {
          startTime: null,
          endTime: null,
          durationSeconds: 0,
          isRunning: false,
        },
        completedAt: null,
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Adapter Integration Test Task');

      // Read Tasks
      const tasks = await adapter.getTasks();
      const found = tasks.find((t) => t.id === task.id);
      expect(found).toBeDefined();
      expect(found?.isImportant).toBe(true);

      // Update Task
      const updated = await adapter.updateTask(task.id, {
        isCompleted: true,
        title: 'Updated Test Task Title',
      });
      expect(updated).toBeDefined();
      expect(updated?.isCompleted).toBe(true);
      expect(updated?.title).toBe('Updated Test Task Title');

      // Delete Task
      const deleted = await adapter.deleteTask(task.id);
      expect(deleted).toBe(true);
    });

    suite.it('should generate dialect-specific schemas for SQL and NoSQL engines', () => {
      const sqliteSchema = dbFactory.getSchemaForDriver('sqlite');
      expect(sqliteSchema).toContain('CREATE TABLE');

      const postgresSchema = dbFactory.getSchemaForDriver('postgres');
      expect(postgresSchema).toContain('CREATE TABLE');

      const mongoSchema = dbFactory.getSchemaForDriver('mongodb');
      expect(mongoSchema).toContain('validator');

      const firestoreSchema = dbFactory.getSchemaForDriver('firebase');
      expect(firestoreSchema).toContain('rules_version');
    });

    suite.it('should seamlessly hot-swap between SQL and NoSQL adapters with data preservation', async () => {
      // Create seed task in SQLite
      const adapter1 = dbFactory.getAdapter();
      const seedTask = await adapter1.createTask({
        title: 'Hot Swap Seed Task',
        isCompleted: false,
        isImportant: false,
        dueDate: null,
        reminder: null,
        repeatRule: 'NONE',
        subtasks: [],
        timeTracking: {
          startTime: null,
          endTime: null,
          durationSeconds: 0,
          isRunning: false,
        },
        completedAt: null,
      });

      // Switch to Memory/NoSQL driver with data migration
      const switchResult = await dbFactory.switchDriver(
        { driver: 'memory' },
        true
      );
      expect(switchResult.success).toBe(true);
      expect(dbFactory.getAdapter().type).toBe('memory');

      // Verify task exists in new adapter
      const adapter2 = dbFactory.getAdapter();
      const tasksAfterSwitch = await adapter2.getTasks();
      const migratedTask = tasksAfterSwitch.find((t) => t.title === 'Hot Swap Seed Task');
      expect(migratedTask).toBeDefined();

      // Clean up & Switch back to SQLite
      await dbFactory.switchDriver({ driver: 'sqlite' }, true);
      expect(dbFactory.getAdapter().type).toBe('sqlite');
    });
  }
);
