import React, { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  Cpu,
  Copy,
  Check,
  Play,
  Server,
  BookOpen,
  Sparkles,
  RefreshCw,
  Code2,
  Layers,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';

interface McpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface McpInfo {
  name: string;
  version: string;
  description: string;
  endpoints: {
    sse: string;
    messages: string;
    restTools: string;
  };
  clientConfigs: {
    claudeDesktop: {
      mcpServers: Record<string, unknown>;
    };
    cursorOrWindsurf: {
      name: string;
      type: string;
      url: string;
    };
  };
  toolsAvailable: string[];
  resourcesAvailable: string[];
  promptsAvailable: string[];
}

export const McpModal: React.FC<McpModalProps> = ({ isOpen, onClose }) => {
  const { tasks, customLists } = useTasks();
  const [activeTab, setActiveTab] = useState<'connect' | 'tester' | 'tools' | 'resources'>('connect');
  const [mcpInfo, setMcpInfo] = useState<McpInfo | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(true);

  // Tool tester state
  const [selectedTool, setSelectedTool] = useState<string>('list_tasks');
  const [testParams, setTestParams] = useState<string>('{\n  "status": "all"\n}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch MCP server info on mount
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/mcp/info')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch info');
        return res.json();
      })
      .then((data: McpInfo) => {
        setMcpInfo(data);
        setServerOnline(true);
      })
      .catch(() => {
        const origin = window.location.origin;
        setMcpInfo({
          name: 'KriyaMCP',
          version: '1.3.0',
          description: 'Model Context Protocol (MCP) Server for Kriya Task & Time Engine',
          endpoints: {
            sse: `${origin}/sse`,
            messages: `${origin}/messages`,
            restTools: `${origin}/api/mcp/call`,
          },
          clientConfigs: {
            claudeDesktop: {
              mcpServers: {
                kriya: {
                  command: 'npx',
                  args: ['-y', '@modelcontextprotocol/inspector', `${origin}/sse`],
                },
              },
            },
            cursorOrWindsurf: {
              name: 'kriya',
              type: 'sse',
              url: `${origin}/sse`,
            },
          },
          toolsAvailable: [
            'list_tasks',
            'get_task',
            'create_task',
            'update_task',
            'delete_task',
            'toggle_task_complete',
            'add_subtask',
            'toggle_subtask',
            'start_stopwatch',
            'pause_stopwatch',
            'list_custom_lists',
            'create_custom_list',
            'delete_custom_list',
            'get_task_analytics',
          ],
          resourcesAvailable: ['tasks://all', 'tasks://lists', 'tasks://stats'],
          promptsAvailable: ['prioritize_day', 'daily_standup'],
        });
      });
  }, [isOpen]);

  // Sync state with backend whenever tester opens or runs
  const handleSyncToBackend = async () => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, lists: customLists }),
      });
    } catch {
      // ignore
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExecuteTool = async () => {
    setIsExecuting(true);
    setTestResult(null);

    // Sync latest tasks before running tool
    await handleSyncToBackend();

    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(testParams);
      } catch {
        setTestResult(JSON.stringify({ error: 'Invalid JSON in parameter input' }, null, 2));
        setIsExecuting(false);
        return;
      }

      const res = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: selectedTool,
          params: parsedParams,
        }),
      });

      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult(JSON.stringify({ error: msg }, null, 2));
    } finally {
      setIsExecuting(false);
    }
  };

  // Change preset parameter template when changing selected tool
  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    switch (toolName) {
      case 'manage_tasks':
        setTestParams(
          '{\n  "action": "list",\n  "status": "all"\n}'
        );
        break;
      case 'manage_subtasks':
        setTestParams(
          `{\n  "action": "list",\n  "taskId": "${tasks[0]?.id || 'task-101'}"\n}`
        );
        break;
      case 'manage_time_tracking':
        setTestParams(
          '{\n  "action": "status"\n}'
        );
        break;
      case 'manage_lists':
        setTestParams(
          '{\n  "action": "list"\n}'
        );
        break;
      default:
        setTestParams('{\n  "action": "list"\n}');
    }
  };

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const sseUrl = mcpInfo?.endpoints?.sse || `${currentHost}/sse`;

  const claudeConfigJson = JSON.stringify(
    {
      mcpServers: {
        'todo-tracker': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/inspector', sseUrl],
        },
      },
    },
    null,
    2
  );

  const cursorConfigJson = JSON.stringify(
    {
      mcpServers: {
        'todo-tracker': {
          url: sseUrl,
          type: 'sse',
        },
      },
    },
    null,
    2
  );

  const pythonSnippet = `import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    async with sse_client("${sseUrl}") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List all tasks
            tasks_result = await session.call_tool("list_tasks", arguments={"status": "pending"})
            print(tasks_result)

asyncio.run(main())`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Model Context Protocol (MCP) Server</h3>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SSE Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connect Claude Desktop, Cursor, AI Agents, or custom LLMs to inspect & manage tasks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncToBackend}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Sync current tasks to MCP server"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync State</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'connect'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Connect & Configs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'tester'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Tool Tester & Console</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'tools'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Tool Catalog ({mcpInfo?.toolsAvailable?.length || 14})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'resources'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Resources & Prompts</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: CONNECT & CLIENT CONFIGS */}
          {activeTab === 'connect' && (
            <div className="space-y-6">
              {/* Endpoint banner */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono text-indigo-300 uppercase tracking-wider">
                      MCP SSE Endpoint URL
                    </span>
                    <p className="font-mono text-sm font-semibold text-emerald-400 select-all break-all">{sseUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(sseUrl, 'endpoint')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                  >
                    {copiedKey === 'endpoint' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'endpoint' ? 'Copied' : 'Copy SSE URL'}</span>
                  </button>
                </div>
              </div>

              {/* Client Setup Guides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claude Desktop Config */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                        C
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Claude Desktop Config</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(claudeConfigJson, 'claude')}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {copiedKey === 'claude' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'claude' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Paste into <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">claude_desktop_config.json</code>
                  </p>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-36">
                    {claudeConfigJson}
                  </pre>
                </div>

                {/* Cursor & Windsurf Config */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        ⚡
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Cursor / Windsurf Setup</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(cursorConfigJson, 'cursor')}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {copiedKey === 'cursor' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'cursor' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Add SSE MCP server directly in Settings &gt; Features &gt; MCP</p>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-36">
                    {cursorConfigJson}
                  </pre>
                </div>
              </div>

              {/* Python / Custom Agent Code */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800">Python MCP Client Code</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(pythonSnippet, 'python')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'python' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-40">
                  {pythonSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: TOOL TESTER & CONSOLE */}
          {activeTab === 'tester' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Form: Select Tool and Parameters */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select MCP Tool to Execute
                  </label>
                  <select
                    value={selectedTool}
                    onChange={(e) => handleToolSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="list_tasks">list_tasks (Query tasks with filters)</option>
                    <option value="get_task">get_task (Retrieve task details)</option>
                    <option value="create_task">create_task (Create new task)</option>
                    <option value="update_task">update_task (Update task properties)</option>
                    <option value="toggle_task_complete">toggle_task_complete (Toggle completed)</option>
                    <option value="add_subtask">add_subtask (Add step to task)</option>
                    <option value="start_stopwatch">start_stopwatch (Start timer)</option>
                    <option value="pause_stopwatch">pause_stopwatch (Pause timer)</option>
                    <option value="list_custom_lists">list_custom_lists (Get categories)</option>
                    <option value="create_custom_list">create_custom_list (Create list category)</option>
                    <option value="get_task_analytics">get_task_analytics (Productivity stats)</option>
                    <option value="delete_task">delete_task (Permanently delete)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Arguments (JSON)
                    </label>
                    <span className="text-[10px] text-slate-400">Validated against Zod schema</span>
                  </div>
                  <textarea
                    rows={7}
                    value={testParams}
                    onChange={(e) => setTestParams(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExecuteTool}
                  disabled={isExecuting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors"
                >
                  {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isExecuting ? 'Calling MCP Tool...' : 'Execute Tool Call'}</span>
                </button>
              </div>

              {/* Right: Live Output Console */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Live JSON-RPC Result
                    </span>
                  </div>
                  {testResult && (
                    <button
                      type="button"
                      onClick={() => handleCopy(testResult, 'result')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {copiedKey === 'result' ? 'Copied' : 'Copy Output'}
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-[220px] p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-y-auto border border-slate-800">
                  {testResult ? (
                    <pre className="text-emerald-400 whitespace-pre-wrap">{testResult}</pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                      <Terminal className="w-8 h-8 mb-2 opacity-40" />
                      <p>Click &quot;Execute Tool Call&quot; to test this tool against the live task database.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TOOLS CATALOG */}
          {activeTab === 'tools' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                The MCP server exposes 4 high-leverage tools with unified action parameters, making LLM tool selection fast, robust, and cost-efficient.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: 'manage_tasks',
                    desc: 'Full lifecycle manager for tasks: query/list, retrieve, create, update properties, toggle completion, delete, and view analytics.',
                    actions: 'list | get | create | update | toggle_complete | delete | analytics',
                    args: 'action (req), taskId, title, status, listId, isImportant, inMyDay, dueDate, reminder, repeatRule, notes, subtasks, searchQuery',
                  },
                  {
                    name: 'manage_subtasks',
                    desc: 'Manage step-by-step checklists inside any task: list existing checklist items, add new steps, or toggle completion state.',
                    actions: 'list | add | toggle',
                    args: 'action (req), taskId (req), title (for add), subtaskId (for toggle)',
                  },
                  {
                    name: 'manage_time_tracking',
                    desc: 'Control real-time focus stopwatch and timer sessions: start timer on task, pause active timer, or inspect global timer status.',
                    actions: 'start | pause | status',
                    args: 'action (req), taskId (for start/pause)',
                  },
                  {
                    name: 'manage_lists',
                    desc: 'Manage custom categories/folders: list all categories with task counts, create customized lists with icons and colors, update, or delete.',
                    actions: 'list | create | update | delete',
                    args: 'action (req), listId (for update/delete), name, icon, color',
                  },
                ].map((tool) => (
                  <div key={tool.name} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-600">{tool.name}</span>
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                        Unified Tool
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{tool.desc}</p>
                    <div className="p-2 bg-slate-50 rounded-lg space-y-1 text-[11px] font-mono border border-slate-100">
                      <div>
                        <span className="text-slate-500 font-semibold">Actions: </span>
                        <span className="text-emerald-600 font-medium">{tool.actions}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Params: </span>
                        <span className="text-slate-600">{tool.args}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RESOURCES & PROMPTS */}
          {activeTab === 'resources' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">MCP Resources</h4>
                <div className="space-y-2">
                  {[
                    { uri: 'tasks://all', desc: 'Direct JSON read access to all current tasks and checklist steps' },
                    { uri: 'tasks://lists', desc: 'Read access to all custom list categories and their color configs' },
                    { uri: 'tasks://stats', desc: 'Productivity statistics, total time logged, and completion percentages' },
                  ].map((res) => (
                    <div key={res.uri} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {res.uri}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{res.desc}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Resource</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">MCP Prompts</h4>
                <div className="space-y-2">
                  {[
                    {
                      name: 'prioritize_day',
                      desc: 'Generates an optimized daily schedule and time-block plan based on deadlines and importance',
                    },
                    {
                      name: 'daily_standup',
                      desc: 'Creates a concise standup report covering completed achievements and in-progress tasks',
                    },
                  ].map((p) => (
                    <div key={p.name} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-mono text-xs font-bold text-slate-800">{p.name}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Prompt</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>MCP SDK v1.30 • JSON-RPC 2.0 • SSE Transport</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
