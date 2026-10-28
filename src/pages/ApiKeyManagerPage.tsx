import React, { useState, useEffect } from 'react';
import { 
  Key, Lock, ShieldCheck, Check, Copy, Trash2, Eye, EyeOff, 
  RefreshCw, Zap, Code, Terminal, Globe, AlertCircle, CheckCircle2, 
  LogOut, Send, ExternalLink, ShieldAlert, Loader2, CheckSquare, Square,
  Layers, Sliders, ChevronDown
} from 'lucide-react';

interface ServerApiKey {
  partner_id: string;
  name: string;
  tier: string;
  rate_limit: number;
  allowed_features: string[];
  created_at: string;
  key_preview?: string;
  key?: string;
}

const API_BASE_URL = 'https://pdfbolt-api.onrender.com';
const STORAGE_TOKEN_KEY = 'pdfbolt_admin_session_token_v1';

const ALL_AVAILABLE_FEATURES = [
  { id: 'compress', label: 'Compress PDF', category: 'Optimization' },
  { id: 'merge', label: 'Merge Multiple PDFs', category: 'Organization' },
  { id: 'split', label: 'Split & Extract Pages', category: 'Organization' },
  { id: 'word_to_pdf', label: 'Word to PDF (.docx)', category: 'Conversion' },
  { id: 'pdf_to_word', label: 'PDF to Word (.docx)', category: 'Conversion' },
  { id: 'excel_to_pdf', label: 'Excel to PDF (.xlsx)', category: 'Conversion' },
  { id: 'ppt_to_pdf', label: 'PowerPoint to PDF (.pptx)', category: 'Conversion' },
  { id: 'jpg_to_pdf', label: 'Images to PDF (JPG/PNG)', category: 'Conversion' },
  { id: 'pdf_to_jpg', label: 'PDF to Images (JPG)', category: 'Conversion' },
  { id: 'ocr', label: 'OCR Searchable PDF', category: 'Intelligence' },
  { id: 'protect', label: 'Protect & Unlock PDF', category: 'Security' },
  { id: 'redact', label: 'Redact Sensitive Data', category: 'Security' },
  { id: 'analyze', label: 'Document Forensics & Metadata', category: 'Inspection' },
];

