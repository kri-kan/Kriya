import { BaseDatabaseAdapter, INITIAL_CUSTOM_LISTS, INITIAL_TASKS } from './baseAdapter';
import {
  Task,
  CustomList,
  Subtask,
  TaskFilter,
  DatabaseDriverType,
  DatabaseConfig,
} from '../types';
import { NoSqlSchemaValidator } from '../schema/nosqlSchemaValidator';

export type NoSqlProviderType = 'mongodb' | 'firebase';

export interface NoSqlProviderConfig {
  provider: NoSqlProviderType;
  displayName: string;
  idField: string;
  documentModel: string;
  schemaDocumentation: string;
}

export const NOSQL_PROVIDER_CONFIGS: Record<NoSqlProviderType, NoSqlProviderConfig> = {
  mongodb: {
    provider: 'mongodb',
    displayName: 'MongoDB Atlas (BSON Document Store)',
    idField: '_id',
    documentModel: 'BSON Document with Embedded Subdocuments & Arrays',
    schemaDocumentation: `// ==============================================================================
// MONGODB / ATLAS NOSQL SCHEMA VALIDATION & INDEXES (Unified NoSQL Adapter)
// ==============================================================================
db.createCollection("custom_lists", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "createdAt"],
      properties: {
        _id: { bsonType: "string" },
        name: { bsonType: "string" },
        icon: { bsonType: "string" },
        color: { bsonType: "string" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("tasks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "title", "isCompleted", "createdAt"],
      properties: {
        _id: { bsonType: "string" },
        title: { bsonType: "string" },
        isCompleted: { bsonType: "bool" },
        isImportant: { bsonType: "bool" },
        dueDate: { bsonType: ["date", "null"] },
        reminder: { bsonType: ["date", "null"] },
        repeatRule: { enum: ["NONE", "DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY", "YEARLY"] },
        subtasks: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["id", "title", "isCompleted"],
            properties: {
              id: { bsonType: "string" },
              title: { bsonType: "string" },
              isCompleted: { bsonType: "bool" }
            }
          }
        },
        timeTracking: {
          bsonType: "object",
          properties: {
            startTime: { bsonType: ["date", "string", "null"] },
            endTime: { bsonType: ["date", "string", "null"] },
            durationSeconds: { bsonType: "number" },
            isRunning: { bsonType: "bool" },
            lastStartedAt: { bsonType: ["date", "string", "null"] }
          }
        },
        notes: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        completedAt: { bsonType: ["date", "null"] },
        inMyDay: { bsonType: "bool" },
        listId: { bsonType: ["string", "null"] }
      }
    }
  }
});

// Create Compound Indexes
db.tasks.createIndex({ listId: 1, isCompleted: 1 });
db.tasks.createIndex({ inMyDay: 1 });
db.tasks.createIndex({ isImportant: 1 });
db.tasks.createIndex({ "subtasks.isCompleted": 1 });`,
  },
  firebase: {
    provider: 'firebase',
    displayName: 'Google Cloud Firestore (Serverless Realtime NoSQL)',
    idField: 'id',
    documentModel: 'Firestore Collection Document Hierarchy',
    schemaDocumentation: `// ==============================================================================
// GOOGLE CLOUD FIRESTORE SECURITY RULES & SCHEMA (Unified NoSQL Adapter)
// ==============================================================================
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Custom Lists Collection
    match /lists/{listId} {
      allow read: if true;
      allow create: if request.resource.data.name is string
                    && request.resource.data.name.size() > 0;
      allow update: if true;
      allow delete: if true;
    }
    
    // Tasks Collection with Embedded Subtasks and Time Tracking
    match /tasks/{taskId} {
      allow read: if true;
      allow create: if request.resource.data.title is string
                    && request.resource.data.title.size() > 0
                    && request.resource.data.isCompleted is bool;
      allow update: if true;
      allow delete: if true;
    }
  }
}`,
  },
};

