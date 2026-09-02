import React, { useState } from 'react';
import {
  Sun,
  Star,
  Calendar,
  CheckSquare,
  CheckCircle2,
  Timer,
  Search,
  Clock,
  Pause,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  List as ListIcon,
  Cpu,
  Database,
  Wrench,
  Package,
  FlaskConical,
  BookOpen,
  Keyboard,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { ViewFilter, CustomList } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { getListIcon, getListColor } from '../utils/listUtils';
import { CustomListModal } from './CustomListModal';
import { McpModal } from './McpModal';
import { DatabaseModal } from './DatabaseModal';
import { InstallerModal } from './InstallerModal';
import { PortabilityModal } from './PortabilityModal';
import { TestRunnerModal } from './TestRunnerModal';
import { DocsModal } from './DocsModal';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  isMobile = false,
  onOpenShortcuts,
}) => {
  const {
    activeFilter,
    setActiveFilter,
    counts,
    tasks,
    customLists,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    searchQuery,
    setSearchQuery,
    setSelectedTaskId,
    pauseTimer,
  } = useTasks();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMcpOpen, setIsMcpOpen] = useState(false);
  const [isDbOpen, setIsDbOpen] = useState(false);
  const [isInstallerOpen, setIsInstallerOpen] = useState(false);
  const [isPortabilityOpen, setIsPortabilityOpen] = useState(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomList | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [inlineListName, setInlineListName] = useState('');

  const systemNavItems: Array<{
    id: ViewFilter;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    color: string;
    activeBg: string;
    shortcut: string;
  }> = [
    {
      id: 'my_day',
      label: 'My Day',
      icon: Sun,
      count: counts.my_day,
      color: 'text-amber-500',
      activeBg: 'bg-blue-50 text-blue-700 font-semibold',
      shortcut: '1',
    },
    {
      id: 'important',
      label: 'Important',
      icon: Star,
      count: counts.important,
      color: 'text-rose-500',
      activeBg: 'bg-rose-50 text-rose-700 font-semibold',
      shortcut: '2',
    },
    {
      id: 'planned',
      label: 'Planned',
      icon: Calendar,
      count: counts.planned,
      color: 'text-indigo-500',
      activeBg: 'bg-indigo-50 text-indigo-700 font-semibold',
      shortcut: '3',
    },
    {
      id: 'all',
      label: 'Tasks',
      icon: CheckSquare,
      count: counts.all,
      color: 'text-blue-600',
      activeBg: 'bg-blue-50 text-blue-700 font-semibold',
      shortcut: '4',
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CheckCircle2,
      count: counts.completed,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-50 text-emerald-700 font-semibold',
      shortcut: '5',
    },
    {
      id: 'time_tracking',
      label: 'Time Logged',
      icon: Timer,
      count: counts.time_tracking,
      color: 'text-violet-600',
      activeBg: 'bg-violet-50 text-violet-700 font-semibold',
      shortcut: '6',
    },
  ];

  // Find if any task is actively running a timer
  const runningTask = tasks.find((t) => t.timeTracking?.isRunning);

  // Total duration logged across all tasks
  const totalDurationAll = tasks.reduce((sum, t) => sum + (t.timeTracking?.durationSeconds || 0), 0);

  const handleSelectFilter = (filterId: ViewFilter) => {
    setActiveFilter(filterId);
    if (isMobile) {
      onToggle();
    }
  };

  const handleCreateNewListModal = () => {
    setEditingList(null);
    setIsModalOpen(true);
  };

  const handleEditListModal = (list: CustomList, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setEditingList(list);
    setIsModalOpen(true);
  };

  const handleDeleteList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    deleteCustomList(id);
  };

  const handleInlineAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineListName.trim()) {
      setIsInlineAdding(false);
      return;
    }
    const newList = createCustomList(inlineListName.trim(), 'List', 'blue');
    setInlineListName('');
    setIsInlineAdding(false);
    setActiveFilter(newList.id);
  };

  return (
    <>
      <aside
        id="app-sidebar"
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-50 shadow-2xl transition-transform duration-300 ease-in-out' : 'relative'}
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
          ${!isMobile && !isOpen ? 'w-16' : 'w-72'}
          flex flex-col bg-white border-r border-slate-200 shrink-0 select-none transition-all duration-200
        `}
      >
        {/* Top Header / Profile */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            {(isOpen || isMobile) && (
              <div className="truncate">
                <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Kriya</h1>
                <p className="text-xs text-slate-500 truncate">Task & Time Engine</p>
              </div>
            )}
          </div>

          <button
            id="sidebar-toggle-btn"
            type="button"
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Search */}
        {(isOpen || isMobile) && (
          <div className="p-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="sidebar-search-input"
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {/* Section 1: Standard Smart Views */}
          <div className="space-y-0.5">
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.id;

              return (
                <button
                  id={`nav-filter-${item.id}`}
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFilter(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left group relative
                    ${isActive ? item.activeBg : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'}
                  `}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${item.color}`} />

                  {(isOpen || isMobile) && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{item.label}</span>
                        <kbd className="hidden group-hover:inline-block px-1.5 py-0.2 text-[9px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                          {item.shortcut}
                        </kbd>
                      </div>
                      {item.count > 0 && (
                        <span
                          className={`
                            text-xs font-semibold px-2 py-0.5 rounded-full ml-2 tabular-nums
                            ${isActive ? 'bg-white/80 shadow-xs' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}
                          `}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section 2: Custom Lists (divider + section header) */}
          <div className="pt-2 border-t border-slate-100">
            {(isOpen || isMobile) ? (
              <div className="flex items-center justify-between px-3 py-1 mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Lists ({customLists.length})
                </span>
                <button
                  id="create-custom-list-btn"
                  type="button"
                  onClick={handleCreateNewListModal}
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Create new list"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-full flex justify-center py-1">
                <button
                  type="button"
                  onClick={handleCreateNewListModal}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Create new list"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Custom Lists Items */}
            <div className="space-y-0.5">
              {customLists.map((list) => {
                const IconComponent = getListIcon(list.icon);
                const colorObj = getListColor(list.color);
                const isActive = activeFilter === list.id;
                const count = counts.listCounts[list.id] || 0;
                const isMenuOpen = activeMenuId === list.id;

                return (
                  <div key={list.id} className="relative group">
                    <button
                      id={`nav-list-${list.id}`}
                      type="button"
                      onClick={() => handleSelectFilter(list.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                        ${isActive ? colorObj.bgActive : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'}
                      `}
                      title={list.name}
                    >
                      <IconComponent
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? colorObj.textColor : colorObj.textColor
                        }`}
                      />

                      {(isOpen || isMobile) && (
                        <div className="flex-1 flex items-center justify-between min-w-0 pr-6">
                          <span className="truncate">{list.name}</span>
                          {count > 0 && (
                            <span
                              className={`
                                text-xs font-semibold px-2 py-0.5 rounded-full ml-2 tabular-nums
                                ${isActive ? 'bg-white/80 shadow-xs' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}
                              `}
                            >
                              {count}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Context Action Menu Button (hover on desktop or open state) */}
                    {(isOpen || isMobile) && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : list.id);
                          }}
                          className={`
                            p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-opacity
                            ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                          `}
                          title="List options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 space-y-0.5 text-xs animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleEditListModal(list, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                            >
                              <Edit2 className="w-3 h-3 text-slate-400" />
                              <span>Edit List</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteList(list.id, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span>Delete List</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Inline Quick Add or "+ New List" Button */}
              {(isOpen || isMobile) && (
                isInlineAdding ? (
                  <form onSubmit={handleInlineAddSubmit} className="px-2 pt-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-blue-400 rounded-lg">
                      <ListIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={inlineListName}
                        onChange={(e) => setInlineListName(e.target.value)}
                        onBlur={() => {
                          if (!inlineListName.trim()) setIsInlineAdding(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setIsInlineAdding(false);
                        }}
                        placeholder="List name"
                        className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800"
                      />
                    </div>
                  </form>
                ) : (
                  <button
                    id="sidebar-inline-new-list-btn"
                    type="button"
                    onClick={() => setIsInlineAdding(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50/70 rounded-lg transition-colors text-left mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New list</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Running Stopwatch Card or Overall Stats & MCP Server Button */}
        {(isOpen || isMobile) ? (
          <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0 space-y-2">
            {runningTask ? (
              <div
                id="active-timer-widget"
                onClick={() => setSelectedTaskId(runningTask.id)}
                className="p-3 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5 opacity-90">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                    Live Timer Running
                  </span>
                  <span className="font-mono font-bold tracking-wider">
                    {formatDuration(runningTask.timeTracking?.durationSeconds || 0)}
                  </span>
                </div>
                <p className="text-xs font-medium truncate mb-2 text-blue-100">{runningTask.title}</p>
                <div className="flex items-center justify-between pt-1 border-t border-blue-500/40">
                  <span className="text-[11px] text-blue-200">Tap to inspect</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      pauseTimer(runningTask.id);
                    }}
                    className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Pause Timer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Total Logged Time:
                </span>
                <span className="font-mono font-semibold text-slate-700">
                  {formatDuration(totalDurationAll, true)}
                </span>
              </div>
            )}

            {/* Database Pluggable Engine Switcher button */}
            <button
              id="database-hub-button"
              type="button"
              onClick={() => setIsDbOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 transition-all shadow-2xs group"
              title="Configure & Switch Pluggable Database Backend"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Database className="w-3 h-3" />
                </div>
                <span>Database & SQL</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                SQL / NoSQL
              </span>
            </button>

            {/* Installer & In-Place Upgrader button */}
            <button
              id="installer-hub-button"
              type="button"
              onClick={() => setIsInstallerOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-purple-700 transition-all shadow-2xs group"
              title="Application Installer, Setup Wizard & In-Place Upgrades"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-3 h-3" />
                </div>
                <span>Installer & Upgrades</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                Setup
              </span>
            </button>

            {/* Cross-Platform Executables / Portability button */}
            <button
              id="portability-hub-button"
              type="button"
              onClick={() => setIsPortabilityOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-all shadow-2xs group"
              title="Build Native Executables for Windows, Linux, macOS, Android, iOS"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Package className="w-3 h-3" />
                </div>
                <span>Portability & Binaries</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                .EXE / APK
              </span>
            </button>

            {/* MCP Model Context Protocol Hub button */}
            <button
              id="mcp-hub-button"
              type="button"
              onClick={() => setIsMcpOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-all shadow-2xs group"
              title="Open Model Context Protocol (MCP) Server Hub"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Cpu className="w-3 h-3" />
                </div>
                <span>MCP Server</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SSE
              </span>
            </button>

            {/* Test Suite & Quality Assurance Hub button */}
            <button
              id="test-runner-hub-button"
              type="button"
              onClick={() => setIsTestRunnerOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-teal-700 transition-all shadow-2xs group"
              title="Run Automated Tests, Verify Migrations & Prevent Regressions"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <FlaskConical className="w-3 h-3" />
                </div>
                <span>Test & QA Hub</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                49 Tests
              </span>
            </button>

            {/* Documentation, Architecture & User Guide button */}
            <button
              id="docs-guide-hub-button"
              type="button"
              onClick={() => setIsDocsOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-all shadow-2xs group"
              title="Architecture Specifications, Setup Guides, User Manuals & Release Notes"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-3 h-3" />
                </div>
                <span>Docs & Guides</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                Insider
              </span>
            </button>

            {/* Keyboard Shortcuts Cheatsheet button */}
            {onOpenShortcuts && (
              <button
                id="keyboard-shortcuts-hub-button"
                type="button"
                onClick={onOpenShortcuts}
                className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 transition-all shadow-2xs group"
                title="Keyboard Shortcuts & Hotkey Cheatsheet (?)"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-slate-800 text-white flex items-center justify-center shadow-xs">
                    <Keyboard className="w-3 h-3" />
                  </div>
                  <span>Shortcuts</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  ?
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-2 border-t border-slate-100 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDbOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Database Engine"
            >
              <Database className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsInstallerOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
              title="Installer & Upgrader"
            >
              <Wrench className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsPortabilityOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Portability & Binaries"
            >
              <Package className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsMcpOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Open MCP Server"
            >
              <Cpu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsTestRunnerOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              title="Test & QA Hub"
            >
              <FlaskConical className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsDocsOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Docs & Insider Guides"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Custom List Create/Edit Modal */}
      <CustomListModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingList(null);
        }}
        initialList={editingList}
        onSave={(name, icon, color) => {
          if (editingList) {
            updateCustomList(editingList.id, { name, icon, color });
          } else {
            const created = createCustomList(name, icon, color);
            setActiveFilter(created.id);
          }
        }}
        onDelete={(id) => deleteCustomList(id)}
      />

      {/* MCP Connection & Tool Tester Modal */}
      <McpModal isOpen={isMcpOpen} onClose={() => setIsMcpOpen(false)} />

      {/* Pluggable Database Management Modal */}
      <DatabaseModal isOpen={isDbOpen} onClose={() => setIsDbOpen(false)} />

      {/* Application Installer & In-Place Upgrader Modal */}
      <InstallerModal isOpen={isInstallerOpen} onClose={() => setIsInstallerOpen(false)} />

      {/* Multi-Platform Executables / Portability Modal */}
      <PortabilityModal isOpen={isPortabilityOpen} onClose={() => setIsPortabilityOpen(false)} />

      {/* Automated Test Suite & QA Hub Modal */}
      <TestRunnerModal isOpen={isTestRunnerOpen} onClose={() => setIsTestRunnerOpen(false)} />

      {/* Insider Documentation & Guides Modal */}
      <DocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </>
  );
};
