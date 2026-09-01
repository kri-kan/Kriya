import { createSuite, expect } from '../framework';
import { generateTasksCSV } from '../../src/utils/csvExport';
import { Task, CustomList } from '../../src/types';

export const csvExportAndSerializationSuite = createSuite(
  'CSV Export & Data Serialization Engine',
  'utils',
  'Verifies CSV header conformity, data escaping (commas, quotes, newlines), subtask metrics, and duration formatting',
  (suite) => {
    const mockLists: CustomList[] = [
      {
        id: 'list-eng',
        name: 'Engineering & DevOps',
        icon: 'Terminal',
        color: '#2563eb',
        createdAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'list-design',
        name: 'UI/UX Polish',
        icon: 'Palette',
        color: '#8b5cf6',
        createdAt: '2026-08-01T11:00:00.000Z',
      },
    ];

    const mockTasks: Task[] = [
      {
        id: 'task-101',
        listId: 'list-eng',
        title: 'Release Insider Build v1.3.0',
        isCompleted: true,
        isImportant: true,
        dueDate: '2026-09-01T23:59:59.999Z',
        reminder: '2026-09-01T09:00:00.000Z',
        repeatRule: 'DAILY',
        subtasks: [
          { id: 'sub-1', title: 'Verify unit tests', isCompleted: true },
          { id: 'sub-2', title: 'Compile binaries', isCompleted: true },
          { id: 'sub-3', title: 'Publish release notes', isCompleted: false },
        ],
        timeTracking: {
          startTime: '2026-09-01T10:00:00.000Z',
          endTime: '2026-09-01T11:30:00.000Z',
          durationSeconds: 5400, // 1 hr 30 mins
          isRunning: false,
        },
        notes: 'Priority insider milestone with "special quotes", commas in notes, and\nnewline breaks.',
        completedAt: '2026-09-01T11:30:00.000Z',
        createdAt: '2026-09-01T07:00:00.000Z',
      },
      {
        id: 'task-102',
        title: 'Simple Standalone Task',
        isCompleted: false,
        isImportant: false,
        dueDate: null,
        reminder: null,
        repeatRule: 'NONE',
        subtasks: [],
        timeTracking: {
          startTime: null,
          endTime: null,
          durationSeconds: 0,
          isRunning: false,
        },
        notes: '',
        completedAt: null,
        createdAt: '2026-09-01T07:15:00.000Z',
      },
    ];

    suite.it('should generate valid RFC-4180 CSV header structure matching the specification', () => {
      const csv = generateTasksCSV(mockTasks, mockLists);
      const lines = csv.split('\r\n');
      const headerLine = lines[0];

      expect(headerLine).toBe(
        'Task_ID,List_Name,Title,Is_Completed,Is_Important,Due_Date,Reminder_Date,Repeat_Rule,Subtask_Count,Subtasks_Completed,Start_Time,End_Time,Duration_Seconds,Total_Time_Formatted,Notes'
      );
    });

    suite.it('should properly map custom list IDs to human-readable names and fallback to Tasks', () => {
      const csv = generateTasksCSV(mockTasks, mockLists);
      const lines = csv.split('\r\n');

      // Task 1 belongs to 'list-eng'
      expect(lines[1]).toContain('"Engineering & DevOps"');

      // Task 2 has no listId, should default to 'Tasks'
      expect(lines[2]).toContain('"Tasks"');
    });

    suite.it('should accurately calculate subtask metrics (total count and completed count)', () => {
      const csv = generateTasksCSV(mockTasks, mockLists);
      const lines = csv.split('\r\n');

      // Task 1 has 3 subtasks, 2 completed
      const task1Cols = lines[1].split(',');
      expect(lines[1]).toContain('"3"'); // subtask count
      expect(lines[1]).toContain('"2"'); // subtasks completed
    });

    suite.it('should format durations correctly into human-readable strings (e.g., 01:30:00)', () => {
      const csv = generateTasksCSV(mockTasks, mockLists);
      const lines = csv.split('\r\n');

      // Task 1 has 5400s -> "01:30:00"
      expect(lines[1]).toContain('"01:30:00"');
      expect(lines[1]).toContain('"5400"');

      // Task 2 has 0s -> "00:00"
      expect(lines[2]).toContain('"00:00"');
    });

    suite.it('should properly escape double quotes, commas, and newlines in text notes', () => {
      const csv = generateTasksCSV(mockTasks, mockLists);

      // Verify that quotes inside notes are doubled (" -> "")
      expect(csv).toContain('""special quotes""');
      expect(csv).toContain('commas in notes');
    });
  }
);
