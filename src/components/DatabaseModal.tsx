import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Activity,
  Copy,
  Check,
  RefreshCw,
  ArrowRightLeft,
  Download,
  Terminal,
  Shield,
  Layers,
  Zap,
} from 'lucide-react';
import { DatabaseDriverType, DatabaseInfoResponse, DatabaseDriverMetadata, DatabaseConnectionStatus } from '../types';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dbInfo, setDbInfo] = useState<DatabaseInfoResponse | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DatabaseDriverType>('sqlite');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [schemaCode, setSchemaCode] = useState<string>('');
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'switch' | 'schema' | 'migrations' | 'nosql_schema' | 'export'>('switch');
  const [migrationsList, setMigrationsList] = useState<any[]>([]);
  const [migrationsLoading, setMigrationsLoading] = useState(false);
  const [migrationsVersion, setMigrationsVersion] = useState({ current: 4, latest: 5, pending: 1 });
  const [evolutionScript, setEvolutionScript] = useState('');
  const [noSqlInfo, setNoSqlInfo] = useState<any>(null);
  const [sampleNoSqlDoc, setSampleNoSqlDoc] = useState(`{\n  "title": "Build Cross-Platform Installer",\n  "isCompleted": false,\n  "isImportant": true,\n  "subtasks": [\n    { "title": "Implement NSIS target" },\n    { "title": "Configure Capacitor APK" }\n  ]\n}`);
  const [noSqlValidationResult, setNoSqlValidationResult] = useState<any>(null);

  const fetchMigrations = async () => {
    setMigrationsLoading(true);
    try {
      const res = await fetch('/api/migrations/list');
      const data = await res.json();
      if (data.migrations) {
        setMigrationsList(data.migrations);
        setMigrationsVersion({
          current: data.currentVersion,
          latest: data.latestVersion,
          pending: data.pendingCount,
        });
      }
      const scriptRes = await fetch(`/api/migrations/script/${selectedDriver === 'postgres' || selectedDriver === 'mysql' || selectedDriver === 'mssql' ? selectedDriver : 'sqlite'}`);
      const scriptData = await scriptRes.json();
      setEvolutionScript(scriptData.script || '');
    } catch (err) {
      console.error('Failed to load migrations:', err);
    } finally {
      setMigrationsLoading(false);
    }
  };

  const fetchNoSqlInfo = async () => {
    try {
      const res = await fetch('/api/nosql/schema-info');
      const data = await res.json();
      setNoSqlInfo(data);
    } catch (err) {
      console.error('Failed to load nosql info:', err);
    }
  };

  const handleApplyMigration = async (id: string) => {
    try {
      const res = await fetch(`/api/migrations/apply/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchMigrations();
      }
    } catch (err) {
      console.error('Failed to apply migration:', err);
    }
  };

  const handleApplyAllMigrations = async () => {
    try {
      const res = await fetch('/api/migrations/apply-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchMigrations();
      }
    } catch (err) {
      console.error('Failed to apply all migrations:', err);
    }
  };

  const handleTestNoSqlDocument = async () => {
    try {
      const parsed = JSON.parse(sampleNoSqlDoc);
      const res = await fetch('/api/nosql/validate-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'task', document: parsed }),
      });
      const data = await res.json();
      setNoSqlValidationResult(data.result);
    } catch (err: any) {
      setNoSqlValidationResult({
        valid: false,
        errors: [`JSON Syntax Error: ${err.message}`],
      });
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'migrations') {
      fetchMigrations();
    }
    if (isOpen && activeTab === 'nosql_schema') {
      fetchNoSqlInfo();
    }
  }, [isOpen, activeTab, selectedDriver]);

  // Custom connection configuration form
  const [configForm, setConfigForm] = useState({
    host: 'localhost',
    port: '',
    database: 'kriya_db',
    user: 'root',
    password: '',
    connectionString: '',
    projectId: 'kriya-prod',
    ssl: false,
  });

  const [testResult, setTestResult] = useState<DatabaseConnectionStatus | null>(null);
  const [switchSuccessMsg, setSwitchSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Database Info
  const fetchDbInfo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/db/info');
      const data: DatabaseInfoResponse = await res.json();
      setDbInfo(data);
      if (data.activeDriver) {
        setSelectedDriver(data.activeDriver.id);
        const c = data.activeDriver.config;
        setConfigForm({
          host: c.host || 'localhost',
          port: c.port ? String(c.port) : '',
          database: c.database || 'kriya_db',
          user: c.user || 'root',
          password: '',
          connectionString: c.connectionString || '',
          projectId: c.projectId || 'kriya-prod',
          ssl: Boolean(c.ssl),
        });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect to backend database service');
    } finally {
      setLoading(false);
    }
  };

  // Fetch DDL Schema for Selected Driver
  const fetchSchema = async (driver: DatabaseDriverType) => {
    setSchemaLoading(true);
    try {
      const res = await fetch(`/api/db/schema/${driver}`);
      const data = await res.json();
      setSchemaCode(data.schema || '');
    } catch {
      setSchemaCode('-- Failed to load DDL schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDbInfo();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'schema') {
      fetchSchema(selectedDriver);
    }
  }, [isOpen, activeTab, selectedDriver]);

  if (!isOpen) return null;

  // Handle Driver Switch
  const handleSwitchDriver = async (migrateData = true) => {
    setSwitching(true);
    setSwitchSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/db/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver: selectedDriver,
          config: {
            ...configForm,
            port: configForm.port ? parseInt(configForm.port, 10) : undefined,
          },
          migrateData,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to switch database driver');
      }
      setSwitchSuccessMsg(data.message || 'Database backend switched successfully');
      await fetchDbInfo();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Database switch failed');
    } finally {
      setSwitching(false);
    }
  };

  // Handle Connection Test
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver: selectedDriver,
          config: {
            ...configForm,
            port: configForm.port ? parseInt(configForm.port, 10) : undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.result) {
        setTestResult(data.result);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  // Handle Export Backup
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/db/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kriya-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg('Failed to export database backup');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const getDriverIcon = (id: DatabaseDriverType) => {
    switch (id) {
      case 'sqlite':
        return <HardDrive className="w-4 h-4 text-emerald-600" />;
      case 'postgres':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'mysql':
        return <Database className="w-4 h-4 text-cyan-600" />;
      case 'mssql':
        return <Server className="w-4 h-4 text-indigo-600" />;
      case 'mongodb':
        return <Layers className="w-4 h-4 text-emerald-500" />;
      case 'firebase':
        return <Cloud className="w-4 h-4 text-amber-500" />;
      case 'memory':
      default:
        return <Zap className="w-4 h-4 text-amber-500" />;
    }
  };

  const activeDriverMeta = dbInfo?.supportedDrivers.find((d) => d.id === dbInfo?.activeDriver.id);
  const selectedDriverMeta = dbInfo?.supportedDrivers.find((d) => d.id === selectedDriver);

  return (
    <div id="database-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div
        id="database-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">Database Architecture & Pluggable Storage</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  v1.2.0 Multi-Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Production-grade storage layer supporting SQLite, PostgreSQL, MySQL, MSSQL, MongoDB, Firebase, & In-Memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDbInfo}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Refresh database status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors text-sm font-semibold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Active Engine Health Banner */}
        {dbInfo && (
          <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400 font-medium">Active Backend:</span>
                <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {dbInfo.activeDriver.name}
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <Activity className="w-3.5 h-3.5" />
                <span>{dbInfo.activeDriver.status.latencyMs}ms latency</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
              <span>{dbInfo.activeDriver.stats.totalTasks} Total Tasks</span>
              <span>•</span>
              <span className="text-emerald-400">{dbInfo.activeDriver.stats.completedTasks} Done</span>
              <span>•</span>
              <span className="text-blue-400">{dbInfo.activeDriver.stats.pendingTasks} Pending</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('switch')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'switch'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Switch & Configure Driver
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('migrations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'migrations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            SQL Evolution Scripts (v{migrationsVersion.current})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nosql_schema')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'nosql_schema'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            NoSQL Code Schema (v2)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'schema'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            DDL Schema Export
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Backup & JSON Snapshot
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Alerts */}
          {switchSuccessMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{switchSuccessMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: SWITCH DRIVER */}
          {activeTab === 'switch' && (
            <div className="space-y-6">
              {/* Driver Grid Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Select Target Storage Engine
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dbInfo?.supportedDrivers.map((driver: DatabaseDriverMetadata) => {
                    const isCurrent = dbInfo.activeDriver.id === driver.id;
                    const isSelected = selectedDriver === driver.id;

                    return (
                      <div
                        key={driver.id}
                        onClick={() => {
                          setSelectedDriver(driver.id);
                          setTestResult(null);
                          setSwitchSuccessMsg(null);
                        }}
                        className={`
                          relative p-3.5 rounded-xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between
                          ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                          }
                        `}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              {getDriverIcon(driver.id)}
                              <span className="font-bold text-xs text-slate-900">{driver.name}</span>
                            </div>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-2">
                            {driver.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {driver.features.slice(0, 2).map((feat, idx) => (
                            <span key={idx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Driver Configuration & Credentials */}
              {selectedDriverMeta && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      {getDriverIcon(selectedDriverMeta.id)}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {selectedDriverMeta.name} Configuration
                        </h3>
                        <p className="text-xs text-slate-500">{selectedDriverMeta.recommendedUse}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {selectedDriverMeta.category}
                    </span>
                  </div>

                  {/* Dynamic Form Fields based on Driver Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {selectedDriver === 'sqlite' && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="font-semibold text-slate-700">Database File Path / Memory Target</label>
                        <input
                          type="text"
                          value={configForm.connectionString || 'data/tasks.sqlite'}
                          onChange={(e) => setConfigForm({ ...configForm, connectionString: e.target.value })}
                          placeholder=":memory: or path/to/database.sqlite"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="text-[11px] text-slate-400">
                          Use <code className="font-mono text-slate-600">:memory:</code> for in-memory SQLite, or a persistent file path.
                        </p>
                      </div>
                    )}

                    {['postgres', 'mysql', 'mssql'].includes(selectedDriver) && (
                      <>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Host Server</label>
                          <input
                            type="text"
                            value={configForm.host}
                            onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                            placeholder="localhost or db.cloud.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Port</label>
                          <input
                            type="text"
                            value={configForm.port || (selectedDriverMeta.defaultPort ? String(selectedDriverMeta.defaultPort) : '')}
                            onChange={(e) => setConfigForm({ ...configForm, port: e.target.value })}
                            placeholder={String(selectedDriverMeta.defaultPort || '')}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Database Name</label>
                          <input
                            type="text"
                            value={configForm.database}
                            onChange={(e) => setConfigForm({ ...configForm, database: e.target.value })}
                            placeholder="todo_db"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Username</label>
                          <input
                            type="text"
                            value={configForm.user}
                            onChange={(e) => setConfigForm({ ...configForm, user: e.target.value })}
                            placeholder="postgres / root / sa"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Password</label>
                          <input
                            type="password"
                            value={configForm.password}
                            onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id="ssl-checkbox"
                            checked={configForm.ssl}
                            onChange={(e) => setConfigForm({ ...configForm, ssl: e.target.checked })}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="ssl-checkbox" className="font-medium text-slate-700">
                            Enable SSL / TLS Encryption
                          </label>
                        </div>
                      </>
                    )}

                    {selectedDriver === 'mongodb' && (
                      <>
                        <div className="md:col-span-2 space-y-1">
                          <label className="font-semibold text-slate-700">MongoDB Connection String / URI</label>
                          <input
                            type="text"
                            value={configForm.connectionString}
                            onChange={(e) => setConfigForm({ ...configForm, connectionString: e.target.value })}
                            placeholder={selectedDriverMeta.connectionPlaceholder}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Database Name</label>
                          <input
                            type="text"
                            value={configForm.database}
                            onChange={(e) => setConfigForm({ ...configForm, database: e.target.value })}
                            placeholder="todo_database"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </>
                    )}

                    {selectedDriver === 'firebase' && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="font-semibold text-slate-700">Firebase Cloud Project ID</label>
                        <input
                          type="text"
                          value={configForm.projectId}
                          onChange={(e) => setConfigForm({ ...configForm, projectId: e.target.value })}
                          placeholder="kriya-prod"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                        />
                        <p className="text-[11px] text-slate-400">
                          Communicates directly with Google Cloud Firestore NoSQL document store.
                        </p>
                      </div>
                    )}

                    {selectedDriver === 'memory' && (
                      <div className="md:col-span-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                        In-Memory storage runs in Node.js process heap with zero I/O latency. Ideal for automated testing and sandbox evaluations.
                      </div>
                    )}
                  </div>

                  {/* Test Connection Output */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        testResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-white/80 border">
                        {testResult.latencyMs} ms
                      </span>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-blue-600' : ''}`} />
                      <span>{testing ? 'Testing connection...' : 'Test Connection & Ping'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSwitchDriver(false)}
                        disabled={switching || dbInfo?.activeDriver.id === selectedDriver}
                        className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50"
                        title="Switch driver without copying existing tasks"
                      >
                        Switch (Empty Start)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchDriver(true)}
                        disabled={switching || dbInfo?.activeDriver.id === selectedDriver}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
                      >
                        <ArrowRightLeft className={`w-3.5 h-3.5 ${switching ? 'animate-spin' : ''}`} />
                        <span>{switching ? 'Migrating & Switching...' : 'Switch Driver & Migrate Data'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SQL EVOLUTIONS */}
          {activeTab === 'migrations' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-slate-400">Database Schema Evolution</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    Version v{migrationsVersion.current} / v{migrationsVersion.latest}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {migrationsVersion.pending > 0
                      ? `${migrationsVersion.pending} pending migration script(s) ready to apply`
                      : 'All SQL schema migration steps are fully up-to-date'}
                  </div>
                </div>

                {migrationsVersion.pending > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAllMigrations}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Apply All Pending ({migrationsVersion.pending})
                  </button>
                )}
              </div>

              {/* Migrations Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Versioned Migration Scripts</span>
                  <span className="font-mono text-[11px] text-slate-500">Auto-calculated SHA-256 Checksums</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {migrationsList.map((m) => (
                    <div key={m.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-bold">
                            v{m.version}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{m.name}</span>
                          {m.applied ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              APPLIED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              PENDING
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{m.description}</p>
                        <div className="text-[10px] font-mono text-slate-400">
                          Checksum: {m.checksum} | Applied at: {m.appliedAt ? new Date(m.appliedAt).toLocaleString() : 'Not yet'}
                        </div>
                      </div>

                      <div>
                        {!m.applied && (
                          <button
                            type="button"
                            onClick={() => handleApplyMigration(m.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                          >
                            Apply v{m.version}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Evolution SQL Script Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Full Dialect Evolution Script ({selectedDriver.toUpperCase()})
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(evolutionScript)}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Evolution Script
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto max-h-60 border border-slate-800">
                  {evolutionScript}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: NOSQL CODE SCHEMA */}
          {activeTab === 'nosql_schema' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-950 text-emerald-100 rounded-xl border border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Code-Level Schema Enforcement (v2)
                  </div>
                  <span className="font-mono text-xs bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">
                    Strict Type Sanitation Active
                  </span>
                </div>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  Unlike traditional relational tables, MongoDB & Firestore document stores rely on application-level schema enforcement. Kriya enforces automatic document sanitization, schema version tagging (<code className="font-mono bg-emerald-900 px-1 rounded">_schemaVersion: 2</code>), and real-time backwards-compatibility upgrades from legacy v1 documents.
                </p>
              </div>

              {/* Live Document Validator & Upgrader Tester */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Raw NoSQL Document Input (JSON)
                  </label>
                  <textarea
                    rows={10}
                    value={sampleNoSqlDoc}
                    onChange={(e) => setSampleNoSqlDoc(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-200 rounded-xl border border-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestNoSqlDocument}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    Run Code-Level Validation & Upgrade Test
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Validator & Sanitized Output
                  </label>
                  <div className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 h-[240px] overflow-y-auto">
                    {noSqlValidationResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                          <span className={noSqlValidationResult.valid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {noSqlValidationResult.valid ? '✓ VALID SCHEMA' : '✗ VALIDATION FAILED'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            v{noSqlValidationResult.migratedFromVersion} → v{noSqlValidationResult.schemaVersion}
                          </span>
                        </div>
                        {noSqlValidationResult.sanitizedDocument && (
                          <pre className="text-[11px] text-emerald-300">
                            {JSON.stringify(noSqlValidationResult.sanitizedDocument, null, 2)}
                          </pre>
                        )}
                        {noSqlValidationResult.errors?.length > 0 && (
                          <div className="text-rose-400 text-xs space-y-1">
                            {noSqlValidationResult.errors.map((e: string, i: number) => (
                              <div key={i}>• {e}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-center pt-20">
                        Click 'Run Code-Level Validation' to inspect document sanitization.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEMA & DDL */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    DDL & Schema Migration for {selectedDriverMeta?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Production-ready schema migration script with table constraints, indexes, and JSON validators
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(schemaCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Copied to Clipboard!' : 'Copy Schema Code'}</span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs text-slate-200">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Engine: {selectedDriverMeta?.category} ({selectedDriver})</span>
                  <span className="text-emerald-400">Strict Typing & Foreign Keys</span>
                </div>
                <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed max-h-[380px]">
                  {schemaLoading ? 'Generating DDL schema...' : schemaCode}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Database Snapshot & JSON Backup</h3>
                    <p className="text-xs text-slate-500">
                      Download a full machine-readable JSON backup containing all tasks, checklist subtasks, time-tracking logs, and custom list definitions.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block mb-1">Source Backend</span>
                    <span className="font-bold text-slate-800">{dbInfo?.activeDriver.name}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block mb-1">Total Records</span>
                    <span className="font-bold text-slate-800 font-mono">{dbInfo?.activeDriver.stats.totalTasks} tasks</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block mb-1">Format Specification</span>
                    <span className="font-bold text-slate-800 font-mono">JSON Schema v1.2</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-500/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Complete JSON Backup</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Zero-Downtime Hot-Swapping Enabled</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
