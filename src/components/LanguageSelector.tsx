import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  isComplete: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English', dir: 'ltr', isComplete: true },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', dir: 'ltr', isComplete: true },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', isComplete: false },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', dir: 'ltr', isComplete: false },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', dir: 'ltr', isComplete: false },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', dir: 'ltr', isComplete: false },
  { code: 'pt-BR', name: 'Portuguese (BR)', nativeName: 'Português', dir: 'ltr', isComplete: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', isComplete: false },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', dir: 'ltr', isComplete: false },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', isComplete: false },
];

export const LanguageSelector: React.FC<{ darkMode: boolean; dropUp?: boolean }> = ({ darkMode, dropUp = false }) => {
  const [selectedCode, setSelectedCode] = useState<string>('en-US');
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Explicit saved user language
    const saved = localStorage.getItem('pdfbolt_lang');
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      applyLanguage(saved);
      return;
    }

    // 2. Safe navigator.languages detection
    const browserLanguages = navigator.languages || [navigator.language || 'en-US'];
    let matched = 'en-US';
    for (const bLang of browserLanguages) {
      const match = SUPPORTED_LANGUAGES.find(l => 
        l.code.toLowerCase() === bLang.toLowerCase() || 
        l.code.split('-')[0].toLowerCase() === bLang.split('-')[0].toLowerCase()
      );
      if (match && match.isComplete) {
        matched = match.code;
        break;
      }
    }

    applyLanguage(matched);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyLanguage = (code: string) => {
    setSelectedCode(code);
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
    
    // Update DOM attributes
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir;
    
    // Persist locally
    localStorage.setItem('pdfbolt_lang', lang.code);

    if (!lang.isComplete) {
      setNotice(`${lang.name} translation is in staging. Interface remains in English.`);
      setTimeout(() => setNotice(null), 4000);
    } else {
      setNotice(null);
    }
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedCode) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select language"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
          darkMode
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
        }`}
      >
        <Globe size={14} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
        <span className="truncate max-w-[80px]">{currentLang.nativeName}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-48 rounded-2xl shadow-2xl border py-1.5 z-50 animate-fadeIn ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Select Language
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === selectedCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    applyLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold'
                      : darkMode
                        ? 'hover:bg-slate-800'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] opacity-60">({lang.name})</span>
                  </span>
                  {isSelected && <Check size={13} className="text-yellow-600 dark:text-yellow-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {notice && (
        <div 
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-medium shadow-xl border border-slate-700 z-50 animate-fadeIn"
        >
          {notice}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
