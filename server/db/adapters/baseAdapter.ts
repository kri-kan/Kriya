import {
  DatabaseAdapter,
  DatabaseDriverType,
  Task,
  CustomList,
  Subtask,
  TaskFilter,
  TaskStats,
  ConnectionTestResult,
} from '../types';

export const INITIAL_CUSTOM_LISTS: CustomList[] = [
  {
    id: 'list-work',
    name: 'Work Projects',
    icon: 'Briefcase',
    color: 'indigo',
    createdAt: new Date(Date.now() - 86400 * 1000 * 5).toISOString(),
  },
  {
    id: 'list-personal',
    name: 'Personal & Habits',
    icon: 'Sparkles',
    color: 'amber',
    createdAt: new Date(Date.now() - 86400 * 1000 * 4).toISOString(),
  },
  {
    id: 'list-shopping',
    name: 'Groceries & Shopping',
    icon: 'ShoppingCart',
    color: 'emerald',
    createdAt: new Date(Date.now() - 86400 * 1000 * 3).toISOString(),
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-101',
    title: 'Finalize Q3 Engineering OKRs and Milestones',
    isCompleted: false,
    isImportant: true,
    dueDate: new Date(Date.now() + 86400 * 1000 * 2).toISOString(),
    reminder: new Date(Date.now() + 86400 * 1000 * 1).toISOString(),
    repeatRule: 'NONE',
    notes: 'Draft key results for API performance, MCP endpoints, and pluggable database architecture.',
    createdAt: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
    completedAt: null,
    inMyDay: true,
    listId: 'list-work',
    subtasks: [
      { id: 'sub-1', title: 'Compile latency benchmarks', isCompleted: true },
      { id: 'sub-2', title: 'Review pull requests with platform team', isCompleted: false },
      { id: 'sub-3', title: 'Document pluggable database adapters', isCompleted: false },
    ],
    timeTracking: {
      startTime: null,
      endTime: null,
      durationSeconds: 3420, // 57 mins
      isRunning: false,
      lastStartedAt: null,
    },
  },
  {
    id: 'task-102',
    title: 'Weekly grocery run & meal planning',
    isCompleted: false,
    isImportant: false,
    dueDate: new Date(Date.now() + 86400 * 1000 * 1).toISOString(),
    reminder: null,
    repeatRule: 'WEEKLY',
    notes: 'Pick up fresh produce, almond milk, and ground coffee.',
    createdAt: new Date(Date.now() - 86400 * 1000 * 1).toISOString(),
    completedAt: null,
    inMyDay: true,
    listId: 'list-shopping',
    subtasks: [
      { id: 'sub-4', title: 'Avocados and spinach', isCompleted: false },
      { id: 'sub-5', title: 'Cold brew beans', isCompleted: true },
    ],
    timeTracking: {
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      isRunning: false,
      lastStartedAt: null,
    },
  },
  {
    id: 'task-103',
    title: 'Complete 30-minute mindfulness & core workout',
    isCompleted: true,
    isImportant: true,
    dueDate: new Date().toISOString(),
    reminder: null,
    repeatRule: 'DAILY',
    notes: 'Completed morning yoga session and stretching.',
    createdAt: new Date(Date.now() - 86400 * 1000 * 3).toISOString(),
    completedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    inMyDay: false,
    listId: 'list-personal',
    subtasks: [],
    timeTracking: {
      startTime: null,
      endTime: null,
      durationSeconds: 1800,
      isRunning: false,
      lastStartedAt: null,
    },
  },
];

export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  abstract readonly name: string;
  abstract readonly type: DatabaseDriverType;

  protected isInitialized = false;

  async init(): Promise<void> {
    this.isInitialized = true;
  }

  async close(): Promise<void> {
    this.isInitialized = false;
  }

  abstract getTasks(filter?: TaskFilter): Promise<Task[]>;
  abstract getTaskById(id: string): Promise<Task | null>;
  abstract createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
  abstract updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
  abstract deleteTask(id: string): Promise<boolean>;
  abstract toggleComplete(id: string): Promise<Task | null>;
  abstract toggleImportant(id: string): Promise<Task | null>;
  abstract addSubtask(taskId: string, title: string): Promise<Subtask | null>;
  abstract toggleSubtask(taskId: string, subtaskId: string): Promise<Subtask | null>;
  abstract startTimer(taskId: string): Promise<Task | null>;
  abstract pauseTimer(taskId: string): Promise<Task | null>;
  
  abstract getLists(): Promise<CustomList[]>;
  abstract getListById(id: string): Promise<CustomList | null>;
  abstract createList(name: string, icon?: string, color?: string): Promise<CustomList>;
  abstract updateList(id: string, updates: Partial<CustomList>): Promise<CustomList | null>;
  abstract deleteList(id: string): Promise<boolean>;
  abstract sync(tasks: Task[], lists: CustomList[]): Promise<void>;
  abstract getSchemaDDL(): string;

  async getStats(): Promise<TaskStats> {
    const tasks = await this.getTasks();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.isCompleted).length;
    const pendingTasks = totalTasks - completedTasks;
    const importantTasks = tasks.filter((t) => t.isImportant).length;
    const myDayTasks = tasks.filter((t) => t.inMyDay).length;
    const totalLoggedSeconds = tasks.reduce(
      (acc, t) => acc + (t.timeTracking?.durationSeconds || 0),
      0
    );
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      importantTasks,
      myDayTasks,
      totalLoggedSeconds,
      completionRate,
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const lists = await this.getLists();
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        success: true,
        driver: this.type,
        latencyMs: latencyMs < 1 ? 1.2 : latencyMs,
        message: `Successfully connected to ${this.name} engine. Verified ${lists.length} lists.`,
        details: {
          driverName: this.name,
          driverType: this.type,
          initialized: this.isInitialized,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        driver: this.type,
        latencyMs: Math.round(performance.now() - start),
        message: `Failed to connect to ${this.name}: ${msg}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async exportData(): Promise<{ tasks: Task[]; lists: CustomList[]; exportedAt: string; driver: string }> {
    const tasks = await this.getTasks();
    const lists = await this.getLists();
    return {
      tasks,
      lists,
      exportedAt: new Date().toISOString(),
      driver: this.type,
    };
  }

  protected filterTasksInMemory(tasks: Task[], filter?: TaskFilter): Task[] {
    if (!filter) return [...tasks];
    let result = [...tasks];

    if (filter.status === 'pending') {
      result = result.filter((t) => !t.isCompleted);
    } else if (filter.status === 'completed') {
      result = result.filter((t) => t.isCompleted);
    }

    if (filter.listId !== undefined) {
      if (filter.listId === null || filter.listId === '' || filter.listId === 'null') {
        result = result.filter((t) => !t.listId);
      } else {
        result = result.filter((t) => t.listId === filter.listId);
      }
    }

    if (filter.isImportant !== undefined) {
      result = result.filter((t) => t.isImportant === filter.isImportant);
    }

    if (filter.inMyDay !== undefined) {
      result = result.filter((t) => t.inMyDay === filter.inMyDay);
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.subtasks?.some((s) => s.title.toLowerCase().includes(q))
      );
    }

    return result;
  }
}
