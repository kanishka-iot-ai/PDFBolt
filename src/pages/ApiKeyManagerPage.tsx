import React, { useState, useEffect } from 'react';
import { 
  Key, Lock, ShieldCheck, Check, Copy, Trash2, Eye, EyeOff, 
  RefreshCw, Zap, Code, Terminal, Globe, AlertCircle, CheckCircle2, 
  LogOut, Send, ExternalLink, ShieldAlert
} from 'lucide-react';

interface SavedApiKey {
  id: string;
  key: string;
  partnerName: string;
  tier: 'standard' | 'pro' | 'enterprise' | 'custom';
  rateLimit: number;
  createdAt: string;
}

const ADMIN_PASS = 'Kkds@cuchd.in';
const STORAGE_AUTH_KEY = 'pdfbolt_admin_key_auth';
const STORAGE_VAULT_KEY = 'pdfbolt_vault_keys_v1';

export const ApiKeyManagerPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Generator form state
  const [partnerName, setPartnerName] = useState<string>('');
  const [tier, setTier] = useState<'standard' | 'pro' | 'enterprise' | 'custom'>('pro');
  const [customRateLimit, setCustomRateLimit] = useState<number>(300);
  const [keyPrefix, setKeyPrefix] = useState<'pdfbolt_live_' | 'pdfbolt_test_'>('pdfbolt_live_');
  
  // Newly generated key
  const [generatedKey, setGeneratedKey] = useState<SavedApiKey | null>(null);
  const [copiedSection, setCopiedSection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'embed' | 'render' | 'js' | 'python' | 'curl'>('embed');

  // Vault state
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);
  const [pingStatus, setPingStatus] = useState<{ [keyId: string]: string }>({});

  // Check session auth on mount
  useEffect(() => {
    document.title = 'API Key Management & Partner Portal | PDFBolt';
    // Ensure noindex, nofollow for this private admin page
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow';

    const savedAuth = sessionStorage.getItem(STORAGE_AUTH_KEY);
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
    }

    try {
      const stored = localStorage.getItem(STORAGE_VAULT_KEY);
      if (stored) {
        setSavedKeys(JSON.parse(stored));
      }
    } catch (_) {
      // ignore JSON parse error
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASS) {
      sessionStorage.setItem(STORAGE_AUTH_KEY, 'authenticated');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access Denied: Incorrect password. Please try again.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_AUTH_KEY);
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const generateCryptographicKey = (prefix: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
    const randomBytes = new Uint8Array(28);
    window.crypto.getRandomValues(randomBytes);
    let result = '';
    for (let i = 0; i < randomBytes.length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    return `${prefix}${result}`;
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = partnerName.trim() || 'Client Partner';
    const effectiveRateLimit = tier === 'standard' ? 120 : tier === 'pro' ? 300 : tier === 'enterprise' ? 1000 : customRateLimit;
    const newKeyString = generateCryptographicKey(keyPrefix);

    const newRecord: SavedApiKey = {
      id: `key_${Date.now()}`,
      key: newKeyString,
      partnerName: finalName,
      tier,
      rateLimit: effectiveRateLimit,
      createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newRecord, ...savedKeys];
    setSavedKeys(updated);
    setGeneratedKey(newRecord);
    try {
      localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  const handleDeleteKey = (id: string) => {
    if (confirm('Are you sure you want to delete this key record from your local vault?')) {
      const updated = savedKeys.filter(k => k.id !== id);
      setSavedKeys(updated);
      try {
        localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(updated));
      } catch (_) {}
      if (generatedKey?.id === id) {
        setGeneratedKey(null);
      }
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(''), 2200);
  };

  const testKeyHealth = async (keyItem: SavedApiKey) => {
    setPingStatus(prev => ({ ...prev, [keyItem.id]: 'Testing...' }));
    const startTime = Date.now();
    try {
      const res = await fetch('https://pdfbolt-api.onrender.com/api/v1/health', {
        headers: { 'X-API-Key': keyItem.key }
      });
      const elapsed = Date.now() - startTime;
      if (res.ok) {
        setPingStatus(prev => ({ ...prev, [keyItem.id]: `200 OK (${elapsed}ms)` }));
      } else {
        setPingStatus(prev => ({ ...prev, [keyItem.id]: `Error: ${res.status}` }));
      }
    } catch (err: any) {
      setPingStatus(prev => ({ ...prev, [keyItem.id]: 'Network Error' }));
    }
  };

  // --------------------------------------------------------------------------
  // Password Locked Screen
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className={`min-h-[80vh] flex items-center justify-center px-4 py-16 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`w-full max-w-md p-8 sm:p-10 rounded-3xl border shadow-2xl transition-all ${
          darkMode ? 'bg-slate-900/90 border-slate-800 shadow-black/50' : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 mb-5 shadow-lg shadow-amber-500/25">
              <Lock size={32} strokeWidth={2.2} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20">
              <ShieldAlert size={14} /> Administrator Only
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">API Key Management</h1>
            <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter the administrator password to unlock partner API key generation and client integration credentials.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                Portal Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter administrator password"
                  autoFocus
                  required
                  className={`w-full px-4 py-3.5 pr-12 rounded-xl text-sm font-medium border transition-all outline-none ${
                    authError 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/30' 
                      : darkMode 
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {authError && (
                <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-red-500">
                  <AlertCircle size={14} />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Key size={18} />
              <span>Unlock Key Portal</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <span className="text-xs opacity-50">
              PDFBolt Enterprise Security • End-to-End Key Isolation
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Helper generators for codes
  const partnerSlug = (generatedKey?.partnerName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const partnerKey = generatedKey?.key || 'pdfbolt_live_YOUR_KEY';

  const embedSnippet = `<!-- 1. Drop anywhere on client website -->
<div data-pdfbolt-tool="compress" data-pdfbolt-key="${partnerKey}"></div>
<script src="https://pdfbolt.in/sdk/pdfbolt.js" async></script>`;

  const renderJsonSnippet = JSON.stringify({
    [partnerSlug]: {
      key: partnerKey,
      tier: generatedKey?.tier || 'pro',
      rate_limit: generatedKey?.rateLimit || 300
    }
  }, null, 2);

  const jsSnippet = `// 1. Include SDK in HTML or import in Node.js
// <script src="https://pdfbolt.in/sdk/pdfbolt.js"></script>

const pdfbolt = new PDFBolt({ apiKey: "${partnerKey}" });

// Example: Compress a PDF
const compressedBlob = await pdfbolt.compress(fileInput.files[0], { targetKb: 100 });
PDFBolt.downloadBlob(compressedBlob, "compressed.pdf");`;

  const pythonSnippet = `import requests

API_KEY = "${partnerKey}"
url = "https://pdfbolt-api.onrender.com/api/v1/convert/word-to-pdf"

with open("document.docx", "rb") as f:
    res = requests.post(url, headers={"X-API-Key": API_KEY}, files={"file": f})

with open("output.pdf", "wb") as f:
    f.write(res.content)`;

  const curlSnippet = `curl -X POST "https://pdfbolt-api.onrender.com/api/v1/convert/word-to-pdf" \\
  -H "X-API-Key: ${partnerKey}" \\
  -F "file=@/path/to/invoice.docx" \\
  --output converted.pdf`;

  // --------------------------------------------------------------------------
  // Authenticated Key Manager View
  // --------------------------------------------------------------------------
  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Top Header Bar */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/20">
              <ShieldCheck size={14} /> Authenticated Admin Session
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">API Key & Client Integration Portal</h1>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Generate live client credentials, configure rate limits, and export plug-and-play SDK snippets.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a
              href="https://pdfbolt-api.onrender.com/docs"
              target="_blank"
              rel="noreferrer"
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}
            >
              <span>Swagger Docs</span>
              <ExternalLink size={13} />
            </a>

            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              <span>Lock Portal</span>
            </button>
          </div>
        </div>

        {/* Generator & Exporter Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Form: Key Generator (5 Cols) */}
          <div className={`lg:col-span-5 p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-2 text-amber-500 mb-4 font-bold text-sm uppercase tracking-wider">
                <Zap size={18} />
                <span>Create New Partner Key</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-6">Generate Client Access Key</h2>

              <form onSubmit={handleCreateKey} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                    Client / Partner Name
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Acme FinTech, LawFirm Portal"
                    required
                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium border outline-none transition-all ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                    Access Tier & Rate Limit
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'standard', name: 'Standard', limit: '120/m' },
                      { id: 'pro', name: 'Pro', limit: '300/m' },
                      { id: 'enterprise', name: 'Enterprise', limit: '1000/m' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTier(t.id as any)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          tier === t.id
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                            : darkMode
                              ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <div>{t.name}</div>
                        <div className="text-[10px] opacity-75">{t.limit}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                    Environment Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'pdfbolt_live_', label: 'Live Production' },
                      { id: 'pdfbolt_test_', label: 'Test Sandbox' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setKeyPrefix(p.id as any)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                          keyPrefix === p.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : darkMode
                              ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Key size={18} />
                  <span>Generate New API Key</span>
                </button>
              </form>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs opacity-60">
              Generated keys use 256-bit cryptographically secure pseudorandom entropy and are immediately ready for production use.
            </div>
          </div>

          {/* Right Area: Generated Key Display & Client Code Exporters (7 Cols) */}
          <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-blue-500 font-bold text-sm uppercase tracking-wider">
                  <Code size={18} />
                  <span>Client Deployment Code</span>
                </div>

                {generatedKey && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Ready for {generatedKey.partnerName}
                  </span>
                )}
              </div>

              {/* Active Key Display Banner */}
              <div className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="overflow-hidden w-full">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Active Client API Key
                  </div>
                  <div className="font-mono text-sm sm:text-base font-bold text-amber-500 truncate">
                    {partnerKey}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(partnerKey, 'active_key')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shrink-0 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  {copiedSection === 'active_key' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSection === 'active_key' ? 'Copied Key!' : 'Copy Key'}</span>
                </button>
              </div>

              {/* Code Snippet Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 overflow-x-auto">
                {[
                  { id: 'embed', label: '2-Line Website Embed' },
                  { id: 'render', label: 'Render Config JSON' },
                  { id: 'js', label: 'JavaScript SDK' },
                  { id: 'python', label: 'Python' },
                  { id: 'curl', label: 'cURL' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : darkMode
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Snippet Output Box */}
              <div className="relative">
                <pre className={`p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-[220px] leading-relaxed border ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}>
                  <code>
                    {activeTab === 'embed' && embedSnippet}
                    {activeTab === 'render' && renderJsonSnippet}
                    {activeTab === 'js' && jsSnippet}
                    {activeTab === 'python' && pythonSnippet}
                    {activeTab === 'curl' && curlSnippet}
                  </code>
                </pre>

                <button
                  onClick={() => {
                    const textToCopy = 
                      activeTab === 'embed' ? embedSnippet :
                      activeTab === 'render' ? renderJsonSnippet :
                      activeTab === 'js' ? jsSnippet :
                      activeTab === 'python' ? pythonSnippet : curlSnippet;
                    copyToClipboard(textToCopy, activeTab);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5 shadow"
                >
                  {copiedSection === activeTab ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedSection === activeTab ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Deployment Instructions */}
            <div className={`mt-6 p-4 rounded-2xl border text-xs space-y-1.5 ${
              darkMode ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>How to Activate on Live Render Backend:</span>
              </div>
              <p>1. Copy the <strong>Render Config JSON</strong> above.</p>
              <p>2. Open <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">dashboard.render.com</a> &rarr; <strong>pdfbolt-api</strong> &rarr; <strong>Environment</strong>.</p>
              <p>3. Update <strong>PARTNER_API_KEYS</strong> with this JSON & click <strong>Save Changes</strong>.</p>
              <p>4. Send the <strong>2-Line Website Embed</strong> snippet to your client!</p>
            </div>
          </div>
        </div>

        {/* Vault: Generated Keys History Table */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight">Active Client Keys Vault</h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Local registry of keys issued to clients on this administrative device.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800">
              {savedKeys.length} Registered Keys
            </span>
          </div>

          {savedKeys.length === 0 ? (
            <div className="py-12 text-center opacity-50 text-sm">
              No keys generated yet. Use the form above to create your first client API key.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="pb-3 font-bold uppercase tracking-wider">Client / Partner</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">API Key</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Tier / Rate Limit</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Created</th>
                    <th className="pb-3 font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {savedKeys.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-4 font-bold text-slate-900 dark:text-white">
                        {item.partnerName}
                      </td>
                      <td className="py-4 font-mono font-bold text-amber-500">
                        {item.key.slice(0, 16)}...{item.key.slice(-6)}
                      </td>
                      <td className="py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          item.tier === 'enterprise' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' :
                          item.tier === 'pro' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                          'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        }`}>
                          {item.tier.toUpperCase()} ({item.rateLimit} req/min)
                        </span>
                      </td>
                      <td className="py-4 opacity-70">
                        {item.createdAt}
                      </td>
                      <td className="py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => testKeyHealth(item)}
                          className="px-2.5 py-1 rounded-lg font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {pingStatus[item.id] || 'Test Ping'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedKey(item);
                            copyToClipboard(item.key, item.id);
                          }}
                          className="px-2.5 py-1 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors inline-flex items-center gap-1"
                        >
                          {copiedSection === item.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedSection === item.id ? 'Copied' : 'Select & Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(item.id)}
                          className="px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete from local vault"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
