import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cookie, Check, X } from 'lucide-react';

interface CookieConsentProps {
  darkMode: boolean;
}

const CONSENT_STORAGE_KEY = 'pdfbolt.cookie_consent';

const CookieConsent: React.FC<CookieConsentProps> = ({ darkMode }) => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!saved) {
        // Small delay for smooth UX
        const timer = setTimeout(() => setShowBanner(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage access denied/restricted
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
        status: 'accepted',
        timestamp: Date.now(),
        adPersonalization: true
      }));
    } catch {}
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
        status: 'essential_only',
        timestamp: Date.now(),
        adPersonalization: false
      }));

      // Tell AdSense to serve non-personalized ads
      if (typeof window !== 'undefined') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).requestNonPersonalizedAds = 1;
      }
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-slideUp"
      aria-label="Cookie and Privacy Consent"
    >
      <div className={`p-5 rounded-3xl border shadow-2xl backdrop-blur-xl ${
        darkMode ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-start gap-3.5 mb-3">
          <div className="p-2.5 rounded-2xl bg-yellow-500/10 text-yellow-500 shrink-0 mt-0.5">
            <Cookie size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black tracking-tight">Privacy & Advertising Preferences</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              PDFBolt processes all documents <strong>100% locally in your browser</strong>. We use cookies to enhance navigation and deliver relevant advertisements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAcceptAll}
            className="flex-1 py-2 px-3 bg-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-yellow-400 transition-all shadow-md text-center"
          >
            Accept All
          </button>
          <button
            onClick={handleEssentialOnly}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Essential Only
          </button>
          <Link
            to="/privacy"
            className="text-[11px] font-semibold text-slate-400 hover:text-yellow-500 underline ml-1"
          >
            Privacy
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default CookieConsent;
