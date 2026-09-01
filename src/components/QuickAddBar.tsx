import React, { useState, useRef } from 'react';
import { Plus, Calendar, Bell, Star, ArrowRight } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { getTodayISO, getTomorrowISO, getLaterTodayReminderISO } from '../utils/dateUtils';
import { getListColor, getListIcon } from '../utils/listUtils';

export const QuickAddBar: React.FC = () => {
  const { addTask, activeFilter, customLists } = useTasks();
  const [title, setTitle] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [reminder, setReminder] = useState<string | null>(null);
  const [isImportant, setIsImportant] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCustomList = customLists.find((l) => l.id === activeFilter);
  const listColorObj = activeCustomList ? getListColor(activeCustomList.color) : null;
  const ListIconComp = activeCustomList ? getListIcon(activeCustomList.icon) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask(title, {
      dueDate: dueDate || (activeFilter === 'planned' ? getTodayISO() : null),
      reminder: reminder,
      isImportant: isImportant || activeFilter === 'important',
      inMyDay: activeFilter === 'my_day',
      listId: activeCustomList ? activeCustomList.id : null,
    });

    setTitle('');
    setDueDate(null);
    setReminder(null);
    setIsImportant(false);
    setShowDatePicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const placeholderText = activeCustomList
    ? `Add a task to "${activeCustomList.name}" (press Enter)`
    : activeFilter === 'my_day'
    ? "Add a task to My Day (press Enter)"
    : "Add a task (e.g. 'Review pull request', press Enter)";

  return (
    <div id="quick-add-container" className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent z-10">
      <form
        onSubmit={handleSubmit}
        className={`
          flex items-center h-12 px-3.5 bg-white border rounded-xl shadow-md transition-all duration-200
          ${isFocused ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-300 hover:border-slate-400'}
        `}
      >
        <button
          id="quick-add-submit-icon-btn"
          type="submit"
          disabled={!title.trim()}
          className={`
            w-7 h-7 rounded-lg flex items-center justify-center mr-2.5 transition-colors shrink-0
            ${title.trim() ? (listColorObj ? listColorObj.accentBg : 'bg-blue-600 text-white hover:bg-blue-700') : 'text-slate-400 hover:text-slate-600'}
          `}
          title="Add task"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {activeCustomList && listColorObj && ListIconComp && (
          <span className={`hidden sm:flex items-center gap-1 mr-2 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${listColorObj.badgeBg}`}>
            <ListIconComp className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{activeCustomList.name}</span>
          </span>
        )}

        <input
          ref={inputRef}
          id="quick-add-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="flex-1 bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-w-0"
        />

        {/* Quick Attribute Shortcuts */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Due date shortcut button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                dueDate ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Add due date"
            >
              <Calendar className="w-4 h-4" />
              {dueDate && <span className="text-[11px] hidden sm:inline">Due set</span>}
            </button>

            {showDatePicker && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 text-xs space-y-1">
                <div className="font-semibold text-slate-500 px-2 py-1 uppercase tracking-wider text-[10px]">Due Date</div>
                <button
                  type="button"
                  onClick={() => {
                    setDueDate(getTodayISO());
                    setShowDatePicker(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-slate-700 flex justify-between items-center"
                >
                  <span>Today</span>
                  <span className="text-[10px] text-slate-400">Today</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDueDate(getTomorrowISO());
                    setShowDatePicker(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-slate-700 flex justify-between items-center"
                >
                  <span>Tomorrow</span>
                  <span className="text-[10px] text-slate-400">Tomorrow</span>
                </button>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setDueDate(null);
                      setShowDatePicker(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-medium"
                  >
                    Clear due date
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Star shortcut button */}
          <button
            type="button"
            onClick={() => setIsImportant(!isImportant)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              isImportant ? 'text-amber-500 hover:text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Mark as important"
          >
            <Star className={`w-4 h-4 ${isImportant ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>

          {/* Shortcut hint badge when unfocused */}
          {!isFocused && !title.trim() && (
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded shrink-0 shadow-2xs" title="Press 'N' or '/' to create a task">
              N
            </kbd>
          )}

          {/* Submit Button (if title entered) */}
          {title.trim() && (
            <button
              id="quick-add-confirm-btn"
              type="submit"
              className="ml-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
            >
              Add
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
