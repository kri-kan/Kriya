import { Task, CustomList, Subtask, TaskFilter } from '../types';

export interface NoSqlValidationResult<T> {
  valid: boolean;
  sanitized: T;
  errors: string[];
  schemaVersion: number;
  migrated: boolean;
}

export const CURRENT_NOSQL_SCHEMA_VERSION = 2;

/**
 * NoSQL Code-Level Schema Validator & Auto-Migration Engine
 * Enforces strict typing, default values, bounds checking, and automatic version transformations.
 */
export class NoSqlSchemaValidator {
  /**
   * Validates, sanitizes, and upgrades a Task document
   */
  static validateAndSanitizeTask(doc: unknown): NoSqlValidationResult<Task> {
    const errors: string[] = [];
    let migrated = false;

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      return {
        valid: false,
        sanitized: {
          id: `task-${Date.now()}`,
          title: 'Invalid Task Document',
          isCompleted: false,
          isImportant: false,
          dueDate: null,
          reminder: null,
          repeatRule: 'NONE',
          subtasks: [],
          timeTracking: { startTime: null, endTime: null, durationSeconds: 0, isRunning: false },
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
        errors: ['Document payload must be a non-null object.'],
        schemaVersion: CURRENT_NOSQL_SCHEMA_VERSION,
        migrated: false,
      };
    }

    const docObj = doc as Record<string, unknown>;

    // Detect schema version (v1 had no _schemaVersion or timeTracking)
    const docVersion = typeof docObj._schemaVersion === 'number' ? docObj._schemaVersion : 1;
    if (docVersion < CURRENT_NOSQL_SCHEMA_VERSION) {
      migrated = true;
    }

    // 1. ID Validation & Fallback
    let id = typeof docObj.id === 'string' ? docObj.id.trim() : (typeof docObj._id === 'string' ? docObj._id.trim() : '');
    if (!id) {
      id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      migrated = true;
    }

    // 2. Title Validation
    let title = typeof docObj.title === 'string' ? docObj.title.trim() : '';
    if (!title) {
      title = 'Untitled Task';
      errors.push('Task title was missing or empty; defaulted to "Untitled Task".');
    }

    // 3. Status Booleans
    const isCompleted = Boolean(docObj.isCompleted);
    const isImportant = Boolean(docObj.isImportant);
    const inMyDay = Boolean(docObj.inMyDay);

    // 4. Dates
    const validateDate = (val: unknown): string | null => {
      if (!val) return null;
      if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString();
      if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
      return null;
    };

    const dueDate = validateDate(docObj.dueDate);
    const reminder = validateDate(docObj.reminder);
    const createdAt = validateDate(docObj.createdAt) || new Date().toISOString();
    let completedAt = validateDate(docObj.completedAt);
    if (isCompleted && !completedAt) {
      completedAt = new Date().toISOString();
    } else if (!isCompleted) {
      completedAt = null;
    }

    // 5. Repeat Rule Enum Enforcement
    const validRepeatRules = ['NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
    let repeatRule: Task['repeatRule'] = 'NONE';
    if (typeof docObj.repeatRule === 'string' && (validRepeatRules as readonly string[]).includes(docObj.repeatRule)) {
      repeatRule = docObj.repeatRule as Task['repeatRule'];
    }

    // 6. Subtasks Array & Schema Enforcement
    const subtasks: Subtask[] = [];
    if (Array.isArray(docObj.subtasks)) {
      docObj.subtasks.forEach((rawSub, idx) => {
        if (typeof rawSub === 'object' && rawSub !== null) {
          const subObj = rawSub as Record<string, unknown>;
          const subId = typeof subObj.id === 'string' ? subObj.id : `sub-${idx}-${Date.now()}`;
          const subTitle = typeof subObj.title === 'string' ? subObj.title.trim() : `Subtask ${idx + 1}`;
          subtasks.push({
            id: subId,
            title: subTitle || `Subtask ${idx + 1}`,
            isCompleted: Boolean(subObj.isCompleted),
          });
        }
      });
    }

    // 7. Time Tracking Object & Schema Enforcement (V2 Schema)
    const rawTime = (typeof docObj.timeTracking === 'object' && docObj.timeTracking !== null)
      ? (docObj.timeTracking as Record<string, unknown>)
      : {};

    const durationSeconds = typeof rawTime.durationSeconds === 'number' && rawTime.durationSeconds >= 0
      ? Math.floor(rawTime.durationSeconds)
      : 0;

    const isRunning = Boolean(rawTime.isRunning);
    const startTime = validateDate(rawTime.startTime);
    const endTime = validateDate(rawTime.endTime);
    const lastStartedAt = validateDate(rawTime.lastStartedAt);

    const timeTracking = {
      startTime,
      endTime,
      durationSeconds,
      isRunning,
      lastStartedAt,
    };

    // 8. Notes & List ID
    const notes = typeof docObj.notes === 'string' ? docObj.notes : '';
    const listId = typeof docObj.listId === 'string' && docObj.listId.trim() ? docObj.listId.trim() : null;

    const sanitizedTask: Task = {
      id,
      title,
      isCompleted,
      isImportant,
      dueDate,
      reminder,
      repeatRule,
      subtasks,
      timeTracking,
      notes,
      createdAt,
      completedAt,
      inMyDay,
      listId,
    };

    return {
      valid: errors.length === 0,
      sanitized: sanitizedTask,
      errors,
      schemaVersion: CURRENT_NOSQL_SCHEMA_VERSION,
      migrated,
    };
  }

  /**
   * Validates and sanitizes a CustomList document
   */
  static validateAndSanitizeList(doc: unknown): NoSqlValidationResult<CustomList> {
    const errors: string[] = [];

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      return {
        valid: false,
        sanitized: {
          id: `list-${Date.now()}`,
          name: 'Invalid List',
          icon: 'List',
          color: '#3b82f6',
          createdAt: new Date().toISOString(),
        },
        errors: ['Document payload must be a non-null object.'],
        schemaVersion: CURRENT_NOSQL_SCHEMA_VERSION,
        migrated: false,
      };
    }

    const docObj = doc as Record<string, unknown>;

    let id = typeof docObj.id === 'string' ? docObj.id.trim() : (typeof docObj._id === 'string' ? docObj._id.trim() : '');
    if (!id) {
      id = `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }

    let name = typeof docObj.name === 'string' ? docObj.name.trim() : '';
    if (!name) {
      name = 'Untitled List';
      errors.push('List name was missing; defaulted to "Untitled List".');
    }

    const icon = typeof docObj.icon === 'string' && docObj.icon.trim() ? docObj.icon.trim() : 'List';
    
    // Sanitize color code
    let color = typeof docObj.color === 'string' ? docObj.color.trim() : 'blue';
    if (!/^#[0-9a-fA-F]{6}$/.test(color) && !['blue', 'purple', 'emerald', 'amber', 'rose', 'indigo', 'teal', 'cyan'].includes(color)) {
      color = '#3b82f6'; // Safe fallback
    }

    const createdAt = typeof docObj.createdAt === 'string' ? docObj.createdAt : new Date().toISOString();

    const sanitizedList: CustomList = {
      id,
      name,
      icon,
      color,
      createdAt,
    };

    return {
      valid: errors.length === 0,
      sanitized: sanitizedList,
      errors,
      schemaVersion: CURRENT_NOSQL_SCHEMA_VERSION,
      migrated: false,
    };
  }
}
