import { BaseDatabaseAdapter, INITIAL_CUSTOM_LISTS, INITIAL_TASKS } from './baseAdapter';
import { Task, CustomList, Subtask, TaskFilter, DatabaseDriverType } from '../types';

export class MemoryDatabaseAdapter extends BaseDatabaseAdapter {
  readonly name = 'In-Memory / Fast Transient Store';
  readonly type: DatabaseDriverType = 'memory';

  private tasks: Task[] = JSON.parse(JSON.stringify(INITIAL_TASKS));
  private lists: CustomList[] = JSON.parse(JSON.stringify(INITIAL_CUSTOM_LISTS));

  async init(): Promise<void> {
    await super.init();
    console.log('[DB Adapter] In-Memory store initialized with default seed data.');
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    return this.filterTasksInMemory(this.tasks, filter);
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.tasks.find((t) => t.id === id) || null;
  }

  async createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const newTask: Task = {
      ...data,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      completedAt: data.isCompleted ? new Date().toISOString() : null,
      subtasks: data.subtasks || [],
      timeTracking: data.timeTracking || {
        startTime: null,
        endTime: null,
        durationSeconds: 0,
        isRunning: false,
        lastStartedAt: null,
      },
    };
    this.tasks.unshift(newTask);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const current = this.tasks[index];
    const isNowCompleted = updates.isCompleted !== undefined ? updates.isCompleted : current.isCompleted;
    let completedAt = current.completedAt;

    if (updates.isCompleted !== undefined) {
      completedAt = updates.isCompleted ? new Date().toISOString() : null;
    }

    const updatedTask: Task = {
      ...current,
      ...updates,
      isCompleted: isNowCompleted,
      completedAt,
    };

    this.tasks[index] = updatedTask;
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const initialLen = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return this.tasks.length < initialLen;
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

    const newSub: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      isCompleted: false,
    };

    const subtasks = [...(task.subtasks || []), newSub];
    await this.updateTask(taskId, { subtasks });
    return newSub;
  }

  async toggleSubtask(taskId: string, subtaskId: string): Promise<Subtask | null> {
    const task = await this.getTaskById(taskId);
    if (!task || !task.subtasks) return null;

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

    // Pause any other active timer
    for (const t of this.tasks) {
      if (t.id !== taskId && t.timeTracking?.isRunning) {
        await this.pauseTimer(t.id);
      }
    }

    const currentTT = task.timeTracking || {
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      isRunning: false,
    };

    const now = new Date().toISOString();
    return this.updateTask(taskId, {
      timeTracking: {
        ...currentTT,
        isRunning: true,
        startTime: currentTT.startTime || now,
        lastStartedAt: now,
      },
    });
  }

  async pauseTimer(taskId: string): Promise<Task | null> {
    const task = await this.getTaskById(taskId);
    if (!task || !task.timeTracking) return null;

    const tt = task.timeTracking;
    let accumulated = tt.durationSeconds || 0;

    if (tt.isRunning && tt.lastStartedAt) {
      const elapsed = Math.floor((Date.now() - new Date(tt.lastStartedAt).getTime()) / 1000);
      accumulated += Math.max(0, elapsed);
    }

    return this.updateTask(taskId, {
      timeTracking: {
        ...tt,
        isRunning: false,
        durationSeconds: accumulated,
        lastStartedAt: null,
        endTime: new Date().toISOString(),
      },
    });
  }

  async getLists(): Promise<CustomList[]> {
    return [...this.lists];
  }

  async getListById(id: string): Promise<CustomList | null> {
    return this.lists.find((l) => l.id === id) || null;
  }

  async createList(name: string, icon = 'Folder', color = 'blue'): Promise<CustomList> {
    const newList: CustomList = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      icon,
      color,
      createdAt: new Date().toISOString(),
    };
    this.lists.push(newList);
    return newList;
  }

  async updateList(id: string, updates: Partial<CustomList>): Promise<CustomList | null> {
    const idx = this.lists.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    this.lists[idx] = { ...this.lists[idx], ...updates };
    return this.lists[idx];
  }

  async deleteList(id: string): Promise<boolean> {
    this.lists = this.lists.filter((l) => l.id !== id);
    this.tasks = this.tasks.map((t) => (t.listId === id ? { ...t, listId: null } : t));
    return true;
  }

  async sync(tasks: Task[], lists: CustomList[]): Promise<void> {
    if (tasks && Array.isArray(tasks)) this.tasks = JSON.parse(JSON.stringify(tasks));
    if (lists && Array.isArray(lists)) this.lists = JSON.parse(JSON.stringify(lists));
  }

  getSchemaDDL(): string {
    return `-- In-Memory / Transient JSON Storage
-- Data resides in high-speed Node.js heap memory.
-- Schema Definition:

interface TaskRecord {
  id: string;
  title: string;
  isCompleted: boolean;
  isImportant: boolean;
  dueDate: string | null;
  reminder: string | null;
  repeatRule: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  subtasks: Array<{ id: string; title: string; isCompleted: boolean }>;
  timeTracking: { durationSeconds: number; isRunning: boolean; lastStartedAt?: string };
  notes?: string;
  createdAt: string;
  completedAt: string | null;
  inMyDay?: boolean;
  listId?: string | null;
}
`;
  }
}
