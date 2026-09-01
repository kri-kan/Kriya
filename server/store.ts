import { dbFactory } from './db/factory';
import { Task, CustomList, Subtask, TaskStats, TaskFilter } from './db/types';

export * from './db/types';

/**
 * TaskStore Facade
 * Connects the active pluggable database adapter (SQLite, Postgres, MySQL, MSSQL, MongoDB, Firebase, Memory)
 * with the MCP Server and Express REST endpoints.
 */
export const taskStore = {
  // Direct Adapter access
  getAdapter: () => dbFactory.getAdapter(),
  getFactory: () => dbFactory,

  // Synchronous / Async Task Operations
  getTasks: (filter?: TaskFilter): Task[] => {
    // Return from active adapter
    const adapter = dbFactory.getAdapter();
    // Since adapter methods are async, we can await them where needed or use adapter directly
    // For synchronous calls in MCP or routes, adapter has in-memory buffer:
    let tasks: Task[] = [];
    adapter.getTasks(filter).then((res) => {
      tasks = res;
    });
    // In node/express async handlers, use getTasksAsync
    return (adapter as unknown as { tasks?: Task[]; tasksTable?: Map<string, unknown> }).tasks || [];
  },

  getTasksAsync: async (filter?: TaskFilter): Promise<Task[]> => {
    return dbFactory.getAdapter().getTasks(filter);
  },

  getTaskById: (id: string): Task | null => {
    const adapter = dbFactory.getAdapter();
    const tasks = (adapter as unknown as { tasks?: Task[] }).tasks;
    if (tasks) return tasks.find((t) => t.id === id) || null;
    return null;
  },

  getTaskByIdAsync: async (id: string): Promise<Task | null> => {
    return dbFactory.getAdapter().getTaskById(id);
  },

  createTask: (data: Partial<Task> & { title: string }): Task => {
    const adapter = dbFactory.getAdapter();
    const cleanData: Omit<Task, 'id' | 'createdAt'> = {
      title: data.title.trim(),
      isCompleted: data.isCompleted ?? false,
      isImportant: data.isImportant ?? false,
      dueDate: data.dueDate ?? null,
      reminder: data.reminder ?? null,
      repeatRule: data.repeatRule ?? 'NONE',
      inMyDay: data.inMyDay ?? false,
      listId: data.listId ?? null,
      subtasks: data.subtasks ?? [],
      timeTracking: data.timeTracking ?? {
        startTime: null,
        endTime: null,
        durationSeconds: 0,
        isRunning: false,
        lastStartedAt: null,
      },
      notes: data.notes ?? '',
      completedAt: null,
    };

    let created: Task | null = null;
    adapter.createTask(cleanData).then((t) => {
      created = t;
    });

    return (
      created || {
        ...cleanData,
        id: 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        createdAt: new Date().toISOString(),
      }
    );
  },

  createTaskAsync: async (data: Partial<Task> & { title: string }): Promise<Task> => {
    const cleanData: Omit<Task, 'id' | 'createdAt'> = {
      title: data.title.trim(),
      isCompleted: data.isCompleted ?? false,
      isImportant: data.isImportant ?? false,
      dueDate: data.dueDate ?? null,
      reminder: data.reminder ?? null,
      repeatRule: data.repeatRule ?? 'NONE',
      inMyDay: data.inMyDay ?? false,
      listId: data.listId ?? null,
      subtasks: data.subtasks ?? [],
      timeTracking: data.timeTracking ?? {
        startTime: null,
        endTime: null,
        durationSeconds: 0,
        isRunning: false,
        lastStartedAt: null,
      },
      notes: data.notes ?? '',
      completedAt: null,
    };
    return dbFactory.getAdapter().createTask(cleanData);
  },

  updateTask: (id: string, updates: Partial<Task>): Task | null => {
    let updated: Task | null = null;
    dbFactory.getAdapter().updateTask(id, updates).then((t) => {
      updated = t;
    });
    return updated;
  },

  updateTaskAsync: async (id: string, updates: Partial<Task>): Promise<Task | null> => {
    return dbFactory.getAdapter().updateTask(id, updates);
  },

  deleteTask: (id: string): boolean => {
    dbFactory.getAdapter().deleteTask(id);
    return true;
  },

  deleteTaskAsync: async (id: string): Promise<boolean> => {
    return dbFactory.getAdapter().deleteTask(id);
  },

  toggleComplete: (id: string): Task | null => {
    let result: Task | null = null;
    dbFactory.getAdapter().toggleComplete(id).then((t) => {
      result = t;
    });
    return result;
  },

  toggleCompleteAsync: async (id: string): Promise<Task | null> => {
    return dbFactory.getAdapter().toggleComplete(id);
  },

  toggleImportantAsync: async (id: string): Promise<Task | null> => {
    return dbFactory.getAdapter().toggleImportant(id);
  },

  addSubtask: (taskId: string, title: string): Subtask | null => {
    let sub: Subtask | null = null;
    dbFactory.getAdapter().addSubtask(taskId, title).then((s) => {
      sub = s;
    });
    return sub || { id: 'sub-' + Date.now(), title, isCompleted: false };
  },

  addSubtaskAsync: async (taskId: string, title: string): Promise<Subtask | null> => {
    return dbFactory.getAdapter().addSubtask(taskId, title);
  },

  toggleSubtask: (taskId: string, subtaskId: string): Subtask | null => {
    let sub: Subtask | null = null;
    dbFactory.getAdapter().toggleSubtask(taskId, subtaskId).then((s) => {
      sub = s;
    });
    return sub;
  },

  toggleSubtaskAsync: async (taskId: string, subtaskId: string): Promise<Subtask | null> => {
    return dbFactory.getAdapter().toggleSubtask(taskId, subtaskId);
  },

  startTimer: (taskId: string): Task | null => {
    let task: Task | null = null;
    dbFactory.getAdapter().startTimer(taskId).then((t) => {
      task = t;
    });
    return task;
  },

  startTimerAsync: async (taskId: string): Promise<Task | null> => {
    return dbFactory.getAdapter().startTimer(taskId);
  },

  pauseTimer: (taskId: string): Task | null => {
    let task: Task | null = null;
    dbFactory.getAdapter().pauseTimer(taskId).then((t) => {
      task = t;
    });
    return task;
  },

  pauseTimerAsync: async (taskId: string): Promise<Task | null> => {
    return dbFactory.getAdapter().pauseTimer(taskId);
  },

  // Lists CRUD
  getLists: (): CustomList[] => {
    const adapter = dbFactory.getAdapter();
    return (adapter as unknown as { lists?: CustomList[] }).lists || [];
  },

  getListsAsync: async (): Promise<CustomList[]> => {
    return dbFactory.getAdapter().getLists();
  },

  getListByIdAsync: async (id: string): Promise<CustomList | null> => {
    return dbFactory.getAdapter().getListById(id);
  },

  createList: (name: string, icon = 'List', color = 'blue'): CustomList => {
    const created: CustomList = {
      id: 'list-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      name: name.trim(),
      icon: icon || 'List',
      color: color || 'blue',
      createdAt: new Date().toISOString(),
    };
    dbFactory.getAdapter().createList(name, icon, color);
    return created;
  },

  createListAsync: async (name: string, icon = 'List', color = 'blue'): Promise<CustomList> => {
    return dbFactory.getAdapter().createList(name, icon, color);
  },

  updateListAsync: async (id: string, updates: Partial<CustomList>): Promise<CustomList | null> => {
    return dbFactory.getAdapter().updateList(id, updates);
  },

  deleteListAsync: async (id: string): Promise<boolean> => {
    return dbFactory.getAdapter().deleteList(id);
  },

  // Bulk State Synchronization
  syncFromClient: async (clientTasks?: Task[], clientLists?: CustomList[]) => {
    if (clientTasks && clientLists) {
      await dbFactory.getAdapter().sync(clientTasks, clientLists);
    }
  },

  // Analytics & Stats
  getStats: (): TaskStats => {
    return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      importantTasks: 0,
      myDayTasks: 0,
      totalLoggedSeconds: 0,
      completionRate: 0,
    };
  },

  getStatsAsync: async (): Promise<TaskStats> => {
    return dbFactory.getAdapter().getStats();
  },
};
