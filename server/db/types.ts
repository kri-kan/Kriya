export type DatabaseDriverType =
  | 'sqlite'
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'mongodb'
  | 'firebase'
  | 'memory';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TimeTracking {
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  isRunning: boolean;
  lastStartedAt?: string | null;
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
  dueDate: string | null;
  reminder: string | null;
  repeatRule: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  subtasks: Subtask[];
  timeTracking: TimeTracking;
  notes?: string;
  createdAt: string;
  completedAt: string | null;
  inMyDay?: boolean;
  listId?: string | null;
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  importantTasks: number;
  myDayTasks: number;
  totalLoggedSeconds: number;
  completionRate: number;
}

export interface TaskFilter {
  status?: 'all' | 'pending' | 'completed';
  listId?: string | null;
  isImportant?: boolean;
  inMyDay?: boolean;
  searchQuery?: string;
}

export interface DatabaseConfig {
  driver: DatabaseDriverType;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  filename?: string; // For SQLite
  projectId?: string; // For Firebase
  apiKey?: string;
  authDomain?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  driver: DatabaseDriverType;
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DriverMetadata {
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

export interface DatabaseAdapter {
  readonly name: string;
  readonly type: DatabaseDriverType;
  
  init(): Promise<void>;
  close(): Promise<void>;
  
  // Task Operations
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
  toggleComplete(id: string): Promise<Task | null>;
  toggleImportant(id: string): Promise<Task | null>;
  addSubtask(taskId: string, title: string): Promise<Subtask | null>;
  toggleSubtask(taskId: string, subtaskId: string): Promise<Subtask | null>;
  startTimer(taskId: string): Promise<Task | null>;
  pauseTimer(taskId: string): Promise<Task | null>;
  
  // List Operations
  getLists(): Promise<CustomList[]>;
  getListById(id: string): Promise<CustomList | null>;
  createList(name: string, icon?: string, color?: string): Promise<CustomList>;
  updateList(id: string, updates: Partial<CustomList>): Promise<CustomList | null>;
  deleteList(id: string): Promise<boolean>;
  
  // Analytics & Bulk
  getStats(): Promise<TaskStats>;
  sync(tasks: Task[], lists: CustomList[]): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  getSchemaDDL(): string;
  exportData(): Promise<{ tasks: Task[]; lists: CustomList[]; exportedAt: string; driver: string }>;
}
