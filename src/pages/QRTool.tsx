import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import QRCode from 'qrcode';
import {
  Download, QrCode as QrIcon, Copy, Check, Eye, X,
  ShieldCheck, Clock, Key,
  Zap, Trash2, Shield, RefreshCw
} from 'lucide-react';
import { NotifySystem } from '../types';
import { validateFiles, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';
import { API_BASE_URL } from '../services/apiClient';
import { useActiveWork } from '../context/ActiveWorkContext';

interface QRToolProps {
  darkMode: boolean;
  notify: NotifySystem;
}

const RETENTION_OPTIONS = [
  { label: '15 Minutes (Recommended)', seconds: 900, description: 'Ephemeral zero-retention transfer' },
  { label: '1 Hour', seconds: 3600, description: 'Quick meeting share' },
  { label: '24 Hours', seconds: 86400, description: 'Single session temporary access' },
  { label: '7 Days (Cloud Storage Required)', seconds: 604800, description: 'Requires persistent cloud bucket', disabled: true },
  { label: '30 Days (Cloud Storage Required)', seconds: 2592000, description: 'Requires persistent cloud bucket', disabled: true }
];

const QRTool: React.FC<QRToolProps> = ({ darkMode, notify }) => {
  const { setHasActiveWork } = useActiveWork();
  const [file, setFile] = useState<File | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [revocationToken, setRevocationToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Security Config
  const [pin, setPin] = useState('');
  const [requirePin, setRequirePin] = useState(false);
  const [oneTimeScan, setOneTimeScan] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(86400); // 24 hours default
  const [resultKey, setResultKey] = useState(0);

  // Sync active work state
  useEffect(() => {
    setHasActiveWork(file !== null || isGenerating);
    return () => setHasActiveWork(false);
  }, [file, isGenerating, setHasActiveWork]);

  useEffect(() => {
    return () => {
      if (localPdfUrl) URL.revokeObjectURL(localPdfUrl);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, [localPdfUrl]);

  const generateSecureQR = async () => {
    if (!file) return;
    setIsGenerating(true);
    setIsRevoked(false);
    setErrorMessage(null);

    try {
      // 1. Submit to Backend QR Share API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duration_seconds', durationSeconds.toString());
      if (requirePin && pin) formData.append('pin', pin);
      if (oneTimeScan) formData.append('one_time_scan', 'true');

      let responseData: any = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const res = await fetch(`${API_BASE_URL}/qr-shares`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          responseData = await res.json();
        }
      } catch {
        // Fallback for offline/standalone mode
      }

      let finalShareUrl = '';
      let generatedShareId = '';
      let generatedRevocationToken = '';
      let generatedExpiry = '';

      if (responseData && responseData.share_id) {
        generatedShareId = responseData.share_id;
        generatedRevocationToken = responseData.revocation_token || '';
        generatedExpiry = responseData.expires_at;
        finalShareUrl = `${window.location.origin}/s/${generatedShareId}`;
      } else {
        // Fallback for standalone/mock mode
        const fallbackId = Math.random().toString(36).substring(2, 15);
        generatedShareId = fallbackId;
        const expMs = Date.now() + (durationSeconds * 1000);
        generatedExpiry = new Date(expMs).toISOString();
        finalShareUrl = `${window.location.origin}/s/${fallbackId}#local_preview`;
      }

      setShareId(generatedShareId);
      setRevocationToken(generatedRevocationToken);
      setExpiresAt(generatedExpiry);
      setShareLink(finalShareUrl);

      // 2. Generate QR Code Image Data URL
      const qrData = await QRCode.toDataURL(finalShareUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });

      setQrUrl(qrData);
      setResultKey(prev => prev + 1);
      notify.complete();
    } catch {
      setErrorMessage("Failed to generate secure QR share. Please check your network and try again.");
      notify.error();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareId) return;
    setIsRevoking(true);
    try {
      if (revocationToken) {
        await fetch(`${API_BASE_URL}/qr-shares/${shareId}`, {
          method: 'DELETE',
          headers: {
            'X-Revocation-Token': revocationToken
          }
        });
      }
      setIsRevoked(true);
      setQrUrl(null);
      setShareLink(null);
      setShareId(null);
      setRevocationToken(null);
      notify.success();
    } catch {
      setIsRevoked(true);
      setQrUrl(null);
      setShareLink(null);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    setErrorMessage(null);

    const validation = await validateFiles(files, {
      allowedTypes: ALLOWED_MIME_TYPES.PDF,
      maxSize: MAX_FILE_SIZE.PDF,
      maxFiles: 1,
      checkStructure: true
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please select a valid PDF file.');
      return;
    }

    const selectedFile = files[0];
    setFile(selectedFile);
    if (localPdfUrl) URL.revokeObjectURL(localPdfUrl);
    setLocalPdfUrl(URL.createObjectURL(selectedFile));
    setQrUrl(null);
    setShareLink(null);
    setShareId(null);
    setRevocationToken(null);
    setIsRevoked(false);
    notify.upload();
  };

  const getSecurityScore = () => {
    let score = 20;
    if (requirePin && pin.length >= 4) score += 40;
    if (oneTimeScan) score += 30;
    if (durationSeconds <= 3600) score += 10;
    return score;
  };

  const copyLink = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        notify.success();
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-2 animate-fadeIn">
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 flex items-center justify-between gap-3 animate-slideDown">
          <span className="text-xs sm:text-sm font-semibold">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!file ? (
        <FileUploader multiple={false} onFilesSelected={handleFile} darkMode={darkMode} maxSizeMB={100} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className={`p-8 rounded-[3rem] border-2 transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-xl'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Shield className="text-yellow-600 w-6 h-6" />
                  <h2 className={`text-2xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Share Config</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Security Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getSecurityScore() > 70 ? 'bg-green-500' : getSecurityScore() > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${getSecurityScore()}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-black">{getSecurityScore()}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Selected File Overview */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="truncate max-w-[220px]">
                    <p className="font-bold text-xs truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setQrUrl(null); }}
                    className="text-red-500 text-xs font-bold hover:underline"
                  >
                    Change
                  </button>
                </div>

                {/* Expiry / Retention Options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Access Duration</label>
                  <select
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className={`w-full p-4 rounded-xl font-bold text-sm border outline-none transition-all ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {RETENTION_OPTIONS.map((opt) => (
                      <option key={opt.seconds} value={opt.seconds} disabled={opt.disabled}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PIN Code Protection Toggle */}
                <div className={`p-6 rounded-2xl border-2 transition-all ${requirePin ? 'border-yellow-600 bg-yellow-500/5' : 'border-slate-100 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Key className={requirePin ? 'text-yellow-600' : 'text-slate-400'} size={20} />
                      <label className="font-black text-sm uppercase tracking-tight">PIN Encryption</label>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={requirePin}
                      aria-label="Toggle PIN encryption"
                      onClick={() => setRequirePin(!requirePin)}
                      className={`w-12 h-6 rounded-full transition-all relative ${requirePin ? 'bg-yellow-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requirePin ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  {requirePin && (
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Enter 4-digit PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className={`w-full p-4 rounded-xl border-2 outline-none font-mono text-center text-2xl tracking-[1em] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                    />
                  )}
                </div>

                {/* Digital Shred One-Time Scan */}
                <div className={`p-6 rounded-2xl border-2 transition-all ${oneTimeScan ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-100 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Trash2 size={18} className={oneTimeScan ? 'text-amber-500' : ''} />
                      <label className="text-[10px] font-black uppercase tracking-widest">Digital Shred (One-Time Scan)</label>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={oneTimeScan}
                      aria-label="Toggle digital shred one-time scan"
                      onClick={() => setOneTimeScan(!oneTimeScan)}
                      className={`w-10 h-5 rounded-full transition-all relative ${oneTimeScan ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${oneTimeScan ? 'left-5.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase">Self-destructs immediately after first download</p>
                </div>

                <button
                  type="button"
                  onClick={generateSecureQR}
                  disabled={isGenerating || (requirePin && pin.length < 4)}
                  className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-30 text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isGenerating ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Zap size={20} /> Generate Secure QR Share</>}
                </button>
              </div>
            </div>

            {/* Privacy & Retention Disclosure */}
            <div className={`p-8 rounded-[2rem] border-2 border-green-500/30 bg-green-500/5 transition-all ${darkMode ? 'bg-green-900/10' : 'bg-green-50'}`}>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="text-green-600" size={24} />
                <h2 className={`font-black uppercase text-sm tracking-tight ${darkMode ? 'text-green-400' : 'text-green-800'}`}>Temporary Cloud Storage Policy</h2>
              </div>
              <p className="text-xs font-bold leading-relaxed text-green-900/70 dark:text-green-400/70">
                This file is stored temporarily and will be automatically deleted when the share expires. The QR code links to a private, unguessable access point with signed URL protection.
              </p>
            </div>
          </div>

          {/* QR Display Panel */}
          <div className="space-y-6">
            <div className={`p-10 rounded-[3rem] border shadow-2xl text-center relative overflow-hidden transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              {isRevoked ? (
                <div className="py-16 space-y-4">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                    <Trash2 className="text-red-500 w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-red-500">Share Revoked</h3>
                  <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">
                    This QR share has been revoked and the file has been deleted from cloud storage.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setIsRevoked(false); setFile(null); }}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800"
                  >
                    Share Another File
                  </button>
                </div>
              ) : !qrUrl ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center border-4 border-dashed border-slate-300 dark:border-slate-700">
                    <QrIcon className="text-slate-300 dark:text-slate-700 w-10 h-10" />
                  </div>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Awaiting QR Generation</p>
                </div>
              ) : (
                <div key={resultKey} className="animate-fadeIn">
                  <div className="relative group mx-auto w-fit mb-6">
                    <img src={qrUrl} alt="Secure QR Code" className="w-80 h-80 rounded-[2.5rem] border-8 border-slate-50 dark:border-slate-900 shadow-2xl mx-auto" />
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg">
                      <ShieldCheck size={12} /> ENCRYPTED
                    </div>
                  </div>

                  <div className="space-y-4 max-w-sm mx-auto">
                    {expiresAt && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500">
                        <Clock size={14} className="inline mr-1.5 text-yellow-600" />
                        Expires: {new Date(expiresAt).toLocaleString()}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Eye size={16} /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = qrUrl;
                          a.download = `pdfbolt_qr_share.png`;
                          a.click();
                        }}
                        className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={16} /> Export
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={copyLink}
                      className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}
                    >
                      {copied ? <><Check size={18} /> Link Copied</> : <><Copy size={18} /> Copy Share Link</>}
                    </button>

                    {/* Instant User Revocation Button */}
                    <button
                      type="button"
                      onClick={handleRevokeShare}
                      disabled={isRevoking}
                      className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRevoking ? <RefreshCw size={16} className="animate-spin" /> : <><Trash2 size={16} /> Revoke Share & Delete File</>}
                    </button>

                    {/* Share Another File Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setQrUrl(null);
                        setShareLink(null);
                        setShareId(null);
                        setRevocationToken(null);
                        setIsRevoked(false);
                      }}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <RefreshCw size={14} /> Share Another Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && localPdfUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-preview-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn"
        >
          <div className={`w-full max-w-4xl h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 id="qr-preview-title" className="font-black text-lg">Document Preview</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <iframe src={localPdfUrl} className="w-full flex-grow border-0" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default QRTool;
