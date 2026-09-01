import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Subtask, TimeTracking, ViewFilter, SortBy, CustomList } from '../types';
import { INITIAL_TASKS, INITIAL_LISTS } from '../data/initialTasks';
import { playTone } from '../utils/timeUtils';
import { isToday } from '../utils/dateUtils';

interface TaskContextType {
  tasks: Task[];
  customLists: CustomList[];
  activeFilter: ViewFilter;
  setActiveFilter: (filter: ViewFilter) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedTask: Task | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;

  // Task actions
  addTask: (title: string, extras?: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  toggleTaskImportant: (id: string) => void;
  toggleInMyDay: (id: string) => void;
  moveTaskToList: (taskId: string, listId: string | null) => void;

  // Custom list actions
  createCustomList: (name: string, icon?: string, color?: string) => CustomList;
  updateCustomList: (id: string, updates: Partial<CustomList>) => void;
  deleteCustomList: (id: string) => void;
  getCustomList: (id: string) => CustomList | undefined;

  // Subtask actions
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  updateSubtaskTitle: (taskId: string, subtaskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;

  // Time tracking actions
  startTimer: (taskId: string) => void;
  pauseTimer: (taskId: string) => void;
  resetTimer: (taskId: string) => void;
  updateTimeTracking: (taskId: string, tracking: Partial<TimeTracking>) => void;
  addQuickTime: (taskId: string, secondsToAdd: number) => void;

  // Counts for sidebar badges
  counts: {
    my_day: number;
    important: number;
    planned: number;
    all: number;
    completed: number;
    time_tracking: number;
    listCounts: Record<string, number>;
  };
}

const STORAGE_KEY = 'todo_app_tasks_v2';
const LISTS_STORAGE_KEY = 'todo_app_custom_lists_v2';

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_TASKS;
  });

  const [customLists, setCustomLists] = useState<CustomList[]>(() => {
    try {
      const saved = localStorage.getItem(LISTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_LISTS;
  });

  const [activeFilter, setActiveFilter] = useState<ViewFilter>('my_day');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Sync tasks to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Storage error ignored
    }
  }, [tasks]);

  // Sync custom lists to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(customLists));
    } catch {
      // Storage error ignored
    }
  }, [customLists]);

  // Sync state to backend server so MCP tools operate on live state
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, lists: customLists }),
      }).catch(() => {
        // Backend offline or dev mode
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [tasks, customLists]);

  // Global stopwatch tick interval for running tasks
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.timeTracking?.isRunning);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setTasks((prevTasks) =>
        prevTasks.map((t) => {
          if (t.timeTracking?.isRunning) {
            const currentDuration = t.timeTracking.durationSeconds || 0;
            return {
              ...t,
              timeTracking: {
                ...t.timeTracking,
                durationSeconds: currentDuration + 1,
              },
            };
          }
          return t;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  // Derived selected task
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Calculate filter counts for sidebar badges
  const counts = useMemo(() => {
    const listCounts: Record<string, number> = {};
    customLists.forEach((l) => {
      listCounts[l.id] = tasks.filter((t) => !t.isCompleted && t.listId === l.id).length;
    });

    return {
      my_day: tasks.filter((t) => !t.isCompleted && (t.inMyDay || isToday(t.dueDate))).length,
      important: tasks.filter((t) => !t.isCompleted && t.isImportant).length,
      planned: tasks.filter((t) => !t.isCompleted && (t.dueDate !== null || t.reminder !== null)).length,
      all: tasks.filter((t) => !t.isCompleted).length,
      completed: tasks.filter((t) => t.isCompleted).length,
      time_tracking: tasks.filter((t) => (t.timeTracking?.durationSeconds || 0) > 0 || t.timeTracking?.isRunning).length,
      listCounts,
    };
  }, [tasks, customLists]);

  // Custom List Operations
  const createCustomList = useCallback((name: string, icon: string = 'List', color: string = 'blue'): CustomList => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('List name cannot be empty');

    const newList: CustomList = {
      id: 'list-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      name: trimmed,
      icon: icon || 'List',
      color: color || 'blue',
      createdAt: new Date().toISOString(),
    };

    setCustomLists((prev) => [...prev, newList]);
    playTone('click');
    return newList;
  }, []);

  const updateCustomList = useCallback((id: string, updates: Partial<CustomList>) => {
    setCustomLists((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  }, []);

  const deleteCustomList = useCallback((id: string) => {
    setCustomLists((prev) => prev.filter((l) => l.id !== id));
    // Reset tasks belonging to this list to no list (null)
    setTasks((prev) =>
      prev.map((t) => (t.listId === id ? { ...t, listId: null } : t))
    );
    // If viewing deleted list, reset to 'all'
    setActiveFilter((curr) => (curr === id ? 'all' : curr));
  }, []);

  const getCustomList = useCallback((id: string) => {
    return customLists.find((l) => l.id === id);
  }, [customLists]);

  const addTask = useCallback((title: string, extras?: Partial<Task>): Task => {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Task title cannot be empty');

    // If activeFilter is a custom list ID, assign task to this custom list
    const isCustomListView = customLists.some((l) => l.id === activeFilter);
    const assignedListId = extras?.listId !== undefined
      ? extras.listId
      : isCustomListView
      ? activeFilter
      : null;

    const newTask: Task = {
      id: 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      title: trimmed,
      isCompleted: false,
      isImportant: activeFilter === 'important' || !!extras?.isImportant,
      dueDate: activeFilter === 'planned' ? new Date().toISOString() : (extras?.dueDate ?? null),
      reminder: extras?.reminder ?? null,
      repeatRule: extras?.repeatRule ?? 'NONE',
      inMyDay: activeFilter === 'my_day' ? true : (extras?.inMyDay ?? false),
      listId: assignedListId,
      subtasks: extras?.subtasks ?? [],
      timeTracking: {
        startTime: null,
        endTime: null,
        durationSeconds: 0,
        isRunning: false,
        ...extras?.timeTracking,
      },
      notes: extras?.notes ?? '',
      createdAt: new Date().toISOString(),
      completedAt: null,
      ...extras,
    };

    setTasks((prev) => [newTask, ...prev]);
    playTone('click');
    return newTask;
  }, [activeFilter, customLists]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          return { ...task, ...updates };
        }
        return task;
      })
    );
  }, []);

  const moveTaskToList = useCallback((taskId: string, listId: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, listId } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId]);

  const toggleTaskComplete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const nextCompleted = !task.isCompleted;
          if (nextCompleted) {
            playTone('complete');
            // Pause any running timer
            return {
              ...task,
              isCompleted: true,
              completedAt: new Date().toISOString(),
              timeTracking: {
                ...task.timeTracking,
                isRunning: false,
                endTime: task.timeTracking.endTime || new Date().toISOString(),
              },
            };
          } else {
            playTone('click');
            return {
              ...task,
              isCompleted: false,
              completedAt: null,
            };
          }
        }
        return task;
      })
    );
  }, []);

  const toggleTaskImportant = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const nextImportant = !task.isImportant;
          if (nextImportant) {
            playTone('star');
          } else {
            playTone('click');
          }
          return { ...task, isImportant: nextImportant };
        }
        return task;
      })
    );
  }, []);

  const toggleInMyDay = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          return { ...task, inMyDay: !task.inMyDay };
        }
        return task;
      })
    );
  }, []);

  // Subtask operations
  const addSubtask = useCallback((taskId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newSubtask: Subtask = {
      id: 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      title: trimmed,
      isCompleted: false,
    };

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: [...(task.subtasks || []), newSubtask],
          };
        }
        return task;
      })
    );
    playTone('click');
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.map((sub) => {
            if (sub.id === subtaskId) {
              const nextState = !sub.isCompleted;
              if (nextState) playTone('complete');
              else playTone('click');
              return { ...sub, isCompleted: nextState };
            }
            return sub;
          });
          return { ...task, subtasks: updatedSubtasks };
        }
        return task;
      })
    );
  }, []);

  const updateSubtaskTitle = useCallback((taskId: string, subtaskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.map((sub) =>
              sub.id === subtaskId ? { ...sub, title } : sub
            ),
          };
        }
        return task;
      })
    );
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.filter((sub) => sub.id !== subtaskId),
          };
        }
        return task;
      })
    );
  }, []);

  // Time tracking methods
  const startTimer = useCallback((taskId: string) => {
    const nowISO = new Date().toISOString();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            timeTracking: {
              ...task.timeTracking,
              isRunning: true,
              startTime: task.timeTracking.startTime || nowISO,
              lastStartedAt: nowISO,
            },
          };
        } else {
          // Single-focus principle: Pause any other running task
          if (task.timeTracking?.isRunning) {
            return {
              ...task,
              timeTracking: {
                ...task.timeTracking,
                isRunning: false,
              },
            };
          }
          return task;
        }
      })
    );
    playTone('click');
  }, []);

  const pauseTimer = useCallback((taskId: string) => {
    const nowISO = new Date().toISOString();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            timeTracking: {
              ...task.timeTracking,
              isRunning: false,
              endTime: nowISO,
            },
          };
        }
        return task;
      })
    );
    playTone('click');
  }, []);

  const resetTimer = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            timeTracking: {
              startTime: null,
              endTime: null,
              durationSeconds: 0,
              isRunning: false,
              lastStartedAt: null,
            },
          };
        }
        return task;
      })
    );
  }, []);

  const updateTimeTracking = useCallback((taskId: string, tracking: Partial<TimeTracking>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            timeTracking: {
              ...task.timeTracking,
              ...tracking,
            },
          };
        }
        return task;
      })
    );
  }, []);

  const addQuickTime = useCallback((taskId: string, secondsToAdd: number) => {
    const nowISO = new Date().toISOString();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const current = task.timeTracking?.durationSeconds || 0;
          return {
            ...task,
            timeTracking: {
              ...task.timeTracking,
              durationSeconds: Math.max(0, current + secondsToAdd),
              startTime: task.timeTracking.startTime || nowISO,
            },
          };
        }
        return task;
      })
    );
    playTone('click');
  }, []);

  const value = {
    tasks,
    customLists,
    activeFilter,
    setActiveFilter,
    selectedTaskId,
    setSelectedTaskId,
    selectedTask,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showCompleted,
    setShowCompleted,
    addTask,
    updateTask,
    moveTaskToList,
    deleteTask,
    toggleTaskComplete,
    toggleTaskImportant,
    toggleInMyDay,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    getCustomList,
    addSubtask,
    toggleSubtask,
    updateSubtaskTitle,
    deleteSubtask,
    startTimer,
    pauseTimer,
    resetTimer,
    updateTimeTracking,
    addQuickTime,
    counts,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
