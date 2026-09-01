import React, { useMemo, useState } from 'react';
import {
  Download,
  ArrowUpDown,
  Sun,
  Star,
  Calendar,
  CheckSquare,
  CheckCircle2,
  Timer,
  ChevronDown,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  Cpu,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { SortBy, CustomList } from '../types';
import { TaskRow } from './TaskRow';
import { QuickAddBar } from './QuickAddBar';
import { exportTasksToCSV } from '../utils/csvExport';
import { getTodayDateString, isToday } from '../utils/dateUtils';
import { getListIcon, getListColor } from '../utils/listUtils';
import { CustomListModal } from './CustomListModal';
import { McpModal } from './McpModal';

interface TaskStreamProps {
  onOpenSidebar?: () => void;
}

export const TaskStream: React.FC<TaskStreamProps> = ({ onOpenSidebar }) => {
  const {
    tasks,
    customLists,
    activeFilter,
    selectedTaskId,
    setSelectedTaskId,
    searchQuery,
    sortBy,
    setSortBy,
    showCompleted,
    setShowCompleted,
    updateCustomList,
    deleteCustomList,
  } = useTasks();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);

  // System filters metadata
  const systemViewInfo: Record<string, { title: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    my_day: { title: 'My Day', icon: Sun, color: 'text-amber-500' },
    important: { title: 'Important', icon: Star, color: 'text-rose-500' },
    planned: { title: 'Planned', icon: Calendar, color: 'text-indigo-500' },
    all: { title: 'Tasks', icon: CheckSquare, color: 'text-blue-600' },
    completed: { title: 'Completed', icon: CheckCircle2, color: 'text-emerald-600' },
    time_tracking: { title: 'Time Logged', icon: Timer, color: 'text-violet-600' },
  };

  // Check if current filter is a custom list
  const activeCustomList = useMemo(() => {
    return customLists.find((l) => l.id === activeFilter) || null;
  }, [customLists, activeFilter]);

  const currentView = useMemo(() => {
    if (activeCustomList) {
      const IconComponent = getListIcon(activeCustomList.icon);
      const colorObj = getListColor(activeCustomList.color);
      return {
        title: activeCustomList.name,
        icon: IconComponent,
        color: colorObj.textColor,
        isCustom: true,
      };
    }
    const sys = systemViewInfo[activeFilter] || systemViewInfo.all;
    return {
      title: sys.title,
      icon: sys.icon,
      color: sys.color,
      isCustom: false,
    };
  }, [activeFilter, activeCustomList]);

  const ViewIcon = currentView.icon;

  // Filter tasks based on active view and search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchSubtasks = t.subtasks?.some((s) => s.title.toLowerCase().includes(q));
        if (!matchTitle && !matchNotes && !matchSubtasks) return false;
      }

      // 2. Custom List vs System Filter
      if (activeCustomList) {
        return t.listId === activeCustomList.id;
      }

      switch (activeFilter) {
        case 'my_day':
          return t.inMyDay || isToday(t.dueDate);
        case 'important':
          return t.isImportant;
        case 'planned':
          return t.dueDate !== null || t.reminder !== null;
        case 'completed':
          return t.isCompleted;
        case 'time_tracking':
          return (t.timeTracking?.durationSeconds || 0) > 0 || t.timeTracking?.isRunning;
        case 'all':
        default:
          return true;
      }
    });
  }, [tasks, activeFilter, searchQuery, activeCustomList]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    switch (sortBy) {
      case 'importance':
        return list.sort((a, b) => (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0));
      case 'dueDate':
        return list.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      case 'alphabetical':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'creationDate':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'duration':
        return list.sort((a, b) => (b.timeTracking?.durationSeconds || 0) - (a.timeTracking?.durationSeconds || 0));
      default:
        // By default: incomplete first, then important first
        return list.sort((a, b) => {
          if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
          if (a.isImportant !== b.isImportant) return b.isImportant ? 1 : -1;
          return 0;
        });
    }
  }, [filteredTasks, sortBy]);

  // Incomplete vs Completed separation (if not already viewing completed tab)
  const incompleteTasks = useMemo(() => sortedTasks.filter((t) => !t.isCompleted), [sortedTasks]);
  const completedTasks = useMemo(() => sortedTasks.filter((t) => t.isCompleted), [sortedTasks]);

  const handleExportCSV = () => {
    const cleanName = activeCustomList
      ? `list_${activeCustomList.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : `todo_${activeFilter}`;
    exportTasksToCSV(filteredTasks, cleanName, customLists);
  };

  return (
    <div id="main-task-stream" className="flex-1 flex flex-col h-full bg-slate-100/60 overflow-hidden relative">
      {/* Header Area */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-200/80 bg-white/70 backdrop-blur-xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Date Metadata */}
          <div>
            <div className="flex items-center gap-2.5">
              {onOpenSidebar && (
                <button
                  type="button"
                  onClick={onOpenSidebar}
                  className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <Filter className="w-4 h-4" />
                </button>
              )}
              <ViewIcon className={`w-6 h-6 ${currentView.color}`} />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentView.title}</h2>

              {/* Custom List Options Menu */}
              {activeCustomList && (
                <div className="relative ml-1">
                  <button
                    type="button"
                    onClick={() => setShowListMenu(!showListMenu)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="List actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showListMenu && (
                    <div
                      className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 space-y-0.5 text-xs animate-in fade-in zoom-in-95"
                      onClick={() => setShowListMenu(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit list & theme</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomList(activeCustomList.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete list</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-8.5 font-medium">{getTodayDateString()}</p>
          </div>

          {/* Action Bar: Sort & CSV Export */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                id="task-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="appearance-none pl-7 pr-8 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="default">Sort: Default</option>
                <option value="importance">Sort: Importance</option>
                <option value="dueDate">Sort: Due Date</option>
                <option value="duration">Sort: Time Spent</option>
                <option value="creationDate">Sort: Creation Date</option>
                <option value="alphabetical">Sort: Alphabetical</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* MCP Model Context Protocol Button */}
            <button
              id="mcp-header-btn"
              type="button"
              onClick={() => setIsMcpModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-2xs hover:shadow-xs transition-all"
              title="Open Model Context Protocol (MCP) Server"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">MCP Tools</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* One-Click CSV Export Button */}
            <button
              id="csv-export-btn"
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
              title="Export tasks to CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
              <span className="bg-slate-700 text-slate-200 px-1.5 py-0.2 rounded text-[10px] ml-0.5">
                {filteredTasks.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Task Stream List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mb-3">
              <ViewIcon className={`w-7 h-7 ${currentView.color} opacity-80`} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No tasks in {currentView.title}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {searchQuery
                ? `No tasks matching "${searchQuery}". Clear your search to see all tasks.`
                : 'Tasks added to this view will appear here. Use the quick-add bar below.'}
            </p>
          </div>
        ) : activeFilter === 'completed' ? (
          // In completed tab, show all directly
          sortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onSelect={(t) => setSelectedTaskId(t.id)}
              showListBadge={!activeCustomList}
            />
          ))
        ) : (
          <>
            {/* Active Incomplete Tasks */}
            {incompleteTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={(t) => setSelectedTaskId(t.id)}
                showListBadge={!activeCustomList}
              />
            ))}

            {/* Completed Tasks Collapsible Section */}
            {completedTasks.length > 0 && (
              <div className="pt-4 mt-2">
                <button
                  id="toggle-completed-section-btn"
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider mb-2 px-1"
                >
                  {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <span>Completed</span>
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full text-[10px] ml-1">
                    {completedTasks.length}
                  </span>
                </button>

                {showCompleted && (
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskId === task.id}
                        onSelect={(t) => setSelectedTaskId(t.id)}
                        showListBadge={!activeCustomList}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Persistent Quick-Add Bar */}
      <QuickAddBar />

      {/* Edit List Modal */}
      {activeCustomList && (
        <CustomListModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialList={activeCustomList}
          onSave={(name, icon, color) => {
            updateCustomList(activeCustomList.id, { name, icon, color });
          }}
          onDelete={(id) => {
            deleteCustomList(id);
          }}
        />
      )}

      {/* MCP Connection & Tool Tester Modal */}
      <McpModal isOpen={isMcpModalOpen} onClose={() => setIsMcpModalOpen(false)} />
    </div>
  );
};