export const ApiKeyManagerPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string>('');

  // Generator form state
  const [partnerName, setPartnerName] = useState<string>('');
  const [tier, setTier] = useState<'standard' | 'pro' | 'enterprise'>('pro');
  const [keyPrefix, setKeyPrefix] = useState<'pdfbolt_live_' | 'pdfbolt_test_'>('pdfbolt_live_');
  
  // Feature scope selection
  const [featurePreset, setFeaturePreset] = useState<'all' | 'conversions' | 'compress' | 'security' | 'custom'>('all');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['*']);

  // Newly generated key
  const [generatedKey, setGeneratedKey] = useState<ServerApiKey | null>(null);
  const [copiedSection, setCopiedSection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dropdown_embed' | 'single_embed' | 'js' | 'python' | 'curl'>('dropdown_embed');

  // Server Keys Vault
  const [serverKeys, setServerKeys] = useState<ServerApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(false);
  const [pingStatus, setPingStatus] = useState<{ [partnerId: string]: string }>({});

  // Check cryptographic server-side session on mount
  useEffect(() => {
    document.title = 'API Key Management & Partner Portal | PDFBolt';
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow';

    const savedToken = sessionStorage.getItem(STORAGE_TOKEN_KEY);
    if (savedToken) {
      fetch(`${API_BASE_URL}/api/v1/admin/auth/check`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setIsAuthenticated(true);
          setAdminToken(savedToken);
          fetchServerKeys(savedToken);
        } else {
          sessionStorage.removeItem(STORAGE_TOKEN_KEY);
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(STORAGE_TOKEN_KEY);
        setIsAuthenticated(false);
      });
    }
  }, []);

  const fetchServerKeys = async (token: string) => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.keys)) {
        setServerKeys(data.keys);
      }
    } catch (_) {
      // server connection error fallback
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setAuthError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        sessionStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        setAdminToken(data.token);
        setIsAuthenticated(true);
        setAuthError('');
        setPasswordInput('');
        fetchServerKeys(data.token);
      } else if (res.status === 429) {
        setAuthError(data.detail?.message || 'Security Lockout: Too many failed attempts. This IP address is temporarily blocked for 15 minutes.');
      } else {
        const remaining = data.detail?.remaining_attempts;
        const remainingMsg = typeof remaining === 'number' ? ` (${remaining} attempts remaining before 15-min IP lockout)` : '';
        setAuthError((data.detail?.message || 'Access Denied: Invalid administrator password.') + remainingMsg);
      }
    } catch (err: any) {
      setAuthError('Network error: Unable to verify credentials with the security engine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_TOKEN_KEY);
    setIsAuthenticated(false);
    setAdminToken('');
    setPasswordInput('');
    setServerKeys([]);
    setGeneratedKey(null);
  };

  // Feature presets logic
  const handlePresetChange = (preset: 'all' | 'conversions' | 'compress' | 'security' | 'custom') => {
    setFeaturePreset(preset);
    if (preset === 'all') {
      setSelectedFeatures(['*']);
    } else if (preset === 'conversions') {
      setSelectedFeatures(['word_to_pdf', 'pdf_to_word', 'excel_to_pdf', 'ppt_to_pdf', 'jpg_to_pdf', 'pdf_to_jpg']);
    } else if (preset === 'compress') {
      setSelectedFeatures(['compress']);
    } else if (preset === 'security') {
      setSelectedFeatures(['protect', 'redact', 'ocr']);
    } else if (preset === 'custom') {
      if (selectedFeatures.includes('*')) {
        setSelectedFeatures(['compress', 'merge', 'word_to_pdf']);
      }
    }
  };

  const toggleFeature = (featId: string) => {
    setFeaturePreset('custom');
    if (selectedFeatures.includes(featId)) {
      const next = selectedFeatures.filter(f => f !== featId && f !== '*');
      setSelectedFeatures(next.length > 0 ? next : ['compress']);
    } else {
      const next = selectedFeatures.filter(f => f !== '*').concat(featId);
      setSelectedFeatures(next);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = partnerName.trim() || 'Client Partner';
    const effectiveRateLimit = tier === 'standard' ? 120 : tier === 'pro' ? 300 : 1000;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: finalName,
          tier,
          rate_limit: effectiveRateLimit,
          allowed_features: selectedFeatures,
          key_prefix: keyPrefix
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.key) {
        const newRecord: ServerApiKey = {
          partner_id: data.partner_id,
          name: data.name,
          tier: data.tier,
          rate_limit: data.rate_limit,
          allowed_features: data.allowed_features,
          created_at: data.created_at,
          key_preview: `${data.key.slice(0, 14)}...${data.key.slice(-4)}`,
          key: data.key
        };
        setGeneratedKey(newRecord);
        setServerKeys(prev => [newRecord, ...prev]);
        setPartnerName('');
      } else {
        alert(data.detail?.message || 'Failed to auto-activate key on server.');
      }
    } catch (err: any) {
      alert(`Error creating key: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (partnerId: string) => {
    if (!confirm(`Are you sure you want to revoke and delete key '${partnerId}'? It will immediately stop working.`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/keys/${partnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        setServerKeys(prev => prev.filter(k => k.partner_id !== partnerId));
        if (generatedKey?.partner_id === partnerId) {
          setGeneratedKey(null);
        }
      } else {
        alert('Could not revoke key from server.');
      }
    } catch (err: any) {
      alert(`Error revoking key: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(''), 2200);
  };

  const testKeyHealth = async (keyItem: ServerApiKey) => {
    setPingStatus(prev => ({ ...prev, [keyItem.partner_id]: 'Testing...' }));
    const startTime = Date.now();
    try {
      const authHeader = keyItem.key ? { 'X-API-Key': keyItem.key } : { 'Authorization': `Bearer ${adminToken}` };
      const res = await fetch(`${API_BASE_URL}/api/v1/health`, { headers: authHeader });
      const elapsed = Date.now() - startTime;
      if (res.ok) {
        setPingStatus(prev => ({ ...prev, [keyItem.partner_id]: `200 OK (${elapsed}ms)` }));
      } else {
        setPingStatus(prev => ({ ...prev, [keyItem.partner_id]: `Error: ${res.status}` }));
      }
    } catch (_) {
      setPingStatus(prev => ({ ...prev, [keyItem.partner_id]: 'Network Error' }));
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
              <ShieldAlert size={14} /> Server-Authenticated Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">API Key Management</h1>
            <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter administrator password. Verification is processed server-side with anti-brute-force rate limiting and zero Render configuration required.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                Administrator Password
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
                  disabled={isSubmitting}
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
                <div className="flex items-start gap-2 mt-2.5 text-xs font-semibold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20 leading-relaxed">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !passwordInput.trim()}
              className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Key size={18} />
                  <span>Authenticate & Unlock</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <span className="text-xs opacity-50">
              PDFBolt Anti-Brute-Force Shield • Max 5 Attempts per 15 Min
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Active Key strings for exporters
  const partnerKey = generatedKey?.key || generatedKey?.key_preview || 'pdfbolt_live_YOUR_KEY';

  // Exporter snippets
  const dropdownEmbedSnippet = `<!-- 1. All-in-One Dropdown Tool Widget for Client Website -->
<div data-pdfbolt-tool="dropdown" data-pdfbolt-key="${partnerKey}" data-pdfbolt-theme="light"></div>
<script src="https://pdfbolt.in/sdk/pdfbolt.js" async></script>`;

  const singleEmbedSnippet = `<!-- 1. Specific Tool Widget (e.g. Compress or Word to PDF) -->
<div data-pdfbolt-tool="compress" data-pdfbolt-key="${partnerKey}"></div>
<script src="https://pdfbolt.in/sdk/pdfbolt.js" async></script>`;

  const jsSdkSnippet = `// 1. Include SDK in HTML or import in Node.js
// <script src="https://pdfbolt.in/sdk/pdfbolt.js"></script>

const pdfbolt = new PDFBolt({ apiKey: "${partnerKey}" });

// Example: Compress a PDF to 100 KB
const compressedBlob = await pdfbolt.compress(fileInput.files[0], { targetKb: 100 });
PDFBolt.downloadBlob(compressedBlob, "compressed.pdf");`;

  const pythonSnippet = `import requests

API_KEY = "${partnerKey}"
url = "https://pdfbolt-api.onrender.com/api/v1/jobs"

files = {"file": open("document.pdf", "rb")}
data = {"operation": "compress", "options": '{"target_kb": 100}'}

res = requests.post(url, headers={"X-API-Key": API_KEY}, files=files, data=data)
print("Result:", res.json())`;

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
              <ShieldCheck size={14} /> Zero-Render Auto-Activation Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">API Key & Client Integration Portal</h1>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Keys are automatically registered and activated on the live server. Choose allowed features and export ready-to-run dropdown widgets.
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
          
          {/* Left Form: Key Generator (6 Cols) */}
          <div className={`lg:col-span-6 p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-2 text-amber-500 mb-3 font-bold text-xs uppercase tracking-wider">
                <Zap size={16} />
                <span>Automated Server Key Generation</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-5">Create & Activate Partner Key</h2>

              <form onSubmit={handleCreateKey} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                    Client / Partner Name
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Acme FinTech, Exam Portal, Legal Firm"
                    required
                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium border outline-none transition-all ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                    Tier & Rate Limit
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'standard', name: 'Standard', limit: '120 req/m' },
                      { id: 'pro', name: 'Pro', limit: '300 req/m' },
                      { id: 'enterprise', name: 'Enterprise', limit: '1000 req/m' }
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

                {/* FEATURE SELECTION DROPDOWN & CHECKBOXES */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider opacity-80">
                      Choose Allowed Features (Dropdown / Permissions)
                    </label>
                    <span className="text-[11px] font-bold text-amber-500">
                      {selectedFeatures.includes('*') ? 'All Features (100% Access)' : `${selectedFeatures.length} Features Selected`}
                    </span>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { id: 'all', label: 'All Features' },
                      { id: 'conversions', label: 'Conversions Only' },
                      { id: 'compress', label: 'Compress Only' },
                      { id: 'security', label: 'Security & OCR' },
                      { id: 'custom', label: 'Custom' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetChange(p.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          featurePreset === p.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : darkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Individual Feature Checklist */}
                  <div className={`p-3 rounded-2xl border max-h-[160px] overflow-y-auto space-y-1.5 ${
                    darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {ALL_AVAILABLE_FEATURES.map(feat => {
                      const isChecked = selectedFeatures.includes('*') || selectedFeatures.includes(feat.id);
                      return (
                        <div
                          key={feat.id}
                          onClick={() => toggleFeature(feat.id)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                            isChecked 
                              ? darkMode ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-50 text-blue-700 font-semibold'
                              : 'hover:bg-slate-500/10 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isChecked ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} className="opacity-40" />}
                            <span>{feat.label}</span>
                          </div>
                          <span className="text-[10px] opacity-60 uppercase">{feat.category}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Activating Key on Live Server...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>Generate & Activate API Key</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] opacity-60 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Zero-Render: Key activates in live server memory immediately without touching dashboard.</span>
            </div>
          </div>

          {/* Right Area: Generated Key Display & Client Code Exporters (6 Cols) */}
          <div className={`lg:col-span-6 p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-wider">
                  <Code size={16} />
                  <span>Client Dropdown & Embed Code</span>
                </div>

                {generatedKey && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Active for {generatedKey.name}
                  </span>
                )}
              </div>

              {/* Active Key Display Banner */}
              <div className={`p-4 rounded-2xl border mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="overflow-hidden w-full">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <span>Generated Client API Key</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">LIVE ACTIVE</span>
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
                  { id: 'dropdown_embed', label: 'Multi-Tool Dropdown Embed' },
                  { id: 'single_embed', label: 'Single Tool Embed' },
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
                    {activeTab === 'dropdown_embed' && dropdownEmbedSnippet}
                    {activeTab === 'single_embed' && singleEmbedSnippet}
                    {activeTab === 'js' && jsSdkSnippet}
                    {activeTab === 'python' && pythonSnippet}
                    {activeTab === 'curl' && curlSnippet}
                  </code>
                </pre>

                <button
                  onClick={() => {
                    const textToCopy = 
                      activeTab === 'dropdown_embed' ? dropdownEmbedSnippet :
                      activeTab === 'single_embed' ? singleEmbedSnippet :
                      activeTab === 'js' ? jsSdkSnippet :
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

            {/* Instant Hand-off Card */}
            <div className={`mt-5 p-4 rounded-2xl border text-xs space-y-1 ${
              darkMode ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Zero Server Friction Guaranteed:</span>
              </div>
              <p>Just copy the <strong>Multi-Tool Dropdown Embed</strong> code and send it to your client. Their website visitors will immediately see an interactive dropdown menu to pick and process any PDF tool!</p>
            </div>
          </div>
        </div>

        {/* Server Active Keys Vault Table */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight">Live Server Active Keys</h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Dynamically active partner keys stored directly in server memory and persistent storage.
              </p>
            </div>
            
            <button
              onClick={() => fetchServerKeys(adminToken)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw size={13} className={isLoadingKeys ? 'animate-spin' : ''} />
              <span>Refresh Keys</span>
            </button>
          </div>

          {serverKeys.length === 0 ? (
            <div className="py-12 text-center opacity-50 text-sm">
              {isLoadingKeys ? 'Loading registered keys from server...' : 'No partner keys registered yet. Use the form above to activate your first key!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="pb-3 font-bold uppercase tracking-wider">Client / Partner</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Key Preview</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Tier / Rate</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Allowed Features</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Created</th>
                    <th className="pb-3 font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {serverKeys.map((item) => (
                    <tr key={item.partner_id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-4 font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="py-4 font-mono font-bold text-amber-500">
                        {item.key_preview || (item.key ? `${item.key.slice(0, 14)}...` : 'Active')}
                      </td>
                      <td className="py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          item.tier === 'enterprise' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' :
                          item.tier === 'pro' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                          'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        }`}>
                          {item.tier.toUpperCase()} ({item.rate_limit} req/m)
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="max-w-[180px] truncate" title={item.allowed_features.join(', ')}>
                          {item.allowed_features.includes('*') ? (
                            <span className="text-emerald-500 font-bold">All Features (Full Suite)</span>
                          ) : (
                            <span className="opacity-80">{item.allowed_features.join(', ')}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 opacity-70">
                        {item.created_at}
                      </td>
                      <td className="py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => testKeyHealth(item)}
                          className="px-2.5 py-1 rounded-lg font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {pingStatus[item.partner_id] || 'Test Ping'}
                        </button>
                        {item.key && (
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratedKey(item);
                              copyToClipboard(item.key!, item.partner_id);
                            }}
                            className="px-2.5 py-1 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors inline-flex items-center gap-1"
                          >
                            {copiedSection === item.partner_id ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedSection === item.partner_id ? 'Copied' : 'Select'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(item.partner_id)}
                          className="px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Revoke and delete key from server"
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
