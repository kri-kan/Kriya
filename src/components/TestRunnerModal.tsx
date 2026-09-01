import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Download,
  Terminal,
  Layers,
  Database,
  Sliders,
  Package,
  Cpu,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestItemResult {
  title: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  assertions: number;
}

interface TestSuiteItem {
  name: string;
  category: string;
  description: string;
  tests: TestItemResult[];
  passed: boolean;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
}

interface TestSummary {
  timestamp: string;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  success: boolean;
  suites: TestSuiteItem[];
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen && !summary) {
      handleRunTests();
    }
  }, [isOpen]);

  const handleRunTests = async (category: string = selectedCategory) => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category === 'all' ? undefined : category,
          query: searchQuery.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        // Expand all suites by default
        const exp: Record<string, boolean> = {};
        data.summary.suites.forEach((s: TestSuiteItem) => {
          exp[s.name] = true;
        });
        setExpandedSuites(exp);
      }
    } catch (err) {
      console.error('Failed to run tests:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleSuite = (name: string) => {
    setExpandedSuites((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleExportReport = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const categories = [
    { id: 'all', label: 'All Test Suites', icon: FlaskConical },
    { id: 'core', label: 'Task Engine & Lifecycle', icon: Layers },
    { id: 'database', label: 'Pluggable Database Adapters', icon: Database },
    { id: 'migrations', label: 'SQL Evolutions (v1-v5)', icon: Terminal },
    { id: 'schema', label: 'NoSQL Code Schema (v2)', icon: ShieldCheck },
    { id: 'installer', label: 'Installer & In-Place Upgrades', icon: Sliders },
    { id: 'portability', label: 'Cross-Platform Portability', icon: Package },
    { id: 'mcp', label: 'Model Context Protocol (MCP)', icon: Cpu },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Automated Test Suite & Quality Gate</h2>
                <span className="text-[11px] font-mono bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full border border-teal-400/30">
                  Regression Shield Active
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Unit, integration, and migration test harness ensuring reliable zero-regression evolutions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunTests()}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run All Tests
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {summary && (
          <div
            className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 ${
              summary.success
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/90 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {summary.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )}
              <div>
                <div className="text-xs font-bold">
                  {summary.success
                    ? `ALL TEST SUITES PASSED (${summary.passedTests}/${summary.totalTests} Tests Green)`
                    : `REGRESSION DETECTED: ${summary.failedTests} FAILED TEST(S)`}
                </div>
                <div className="text-[11px] opacity-80">
                  Executed in {summary.totalDurationMs}ms • {summary.passedSuites}/{summary.totalSuites} Suites Passed • Checked at {new Date(summary.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportReport}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export Audit Report
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  handleRunTests(cat.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isRunning && !summary && (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-700">Executing automated test suites...</div>
            </div>
          )}

          {summary && (
            <div className="space-y-4">
              {summary.suites.map((suite) => {
                const isExpanded = expandedSuites[suite.name] !== false;
                return (
                  <div
                    key={suite.name}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Suite Header */}
                    <div
                      onClick={() => toggleSuite(suite.name)}
                      className="px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer transition-colors border-b border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{suite.name}</span>
                            <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                              {suite.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{suite.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {suite.totalDurationMs}ms
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            suite.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {suite.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {suite.passedCount}/{suite.tests.length} Passed
                        </span>
                      </div>
                    </div>

                    {/* Suite Tests List */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {suite.tests.map((t, idx) => (
                          <div
                            key={idx}
                            className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs ${
                              t.passed ? 'hover:bg-slate-50/50' : 'bg-rose-50/40'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {t.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                              )}
                              <div className="space-y-1">
                                <div className="font-medium text-slate-800">{t.title}</div>
                                {t.error && (
                                  <div className="p-2.5 bg-rose-950 text-rose-200 font-mono text-[11px] rounded-lg border border-rose-800">
                                    {t.error}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {t.assertions} assertions
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {t.durationMs}ms
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Build Command */}
        <div className="px-6 py-3 bg-slate-900 text-slate-300 text-xs flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 font-mono">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-400" />
            <span>CLI Test Runner: <code className="text-teal-300">npm test</code> or <code className="text-teal-300">npm run verify</code></span>
          </div>
          <span className="text-[11px] text-slate-400">
            Automated CI/CD Quality Gate Embedded
          </span>
        </div>
      </div>
    </div>
  );
};
