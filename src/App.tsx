import React, { useState, useEffect } from 'react';
import { TaskProvider, useTasks } from './context/TaskContext';
import { Sidebar } from './components/Sidebar';
import { TaskStream } from './components/TaskStream';
import { TaskDetailView } from './components/TaskDetailView';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { Menu, Layers, Keyboard } from 'lucide-react';

function AppContent() {
  const { selectedTaskId, setSelectedTaskId } = useTasks();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const { shortcutToast } = useGlobalShortcuts({
    sidebarOpen,
    setSidebarOpen,
    onOpenShortcutsModal: () => setIsShortcutsOpen((prev) => !prev),
    isShortcutsModalOpen: isShortcutsOpen,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  const isDetailOpenOnMobileOrTablet = (isMobile || isTablet) && selectedTaskId !== null;

  return (
    <div id="todo-app-root" className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans relative">
      {/* Mobile Backdrop for Sidebar */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Main Task Stream (65% width on desktop when detail open, or flex-1) */}
        <main
          id="main-task-panel"
          className={`
            h-full flex flex-col min-w-0 transition-all duration-200
            ${isDesktop ? (selectedTaskId ? 'w-[65%]' : 'w-full') : 'w-full'}
          `}
        >
          {/* Top Mobile/Tablet Bar */}
          {!isDesktop && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm text-slate-800">Kriya</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(true)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>
          )}

          <TaskStream onOpenSidebar={() => setSidebarOpen(true)} />
        </main>

        {/* Desktop Side-by-Side Right Panel (35% width per spec) */}
        {isDesktop && (
          <aside
            id="desktop-task-detail-container"
            className={`
              h-full transition-all duration-200 shrink-0
              ${selectedTaskId ? 'w-[35%] min-w-[380px] max-w-[500px]' : 'w-0 overflow-hidden border-none'}
            `}
          >
            {selectedTaskId && (
              <TaskDetailView onClose={() => setSelectedTaskId(null)} />
            )}
          </aside>
        )}

        {/* Tablet View: Overlay Modal / Right-hand Drawer (40% width per spec) */}
        {isTablet && isDetailOpenOnMobileOrTablet && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs transition-opacity"
              onClick={() => setSelectedTaskId(null)}
            />
            <div className="relative w-[40%] min-w-[360px] max-w-[480px] h-full shadow-2xl z-10 bg-white">
              <TaskDetailView onClose={() => setSelectedTaskId(null)} />
            </div>
          </div>
        )}

        {/* Mobile View: Full-screen Slide-Over Panel (100% width per spec) */}
        {isMobile && isDetailOpenOnMobileOrTablet && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <TaskDetailView onClose={() => setSelectedTaskId(null)} />
          </div>
        )}
      </div>

      {/* Global Shortcut Heads-Up Display Toast */}
      {shortcutToast && (
        <div
          id="global-shortcut-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/90 text-white px-3.5 py-1.5 rounded-full shadow-xl text-xs backdrop-blur-xs border border-slate-700 pointer-events-none transition-all animate-bounce-short"
        >
          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">{shortcutToast.message}</span>
          {shortcutToast.keyBadge && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-blue-300 border border-slate-600 rounded">
              {shortcutToast.keyBadge}
            </kbd>
          )}
        </div>
      )}

      {/* Global Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}
