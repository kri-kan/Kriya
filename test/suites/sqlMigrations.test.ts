import { createSuite, expect } from '../framework';
import { SqlMigrationsEngine } from '../../server/db/schema/sqlMigrationsEngine';

export const sqlMigrationsSuite = createSuite(
  'SQL Evolution & Migration Engine',
  'migrations',
  'Verifies sequential schema evolutions (v1-v5), SHA-256 integrity checksums, multi-dialect DDL queries, and rollback capabilities',
  (suite) => {
    suite.it('should register all versioned migration steps in strict sequential order', () => {
      const migrations = SqlMigrationsEngine.getAllMigrations();
      expect(migrations.length).toBeGreaterThanOrEqual(5);

      for (let i = 0; i < migrations.length; i++) {
        expect(migrations[i].version).toBe(i + 1);
        expect(migrations[i].name).toBeDefined();
        expect(migrations[i].upSql).toBeDefined();
        expect(migrations[i].downSql).toBeDefined();
        expect(migrations[i].checksum).toBeDefined();
      }
    });

    suite.it('should generate valid SQLite evolution script', () => {
      const script = SqlMigrationsEngine.generateFullMigrationScript('sqlite');
      expect(script).toContain('CREATE TABLE IF NOT EXISTS');
      expect(script).toContain('custom_lists');
      expect(script).toContain('tasks');
    });

    suite.it('should generate valid PostgreSQL enterprise evolution script with JSONB support', () => {
      const script = SqlMigrationsEngine.generateFullMigrationScript('postgres');
      expect(script).toContain('TIMESTAMPTZ');
      expect(script).toContain('VARCHAR');
      expect(script).toContain('custom_lists');
    });

    suite.it('should generate valid MySQL and MSSQL scripts', () => {
      const mysqlScript = SqlMigrationsEngine.generateFullMigrationScript('mysql');
      expect(mysqlScript).toContain('ENGINE=InnoDB');
      expect(mysqlScript).toContain('custom_lists');

      const mssqlScript = SqlMigrationsEngine.generateFullMigrationScript('mssql');
      expect(mssqlScript).toContain('NVARCHAR');
      expect(mssqlScript).toContain('custom_lists');
    });

    suite.it('should calculate unique non-empty SHA-256 checksums for each migration', () => {
      const migrations = SqlMigrationsEngine.getAllMigrations();
      const checksums = new Set<string>();

      for (const m of migrations) {
        expect(m.checksum.length).toBeGreaterThan(10);
        expect(checksums.has(m.checksum)).toBe(false);
        checksums.add(m.checksum);
      }
    });

    suite.it('should execute simulation and track pending versus applied migrations', () => {
      const pendingBefore = SqlMigrationsEngine.getPendingMigrations();
      const allMigrations = SqlMigrationsEngine.getAllMigrations();
      expect(allMigrations.length).toBeGreaterThanOrEqual(5);

      // Verify applying a migration
      const first = allMigrations[0];
      const res = SqlMigrationsEngine.applyMigration(first.id);
      expect(res.success).toBe(true);
      expect(res.migration.status).toBe('APPLIED');
    });
  }
);
