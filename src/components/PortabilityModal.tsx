import React, { useState, useEffect } from 'react';
import {
  Package,
  X,
  Monitor,
  Terminal,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Download,
  Copy,
  Check,
  Play,
  CheckCircle2,
  RefreshCw,
  FileCode,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface PortabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlatformTarget {
  id: string;
  name: string;
  category: string;
  icon: string;
  outputFormats: string[];
  primaryExtension: string;
  packagingEngine: string;
  buildRequirements: string[];
  sampleBuildCommand: string;
  features: string[];
  description: string;
}

export const PortabilityModal: React.FC<PortabilityModalProps> = ({ isOpen, onClose }) => {
  const [targets, setTargets] = useState<PlatformTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<PlatformTarget | null>(null);
  const [activeTab, setActiveTab] = useState<'platforms' | 'configs' | 'ci_cd'>('platforms');
  const [activeConfigType, setActiveConfigType] = useState<'electron' | 'capacitor' | 'github-actions'>('electron');
  const [configContent, setConfigContent] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTargets();
      fetchConfig('electron');
    }
  }, [isOpen]);

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/packaging/targets');
      const data = await res.json();
      if (data.targets) {
        setTargets(data.targets);
        if (!selectedTarget && data.targets.length > 0) {
          setSelectedTarget(data.targets[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    }
  };

  const fetchConfig = async (type: 'electron' | 'capacitor' | 'github-actions') => {
    setActiveConfigType(type);
    try {
      const res = await fetch(`/api/packaging/config/${type}`);
      const data = await res.json();
      setConfigContent(data.content || '');
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleSimulateBuild = async (platformId: string) => {
    setIsBuilding(true);
    setBuildResult(null);
    try {
      const res = await fetch('/api/packaging/simulate-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId }),
      });
      const data = await res.json();
      setBuildResult(data);
    } catch (err) {
      console.error('Build simulation failed:', err);
    } finally {
      setIsBuilding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlatformIcon = (id: string) => {
    switch (id) {
      case 'windows':
        return <Monitor className="w-5 h-5 text-blue-500" />;
      case 'linux':
        return <Terminal className="w-5 h-5 text-amber-500" />;
      case 'macos':
        return <Laptop className="w-5 h-5 text-slate-700" />;
      case 'android':
        return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case 'ios':
        return <Tablet className="w-5 h-5 text-purple-500" />;
      default:
        return <Globe className="w-5 h-5 text-sky-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Cross-Platform Portability & Executable Hub</h2>
                <span className="text-[11px] font-mono bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                  Windows • Linux • macOS • Android • iOS
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Native binary builds (.exe, AppImage, DMG, APK, IPA) with offline SQLite & code-level schema validation
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
            onClick={() => setActiveTab('platforms')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'platforms'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Target Platforms ({targets.length})
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'configs'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Native Packaging Manifests
          </button>
          <button
            onClick={() => setActiveTab('ci_cd')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'ci_cd'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            CI/CD Multi-Platform Matrix
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'platforms' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Platform List */}
              <div className="md:col-span-5 space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Supported Binary Outputs
                </div>
                {targets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTarget(t);
                      setBuildResult(null);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                      selectedTarget?.id === t.id
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        {getPlatformIcon(t.id)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{t.name}</div>
                        <div className="text-[11px] font-mono text-blue-600">{t.primaryExtension} • {t.packagingEngine}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{t.outputFormats.join(', ')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Platform Detail & Build Generator */}
              <div className="md:col-span-7 space-y-4">
                {selectedTarget ? (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          {getPlatformIcon(selectedTarget.id)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{selectedTarget.name}</h3>
                          <span className="text-xs font-mono text-blue-600 font-semibold">
                            Primary Binary: {selectedTarget.primaryExtension}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isBuilding}
                        onClick={() => handleSimulateBuild(selectedTarget.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50 transition-all"
                      >
                        {isBuilding ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Compiling Binary...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Build {selectedTarget.primaryExtension} Package
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{selectedTarget.description}</p>

                    {/* Features list */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700">Native Platform Features:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTarget.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Build Command */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-700">Terminal Build Command:</div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs">
                        <span>{selectedTarget.sampleBuildCommand}</span>
                        <button
                          onClick={() => copyToClipboard(selectedTarget.sampleBuildCommand)}
                          className="text-slate-400 hover:text-white"
                          title="Copy command"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Build Result Output */}
                    {buildResult && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Compilation & Packaging Completed
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                            {buildResult.size}
                          </span>
                        </div>

                        <div className="text-xs font-mono text-slate-700 bg-white p-2.5 rounded border border-emerald-200 space-y-1">
                          <div><strong>Artifact:</strong> {buildResult.artifactName}</div>
                          <div className="truncate text-[10px] text-slate-500"><strong>SHA-256:</strong> {buildResult.checksum}</div>
                        </div>

                        <div className="space-y-1">
                          {buildResult.steps?.map((st: any) => (
                            <div key={st.step} className="flex items-center justify-between text-[11px] text-emerald-700">
                              <span>✓ Step {st.step}: {st.name}</span>
                              <span className="font-mono text-slate-500">{st.duration}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([`Simulated binary artifact payload for ${buildResult.artifactName}`], { type: 'application/octet-stream' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = buildResult.artifactName;
                            a.click();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Simulated Standalone Package ({buildResult.artifactName})
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-xs border border-dashed rounded-xl">
                    Select a platform on the left to inspect packaging details.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'configs' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchConfig('electron')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeConfigType === 'electron'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  electron-builder.json (Windows .exe / Linux / macOS)
                </button>
                <button
                  onClick={() => fetchConfig('capacitor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeConfigType === 'capacitor'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  capacitor.config.ts (Android APK / iOS IPA)
                </button>
                <button
                  onClick={() => fetchConfig('github-actions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeConfigType === 'github-actions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  release-binaries.yml (GitHub Actions Matrix)
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
                  {configContent}
                </pre>
                <button
                  onClick={() => copyToClipboard(configContent)}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Config'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ci_cd' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Automated Multi-Platform Binary Release Pipeline
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Upon pushing a Git release tag (e.g. <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">v1.2.0</code>), the GitHub Actions matrix workflow spins up runners across <strong>Windows</strong>, <strong>Ubuntu</strong>, and <strong>macOS</strong> simultaneously. It executes TypeScript compilation, packages the SQLite engine, signs the executables, and publishes downloadable release assets directly to your GitHub Releases page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Monitor className="w-4 h-4 text-blue-600" />
                    windows-latest runner
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Outputs <span className="font-mono text-slate-700 font-semibold">TaskMasterPro-win-x64.exe</span> (NSIS Installer) & portable executable.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Terminal className="w-4 h-4 text-amber-600" />
                    ubuntu-latest runner
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Outputs universal <span className="font-mono text-slate-700 font-semibold">.AppImage</span>, <span className="font-mono text-slate-700 font-semibold">.deb</span>, and <span className="font-mono text-slate-700 font-semibold">.rpm</span> packages.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Laptop className="w-4 h-4 text-slate-700" />
                    macos-latest runner
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Outputs Universal <span className="font-mono text-slate-700 font-semibold">.dmg</span> bundle for Apple Silicon (M-series) and Intel Macs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
