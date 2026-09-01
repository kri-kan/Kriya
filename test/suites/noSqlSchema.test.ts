import { createSuite, expect } from '../framework';
import {
  NoSqlSchemaValidator,
  CURRENT_NOSQL_SCHEMA_VERSION,
} from '../../server/db/schema/nosqlSchemaValidator';

export const noSqlSchemaSuite = createSuite(
  'NoSQL Code Schema & Validator Engine',
  'schema',
  'Verifies MongoDB and Firestore runtime document validation, sanitization, default filling, and v1-to-v2 backwards compatibility upgrades',
  (suite) => {
    suite.it('should validate a clean v2 Task document successfully', () => {
      const inputDoc = {
        id: 'task-nosql-1',
        title: 'Upgrade Firestore Security Rules',
        isCompleted: false,
        isImportant: true,
        priority: 'high',
        tags: ['security', 'database'],
        subtasks: [
          { id: 'sub-1', title: 'Write rules.spec', isCompleted: false },
        ],
        _schemaVersion: CURRENT_NOSQL_SCHEMA_VERSION,
      };

      const result = NoSqlSchemaValidator.validateAndSanitizeTask(inputDoc);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.sanitized.title).toBe('Upgrade Firestore Security Rules');
      expect(result.schemaVersion).toBe(2);
    });

    suite.it('should automatically upgrade a legacy v1 Task document to v2 with proper schema version tagging', () => {
      const legacyV1Doc = {
        title: 'Legacy Task Without Schema Version or Priority',
        isCompleted: true,
      };

      const result = NoSqlSchemaValidator.validateAndSanitizeTask(legacyV1Doc);
      expect(result.valid).toBe(true);
      expect(result.schemaVersion).toBe(CURRENT_NOSQL_SCHEMA_VERSION);
      expect(result.migrated).toBe(true);
      expect(result.sanitized.title).toBe('Legacy Task Without Schema Version or Priority');
      expect(Array.isArray(result.sanitized.subtasks)).toBe(true);
      expect(result.sanitized.id).toBeDefined();
    });

    suite.it('should validate custom list documents and sanitize colors', () => {
      const listDoc = {
        name: 'Sprint Backlog',
        icon: 'ListTodo',
        color: '#3B82F6',
      };

      const result = NoSqlSchemaValidator.validateAndSanitizeList(listDoc);
      expect(result.valid).toBe(true);
      expect(result.sanitized.name).toBe('Sprint Backlog');
      expect(result.schemaVersion).toBe(CURRENT_NOSQL_SCHEMA_VERSION);
      expect(result.sanitized.createdAt).toBeDefined();
    });

    suite.it('should reject invalid document payloads with empty title or missing fields', () => {
      const invalidDoc = {
        title: '', // empty title not allowed
      };

      const result = NoSqlSchemaValidator.validateAndSanitizeTask(invalidDoc);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
);
