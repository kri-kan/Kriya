import React from 'react';
import {
  Check,
  Star,
  Calendar,
  Bell,
  Repeat,
  CheckSquare,
  Clock,
  Play,
  Pause,
  List as ListIcon,
} from 'lucide-react';
import { Task } from '../types';
import { useTasks } from '../context/TaskContext';
import { formatDueDate, formatReminder } from '../utils/dateUtils';
import { formatDuration } from '../utils/timeUtils';
import { getListColor, getListIcon } from '../utils/listUtils';

interface TaskRowProps {
  task: Task;
  isSelected: boolean;
  onSelect: (task: Task) => void;
  showListBadge?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  isSelected,
  onSelect,
  showListBadge = true,
}) => {
  const { toggleTaskComplete, toggleTaskImportant, startTimer, pauseTimer, customLists } = useTasks();

  const dueInfo = formatDueDate(task.dueDate);
  const reminderText = formatReminder(task.reminder);
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const hasSubtasks = totalSubtasks > 0;
  const isTimerRunning = !!task.timeTracking?.isRunning;
  const durationSec = task.timeTracking?.durationSeconds || 0;

  // Custom list metadata
  const taskList = task.listId ? customLists.find((l) => l.id === task.listId) : null;
  const listColorObj = taskList ? getListColor(taskList.color) : null;
  const ListIconComp = taskList ? getListIcon(taskList.icon) : ListIcon;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskComplete(task.id);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskImportant(task.id);
  };

  const handleTimerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimerRunning) {
      pauseTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };

  return (
    <div
      id={`task-row-${task.id}`}
      onClick={() => onSelect(task)}
      className={`
        group relative flex items-center justify-between h-14 px-4 bg-white hover:bg-slate-50/90
        border border-slate-200/80 rounded-xl cursor-pointer transition-all duration-150 select-none
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30 shadow-sm' : 'hover:border-slate-300 hover:shadow-xs'}
        ${task.isCompleted ? 'bg-slate-50/60 opacity-75' : ''}
      `}
    >
      {/* Left: Checkbox */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
        <button
          id={`task-checkbox-${task.id}`}
          type="button"
          onClick={handleCheckboxClick}
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0
            ${
              task.isCompleted
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'border-slate-400 hover:border-blue-600 hover:bg-blue-50/50 bg-white text-transparent'
            }
          `}
          title={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
          aria-label={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Center: Title & Badges */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span
              className={`
                text-sm font-medium text-slate-800 truncate leading-snug
                ${task.isCompleted ? 'line-through text-slate-400 font-normal' : ''}
              `}
            >
              {task.title}
            </span>
          </div>

          {/* Metadata Badges Stream */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 overflow-hidden">
            {/* Custom List Tag (if in aggregate view like All Tasks / My Day / Planned) */}
            {showListBadge && taskList && listColorObj && (
              <span
                className={`flex items-center gap-1 shrink-0 font-medium px-1.5 py-0.2 rounded-md text-[10px] ${listColorObj.badgeBg}`}
                title={`In list: ${taskList.name}`}
              >
                <ListIconComp className="w-2.5 h-2.5" />
                <span className="truncate max-w-[90px]">{taskList.name}</span>
              </span>
            )}

            {/* Subtask Progress Badge */}
            {hasSubtasks && (
              <span className="flex items-center gap-1 shrink-0 font-medium text-slate-600">
                <CheckSquare className="w-3 h-3 text-slate-400" />
                <span>
                  {completedSubtasks} of {totalSubtasks}
                </span>
              </span>
            )}

            {/* Due Date Badge */}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 shrink-0 font-medium ${
                  dueInfo.isOverdue
                    ? 'text-rose-600 font-semibold'
                    : dueInfo.isDueToday
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-600'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{dueInfo.text}</span>
              </span>
            )}

            {/* Reminder Badge */}
            {task.reminder && (
              <span className="flex items-center gap-1 shrink-0 text-slate-500 hidden sm:flex" title={`Reminder: ${reminderText}`}>
                <Bell className="w-3 h-3 text-amber-500" />
              </span>
            )}

            {/* Repeat Badge */}
            {task.repeatRule && task.repeatRule !== 'NONE' && (
              <span className="flex items-center gap-1 shrink-0 text-slate-500 hidden sm:flex" title={`Repeats: ${task.repeatRule}`}>
                <Repeat className="w-3 h-3 text-indigo-500" />
              </span>
            )}

            {/* Time Tracking Badge */}
            {(durationSec > 0 || isTimerRunning) && (
              <span
                className={`flex items-center gap-1 shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                  isTimerRunning
                    ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isTimerRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                <Clock className="w-2.5 h-2.5" />
                <span>{formatDuration(durationSec, true)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Timer + Star */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Quick stopwatch button on hover or when running */}
        <button
          id={`task-timer-btn-${task.id}`}
          type="button"
          onClick={handleTimerToggle}
          className={`
            p-1.5 rounded-lg text-xs transition-opacity duration-150 flex items-center gap-1
            ${
              isTimerRunning
                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 opacity-100'
                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100'
            }
          `}
          title={isTimerRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
          aria-label={isTimerRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
        >
          {isTimerRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        {/* Star / Importance Button */}
        <button
          id={`task-star-${task.id}`}
          type="button"
          onClick={handleStarClick}
          className={`
            p-1.5 rounded-lg transition-colors
            ${
              task.isImportant
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-slate-300 hover:text-slate-500 opacity-70 group-hover:opacity-100'
            }
          `}
          title={task.isImportant ? 'Remove importance' : 'Mark as important'}
          aria-label={task.isImportant ? 'Remove importance' : 'Mark as important'}
        >
          <Star className={`w-4 h-4 ${task.isImportant ? 'fill-amber-400 text-amber-500' : ''}`} />
        </button>
      </div>
    </div>
  );
};
