import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Layers,
  Sparkles,
  Terminal,
  FileText,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  Database,
  Cpu,
  ChevronRight,
} from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DocTab = 'user-guide' | 'architecture' | 'setup' | 'contributing' | 'release-notes';

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<DocTab>('user-guide');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tabs: Array<{ id: DocTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
    { id: 'user-guide', label: 'User & Power Guide', icon: BookOpen },
    { id: 'architecture', label: 'Architecture & Engine', icon: Layers },
    { id: 'setup', label: 'Setup & Deployment', icon: Terminal },
    { id: 'contributing', label: 'Contributing & Testing', icon: ShieldCheck },
    { id: 'release-notes', label: 'Insider Release Notes', icon: Sparkles, badge: 'v1.3.0' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="docs-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Kriya Documentation & Guides</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Insider Release v1.3.0
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Official architecture specifications, user manuals, setup guides, and development references
              </p>
            </div>
          </div>
          <button
            id="docs-modal-close-button"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body with Sidebar Navigation */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 border-r border-slate-100 bg-slate-50/60 p-4 flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
              Documentation Hub
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`doc-tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="mt-auto pt-4 border-t border-slate-200/70">
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 text-indigo-900 text-xs">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>CI/CD Quality Gate</span>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  47 automated regression tests and 5 SQL migration checksums verified for release stability.
                </p>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white">
            {activeTab === 'user-guide' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">User & Power-User Guide</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Complete reference for daily workflows, smart scheduling, time tracking, and data export.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">1</span>
                      Smart Scheduling & Recurrence
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Set due dates with quick presets (<em>Today</em>, <em>Tomorrow</em>, <em>Next Week</em>) or configure recurring rules (Daily, Weekdays, Weekly, Monthly, Yearly).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                      Live Stopwatch & Pomodoro
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Start and pause live time tracking directly on any task row. Duration is tracked to the second and aggregated across sessions.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">3</span>
                      Eisenhower Matrix View
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Tasks are categorized into 4 quadrants: <em>Do First</em> (Urgent + Important), <em>Schedule</em> (Important), <em>Delegate</em> (Urgent), and <em>Backlog</em>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">4</span>
                      RFC-4180 CSV Export
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Export your entire database to formatted CSV with escaped text, subtask metrics, list names, and formatted stopwatch durations.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Quick Start Terminal Commands</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('npm install && npm run dev', 'user-quick')}
                      className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                    >
                      {copiedKey === 'user-quick' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'user-quick' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-emerald-400 bg-slate-950/70 p-2.5 rounded-lg overflow-x-auto">
                    git clone https://github.com/kri-kan/Kriya.git && cd Kriya && npm install && npm run dev
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'architecture' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">System Architecture Specification</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Multi-database factory, sequential migrations, hot-swapping, and Model Context Protocol (MCP).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    Pluggable Database Adapters & Dialects
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kriya abstracts all persistent storage behind a unified contract (<code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">DatabaseAdapter</code>). Supported engines include:
                  </p>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc pl-5">
                    <li><strong>SQLite 3</strong>: Embedded file/memory store with WAL journal mode.</li>
                    <li><strong>PostgreSQL</strong>: Native <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">TIMESTAMPTZ</code>, JSONB, and parameterized indexing.</li>
                    <li><strong>MySQL 8 & MSSQL</strong>: InnoDB constraints and T-SQL dialect transformations.</li>
                    <li><strong>MongoDB & Firestore</strong>: Document schema validation with backwards compatibility.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    Model Context Protocol (MCP) Server
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The backend embeds an MCP server at <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">/api/mcp/sse</code> exposing tools (<code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">list_tasks</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">create_task</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">toggle_task</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">filter_tasks</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">time_summary</code>) for LLM agents.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'setup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Developer & Administrator Setup Guide</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Environment configuration, Docker containers, and production deployment scripts.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Run PostgreSQL in Docker</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            'docker run --name kriya-postgres -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=kriya -p 5432:5432 -d postgres:16-alpine',
                            'docker-pg'
                          )
                        }
                        className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                      >
                        {copiedKey === 'docker-pg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === 'docker-pg' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="font-mono text-xs text-emerald-400 bg-slate-950/70 p-2.5 rounded-lg overflow-x-auto">
                      docker run --name kriya-postgres -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=kriya -p 5432:5432 -d postgres:16-alpine
                    </pre>
                  </div>

                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Build Standalone Installers & Binaries</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('npm run build:installer', 'build-inst')}
                        className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                      >
                        {copiedKey === 'build-inst' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === 'build-inst' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="font-mono text-xs text-emerald-400 bg-slate-950/70 p-2.5 rounded-lg overflow-x-auto">
                      npm run build:installer
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contributing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Contributing & Test Suite Development</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Testing guidelines, pull request checklist, and schema evolution rules.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <h4 className="font-bold text-sm text-slate-900">Running the 11 Regression Test Suites</h4>
                  <p className="text-xs text-slate-600">
                    Always verify your changes against the full test matrix before opening a pull request:
                  </p>
                  <pre className="font-mono text-xs text-indigo-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    npm test && npm run verify
                  </pre>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <h4 className="font-bold text-sm text-slate-900">Adding a New SQL Migration</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Add new sequential migration steps to <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">/server/db/schema/sqlMigrationsEngine.ts</code>. Ensure that up/down DDL queries are provided for SQLite, PostgreSQL, MySQL, and MSSQL.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'release-notes' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">Insider Release Notes</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      v1.3.0-insider
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Detailed summary of verified features, architecture upgrades, and stability enhancements.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 flex items-start gap-3">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-purple-950">Pluggable SQL & NoSQL Architecture</h5>
                      <p className="text-xs text-purple-800 mt-0.5">
                        Zero-downtime hot-swapping across SQLite, PostgreSQL, MySQL, MSSQL, MongoDB, Firestore, and Memory.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-blue-950">Sequential Evolution & SHA-256 Checksums</h5>
                      <p className="text-xs text-blue-800 mt-0.5">
                        5 automated SQL migrations with tamper-proof checksum verification and code-level NoSQL auto-upgrading.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-emerald-950">47 Passing Regression Tests (11 Suites)</h5>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Full coverage across Core Lifecycles, Adapters, Migrations, NoSQL Schema, Installer, Portability, MCP, CSV, Time, Security, and API services.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700">Kriya v1.3.0-insider</span>
            <span>•</span>
            <span>Production Ready</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
