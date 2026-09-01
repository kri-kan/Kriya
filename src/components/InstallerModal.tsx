import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Server,
  User,
  Sparkles,
  RefreshCw,
  Terminal,
  ShieldCheck,
  History,
  FileCode,
  HardDrive,
  Sliders,
  Check,
  Package,
  Download,
  Play,
  FlaskConical,
} from 'lucide-react';

interface InstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PreflightCheckItem {
  passed: boolean;
  label: string;
  value: string;
  details: string;
}

interface AppPreferences {
  appName: string;
  version: string;
  installedAt: string;
  lastUpgradedAt: string;
  isInstalled: boolean;
  environment: string;
  database: {
    driver: string;
    config: Record<string, any>;
    sqlSchemaVersion: number;
    noSqlSchemaVersion: number;
    autoRunMigrations: boolean;
  };
  server: {
    port: number;
    host: string;
    corsEnabled: boolean;
  };
  features: {
    enableMcpServer: boolean;
    enableTimeTracking: boolean;
    enableGeminiAi: boolean;
    enableAutoBackup: boolean;
    backupIntervalHours: number;
  };
  userProfile: {
    adminName: string;
    adminEmail: string;
    defaultTheme: string;
    firstDayOfWeek: string;
  };
}

interface UpgradeLog {
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  sqlMigrationsRan: number;
  noSqlUpgraded: boolean;
  status: 'SUCCESS' | 'FAILED';
  details: string[];
}

