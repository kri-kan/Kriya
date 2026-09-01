import { Task, CustomList } from '../types';
import { formatDuration } from './timeUtils';

/**
 * Generates CSV content conforming to the specification schema:
 * Task_ID, List_Name, Title, Is_Completed, Is_Important, Due_Date, Reminder_Date,
 * Repeat_Rule, Subtask_Count, Subtasks_Completed, Start_Time, End_Time,
 * Duration_Seconds, Total_Time_Formatted, Notes
 */
export function generateTasksCSV(tasks: Task[], customLists: CustomList[] = []): string {
  const headers = [
    'Task_ID',
    'List_Name',
    'Title',
    'Is_Completed',
    'Is_Important',
    'Due_Date',
    'Reminder_Date',
    'Repeat_Rule',
    'Subtask_Count',
    'Subtasks_Completed',
    'Start_Time',
    'End_Time',
    'Duration_Seconds',
    'Total_Time_Formatted',
    'Notes',
  ];

  const escapeCSV = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const listMap = new Map<string, string>();
  customLists.forEach((l) => listMap.set(l.id, l.name));

  const rows = tasks.map((task) => {
    const listName = task.listId ? listMap.get(task.listId) || 'Custom List' : 'Tasks';
    const subtaskCount = task.subtasks ? task.subtasks.length : 0;
    const subtasksCompleted = task.subtasks ? task.subtasks.filter((s) => s.isCompleted).length : 0;
    const duration = task.timeTracking?.durationSeconds || 0;
    const formattedDuration = formatDuration(duration);

    return [
      escapeCSV(task.id),
      escapeCSV(listName),
      escapeCSV(task.title),
      escapeCSV(task.isCompleted ? 'TRUE' : 'FALSE'),
      escapeCSV(task.isImportant ? 'TRUE' : 'FALSE'),
      escapeCSV(task.dueDate || ''),
      escapeCSV(task.reminder || ''),
      escapeCSV(task.repeatRule || 'NONE'),
      escapeCSV(subtaskCount),
      escapeCSV(subtasksCompleted),
      escapeCSV(task.timeTracking?.startTime || ''),
      escapeCSV(task.timeTracking?.endTime || ''),
      escapeCSV(duration),
      escapeCSV(formattedDuration),
      escapeCSV(task.notes || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers browser download of generated CSV file
 */
export function exportTasksToCSV(
  tasks: Task[],
  filenamePrefix: string = 'tasks_export',
  customLists: CustomList[] = []
): void {
  const csvContent = generateTasksCSV(tasks, customLists);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${dateStamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
