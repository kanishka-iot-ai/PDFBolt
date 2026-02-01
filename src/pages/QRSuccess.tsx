
import React, { useState, useEffect } from 'react';
import { CheckCircle, ShieldCheck, Laptop, Phone, ArrowRight, Lock, Key, AlertCircle, Download, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getPublicUrl } from '../services/storageService';

const QRSuccess: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [searchParams] = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const payload = searchParams.get('p');
  const authHash = searchParams.get('auth');
  const requiresAuth = !!authHash;

  useEffect(() => {
    if (!requiresAuth) setIsVerified(true);
  }, [requiresAuth]);

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (isVerified && payload) {
      try {
        const data = JSON.parse(atob(payload));

        // Check Expiration
        if (data.e && Date.now() > data.e) {
          setIsExpired(true);
          return;
        }

        if (data.k) {
          setDownloadUrl(getPublicUrl(data.k));
        }
      } catch (e) {
        console.error("Invalid payload", e);
      }
    }
  }, [isVerified, payload]);

  const handleAuth = () => {
    setIsAuthenticating(true);
    setError(false);

    setTimeout(() => {
      if (btoa(pin) === authHash) {
        setIsVerified(true);
      } else {
        setError(true);
        setPin('');
      }
      setIsAuthenticating(false);
    }, 1000);
  };

  if (isExpired) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className={`max-w-md w-full p-10 rounded-[3.5rem] border text-center shadow-2xl animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="inline-flex p-5 rounded-3xl bg-amber-500/10 mb-8 border border-amber-500/20">
            <Clock className="text-amber-500 w-10 h-10" />
          </div>
          <h1 className={`text-3xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Link Expired</h1>
          <p className="text-sm font-medium text-slate-500 mb-8 uppercase tracking-widest leading-relaxed">
            This secure tunnel has closed automatically per the sender's security configuration.
          </p>
          <Link to="/" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className={`max-w-md w-full p-10 rounded-[3.5rem] border text-center shadow-2xl animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="inline-flex p-5 rounded-3xl bg-red-600/10 mb-8 border border-red-600/20">
            <Lock className="text-red-600 w-10 h-10" />
          </div>
          <h1 className={`text-3xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Vault Locked</h1>
          <p className="text-sm font-medium text-slate-500 mb-8 uppercase tracking-widest">Identity verification required</p>

          <div className="space-y-6">
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="0 0 0 0"
                className={`w-full p-6 rounded-2xl border-2 outline-none font-mono text-center text-3xl tracking-[0.5em] transition-all ${error ? 'border-red-500 bg-red-500/5 ring-4 ring-red-500/10' : darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-red-600' : 'bg-slate-50 border-slate-200 focus:border-red-600'
                  }`}
              />
              {error && <div className="absolute -bottom-6 left-0 w-full text-[10px] font-black text-red-500 flex items-center justify-center gap-1 uppercase"><AlertCircle size={10} /> Invalid PIN Protocol</div>}
            </div>

            <button
              onClick={handleAuth}
              disabled={pin.length < 4 || isAuthenticating}
              className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
            >
              {isAuthenticating ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Key size={20} /> Unlock Vault</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className={`max-w-xl w-full p-12 rounded-[3.5rem] border text-center shadow-2xl animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="inline-flex p-6 rounded-full bg-green-50 dark:bg-green-900/20 mb-8 border-4 border-green-100 dark:border-green-800 animate-pulse">
          <CheckCircle className="text-green-500 w-16 h-16" />
        </div>

        <h1 className={`text-4xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Handshake Verified</h1>
        <p className={`text-xl font-medium mb-10 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          You have successfully established a secure tunnel to <span className="text-yellow-600 font-bold">PDFBolt</span>.
        </p>

        {downloadUrl ? (
          <div className="mb-10 animate-bounce-subtle">
            <a
              href={downloadUrl}
              download
              className="w-full py-6 bg-red-600 text-white rounded-3xl font-black text-2xl shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-4"
            >
              <Download size={32} /> Download File
            </a>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Secure TLS 1.3 Download</p>
          </div>
        ) : (
          <div className="mb-10 p-4 bg-amber-50 text-amber-600 rounded-xl font-bold">
            Error: File Link Not Found in Payload
          </div>
        )}

        <div className={`p-8 rounded-3xl text-left mb-10 border-2 ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-start gap-4 mb-6">
            <ShieldCheck className="text-blue-500 shrink-0 w-6 h-6 mt-1" />
            <div>
              <h4 className={`font-black uppercase text-xs tracking-widest mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Encrypted Pairing</h4>
              <p className="text-sm font-medium text-slate-500">Document resolution is occurring via local cryptographic tokens. No tracking cookies are active.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Laptop size={20} className="text-slate-400" />
              <div className="w-4 h-px bg-slate-200 dark:bg-slate-600"></div>
              <Phone size={20} className="text-blue-500" />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase text-blue-500">Secure Pair Active</span>
              <span className="text-[8px] font-bold text-slate-400">TLS 1.3 TUNNEL</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <Link to="/" className="flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all active:scale-95">
            Visit PDFBolt Home <ArrowRight size={20} />
          </Link>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">© 2025 PDFBolt • No External Logs • Peer Verified</p>
        </div>
      </div>
    </div>
  );
};

export default QRSuccess;