/**
 * GenericNoSqlAdapter: A single unified adapter managing all Document NoSQL databases
 * (MongoDB, Firebase Firestore) using NoSQL Provider Strategies.
 */
export class GenericNoSqlAdapter extends BaseDatabaseAdapter {
  readonly providerConfig: NoSqlProviderConfig;
  readonly type: DatabaseDriverType;
  readonly name: string;

  private tasksCollection: Map<string, Record<string, unknown>> = new Map();
  private listsCollection: Map<string, Record<string, unknown>> = new Map();
  private connectionConfig?: DatabaseConfig;

  constructor(provider: NoSqlProviderType, config?: DatabaseConfig) {
    super();
    this.type = provider;
    this.providerConfig = NOSQL_PROVIDER_CONFIGS[provider] || NOSQL_PROVIDER_CONFIGS.mongodb;
    this.name = `Unified NoSQL Adapter [${this.providerConfig.displayName}]`;
    this.connectionConfig = config;
  }

  async init(): Promise<void> {
    await super.init();

    for (const l of INITIAL_CUSTOM_LISTS) {
      const doc = this.serializeListDocument(l);
      this.listsCollection.set(l.id, doc);
    }

    for (const t of INITIAL_TASKS) {
      const doc = this.serializeTaskDocument(t);
      this.tasksCollection.set(t.id, doc);
    }

    console.log(
      `[Unified NoSQL Adapter] Initialized provider: ${this.providerConfig.provider} (${this.name}) -> collections: tasks, lists`
    );
  }

  private serializeTaskDocument(task: Task | Omit<Task, 'createdAt'> & { createdAt?: string }): Record<string, unknown> {
    const idKey = this.providerConfig.idField;
    // Apply code-level schema validation and sanitization
    const validated = NoSqlSchemaValidator.validateAndSanitizeTask(task as Record<string, unknown>);
    const sanitized = validated.sanitized;
    const createdAt = sanitized.createdAt ? new Date(sanitized.createdAt) : new Date();

    return {
      [idKey]: sanitized.id,
      _schemaVersion: validated.schemaVersion,
      title: sanitized.title,
      isCompleted: Boolean(sanitized.isCompleted),
      isImportant: Boolean(sanitized.isImportant),
      dueDate: sanitized.dueDate ? (this.providerConfig.provider === 'mongodb' ? new Date(sanitized.dueDate) : sanitized.dueDate) : null,
      reminder: sanitized.reminder ? (this.providerConfig.provider === 'mongodb' ? new Date(sanitized.reminder) : sanitized.reminder) : null,
      repeatRule: sanitized.repeatRule || 'NONE',
      subtasks: (sanitized.subtasks || []).map((s) => ({
        id: s.id,
        title: s.title,
        isCompleted: Boolean(s.isCompleted),
      })),
      timeTracking: sanitized.timeTracking || {
        startTime: null,
        endTime: null,
        durationSeconds: 0,
        isRunning: false,
        lastStartedAt: null,
      },
      notes: sanitized.notes || '',
      createdAt: this.providerConfig.provider === 'mongodb' ? createdAt : createdAt.toISOString(),
      completedAt: sanitized.completedAt
        ? this.providerConfig.provider === 'mongodb'
          ? new Date(sanitized.completedAt)
          : sanitized.completedAt
        : null,
      inMyDay: Boolean(sanitized.inMyDay),
      listId: sanitized.listId || null,
    };
  }

  private serializeListDocument(list: CustomList): Record<string, unknown> {
    const idKey = this.providerConfig.idField;
    const validated = NoSqlSchemaValidator.validateAndSanitizeList(list as unknown as Record<string, unknown>);
    const sanitized = validated.sanitized;
    const createdAt = sanitized.createdAt ? new Date(sanitized.createdAt) : new Date();

    return {
      [idKey]: sanitized.id,
      _schemaVersion: validated.schemaVersion,
      name: sanitized.name,
      icon: sanitized.icon,
      color: sanitized.color,
      createdAt: this.providerConfig.provider === 'mongodb' ? createdAt : createdAt.toISOString(),
    };
  }

