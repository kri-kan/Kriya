import { createSuite, expect } from '../framework';
import { createMcpServer } from '../../server/mcpServer';
import { dbFactory } from '../../server/db/factory';

export const mcpServerSuite = createSuite(
  'Model Context Protocol (MCP) Server & Tools',
  'mcp',
  'Verifies MCP server initialization, tool declarations, end-to-end data creation, input validation, and data cleanup workflows',
  (suite) => {
    suite.it('should instantiate the MCP server with registered tools, resources, and prompt templates', () => {
      const server = createMcpServer() as any;
      expect(server).toBeDefined();

      const registeredTools = Object.keys(server._registeredTools || {});
      expect(registeredTools.length).toBeGreaterThanOrEqual(4);
      expect(registeredTools).toContain('manage_tasks');
      expect(registeredTools).toContain('manage_subtasks');
      expect(registeredTools).toContain('manage_time_tracking');
      expect(registeredTools).toContain('manage_lists');

      const registeredPrompts = Object.keys(server._registeredPrompts || {});
      expect(registeredPrompts).toContain('prioritize_day');
      expect(registeredPrompts).toContain('daily_standup');
    });

    suite.it('should successfully perform full data creation lifecycle via MCP tools', async () => {
      const server = createMcpServer() as any;
      const manageTasks = server._registeredTools.manage_tasks.handler;
      const manageSubtasks = server._registeredTools.manage_subtasks.handler;
      const manageLists = server._registeredTools.manage_lists.handler;

      // 1. Create a custom list via MCP
      const listRes = await manageLists({
        action: 'create',
        name: 'MCP Automation Sprint',
        icon: 'Bot',
        color: 'indigo',
      });

      expect(listRes.isError).toBeUndefined();
      expect(listRes.content[0].text).toContain('MCP Automation Sprint');
      const listData = JSON.parse(listRes.content[0].text).list;
      expect(listData.id).toBeDefined();

      // 2. Create a task with subtasks, due date, and priority via MCP
      const taskRes = await manageTasks({
        action: 'create',
        title: 'Integrate MCP Server Test Validation',
        listId: listData.id,
        isImportant: true,
        inMyDay: true,
        dueDate: '2026-09-15T18:00:00.000Z',
        repeatRule: 'WEEKLY',
        notes: 'Autonomous agent verified task creation payload.',
        subtasks: ['Write schema tests', 'Verify validation rules'],
      });

      expect(taskRes.isError).toBeUndefined();
      const taskData = JSON.parse(taskRes.content[0].text).task;
      expect(taskData.title).toBe('Integrate MCP Server Test Validation');
      expect(taskData.isImportant).toBe(true);
      expect(taskData.subtasks.length).toBe(2);

      // 3. Add an additional subtask step via MCP
      const subtaskRes = await manageSubtasks({
        action: 'add',
        taskId: taskData.id,
        title: 'Execute cleanup assertions',
      });

      expect(subtaskRes.isError).toBeUndefined();
      const subtaskData = JSON.parse(subtaskRes.content[0].text).subtask;
      expect(subtaskData.title).toBe('Execute cleanup assertions');
      expect(subtaskData.isCompleted).toBe(false);

      // Verify list contains the created task
      const queryRes = await manageTasks({
        action: 'list',
        listId: listData.id,
      });
      const queryData = JSON.parse(queryRes.content[0].text);
      expect(queryData.count).toBeGreaterThanOrEqual(1);
    });

    suite.it('should strictly validate inputs and reject invalid parameters with structured errors', async () => {
      const server = createMcpServer() as any;
      const manageTasks = server._registeredTools.manage_tasks.handler;
      const manageSubtasks = server._registeredTools.manage_subtasks.handler;
      const manageLists = server._registeredTools.manage_lists.handler;
      const manageTime = server._registeredTools.manage_time_tracking.handler;

      // 1. Rejects task creation with empty or missing title
      const emptyTitleRes = await manageTasks({
        action: 'create',
        title: '   ',
      });
      expect(emptyTitleRes.isError).toBe(true);
      expect(emptyTitleRes.content[0].text).toContain('title parameter is required');

      // 2. Rejects custom list creation with missing name
      const emptyListNameRes = await manageLists({
        action: 'create',
        name: '',
      });
      expect(emptyListNameRes.isError).toBe(true);
      expect(emptyListNameRes.content[0].text).toContain('name parameter is required');

      // 3. Rejects task operations (get, update, delete, toggle) when taskId is missing
      const missingTaskIdRes = await manageTasks({
        action: 'get',
      });
      expect(missingTaskIdRes.isError).toBe(true);
      expect(missingTaskIdRes.content[0].text).toContain('taskId parameter is required');

      // 4. Rejects subtask additions without parent taskId or title
      const invalidSubtaskRes = await manageSubtasks({
        action: 'add',
        taskId: 'non-existent-task-id',
        title: 'Test',
      });
      expect(invalidSubtaskRes.isError).toBe(true);
      expect(invalidSubtaskRes.content[0].text).toContain('not found');

      // 5. Rejects time tracking stopwatch without taskId
      const invalidTimerRes = await manageTime({
        action: 'start',
      });
      expect(invalidTimerRes.isError).toBe(true);
      expect(invalidTimerRes.content[0].text).toContain('taskId parameter is required');
    });

    suite.it('should handle data modification, completion toggling, and complete data cleanup', async () => {
      const server = createMcpServer() as any;
      const manageTasks = server._registeredTools.manage_tasks.handler;
      const manageLists = server._registeredTools.manage_lists.handler;

      // 1. Create a disposable task and list for cleanup testing
      const listRes = await manageLists({
        action: 'create',
        name: 'Disposable Clean-Up List',
        color: 'rose',
      });
      const listId = JSON.parse(listRes.content[0].text).list.id;

      const taskRes = await manageTasks({
        action: 'create',
        title: 'Temporary Task to be Cleaned Up',
        listId,
      });
      const taskId = JSON.parse(taskRes.content[0].text).task.id;

      // 2. Toggle completion state
      const toggleRes = await manageTasks({
        action: 'toggle_complete',
        taskId,
      });
      expect(toggleRes.isError).toBeUndefined();
      const toggledTask = JSON.parse(toggleRes.content[0].text).task;
      expect(toggledTask.isCompleted).toBe(true);

      // 3. Clean up (delete) the task
      const deleteTaskRes = await manageTasks({
        action: 'delete',
        taskId,
      });
      expect(deleteTaskRes.isError).toBeUndefined();
      expect(JSON.parse(deleteTaskRes.content[0].text).success).toBe(true);

      // Verify task is deleted
      const verifyTaskRes = await manageTasks({
        action: 'get',
        taskId,
      });
      expect(verifyTaskRes.isError).toBe(true);
      expect(verifyTaskRes.content[0].text).toContain('not found');

      // 4. Clean up (delete) the custom list
      const deleteListRes = await manageLists({
        action: 'delete',
        listId,
      });
      expect(deleteListRes.isError).toBeUndefined();
      expect(JSON.parse(deleteListRes.content[0].text).success).toBe(true);

      // Verify list is deleted
      const listsQueryRes = await manageLists({ action: 'list' });
      const listsData = JSON.parse(listsQueryRes.content[0].text).lists;
      const listFound = listsData.some((l: any) => l.id === listId);
      expect(listFound).toBe(false);
    });
  }
);
