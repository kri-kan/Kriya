export type RepeatRule = 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TimeTracking {
  startTime: string | null;       // ISO-8601 Timestamp | null
  endTime: string | null;         // ISO-8601 Timestamp | null
  durationSeconds: number;        // Total logged seconds
  isRunning?: boolean;            // Whether live stopwatch is ticking
  lastStartedAt?: string | null;  // ISO timestamp of when current session started
}

export interface CustomList {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  isImportant: boolean;
  dueDate: string | null;         // ISO-8601 Timestamp | null
  reminder: string | null;        // ISO-8601 Timestamp | null
  repeatRule: RepeatRule;
  subtasks: Subtask[];
  timeTracking: TimeTracking;
  notes: string;
  createdAt: string;              // ISO-8601 Timestamp
  completedAt: string | null;     // ISO-8601 Timestamp | null
  inMyDay?: boolean;
  listId?: string | null;         // ID of custom list or null for default Tasks
}

export type SystemViewFilter = 'my_day' | 'important' | 'planned' | 'all' | 'completed' | 'time_tracking';
export type ViewFilter = SystemViewFilter | string;

export type SortBy = 'default' | 'importance' | 'dueDate' | 'alphabetical' | 'creationDate' | 'duration';

// Database Pluggable Engine Types
export type DatabaseDriverType =
  | 'sqlite'
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'mongodb'
  | 'firebase'
  | 'memory';

export interface DatabaseDriverMetadata {
  id: DatabaseDriverType;
  name: string;
  category: 'Relational SQL' | 'NoSQL Document Store' | 'Cloud Serverless' | 'Embedded / Memory';
  badge: string;
  description: string;
  defaultPort?: number;
  connectionPlaceholder: string;
  features: string[];
  recommendedUse: string;
}

export interface DatabaseConnectionStatus {
  success: boolean;
  driver: DatabaseDriverType;
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DatabaseInfoResponse {
  activeDriver: {
    id: DatabaseDriverType;
    name: string;
    config: {
      driver: DatabaseDriverType;
      host?: string;
      port?: number;
      database?: string;
      user?: string;
      password?: string;
      connectionString?: string;
      projectId?: string;
      ssl?: boolean;
    };
    status: DatabaseConnectionStatus;
    stats: {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: number;
      importantTasks: number;
      myDayTasks: number;
      totalLoggedSeconds: number;
      completionRate: number;
    };
  };
  supportedDrivers: DatabaseDriverMetadata[];
}
