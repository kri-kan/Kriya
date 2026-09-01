import React, { useState, useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { useTasks } from '../context/TaskContext';
import { useHotkeys, useKeySequence, isInputElement } from './useHotkeys';
import { ViewFilter } from '../types';

export interface ShortcutToast {
  id: number;
  message: string;
  keyBadge?: string;
}

export function useGlobalShortcuts(options: {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void);
  onOpenShortcutsModal: () => void;
  isShortcutsModalOpen?: boolean;
}) {
  const {
    activeFilter,
    setActiveFilter,
    customLists,
    selectedTaskId,
    setSelectedTaskId,
    toggleTaskComplete,
    toggleTaskImportant,
    toggleInMyDay,
    deleteTask,
  } = useTasks();

  const { sidebarOpen, setSidebarOpen, onOpenShortcutsModal, isShortcutsModalOpen } = options;
  const [shortcutToast, setShortcutToast] = useState<ShortcutToast | null>(null);

  const showToast = useCallback((message: string, keyBadge?: string) => {
    const id = Date.now();
    setShortcutToast({ id, message, keyBadge });
    setTimeout(() => {
      setShortcutToast((current) => (current?.id === id ? null : current));
    }, 1400);
  }, []);

  // Ordered list of all available views for cycling
  const allViewFilters: ViewFilter[] = useMemo(() => {
    const systemFilters: ViewFilter[] = [
      'my_day',
      'important',
      'planned',
      'all',
      'completed',
      'time_tracking',
    ];
    const customListIds = customLists.map((l) => l.id);
    return [...systemFilters, ...customListIds];
  }, [customLists]);

  const getViewTitle = useCallback(
    (filter: ViewFilter): string => {
      switch (filter) {
        case 'my_day':
          return 'My Day';
        case 'important':
          return 'Important';
        case 'planned':
          return 'Planned';
        case 'all':
          return 'All Tasks';
        case 'completed':
          return 'Completed';
        case 'time_tracking':
          return 'Time Logged';
        default: {
          const list = customLists.find((l) => l.id === filter);
          return list ? list.name : 'List';
        }
      }
    },
    [customLists]
  );

  // Helper to focus quick add
  const focusQuickAdd = useCallback(() => {
    const input = document.getElementById('quick-add-input') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Quick Add Ready', 'N');
    }
  }, [showToast]);

  // Helper to focus search
  const focusSearch = useCallback(() => {
    const searchInput = document.getElementById('sidebar-search-input') as HTMLInputElement | null;
    if (searchInput) {
      if (!sidebarOpen) {
        setSidebarOpen(true);
      }
      setTimeout(() => {
        searchInput.focus();
        searchInput.select();
      }, 50);
      showToast('Search Tasks', '⌘K');
    }
  }, [sidebarOpen, setSidebarOpen, showToast]);

  // Helper to cycle views
  const cycleView = useCallback(
    (direction: 'next' | 'prev') => {
      const currentIndex = allViewFilters.indexOf(activeFilter);
      let nextIndex = 0;
      if (currentIndex === -1) {
        nextIndex = 0;
      } else if (direction === 'next') {
        nextIndex = (currentIndex + 1) % allViewFilters.length;
      } else {
        nextIndex = (currentIndex - 1 + allViewFilters.length) % allViewFilters.length;
      }
      const nextFilter = allViewFilters[nextIndex];
      setActiveFilter(nextFilter);
      showToast(`Switched to ${getViewTitle(nextFilter)}`, direction === 'next' ? 'Alt+↓' : 'Alt+↑');
    },
    [allViewFilters, activeFilter, setActiveFilter, getViewTitle, showToast]
  );

  // Switch to specific index (0-based)
  const switchToIndex = useCallback(
    (index: number, keyLabel: string) => {
      if (index >= 0 && index < allViewFilters.length) {
        const targetFilter = allViewFilters[index];
        setActiveFilter(targetFilter);
        showToast(`Switched to ${getViewTitle(targetFilter)}`, keyLabel);
      }
    },
    [allViewFilters, setActiveFilter, getViewTitle, showToast]
  );

  // 1. QUICK CREATE TASK SHORTCUTS (N, Alt+N, C, /)
  useHotkeys('n', () => focusQuickAdd(), { description: 'Quick Add Task', category: 'Task Creation' });
  useHotkeys('c', () => focusQuickAdd(), { description: 'Create Task', category: 'Task Creation' });
  useHotkeys('alt+n', () => focusQuickAdd(), { enableOnInputs: true, description: 'Quick Add Task' });
  useHotkeys('/', () => focusQuickAdd(), { description: 'Quick Add Task' });

  // 2. TOGGLE SIDEBAR SHORTCUTS (Ctrl+B, Cmd+B, [, Alt+S)
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      showToast(next ? 'Sidebar Expanded' : 'Sidebar Collapsed', '⌘B');
      return next;
    });
  }, [setSidebarOpen, showToast]);

  useHotkeys('mod+b', toggleSidebar, { enableOnInputs: true, description: 'Toggle Sidebar' });
  useHotkeys('alt+s', toggleSidebar, { enableOnInputs: true, description: 'Toggle Sidebar' });
  useHotkeys('[', toggleSidebar, { description: 'Toggle Sidebar' });

  // 3. SWITCH BETWEEN LISTS (1-6, Alt+1..9)
  // Direct single-key switches when not typing in an input
  useHotkeys('1', () => switchToIndex(0, '1'), { description: 'My Day' });
  useHotkeys('2', () => switchToIndex(1, '2'), { description: 'Important' });
  useHotkeys('3', () => switchToIndex(2, '3'), { description: 'Planned' });
  useHotkeys('4', () => switchToIndex(3, '4'), { description: 'All Tasks' });
  useHotkeys('5', () => switchToIndex(4, '5'), { description: 'Completed' });
  useHotkeys('6', () => switchToIndex(5, '6'), { description: 'Time Logged' });
  useHotkeys('7', () => switchToIndex(6, '7'), { description: 'Custom List 1' });
  useHotkeys('8', () => switchToIndex(7, '8'), { description: 'Custom List 2' });
  useHotkeys('9', () => switchToIndex(8, '9'), { description: 'Custom List 3' });

  // Alt + number modifiers (work everywhere including inside inputs)
  useHotkeys('alt+1', () => switchToIndex(0, 'Alt+1'), { enableOnInputs: true });
  useHotkeys('alt+2', () => switchToIndex(1, 'Alt+2'), { enableOnInputs: true });
  useHotkeys('alt+3', () => switchToIndex(2, 'Alt+3'), { enableOnInputs: true });
  useHotkeys('alt+4', () => switchToIndex(3, 'Alt+4'), { enableOnInputs: true });
  useHotkeys('alt+5', () => switchToIndex(4, 'Alt+5'), { enableOnInputs: true });
  useHotkeys('alt+6', () => switchToIndex(5, 'Alt+6'), { enableOnInputs: true });
  useHotkeys('alt+7', () => switchToIndex(6, 'Alt+7'), { enableOnInputs: true });
  useHotkeys('alt+8', () => switchToIndex(7, 'Alt+8'), { enableOnInputs: true });
  useHotkeys('alt+9', () => switchToIndex(8, 'Alt+9'), { enableOnInputs: true });

  // Cycle lists: Alt+Down / Alt+Up and J / K
  useHotkeys('alt+arrowdown', () => cycleView('next'), { enableOnInputs: true });
  useHotkeys('alt+arrowup', () => cycleView('prev'), { enableOnInputs: true });
  useHotkeys('j', () => cycleView('next'), { description: 'Next List' });
  useHotkeys('k', () => cycleView('prev'), { description: 'Previous List' });

  // Two-key Go-to sequences (G then D/I/P/A/C/T)
  useKeySequence(['g', 'd'], () => switchToIndex(0, 'G -> D'));
  useKeySequence(['g', 'i'], () => switchToIndex(1, 'G -> I'));
  useKeySequence(['g', 'p'], () => switchToIndex(2, 'G -> P'));
  useKeySequence(['g', 'a'], () => switchToIndex(3, 'G -> A'));
  useKeySequence(['g', 'c'], () => switchToIndex(4, 'G -> C'));
  useKeySequence(['g', 't'], () => switchToIndex(5, 'G -> T'));

  // 4. FOCUS SEARCH (Ctrl+K, Cmd+K, Ctrl+F)
  useHotkeys(['mod+k', 'mod+f'], focusSearch, { enableOnInputs: true, description: 'Search Tasks' });

  // 5. CHEATSHEET MODAL (? or Shift+? or Ctrl+/)
  useHotkeys(['?', 'shift+?'], onOpenShortcutsModal, { description: 'Shortcuts Cheatsheet' });
  useHotkeys('mod+/', onOpenShortcutsModal, { enableOnInputs: true, description: 'Shortcuts Cheatsheet' });

  // 6. ESCAPE KEY (closes task detail or blurs focused input)
  useHotkeys(
    'escape',
    () => {
      if (isShortcutsModalOpen) {
        return; // Modal handles its own escape
      }
      if (document.activeElement && isInputElement(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
        return;
      }
      if (selectedTaskId) {
        setSelectedTaskId(null);
        showToast('Closed Task Detail', 'Esc');
      }
    },
    { enableOnInputs: true }
  );

  // 7. TASK ACTIONS WHEN SELECTED (Space/X to toggle, S/I for Star, M for My Day, Del/Backspace)
  useHotkeys('space', () => {
    if (selectedTaskId) {
      toggleTaskComplete(selectedTaskId);
      showToast('Toggled Task Completion', 'Space');
    }
  });

  useHotkeys('x', () => {
    if (selectedTaskId) {
      toggleTaskComplete(selectedTaskId);
      showToast('Toggled Task Completion', 'X');
    }
  });

  useHotkeys('s', () => {
    if (selectedTaskId) {
      toggleTaskImportant(selectedTaskId);
      showToast('Toggled Star / Important', 'S');
    }
  });

  useHotkeys('m', () => {
    if (selectedTaskId) {
      toggleInMyDay(selectedTaskId);
      showToast('Toggled My Day', 'M');
    }
  });

  useHotkeys('delete', () => {
    if (selectedTaskId) {
      deleteTask(selectedTaskId);
      setSelectedTaskId(null);
      showToast('Deleted Task', 'Delete');
    }
  });

  return {
    shortcutToast,
    focusQuickAdd,
    focusSearch,
    toggleSidebar,
    cycleView,
  };
}
