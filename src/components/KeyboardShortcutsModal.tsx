import React, { useState } from 'react';
import {
  Keyboard,
  X,
  Plus,
  PanelLeft,
  Search,
  List,
  CheckCircle,
  Star,
  Calendar,
  Clock,
  Command,
  HelpCircle,
  ArrowUpDown,
  CornerDownLeft,
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Creation & Focus' | 'Navigation & Views' | 'Sidebar & Layout' | 'Task Actions' | 'General';
}

const SHORTCUT_REGISTRY: ShortcutItem[] = [
  // Creation & Focus
  {
    keys: ['N', 'Alt + N', 'C'],
    description: 'Quickly create a new task (focus Quick Add)',
    category: 'Creation & Focus',
  },
  {
    keys: ['/'],
    description: 'Focus Quick Add or Search input',
    category: 'Creation & Focus',
  },
  {
    keys: ['Enter'],
    description: 'Submit new task or confirm action',
    category: 'Creation & Focus',
  },
  {
    keys: ['Ctrl + K', '⌘ + K'],
    description: 'Focus Global Search in sidebar',
    category: 'Creation & Focus',
  },

  // Sidebar & Layout
  {
    keys: ['Ctrl + B', '⌘ + B'],
    description: 'Toggle sidebar open / collapsed',
    category: 'Sidebar & Layout',
  },
  {
    keys: ['['],
    description: 'Toggle sidebar view (single key)',
    category: 'Sidebar & Layout',
  },
  {
    keys: ['Alt + S'],
    description: 'Toggle sidebar state',
    category: 'Sidebar & Layout',
  },

  // Navigation & Views
  {
    keys: ['Alt + 1', '1'],
    description: 'Switch to My Day view',
    category: 'Navigation & Views',
  },
  {
    keys: ['Alt + 2', '2'],
    description: 'Switch to Important view',
    category: 'Navigation & Views',
  },
  {
    keys: ['Alt + 3', '3'],
    description: 'Switch to Planned view',
    category: 'Navigation & Views',
  },
  {
    keys: ['Alt + 4', '4'],
    description: 'Switch to All Tasks view',
    category: 'Navigation & Views',
  },
  {
    keys: ['Alt + 5', '5'],
    description: 'Switch to Completed view',
    category: 'Navigation & Views',
  },
  {
    keys: ['Alt + 6', '6'],
    description: 'Switch to Time Logged view',
    category: 'Navigation & Views',
  },
  {
    keys: ['Alt + 7...9'],
    description: 'Switch to Custom List 1, 2, 3...',
    category: 'Navigation & Views',
  },
  {
    keys: ['Alt + ↑', 'Alt + ↓'],
    description: 'Cycle to Previous / Next List',
    category: 'Navigation & Views',
  },
  {
    keys: ['J', 'K'],
    description: 'Navigate Next / Previous List (when not in input)',
    category: 'Navigation & Views',
  },
  {
    keys: ['G then D / I / P / A'],
    description: 'Go to (D)ay, (I)mportant, (P)lanned, (A)ll',
    category: 'Navigation & Views',
  },

  // Task Actions
  {
    keys: ['Space', 'X'],
    description: 'Toggle selected task completion',
    category: 'Task Actions',
  },
  {
    keys: ['S', 'I'],
    description: 'Toggle Star / Important on selected task',
    category: 'Task Actions',
  },
  {
    keys: ['M'],
    description: 'Add / Remove selected task from My Day',
    category: 'Task Actions',
  },
  {
    keys: ['Delete', 'Backspace'],
    description: 'Delete currently selected task',
    category: 'Task Actions',
  },

  // General
  {
    keys: ['Esc'],
    description: 'Close detail pane, close modal, or blur input',
    category: 'General',
  },
  {
    keys: ['?', 'Shift + ?', 'Ctrl + /'],
    description: 'Open this Keyboard Shortcuts cheatsheet',
    category: 'General',
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const categories = [
    'all',
    'Creation & Focus',
    'Sidebar & Layout',
    'Navigation & Views',
    'Task Actions',
    'General',
  ];

  const filteredShortcuts = SHORTCUT_REGISTRY.filter((s) => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchKey = s.keys.some((k) => k.toLowerCase().includes(q));
      const matchCat = s.category.toLowerCase().includes(q);
      if (!matchDesc && !matchKey && !matchCat) return false;
    }
    return true;
  });

  return (
    <div
      id="keyboard-shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="keyboard-shortcuts-modal-container"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Keyboard Shortcuts Manager
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                  Global Hotkeys
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Navigate, manage tasks, and toggle views without touching your mouse
              </p>
            </div>
          </div>
          <button
            id="close-shortcuts-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between bg-white">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcut (e.g., 'sidebar', 'create', '1')..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterCategory === cat
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'All Shortcuts' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto space-y-3 max-h-[55vh]">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Keyboard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No shortcuts matching "{search}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-200 transition-all"
                >
                  <span className="text-xs text-slate-700 font-medium pr-3 leading-snug">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-md shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-300 rounded">
              Esc
            </kbd>
            to close
          </span>
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            ProTip: Single-key shortcuts like <kbd className="px-1 py-0.2 bg-white border border-slate-300 rounded font-mono">1-6</kbd> & <kbd className="px-1 py-0.2 bg-white border border-slate-300 rounded font-mono">N</kbd> are active when no input is focused
          </span>
        </div>
      </div>
    </div>
  );
};
