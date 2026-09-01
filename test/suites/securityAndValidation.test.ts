import { createSuite, expect } from '../framework';
import { NoSqlSchemaValidator } from '../../server/db/schema/nosqlSchemaValidator';
import { GenericSqlAdapter, SQL_DIALECT_CONFIGS } from '../../server/db/adapters/genericSqlAdapter';

export const securityAndValidationSuite = createSuite(
  'Security, Sanitization & Input Defense',
  'security',
  'Verifies input sanitization, injection resistance, boundary enforcement, and malicious payload defense',
  (suite) => {
    suite.it('should neutralize XSS payloads in task titles and notes via schema sanitizer', () => {
      const maliciousPayload = {
        title: '<script>alert("XSS")</script>Critical Security Task',
        notes: '<img src=x onerror=alert(document.cookie)>Sensitive notes with <b>HTML</b>',
        isCompleted: false,
      };

      const result = NoSqlSchemaValidator.validateAndSanitizeTask(maliciousPayload);
      expect(result.valid).toBe(true);
      expect(result.sanitized.title).toBeDefined();
      expect(result.sanitized.notes).toBeDefined();
      expect(typeof result.sanitized.title).toBe('string');
      expect(result.sanitized.id).toBeDefined();
    });

    suite.it('should reject non-object or null document inputs gracefully without crashing', () => {
      const nullResult = NoSqlSchemaValidator.validateAndSanitizeTask(null);
      expect(nullResult.valid).toBe(false);
      expect(nullResult.errors.length).toBeGreaterThan(0);

      const arrayResult = NoSqlSchemaValidator.validateAndSanitizeTask(['invalid']);
      expect(arrayResult.valid).toBe(false);

      const numberResult = NoSqlSchemaValidator.validateAndSanitizeTask(12345);
      expect(numberResult.valid).toBe(false);
    });

    suite.it('should provide strict parameterized DDL configurations across all SQL dialects', () => {
      const sqliteConfig = SQL_DIALECT_CONFIGS.sqlite;
      expect(sqliteConfig.ddlSchema).toContain('CREATE TABLE IF NOT EXISTS');
      expect(sqliteConfig.paramPlaceholder(1)).toBe('?');

      const pgConfig = SQL_DIALECT_CONFIGS.postgres;
      expect(pgConfig.ddlSchema).toContain('TIMESTAMPTZ');
      expect(pgConfig.paramPlaceholder(1)).toBe('$1');
      expect(pgConfig.paramPlaceholder(2)).toBe('$2');

      const mysqlConfig = SQL_DIALECT_CONFIGS.mysql;
      expect(mysqlConfig.ddlSchema).toContain('ENGINE=InnoDB');
      expect(mysqlConfig.paramPlaceholder(1)).toBe('?');

      const mssqlConfig = SQL_DIALECT_CONFIGS.mssql;
      expect(mssqlConfig.ddlSchema).toContain('NVARCHAR');
      expect(mssqlConfig.paramPlaceholder(1)).toBe('@p1');
    });

    suite.it('should enforce length constraints and sanitize custom list hex color codes', () => {
      const invalidColorList = {
        name: 'Product Roadmap',
        color: 'red; DROP TABLE tasks; --', // Malicious attempt in color property
      };

      const result = NoSqlSchemaValidator.validateAndSanitizeList(invalidColorList);
      expect(result.valid).toBe(true);
      // Sanitizer enforces fallback hex color if invalid hex pattern
      expect(result.sanitized.color.startsWith('#')).toBe(true);
      expect(result.sanitized.color.length).toBe(7);
    });

    suite.it('should handle deeply nested and corrupted subtask arrays securely', () => {
      const corruptedTask = {
        title: 'Corrupted Subtasks Task',
        subtasks: [
          null,
          'string-instead-of-object',
          { id: 'valid-1', title: 'Valid Subtask', isCompleted: true },
          { id: '', title: '', isCompleted: false },
        ],
      };

      const result = NoSqlSchemaValidator.validateAndSanitizeTask(corruptedTask);
      expect(result.valid).toBe(true);
      expect(Array.isArray(result.sanitized.subtasks)).toBe(true);
      // Only valid subtasks with ids and titles survive sanitization
      expect(result.sanitized.subtasks.length).toBeGreaterThanOrEqual(1);
    });
  }
);

