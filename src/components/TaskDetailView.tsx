import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Star,
  Sun,
  Bell,
  Calendar,
  Repeat,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  ChevronDown,
  CheckCircle2,
  FileText,
  Sparkles,
  Folder,
  List as ListIcon,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { RepeatRule } from '../types';
import {
  formatDueDate,
  formatReminder,
  getTodayISO,
  getTomorrowISO,
  getNextWeekISO,
  getLaterTodayReminderISO,
  getTomorrowMorningReminderISO,
} from '../utils/dateUtils';
import {
  formatDuration,
  formatDurationDetailed,
  toDateTimeLocal,
  fromDateTimeLocal,
} from '../utils/timeUtils';
import { getListColor, getListIcon } from '../utils/listUtils';

interface TaskDetailViewProps {
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ onClose }) => {
  const {
    selectedTask,
    customLists,
    updateTask,
    moveTaskToList,
    deleteTask,
    toggleTaskComplete,
    toggleTaskImportant,
    toggleInMyDay,
    addSubtask,
    toggleSubtask,
    updateSubtaskTitle,
    deleteSubtask,
    startTimer,
    pauseTimer,
    resetTimer,
    updateTimeTracking,
    addQuickTime,
  } = useTasks();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [showDueMenu, setShowDueMenu] = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [customDueInput, setCustomDueInput] = useState('');
  const [customReminderInput, setCustomReminderInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync state when selected task changes
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setNotes(selectedTask.notes || '');
      setCustomDueInput(toDateTimeLocal(selectedTask.dueDate));
      setCustomReminderInput(toDateTimeLocal(selectedTask.reminder));
      setConfirmDelete(false);
    }
  }, [selectedTask?.id]);

  if (!selectedTask) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mb-3">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600">Select a task</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Click any task from the list to view its subtasks, schedule, time tracking, and notes.
        </p>
      </div>
    );
  }

  const isRunning = !!selectedTask.timeTracking?.isRunning;
  const durationSec = selectedTask.timeTracking?.durationSeconds || 0;
  const subtasks = selectedTask.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const subtasksProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
  const dueInfo = formatDueDate(selectedTask.dueDate);
  const reminderInfo = formatReminder(selectedTask.reminder);

  const handleTitleBlur = () => {
    if (title.trim() && title !== selectedTask.title) {
      updateTask(selectedTask.id, { title: title.trim() });
    } else {
      setTitle(selectedTask.title);
    }
  };

  const handleNotesBlur = () => {
    if (notes !== selectedTask.notes) {
      updateTask(selectedTask.id, { notes });
    }
  };

  const handleAddStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    addSubtask(selectedTask.id, newStepTitle);
    setNewStepTitle('');
  };

  const handleCustomDueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDueInput(val);
    const iso = fromDateTimeLocal(val);
    updateTask(selectedTask.id, { dueDate: iso });
    setShowDueMenu(false);
  };

  const handleCustomReminderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomReminderInput(val);
    const iso = fromDateTimeLocal(val);
    updateTask(selectedTask.id, { reminder: iso });
    setShowReminderMenu(false);
  };

  const handleSetRepeat = (rule: RepeatRule) => {
    updateTask(selectedTask.id, { repeatRule: rule });
    setShowRepeatMenu(false);
  };

  return (
    <div
      id="task-detail-panel"
      className="h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <button
            id="detail-toggle-complete-btn"
            type="button"
            onClick={() => toggleTaskComplete(selectedTask.id)}
            className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0
              ${
                selectedTask.isCompleted
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'border-slate-400 hover:border-blue-600 bg-white text-transparent'
              }
            `}
            title={selectedTask.isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {selectedTask.isCompleted ? 'Completed Task' : 'Task Details'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="detail-toggle-star-btn"
            type="button"
            onClick={() => toggleTaskImportant(selectedTask.id)}
            className={`p-2 rounded-lg transition-colors ${
              selectedTask.isImportant ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Mark as important"
          >
            <Star className={`w-4 h-4 ${selectedTask.isImportant ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>
          <button
            id="detail-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Section 1: Title Input */}
        <div className="space-y-1">
          <input
            id="detail-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="Task title"
            className={`
              w-full text-base font-bold text-slate-900 bg-transparent border-b-2 border-transparent
              hover:border-slate-200 focus:border-blue-500 focus:outline-none py-1 transition-colors
              ${selectedTask.isCompleted ? 'line-through text-slate-400' : ''}
            `}
          />
        </div>

        {/* Section 2: Subtasks / Steps */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subtasks / Steps</span>
            {subtasks.length > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                {completedSubtasks} of {subtasks.length} done
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {subtasks.length > 0 && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${subtasksProgress}%` }}
              />
            </div>
          )}

          {/* Subtasks List */}
          <div className="space-y-1.5">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="group flex items-center justify-between gap-2.5 px-3 py-2 bg-slate-50/80 hover:bg-slate-100/80 rounded-lg border border-slate-200/60 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                  className={`
                    w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0
                    ${
                      subtask.isCompleted
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 hover:border-blue-600 bg-white text-transparent'
                    }
                  `}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>

                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) => updateSubtaskTitle(selectedTask.id, subtask.id, e.target.value)}
                  className={`
                    flex-1 text-xs bg-transparent border-none focus:outline-none text-slate-800
                    ${subtask.isCompleted ? 'line-through text-slate-400' : ''}
                  `}
                />

                <button
                  type="button"
                  onClick={() => deleteSubtask(selectedTask.id, subtask.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                  title="Delete step"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Add Step Input */}
            <form onSubmit={handleAddStepSubmit} className="flex items-center gap-2 pt-1">
              <Plus className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                id="add-step-input"
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="Add step"
                className="flex-1 text-xs text-slate-800 placeholder-slate-400 bg-transparent border-b border-dashed border-slate-300 py-1.5 focus:border-blue-500 focus:outline-none"
              />
              {newStepTitle.trim() && (
                <button
                  type="submit"
                  className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold rounded"
                >
                  Add
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Section 3: Schedule & Reminders */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Schedule & Reminders</span>

          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {/* Row 1: Add to My Day */}
            <button
              id="detail-my-day-toggle"
              type="button"
              onClick={() => toggleInMyDay(selectedTask.id)}
              className={`w-full flex items-center justify-between p-3 text-xs transition-colors text-left hover:bg-slate-100/80 ${
                selectedTask.inMyDay ? 'text-blue-700 bg-blue-50/50 font-semibold' : 'text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className={`w-4 h-4 ${selectedTask.inMyDay ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
                <span>{selectedTask.inMyDay ? 'Added to My Day' : 'Add to My Day'}</span>
              </div>
              {selectedTask.inMyDay && (
                <span className="text-[11px] text-blue-600 hover:text-rose-600 font-medium">Remove</span>
              )}
            </button>

            {/* Row 2: Remind Me */}
            <div className="relative">
              <button
                id="detail-remind-me-row"
                type="button"
                onClick={() => setShowReminderMenu(!showReminderMenu)}
                className="w-full flex items-center justify-between p-3 text-xs text-slate-700 hover:bg-slate-100/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Bell className={`w-4 h-4 ${selectedTask.reminder ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="truncate">
                    {selectedTask.reminder ? `Reminder: ${reminderInfo}` : 'Remind me'}
                  </span>
                </div>
                {selectedTask.reminder ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTask(selectedTask.id, { reminder: null });
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600"
                  >
                    Clear
                  </button>
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {showReminderMenu && (
                <div className="p-3 bg-white border-t border-slate-100 space-y-2 text-xs">
                  <div className="font-semibold text-slate-600">Quick Reminder Presets:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateTask(selectedTask.id, { reminder: getLaterTodayReminderISO() });
                        setShowReminderMenu(false);
                      }}
                      className="p-1.5 text-left rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
                    >
                      Later Today (5:00 PM)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateTask(selectedTask.id, { reminder: getTomorrowMorningReminderISO() });
                        setShowReminderMenu(false);
                      }}
                      className="p-1.5 text-left rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
                    >
                      Tomorrow (9:00 AM)
                    </button>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[11px] text-slate-500 mb-1 font-medium">Or pick date & time:</label>
                    <input
                      type="datetime-local"
                      value={customReminderInput}
                      onChange={handleCustomReminderChange}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Due Date */}
            <div className="relative">
              <button
                id="detail-due-date-row"
                type="button"
                onClick={() => setShowDueMenu(!showDueMenu)}
                className="w-full flex items-center justify-between p-3 text-xs text-slate-700 hover:bg-slate-100/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className={`w-4 h-4 ${selectedTask.dueDate ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`truncate ${dueInfo.isOverdue ? 'text-rose-600 font-semibold' : ''}`}>
                    {selectedTask.dueDate ? `Due ${dueInfo.text}` : 'Add due date'}
                  </span>
                </div>
                {selectedTask.dueDate ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTask(selectedTask.id, { dueDate: null });
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600"
                  >
                    Clear
                  </button>
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {showDueMenu && (
                <div className="p-3 bg-white border-t border-slate-100 space-y-2 text-xs">
                  <div className="font-semibold text-slate-600">Quick Due Presets:</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateTask(selectedTask.id, { dueDate: getTodayISO() });
                        setShowDueMenu(false);
                      }}
                      className="p-1.5 text-center rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateTask(selectedTask.id, { dueDate: getTomorrowISO() });
                        setShowDueMenu(false);
                      }}
                      className="p-1.5 text-center rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateTask(selectedTask.id, { dueDate: getNextWeekISO() });
                        setShowDueMenu(false);
                      }}
                      className="p-1.5 text-center rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
                    >
                      Next Week
                    </button>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[11px] text-slate-500 mb-1 font-medium">Or pick custom date:</label>
                    <input
                      type="date"
                      value={customDueInput ? customDueInput.substring(0, 10) : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const d = new Date(e.target.value);
                          d.setHours(23, 59, 59, 999);
                          updateTask(selectedTask.id, { dueDate: d.toISOString() });
                        } else {
                          updateTask(selectedTask.id, { dueDate: null });
                        }
                        setShowDueMenu(false);
                      }}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Row 4: Repeat */}
            <div className="relative">
              <button
                id="detail-repeat-row"
                type="button"
                onClick={() => setShowRepeatMenu(!showRepeatMenu)}
                className="w-full flex items-center justify-between p-3 text-xs text-slate-700 hover:bg-slate-100/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Repeat className={`w-4 h-4 ${selectedTask.repeatRule !== 'NONE' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">
                    {selectedTask.repeatRule !== 'NONE' ? `Repeats ${selectedTask.repeatRule.toLowerCase()}` : 'Repeat'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRepeatMenu && (
                <div className="p-2 bg-white border-t border-slate-100 space-y-1 text-xs">
                  {(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as RepeatRule[]).map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => handleSetRepeat(rule)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        selectedTask.repeatRule === rule
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{rule === 'NONE' ? 'Never (No repeat)' : rule.charAt(0) + rule.slice(1).toLowerCase()}</span>
                      {selectedTask.repeatRule === rule && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Row 5: Custom List Assignment */}
            <div className="relative">
              {(() => {
                const assignedList = selectedTask.listId ? customLists.find((l) => l.id === selectedTask.listId) : null;
                const assignedColor = assignedList ? getListColor(assignedList.color) : null;
                const AssignedIcon = assignedList ? getListIcon(assignedList.icon) : ListIcon;

                return (
                  <>
                    <button
                      id="detail-assign-list-row"
                      type="button"
                      onClick={() => setShowListMenu(!showListMenu)}
                      className="w-full flex items-center justify-between p-3 text-xs text-slate-700 hover:bg-slate-100/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Folder className={`w-4 h-4 ${assignedList && assignedColor ? assignedColor.textColor : 'text-slate-400'}`} />
                        <span className="truncate">
                          {assignedList ? (
                            <span className="flex items-center gap-1.5">
                              <span>List:</span>
                              <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${assignedColor?.badgeBg}`}>
                                {assignedList.name}
                              </span>
                            </span>
                          ) : (
                            'Move to list (Tasks default)'
                          )}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {showListMenu && (
                      <div className="p-2 bg-white border-t border-slate-100 space-y-1 text-xs max-h-48 overflow-y-auto">
                        {/* Default Tasks (no custom list) */}
                        <button
                          type="button"
                          onClick={() => {
                            moveTaskToList(selectedTask.id, null);
                            setShowListMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                            !selectedTask.listId
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ListIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>Tasks (Default)</span>
                          </div>
                          {!selectedTask.listId && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>

                        {/* Custom Lists options */}
                        {customLists.map((list) => {
                          const isCurrent = selectedTask.listId === list.id;
                          const col = getListColor(list.color);
                          const IconComp = getListIcon(list.icon);
                          return (
                            <button
                              key={list.id}
                              type="button"
                              onClick={() => {
                                moveTaskToList(selectedTask.id, list.id);
                                setShowListMenu(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                                isCurrent
                                  ? `${col.bgActive}`
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 truncate">
                                <IconComp className={`w-3.5 h-3.5 shrink-0 ${col.textColor}`} />
                                <span className="truncate">{list.name}</span>
                              </div>
                              {isCurrent && <Check className={`w-3.5 h-3.5 shrink-0 ${col.textColor}`} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>


        {/* Section 4: Time Tracking */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-600" />
              Time Tracking
            </span>
            {isRunning && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Recording
              </span>
            )}
          </div>

          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-4">
            {/* Big Stopwatch Display */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-mono font-bold text-slate-800 tracking-tight">
                  {formatDuration(durationSec)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Total spent: <span className="font-semibold text-slate-700">{formatDurationDetailed(durationSec)}</span>
                </div>
              </div>

              {/* Stopwatch Action Buttons */}
              <div className="flex items-center gap-1.5">
                {isRunning ? (
                  <button
                    id="detail-pause-timer-btn"
                    type="button"
                    onClick={() => pauseTimer(selectedTask.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    Pause
                  </button>
                ) : (
                  <button
                    id="detail-start-timer-btn"
                    type="button"
                    onClick={() => startTimer(selectedTask.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start
                  </button>
                )}

                <button
                  id="detail-reset-timer-btn"
                  type="button"
                  onClick={() => resetTimer(selectedTask.id)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Time Log Buttons */}
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block mb-1.5">Quick log time:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => addQuickTime(selectedTask.id, 900)}
                  className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                >
                  +15m
                </button>
                <button
                  type="button"
                  onClick={() => addQuickTime(selectedTask.id, 1800)}
                  className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                >
                  +30m
                </button>
                <button
                  type="button"
                  onClick={() => addQuickTime(selectedTask.id, 3600)}
                  className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                >
                  +1h
                </button>
              </div>
            </div>

            {/* Manual Start & End Time Inputs */}
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(selectedTask.timeTracking?.startTime)}
                  onChange={(e) =>
                    updateTimeTracking(selectedTask.id, {
                      startTime: fromDateTimeLocal(e.target.value),
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(selectedTask.timeTracking?.endTime)}
                  onChange={(e) =>
                    updateTimeTracking(selectedTask.id, {
                      endTime: fromDateTimeLocal(e.target.value),
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Notes */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notes</span>
          <textarea
            id="detail-notes-textarea"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add detailed notes, links, or context for this task..."
            className="w-full p-3 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-y leading-relaxed"
          />
        </div>
      </div>

      {/* Footer: Metadata & Delete */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="truncate text-[11px]">
          Created {new Date(selectedTask.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {selectedTask.completedAt && (
            <span className="text-emerald-600 block sm:inline sm:ml-2 font-medium">
              • Completed {new Date(selectedTask.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        <div>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-rose-600 font-semibold">Delete?</span>
              <button
                type="button"
                onClick={() => deleteTask(selectedTask.id)}
                className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700 shadow-2xs"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="detail-delete-task-btn"
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
