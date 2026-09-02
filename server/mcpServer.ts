import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dbFactory } from './db/factory';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'KriyaMCP',
    version: '1.3.0',
  });

  // =========================================================================
  // 1. MANAGE_TASKS (Unified Task CRUD, Querying, Toggling, & Analytics)
  // =========================================================================
  server.tool(
    'manage_tasks',
    'Unified task management tool to list, query, retrieve, create, update, toggle completion, delete tasks, and view analytics across pluggable backends (SQLite, PostgreSQL, MySQL, MSSQL, MongoDB, Firebase)',
    {
      action: z
        .enum(['list', 'get', 'create', 'update', 'toggle_complete', 'delete', 'analytics'])
        .describe('Operation to perform on tasks'),
      taskId: z.string().optional().describe('Task ID (required for get, update, toggle_complete, delete)'),
      title: z.string().optional().describe('Task title (required for create, optional for update)'),
      status: z.enum(['all', 'pending', 'completed']).optional().describe('Filter by completion state (for action: list)'),
      listId: z.string().nullable().optional().describe('Filter or assign to custom list ID'),
      isImportant: z.boolean().optional().describe('Starred/priority flag'),
      inMyDay: z.boolean().optional().describe("Include in today's focus plan"),
      dueDate: z.string().nullable().optional().describe('ISO-8601 due date'),
      reminder: z.string().nullable().optional().describe('ISO-8601 reminder time'),
      repeatRule: z.enum(['NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional().describe('Recurrence rule'),
      notes: z.string().optional().describe('Task notes or description'),
      subtasks: z.array(z.string()).optional().describe('List of initial subtask checklist titles (for action: create)'),
      searchQuery: z.string().optional().describe('Search filter matching title or notes (for action: list)'),
    },
    async ({
      action,
      taskId,
      title,
      status,
      listId,
      isImportant,
      inMyDay,
      dueDate,
      reminder,
      repeatRule,
      notes,
      subtasks,
      searchQuery,
    }) => {
      const adapter = dbFactory.getAdapter();

      switch (action) {
        case 'list': {
          const result = await adapter.getTasks({
            status,
            listId,
            isImportant,
            inMyDay,
            searchQuery,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ driver: adapter.name, count: result.length, tasks: result }, null, 2),
              },
            ],
          };
        }

        case 'get': {
          if (!taskId) {
            return { isError: true, content: [{ type: 'text', text: 'taskId parameter is required for action "get"' }] };
          }
          const task = await adapter.getTaskById(taskId);
          if (!task) {
            return { isError: true, content: [{ type: 'text', text: `Task "${taskId}" not found in ${adapter.name}.` }] };
          }
          return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
        }

        case 'create': {
          if (!title || !title.trim()) {
            return { isError: true, content: [{ type: 'text', text: 'title parameter is required for action "create"' }] };
          }
          const formattedSubtasks = subtasks
            ? subtasks.map((s, idx) => ({
                id: `sub-${Date.now()}-${idx}`,
                title: s,
                isCompleted: false,
              }))
            : [];

          const created = await adapter.createTask({
            title: title.trim(),
            listId: listId || null,
            dueDate: dueDate || null,
            reminder: reminder || null,
            repeatRule: repeatRule || 'NONE',
            isImportant: isImportant || false,
            inMyDay: inMyDay || false,
            notes: notes || '',
            subtasks: formattedSubtasks,
            isCompleted: false,
            completedAt: null,
            timeTracking: {
              startTime: null,
              endTime: null,
              durationSeconds: 0,
              isRunning: false,
              lastStartedAt: null,
            },
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { message: `Task "${created.title}" persisted to ${adapter.name}.`, task: created },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'update': {
          if (!taskId) {
            return { isError: true, content: [{ type: 'text', text: 'taskId parameter is required for action "update"' }] };
          }
          const updates: Record<string, unknown> = {};
          if (title !== undefined) updates.title = title;
          if (isImportant !== undefined) updates.isImportant = isImportant;
          if (dueDate !== undefined) updates.dueDate = dueDate;
          if (reminder !== undefined) updates.reminder = reminder;
          if (repeatRule !== undefined) updates.repeatRule = repeatRule;
          if (notes !== undefined) updates.notes = notes;
          if (inMyDay !== undefined) updates.inMyDay = inMyDay;
          if (listId !== undefined) updates.listId = listId;

          const updated = await adapter.updateTask(taskId, updates);
          if (!updated) {
            return { isError: true, content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify({ message: 'Task updated successfully', task: updated }, null, 2) }],
          };
        }

        case 'toggle_complete': {
          if (!taskId) {
            return { isError: true, content: [{ type: 'text', text: 'taskId parameter is required for action "toggle_complete"' }] };
          }
          const task = await adapter.toggleComplete(taskId);
          if (!task) {
            return { isError: true, content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { message: `Task is now marked as ${task.isCompleted ? 'COMPLETED' : 'INCOMPLETE'}`, task },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'delete': {
          if (!taskId) {
            return { isError: true, content: [{ type: 'text', text: 'taskId parameter is required for action "delete"' }] };
          }
          const deleted = await adapter.deleteTask(taskId);
          if (!deleted) {
            return { isError: true, content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Task "${taskId}" deleted from ${adapter.name}.` }) }],
          };
        }

        case 'analytics': {
          const stats = await adapter.getStats();
          return {
            content: [{ type: 'text', text: JSON.stringify({ driver: adapter.name, stats }, null, 2) }],
          };
        }

        default:
          return { isError: true, content: [{ type: 'text', text: `Unknown action: ${action}` }] };
      }
    }
  );

  // =========================================================================
  // 2. MANAGE_SUBTASKS (Checklist steps within tasks)
  // =========================================================================
  server.tool(
    'manage_subtasks',
    'Manage checklist items/steps within a task (add new step, toggle checkbox, or list subtasks)',
    {
      action: z.enum(['add', 'toggle', 'list']).describe('Subtask action'),
      taskId: z.string().describe('ID of the parent task'),
      title: z.string().optional().describe('Title of the new checklist step (required for action: add)'),
      subtaskId: z.string().optional().describe('ID of the subtask (required for action: toggle)'),
    },
    async ({ action, taskId, title, subtaskId }) => {
      const adapter = dbFactory.getAdapter();
      const task = await adapter.getTaskById(taskId);
      if (!task) {
        return { isError: true, content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
      }

      switch (action) {
        case 'list': {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ taskId: task.id, title: task.title, subtasks: task.subtasks || [] }, null, 2),
              },
            ],
          };
        }

        case 'add': {
          if (!title || !title.trim()) {
            return { isError: true, content: [{ type: 'text', text: 'title parameter is required to add subtask' }] };
          }
          const newSubtask = await adapter.addSubtask(taskId, title.trim());
          const refreshed = await adapter.getTaskById(taskId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: 'Subtask added', subtask: newSubtask, subtasks: refreshed?.subtasks }, null, 2),
              },
            ],
          };
        }

        case 'toggle': {
          if (!subtaskId) {
            return { isError: true, content: [{ type: 'text', text: 'subtaskId parameter is required to toggle subtask' }] };
          }
          const toggled = await adapter.toggleSubtask(taskId, subtaskId);
          if (!toggled) {
            return { isError: true, content: [{ type: 'text', text: `Subtask "${subtaskId}" not found in task "${taskId}".` }] };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: 'Subtask toggled', subtask: toggled }, null, 2),
              },
            ],
          };
        }

        default:
          return { isError: true, content: [{ type: 'text', text: `Unknown subtask action: ${action}` }] };
      }
    }
  );

  // =========================================================================
  // 3. MANAGE_TIME_TRACKING (Stopwatch & Focus Tracking)
  // =========================================================================
  server.tool(
    'manage_time_tracking',
    'Control real-time focus stopwatch for tasks (start stopwatch, pause stopwatch, or check current active timer)',
    {
      action: z.enum(['start', 'pause', 'status']).describe('Stopwatch action'),
      taskId: z.string().optional().describe('ID of the task (required for start & pause)'),
    },
    async ({ action, taskId }) => {
      const adapter = dbFactory.getAdapter();

      switch (action) {
        case 'start': {
          if (!taskId) {
            return { isError: true, content: [{ type: 'text', text: 'taskId parameter is required to start stopwatch' }] };
          }
          const task = await adapter.startTimer(taskId);
          if (!task) {
            return { isError: true, content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: `Timer started for task "${task.title}". Active elapsed time: ${task.timeTracking?.durationSeconds || 0}s`,
                    task,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'pause': {
          if (!taskId) {
            return { isError: true, content: [{ type: 'text', text: 'taskId parameter is required to pause stopwatch' }] };
          }
          const task = await adapter.pauseTimer(taskId);
          if (!task) {
            return { isError: true, content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: `Timer paused. Total duration logged: ${task.timeTracking?.durationSeconds || 0}s`,
                    task,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'status': {
          const allTasks = await adapter.getTasks();
          const runningTask = allTasks.find((t) => t.timeTracking?.isRunning);
          const totalLogged = allTasks.reduce((acc, t) => acc + (t.timeTracking?.durationSeconds || 0), 0);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    hasActiveTimer: !!runningTask,
                    activeTask: runningTask
                      ? {
                          id: runningTask.id,
                          title: runningTask.title,
                          durationSeconds: runningTask.timeTracking?.durationSeconds || 0,
                          lastStartedAt: runningTask.timeTracking?.lastStartedAt,
                        }
                      : null,
                    totalLoggedSeconds: totalLogged,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        default:
          return { isError: true, content: [{ type: 'text', text: `Unknown time tracking action: ${action}` }] };
      }
    }
  );

  // =========================================================================
  // 4. MANAGE_LISTS (Custom Task Categories / Lists CRUD)
  // =========================================================================
  server.tool(
    'manage_lists',
    'Manage custom task categories/lists (list all categories, create new list, update, or delete list)',
    {
      action: z.enum(['list', 'create', 'update', 'delete']).describe('List management action'),
      listId: z.string().optional().describe('ID of the custom list (required for update and delete)'),
      name: z.string().optional().describe('Name of the list (required for create)'),
      icon: z.string().optional().describe('Icon name (e.g. "Briefcase", "ShoppingCart", "Sparkles", "Folder", "BookOpen")'),
      color: z.string().optional().describe('Color theme: "blue", "indigo", "violet", "rose", "amber", "emerald", "teal", "cyan", "pink", "slate"'),
    },
    async ({ action, listId, name, icon, color }) => {
      const adapter = dbFactory.getAdapter();

      switch (action) {
        case 'list': {
          const lists = await adapter.getLists();
          const allTasks = await adapter.getTasks();
          const enriched = lists.map((l) => ({
            ...l,
            taskCount: allTasks.filter((t) => t.listId === l.id).length,
            pendingCount: allTasks.filter((t) => t.listId === l.id && !t.isCompleted).length,
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ count: enriched.length, lists: enriched }, null, 2),
              },
            ],
          };
        }

        case 'create': {
          if (!name || !name.trim()) {
            return { isError: true, content: [{ type: 'text', text: 'name parameter is required to create a list' }] };
          }
          const created = await adapter.createList(name.trim(), icon, color);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: `Custom list "${created.name}" created.`, list: created }, null, 2),
              },
            ],
          };
        }

        case 'update': {
          if (!listId) {
            return { isError: true, content: [{ type: 'text', text: 'listId parameter is required to update list' }] };
          }
          const updates: Record<string, unknown> = {};
          if (name !== undefined) updates.name = name;
          if (icon !== undefined) updates.icon = icon;
          if (color !== undefined) updates.color = color;

          const updated = await adapter.updateList(listId, updates);
          if (!updated) {
            return { isError: true, content: [{ type: 'text', text: `List "${listId}" not found.` }] };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: `List "${updated.name}" updated.`, list: updated }, null, 2),
              },
            ],
          };
        }

        case 'delete': {
          if (!listId) {
            return { isError: true, content: [{ type: 'text', text: 'listId parameter is required to delete list' }] };
          }
          const deleted = await adapter.deleteList(listId);
          if (!deleted) {
            return { isError: true, content: [{ type: 'text', text: `List "${listId}" not found.` }] };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, message: `List "${listId}" deleted and tasks moved to default view.` }),
              },
            ],
          };
        }

        default:
          return { isError: true, content: [{ type: 'text', text: `Unknown list action: ${action}` }] };
      }
    }
  );

  // ==========================================
  // MCP RESOURCES
  // ==========================================

  server.resource(
    'all_tasks',
    new ResourceTemplate('tasks://all', { list: undefined }),
    async (uri) => {
      const adapter = dbFactory.getAdapter();
      const tasks = await adapter.getTasks();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ driver: adapter.name, tasks }, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    'custom_lists',
    new ResourceTemplate('tasks://lists', { list: undefined }),
    async (uri) => {
      const adapter = dbFactory.getAdapter();
      const lists = await adapter.getLists();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ driver: adapter.name, lists }, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    'task_stats',
    new ResourceTemplate('tasks://stats', { list: undefined }),
    async (uri) => {
      const adapter = dbFactory.getAdapter();
      const stats = await adapter.getStats();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ driver: adapter.name, stats }, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // MCP PROMPTS
  // ==========================================

  server.prompt(
    'prioritize_day',
    'Generate an optimized daily work plan from pending tasks, deadlines, and logged time',
    {},
    async () => {
      const adapter = dbFactory.getAdapter();
      const tasks = (await adapter.getTasks()).filter((t) => !t.isCompleted);
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Here is my current list of pending tasks from ${adapter.name}:\n\n${JSON.stringify(
                tasks,
                null,
                2
              )}\n\nPlease analyze their due dates, priority stars, subtasks, and estimate the optimal sequence for my day using time-blocking.`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'daily_standup',
    'Summarize completed achievements, in-progress items, and blockers for a team standup',
    {},
    async () => {
      const adapter = dbFactory.getAdapter();
      const allTasks = await adapter.getTasks();
      const completed = allTasks.filter((t) => t.isCompleted);
      const inProgress = allTasks.filter((t) => !t.isCompleted && ((t.timeTracking?.durationSeconds || 0) > 0 || t.inMyDay));

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a concise 3-part daily standup summary (What I did, What I am working on next, Blockers) using task activity data from ${adapter.name}:\n\nCompleted Tasks:\n${JSON.stringify(
                completed,
                null,
                2
              )}\n\nIn-Progress / Today's Tasks:\n${JSON.stringify(inProgress, null, 2)}`,
            },
          },
        ],
      };
    }
  );

  return server;
}