export const InstallerModal: React.FC<InstallerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'installer' | 'upgrader' | 'logs'>('installer');
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [preflight, setPreflight] = useState<Record<string, PreflightCheckItem>>({});
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const [upgradeLogs, setUpgradeLogs] = useState<UpgradeLog[]>([]);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Form State
  const [selectedDriver, setSelectedDriver] = useState<string>('sqlite');
  const [appName, setAppName] = useState('TaskMaster Pro');
  const [adminName, setAdminName] = useState('Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@taskmaster.local');
  const [port, setPort] = useState(3000);
  const [enableMcp, setEnableMcp] = useState(true);
  const [enableTimeTracking, setEnableTimeTracking] = useState(true);
  const [enableAutoBackup, setEnableAutoBackup] = useState(true);
  const [autoRunMigrations, setAutoRunMigrations] = useState(true);

  // Upgrader state
  const [targetUpgradeVersion, setTargetUpgradeVersion] = useState('1.3.0');
  const [upgradeOutput, setUpgradeOutput] = useState<string[]>([]);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Package Generation state
  const [selectedBuildTarget, setSelectedBuildTarget] = useState('all');
  const [isBuildingPackage, setIsBuildingPackage] = useState(false);
  const [packageBuildLogs, setPackageBuildLogs] = useState<string[]>([]);
  const [generatedArtifacts, setGeneratedArtifacts] = useState<any[]>([]);
  const [packageManifest, setPackageManifest] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchArtifacts();
    }
  }, [isOpen]);

  const fetchArtifacts = async () => {
    try {
      const res = await fetch('/api/installer/artifacts');
      const data = await res.json();
      if (data.artifacts) {
        setGeneratedArtifacts(data.artifacts);
      }
      if (data.manifest) {
        setPackageManifest(data.manifest);
      }
    } catch (err) {
      console.error('Failed to fetch artifacts:', err);
    }
  };

  const handleGeneratePackage = async () => {
    setIsBuildingPackage(true);
    setPackageBuildLogs([`[INFO] Starting build process for platform: ${selectedBuildTarget.toUpperCase()}...`]);
    try {
      const res = await fetch('/api/installer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlatform: selectedBuildTarget }),
      });
      const data = await res.json();
      if (data.logs) {
        setPackageBuildLogs(data.logs);
      }
      if (data.artifacts) {
        setGeneratedArtifacts(data.artifacts);
      }
      fetchArtifacts();
    } catch (err: any) {
      setPackageBuildLogs((prev) => [...prev, `[ERROR] Build generation failed: ${err.message}`]);
    } finally {
      setIsBuildingPackage(false);
    }
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/installer/status');
      const data = await res.json();
      if (data.preferences) {
        setPreferences(data.preferences);
        setSelectedDriver(data.preferences.database?.driver || 'sqlite');
        setAppName(data.preferences.appName || 'TaskMaster Pro');
        setAdminName(data.preferences.userProfile?.adminName || 'Administrator');
        setAdminEmail(data.preferences.userProfile?.adminEmail || 'admin@taskmaster.local');
        setPort(data.preferences.server?.port || 3000);
        setEnableMcp(data.preferences.features?.enableMcpServer ?? true);
        setEnableTimeTracking(data.preferences.features?.enableTimeTracking ?? true);
      }
      if (data.preflight) {
        setPreflight(data.preflight);
      }
      if (data.upgradeLogs) {
        setUpgradeLogs(data.upgradeLogs);
      }
    } catch (err) {
      console.error('Failed to load installer status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunInstallation = async () => {
    setLoading(true);
    setInstallLogs(['[Installer] Initializing installation sequence...']);
    try {
      const payload = {
        preferences: {
          appName,
          database: {
            driver: selectedDriver,
            config: {
              driver: selectedDriver,
              connectionString: selectedDriver === 'sqlite' ? 'data/tasks.sqlite' : undefined,
            },
            autoRunMigrations,
          },
          server: {
            port,
            host: '0.0.0.0',
            corsEnabled: true,
          },
          features: {
            enableMcpServer: enableMcp,
            enableTimeTracking,
            enableGeminiAi: true,
            enableAutoBackup,
          },
          userProfile: {
            adminName,
            adminEmail,
          },
        },
      };

      const res = await fetch('/api/installer/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setInstallLogs(data.logs || []);
        setInstallSuccess(true);
        setStep(4);
        fetchStatus();
      }
    } catch (err: any) {
      setInstallLogs((prev) => [...prev, `[ERROR] Installation failed: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerUpgrade = async () => {
    setIsUpgrading(true);
    setUpgradeOutput([`Starting in-place application upgrade to v${targetUpgradeVersion}...`]);
    try {
      const res = await fetch('/api/installer/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: targetUpgradeVersion }),
      });
      const data = await res.json();
      if (data.success) {
        setUpgradeOutput(data.log?.details || ['Upgrade completed successfully']);
        fetchStatus();
      } else {
        setUpgradeOutput([`[ERROR] Upgrade failed`]);
      }
    } catch (err: any) {
      setUpgradeOutput([`[ERROR] Upgrade failed: ${err.message}`]);
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Application Installer & Upgrader</h2>
                <span className="text-[11px] font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  v{preferences?.version || '1.2.0'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Setup wizard, preferences capture, SQL evolutions & in-place version upgrades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-200 bg-slate-50/80">
          <button
            onClick={() => setActiveTab('installer')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'installer'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Interactive Setup Wizard
          </button>
          <button
            onClick={() => setActiveTab('upgrader')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'upgrader'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            In-Place Upgrader & Maintenance
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Upgrade Audit Trail ({upgradeLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'packages'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Distributable Packages & Binaries
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'installer' && (
            <div className="space-y-6">
              {/* Stepper Header */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { num: 1, title: 'Preflight Checks' },
                  { num: 2, title: 'Storage & DB Engine' },
                  { num: 3, title: 'App Preferences' },
                  { num: 4, title: 'Installation Status' },
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      step === s.num
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 font-semibold'
                        : step > s.num
                        ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        step === s.num
                          ? 'bg-indigo-600 text-white'
                          : step > s.num
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className="text-xs">{s.title}</span>
                  </div>
                ))}
              </div>

              {/* Step 1: Preflight */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      System Preflight Diagnostics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(preflight).map(([key, item]: [string, PreflightCheckItem]) => (
                        <div key={key} className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                            <div className="text-xs font-mono text-indigo-600">{item.value}</div>
                            <div className="text-[11px] text-slate-500">{item.details}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
                    >
                      Proceed to Database Setup
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Storage & Database Selection */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-600" />
                      Select Default Database Engine
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { id: 'sqlite', name: 'SQLite 3 (Zero-Config)', type: 'SQL', desc: 'Embedded local file database. Recommended for desktop and single users.' },
                        { id: 'postgres', name: 'PostgreSQL Enterprise', type: 'SQL', desc: 'Enterprise client-server SQL with JSONB support.' },
                        { id: 'mongodb', name: 'MongoDB / Atlas', type: 'NoSQL', desc: 'Document store with code-level schema validation.' },
                        { id: 'mysql', name: 'MySQL / MariaDB', type: 'SQL', desc: 'Relational InnoDB transactional database.' },
                        { id: 'firebase', name: 'Cloud Firestore', type: 'NoSQL', desc: 'Real-time serverless document store.' },
                        { id: 'mssql', name: 'Microsoft SQL Server', type: 'SQL', desc: 'Enterprise T-SQL database with JSON constraints.' },
                      ].map((db) => (
                        <div
                          key={db.id}
                          onClick={() => setSelectedDriver(db.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selectedDriver === db.id
                              ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">{db.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                              {db.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{db.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <input
                        type="checkbox"
                        id="autoRunMigrations"
                        checked={autoRunMigrations}
                        onChange={(e) => setAutoRunMigrations(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="autoRunMigrations" className="text-xs text-slate-700 font-medium">
                        Automatically execute SQL evolution migration scripts & NoSQL schema upgrades during bootstrap
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md"
                    >
                      Configure Application Preferences
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Application Preferences */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      Application Settings & Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Application Name</label>
                        <input
                          type="text"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Server Port</label>
                        <input
                          type="number"
                          value={port}
                          onChange={(e) => setPort(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Admin User Name</label>
                        <input
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={enableMcp}
                          onChange={(e) => setEnableMcp(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>Enable Model Context Protocol (MCP) Server Endpoint (`/sse` & `/messages`)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={enableTimeTracking}
                          onChange={(e) => setEnableTimeTracking(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>Enable Stopwatch Time Tracking & JSON Duration Metrics</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={enableAutoBackup}
                          onChange={(e) => setEnableAutoBackup(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>Enable Automatic Daily JSON Database Backups</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRunInstallation}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Execute Installation Sequence
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Installation Status & Logs */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                      <span className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        Installation Execution Terminal
                      </span>
                      {installSuccess && (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          COMPLETE
                        </span>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {installLogs.map((l, i) => (
                        <div key={i} className="text-emerald-400/90 leading-relaxed">
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <div className="text-xs font-bold text-emerald-900">TaskMaster Pro is Configured & Ready</div>
                        <div className="text-[11px] text-emerald-700">
                          Active Driver: <span className="font-mono font-semibold">{selectedDriver.toUpperCase()}</span> | SQL Migration Version: <span className="font-mono font-semibold">v{preferences?.database.sqlSchemaVersion || 4}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      Launch Application
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upgrader' && (
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-indigo-900">Current Running Version</div>
                  <div className="text-2xl font-bold font-mono text-indigo-700">
                    v{preferences?.version || '1.2.0'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Last upgrade recorded on: {new Date(preferences?.lastUpgradedAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700">Target Upgrade Version</div>
                    <select
                      value={targetUpgradeVersion}
                      onChange={(e) => setTargetUpgradeVersion(e.target.value)}
                      className="mt-1 px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="1.3.0">v1.3.0 (Adds Priority Tags & Matrix)</option>
                      <option value="1.4.0">v1.4.0 (Multi-Workspace Federation)</option>
                      <option value="2.0.0">v2.0.0 (Enterprise HA Cluster)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={isUpgrading}
                    onClick={handleTriggerUpgrade}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {isUpgrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Run In-Place Upgrade
                  </button>
                </div>
              </div>

              {upgradeOutput.length > 0 && (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Live Upgrade Log Output
                    </span>
                  </div>
                  <div className="space-y-1">
                    {upgradeOutput.map((out, i) => (
                      <div key={i} className="text-emerald-400">
                        {out}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SQL Evolutions</div>
                  <div className="text-lg font-bold text-slate-900">
                    v{preferences?.database.sqlSchemaVersion || 4} Applied
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">Automatic migration table synchronized</div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">NoSQL Code Schema</div>
                  <div className="text-lg font-bold text-slate-900">
                    v{preferences?.database.noSqlSchemaVersion || 2} Active
                  </div>
                  <div className="text-[11px] text-indigo-600 font-medium">Runtime sanitizer & upgrader active</div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Storage Adapter</div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {preferences?.database.driver.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-slate-500">Zero-downtime hot-swappable</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Historical Application Upgrades & Migrations Audit Log
              </h3>

              <div className="space-y-3">
                {upgradeLogs.map((log, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono font-bold">
                          v{log.fromVersion} → v{log.toVersion}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {log.status}
                      </span>
                    </div>
                    <ul className="space-y-1 pl-4 text-xs text-slate-600 list-disc">
                      {log.details.map((d, di) => (
                        <li key={di}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="space-y-6">
              {/* Build Action & Platform Selector Card */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100 rounded-xl space-y-4 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-600" />
                      Generate Standalone Executables & Installer Packages
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Executes preflight validation, full regression test suite, and compiles release binaries for target OS.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedBuildTarget}
                      onChange={(e) => setSelectedBuildTarget(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Platforms (Matrix)</option>
                      <option value="windows">Windows (.exe / NSIS)</option>
                      <option value="linux">Linux (.AppImage / .deb)</option>
                      <option value="macos">macOS (.dmg / Universal)</option>
                      <option value="android">Android (.apk / .aab)</option>
                      <option value="ios">iOS (.ipa)</option>
                      <option value="web_pwa">Web PWA</option>
                    </select>

                    <button
                      type="button"
                      disabled={isBuildingPackage}
                      onClick={handleGeneratePackage}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                      {isBuildingPackage ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Building...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Generate Binaries
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct CLI Instruction */}
                <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg text-slate-300 font-mono text-xs">
                  <span className="text-slate-400">Terminal Build Command:</span>
                  <code className="text-teal-300 font-bold">npm run build:installer</code>
                </div>
              </div>

              {/* Build Log Console */}
              {packageBuildLogs.length > 0 && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-teal-400" />
                      Build Pipeline Execution Logs
                    </span>
                    <span className="text-[10px] text-slate-500">Live Stream</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {packageBuildLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.includes('ERROR') || log.includes('failed')
                            ? 'text-rose-400 font-semibold'
                            : log.includes('✅') || log.includes('🎉')
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Artifacts Catalog */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Generated Distribution Artifacts ({generatedArtifacts.length})
                  </h4>
                  <button
                    onClick={fetchArtifacts}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh Catalog
                  </button>
                </div>

                {generatedArtifacts.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                    <Package className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-xs font-medium text-slate-600">No binary packages built yet</div>
                    <p className="text-[11px] text-slate-500">
                      Select a platform and click "Generate Binaries" or run <code className="font-mono text-indigo-600">npm run build:installer</code> in your terminal.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {generatedArtifacts.map((art, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-900 truncate" title={art.fileName}>
                              {art.fileName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {art.formattedSize || `${(art.sizeBytes / 1024).toFixed(1)} KB`} • {art.modifiedAt ? new Date(art.modifiedAt).toLocaleTimeString() : 'Ready'}
                            </div>
                          </div>
                        </div>

                        <a
                          href={`/api/installer/download/${art.fileName}`}
                          download={art.fileName}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