  private docToTask(doc: Record<string, unknown>): Task {
    const validated = NoSqlSchemaValidator.validateAndSanitizeTask(doc);
    return validated.sanitized;
  }

  private docToList(doc: Record<string, unknown>): CustomList {
    const validated = NoSqlSchemaValidator.validateAndSanitizeList(doc);
    return validated.sanitized;
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    const all = Array.from(this.tasksCollection.values()).map((d) => this.docToTask(d));
    return this.filterTasksInMemory(all, filter);
  }

  async getTaskById(id: string): Promise<Task | null> {
    const doc = this.tasksCollection.get(id);
    if (!doc) return null;
    return this.docToTask(doc);
  }

  async createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const taskObj: Task = {
      ...data,
      id,
      createdAt: now.toISOString(),
      completedAt: data.isCompleted ? now.toISOString() : null,
      subtasks: data.subtasks || [],
      timeTracking: data.timeTracking || {
        startTime: null,
        endTime: null,
        durationSeconds: 0,
        isRunning: false,
        lastStartedAt: null,
      },
    };

    const doc = this.serializeTaskDocument(taskObj);
    this.tasksCollection.set(id, doc);
    return this.docToTask(doc);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const doc = this.tasksCollection.get(id);
    if (!doc) return null;

    const currentTask = this.docToTask(doc);
    const updatedTask: Task = {
      ...currentTask,
      ...updates,
      completedAt:
        updates.isCompleted !== undefined
          ? updates.isCompleted
            ? new Date().toISOString()
            : null
          : currentTask.completedAt,
    };

    const newDoc = this.serializeTaskDocument(updatedTask);
    this.tasksCollection.set(id, newDoc);
    return this.docToTask(newDoc);
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasksCollection.delete(id);
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
    return Array.from(this.listsCollection.values()).map((d) => this.docToList(d));
  }

  async getListById(id: string): Promise<CustomList | null> {
    const doc = this.listsCollection.get(id);
    if (!doc) return null;
    return this.docToList(doc);
  }

  async createList(name: string, icon = 'List', color = 'blue'): Promise<CustomList> {
    const id = `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const listObj: CustomList = {
      id,
      name,
      icon,
      color,
      createdAt: now,
    };

    const doc = this.serializeListDocument(listObj);
    this.listsCollection.set(id, doc);
    return this.docToList(doc);
  }

  async updateList(id: string, updates: Partial<CustomList>): Promise<CustomList | null> {
    const doc = this.listsCollection.get(id);
    if (!doc) return null;

    const currentList = this.docToList(doc);
    const updatedList: CustomList = {
      ...currentList,
      ...updates,
    };

    const newDoc = this.serializeListDocument(updatedList);
    this.listsCollection.set(id, newDoc);
    return this.docToList(newDoc);
  }

  async deleteList(id: string): Promise<boolean> {
    const deleted = this.listsCollection.delete(id);
    if (deleted) {
      for (const [taskId, doc] of this.tasksCollection.entries()) {
        if (doc.listId === id) {
          doc.listId = null;
          this.tasksCollection.set(taskId, doc);
        }
      }
    }
    return deleted;
  }

  async sync(tasks: Task[], lists: CustomList[]): Promise<void> {
    this.listsCollection.clear();
    this.tasksCollection.clear();

    for (const l of lists) {
      const doc = this.serializeListDocument(l);
      this.listsCollection.set(l.id, doc);
    }

    for (const t of tasks) {
      const doc = this.serializeTaskDocument(t);
      this.tasksCollection.set(t.id, doc);
    }
  }

  getSchemaDDL(): string {
    return this.providerConfig.schemaDocumentation;
  }
}
