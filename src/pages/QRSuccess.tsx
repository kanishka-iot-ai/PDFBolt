import React, { useState, useEffect } from 'react';
import { CheckCircle, ShieldCheck, Laptop, Phone, ArrowRight, Lock, Key, AlertCircle, Download, Clock, Cloud, FileText } from 'lucide-react';
import { Link, useSearchParams, useParams } from 'react-router-dom';

const QRSuccess: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const { shareId } = useParams<{ shareId?: string }>();
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Document metadata
  const [filename, setFilename] = useState<string>('document.pdf');
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [requirePin, setRequirePin] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Legacy payload support
  const legacyPayload = searchParams.get('p');
  const authHash = searchParams.get('auth');

  useEffect(() => {
    const fetchShareInfo = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      // Case 1: Backend API /s/:shareId
      if (shareId) {
        try {
          const pinParam = pin ? `?pin=${encodeURIComponent(pin)}` : '';
          const res = await fetch(`/api/v1/qr-shares/${shareId}${pinParam}`);

          if (res.status === 410) {
            setIsExpired(true);
            setIsLoading(false);
            return;
          }

          if (res.status === 403) {
            setRequirePin(true);
            setIsVerified(false);
            setIsLoading(false);
            return;
          }

          if (!res.ok) {
            setErrorMessage("This QR share was not found or has been removed.");
            setIsLoading(false);
            return;
          }

          const data = await res.json();
          setFilename(data.filename || 'document.pdf');
          setFileSizeBytes(data.file_size_bytes || null);
          setExpiresAt(new Date(data.expires_at));
          setDownloadUrl(`/api/v1/qr-shares/${shareId}/download${pinParam}`);
          setIsVerified(true);
          setRequirePin(false);
        } catch (err: any) {
          console.error("Failed to load QR share:", err);
          setErrorMessage("Failed to connect to server. Please check your connection.");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Case 2: Legacy payload mode (?p=...)
      if (legacyPayload) {
        try {
          const data = JSON.parse(atob(legacyPayload));
          if (data.e) {
            const exp = new Date(data.e);
            setExpiresAt(exp);
            if (Date.now() > data.e) {
              setIsExpired(true);
              setIsLoading(false);
              return;
            }
          }

          if (authHash) {
            setRequirePin(true);
            setIsVerified(false);
          } else {
            setIsVerified(true);
          }

          if (data.k) {
            const { getSecureDownloadUrl } = await import('../services/storageService');
            try {
              const url = await getSecureDownloadUrl(data.k);
              setDownloadUrl(url);
            } catch (err) {
              setDownloadUrl(null);
            }
          }
        } catch (e) {
          setErrorMessage("Invalid share token.");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(false);
      setErrorMessage("No share ID provided.");
    };

    fetchShareInfo();
  }, [shareId, legacyPayload]);

  const handlePinSubmit = async () => {
    setIsAuthenticating(true);
    setPinError(null);

    if (shareId) {
      try {
        const res = await fetch(`/api/v1/qr-shares/${shareId}?pin=${encodeURIComponent(pin)}`);
        if (res.ok) {
          const data = await res.json();
          setFilename(data.filename || 'document.pdf');
          setFileSizeBytes(data.file_size_bytes || null);
          setExpiresAt(new Date(data.expires_at));
          setDownloadUrl(`/api/v1/qr-shares/${shareId}/download?pin=${encodeURIComponent(pin)}`);
          setIsVerified(true);
          setRequirePin(false);
        } else if (res.status === 403) {
          setPinError("Incorrect PIN. Please try again.");
          setPin('');
        } else if (res.status === 410) {
          setIsExpired(true);
        }
      } catch (err) {
        setPinError("Connection error while validating PIN.");
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    // Legacy auth hash check
    if (authHash && btoa(pin) === authHash) {
      setIsVerified(true);
      setRequirePin(false);
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPin('');
    }
    setIsAuthenticating(false);
  };

  // State: Expired / Revoked
  if (isExpired || isRevoked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className={`max-w-md w-full p-10 rounded-[3.5rem] border text-center shadow-2xl animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="inline-flex p-5 rounded-3xl bg-amber-500/10 mb-8 border border-amber-500/20">
            <Clock className="text-amber-500 w-10 h-10" />
          </div>
          <h1 className={`text-3xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Share Expired</h1>
          <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
            This QR share has expired and the file has been deleted.
          </p>
          <Link to="/" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
            Return to PDFBolt
          </Link>
        </div>
      </div>
    );
  }

  // State: Error / Not Found
  if (errorMessage) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className={`max-w-md w-full p-10 rounded-[3.5rem] border text-center shadow-2xl animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="inline-flex p-5 rounded-3xl bg-red-500/10 mb-8 border border-red-500/20">
            <AlertCircle className="text-red-500 w-10 h-10" />
          </div>
          <h1 className={`text-3xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Unavailable</h1>
          <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
            {errorMessage}
          </p>
          <Link to="/" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
            Return to PDFBolt
          </Link>
        </div>
      </div>
    );
  }

  // State: Loading
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verifying Secure Share...</p>
        </div>
      </div>
    );
  }

  // State: PIN Verification Required
  if (requirePin && !isVerified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className={`max-w-md w-full p-10 rounded-[3.5rem] border text-center shadow-2xl animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="inline-flex p-5 rounded-3xl bg-red-600/10 mb-8 border border-red-600/20">
            <Lock className="text-red-600 w-10 h-10" />
          </div>
          <h1 className={`text-3xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>PIN Required</h1>
          <p className="text-sm font-medium text-slate-500 mb-8 uppercase tracking-widest">The sender protected this document with a PIN</p>

          <div className="space-y-6">
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="0 0 0 0"
                className={`w-full p-6 rounded-2xl border-2 outline-none font-mono text-center text-3xl tracking-[0.5em] transition-all ${pinError ? 'border-red-500 bg-red-500/5 ring-4 ring-red-500/10' : darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-red-600' : 'bg-slate-50 border-slate-200 focus:border-red-600'}`}
              />
              {pinError && (
                <div className="absolute -bottom-6 left-0 w-full text-[10px] font-black text-red-500 flex items-center justify-center gap-1 uppercase">
                  <AlertCircle size={10} /> {pinError}
                </div>
              )}
            </div>

            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4 || isAuthenticating}
              className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
            >
              {isAuthenticating ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Key size={20} /> Unlock Document</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State: Verified & Ready for Download
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className={`max-w-xl w-full p-12 rounded-[3.5rem] border text-center shadow-2xl animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="inline-flex p-6 rounded-full bg-green-50 dark:bg-green-900/20 mb-8 border-4 border-green-100 dark:border-green-800 animate-pulse">
          <CheckCircle className="text-green-500 w-16 h-16" />
        </div>

        <h1 className={`text-4xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Secure Document Ready</h1>
        <p className={`text-lg font-medium mb-8 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          You have established a secure link to download <span className="text-yellow-600 font-bold">{filename}</span>.
        </p>

        {/* Document Info Card */}
        <div className={`p-6 rounded-2xl mb-8 text-left border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-yellow-600" size={20} />
            <span className="font-black text-sm truncate">{filename}</span>
          </div>
          {fileSizeBytes && (
            <p className="text-xs text-slate-400 font-bold ml-8 mb-2">
              Size: {(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}
          {expiresAt && (
            <p className="text-xs text-slate-500 font-bold ml-8 flex items-center gap-1.5">
              <Clock size={12} className="text-amber-500" />
              Valid until: {expiresAt.toLocaleString()}
            </p>
          )}
        </div>

        {/* Download Button */}
        {downloadUrl && (
          <div className="mb-8">
            <a
              href={downloadUrl}
              download={filename}
              className="w-full py-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-3xl font-black text-2xl shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-4 active:scale-95"
            >
              <Download size={32} /> Download PDF
            </a>
          </div>
        )}

        {/* Retention Policy Notice */}
        <div className={`p-6 rounded-2xl text-left mb-8 border-2 border-green-500/20 ${darkMode ? 'bg-green-950/20' : 'bg-green-50/50'}`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-green-600 shrink-0 w-5 h-5 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed text-green-900/70 dark:text-green-400/70">
              This file is stored temporarily and will be automatically deleted when the share expires.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <Link to="/" className="flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">
            Explore All PDF Tools <ArrowRight size={16} />
          </Link>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">PDFBolt Cloud Storage Engine • Encrypted Direct Stream</p>
        </div>
      </div>
    </div>
  );
};

export default QRSuccess;
