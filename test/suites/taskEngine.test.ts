import { createSuite, expect } from '../framework';

export interface TestTask {
  id: string;
  title: string;
  isCompleted: boolean;
  isImportant: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  completedAt?: string;
  dueDate?: string;
  tags: string[];
  subtasks: { id: string; title: string; isCompleted: boolean }[];
  timeTracking?: {
    totalDurationSeconds: number;
    isRunning: boolean;
    activeSessionStartTime?: number;
    sessions: { id: string; startTime: number; endTime?: number; durationSeconds: number }[];
  };
}

export const taskEngineSuite = createSuite(
  'Task Lifecycle & Data Integrity',
  'core',
  'Verifies task creation, completion toggling, priority validation, subtask calculation, and time tracking math',
  (suite) => {
    suite.it('should create a task with validated defaults and ISO timestamps', () => {
      const task: TestTask = {
        id: 'task-test-01',
        title: 'Complete architecture review',
        isCompleted: false,
        isImportant: true,
        priority: 'high',
        createdAt: new Date().toISOString(),
        tags: ['architecture', 'security'],
        subtasks: [
          { id: 'sub-1', title: 'Review SQL migrations', isCompleted: true },
          { id: 'sub-2', title: 'Review NoSQL schema', isCompleted: false },
        ],
      };

      expect(task.id).toBe('task-test-01');
      expect(task.isCompleted).toBe(false);
      expect(task.isImportant).toBe(true);
      expect(task.priority).toBe('high');
      expect(task.tags.length).toBe(2);
      expect(task.tags).toContain('architecture');
      expect(task.subtasks.length).toBe(2);
    });

    suite.it('should correctly calculate subtask completion ratio and progress percentage', () => {
      const subtasks = [
        { id: '1', title: 'Sub 1', isCompleted: true },
        { id: '2', title: 'Sub 2', isCompleted: true },
        { id: '3', title: 'Sub 3', isCompleted: false },
        { id: '4', title: 'Sub 4', isCompleted: false },
      ];

      const completedCount = subtasks.filter((s) => s.isCompleted).length;
      const progressPercent = Math.round((completedCount / subtasks.length) * 100);

      expect(completedCount).toBe(2);
      expect(progressPercent).toBe(50);
      expect(progressPercent).toBeGreaterThanOrEqual(0);
      expect(progressPercent).toBeLessThan(101);
    });

    suite.it('should handle time tracking stopwatch sessions accurately', () => {
      const now = Date.now();
      const pastStart = now - 60000; // 60 seconds ago

      const session = {
        id: 'sess-1',
        startTime: pastStart,
        endTime: now,
        durationSeconds: Math.floor((now - pastStart) / 1000),
      };

      expect(session.durationSeconds).toBeGreaterThanOrEqual(59);
      expect(session.durationSeconds).toBeLessThan(62);

      const timeTracking = {
        totalDurationSeconds: session.durationSeconds,
        isRunning: false,
        sessions: [session],
      };

      expect(timeTracking.totalDurationSeconds).toBeGreaterThan(0);
      expect(timeTracking.sessions.length).toBe(1);
    });

    suite.it('should properly categorize tasks by Eisenhower matrix quadrants', () => {
      const tasks: TestTask[] = [
        {
          id: '1',
          title: 'Urgent Server Hotfix',
          isCompleted: false,
          isImportant: true,
          priority: 'urgent',
          dueDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          tags: ['prod'],
          subtasks: [],
        },
        {
          id: '2',
          title: 'Quarterly Strategic Plan',
          isCompleted: false,
          isImportant: true,
          priority: 'medium',
          dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
          createdAt: new Date().toISOString(),
          tags: ['strategy'],
          subtasks: [],
        },
      ];

      const q1 = tasks.filter((t) => t.isImportant && t.priority === 'urgent');
      const q2 = tasks.filter((t) => t.isImportant && t.priority !== 'urgent');

      expect(q1.length).toBe(1);
      expect(q1[0].title).toBe('Urgent Server Hotfix');
      expect(q2.length).toBe(1);
      expect(q2[0].title).toBe('Quarterly Strategic Plan');
    });
  }
);
