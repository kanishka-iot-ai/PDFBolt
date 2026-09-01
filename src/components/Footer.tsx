import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle, Headphones, AlertTriangle } from 'lucide-react';

const Footer: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const handleWipeData = async () => {
    setIsWiping(true);
    try {
      const { clearAllAppData } = await import('../utils/privacy');
      await clearAllAppData();
      setShowWipeModal(false);
      window.location.reload();
    } catch {
      setIsWiping(false);
      setShowWipeModal(false);
    }
  };

  return (
    <footer className={`py-20 border-t mt-auto transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand & Privacy Column */}
        <div className="lg:col-span-1">
          <Link to="/" className="inline-block mb-4 group" aria-label="Go to PDFBolt home">
            <img 
              src="/pdfbolt-logo.webp" 
              alt="PDFBolt" 
              width="150"
              height="40"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
          </Link>
          <p className="text-xs font-medium leading-relaxed mb-6">
            Privacy-first browser-based PDF toolkit. 100% client-side WebAssembly execution with zero server file transfers.
          </p>
          <div className="flex gap-2 items-center flex-wrap">
            <div className={`p-2 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-yellow-500' : 'bg-white shadow-sm text-yellow-600'}`}>
              <Lock size={16} />
            </div>
            <div className={`p-2 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-green-500' : 'bg-white shadow-sm text-green-600'}`}>
              <ShieldCheck size={16} />
            </div>
            <a 
              href="https://www.trustpilot.com/review/pdfbolt.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-transform hover:scale-105 ${darkMode ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-white shadow-sm text-emerald-600 border border-slate-200'}`}
              aria-label="Trustpilot Reviews"
            >
              ★ Trustpilot
            </a>
          </div>
        </div>

        {/* Popular Tools */}
        <nav aria-label="Popular PDF Tools">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>PDF Tools</p>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li><Link to="/analyze-pdf" className="text-yellow-700 dark:text-yellow-400 font-bold hover:underline">✨ AI PDF Analyzer</Link></li>
            <li><Link to="/merge-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Merge PDF</Link></li>
            <li><Link to="/split-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Split PDF</Link></li>
            <li><Link to="/compress-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Compress PDF</Link></li>
            <li><Link to="/pdf-to-word" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF to Word</Link></li>
            <li><Link to="/pdf-to-excel" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF to Excel</Link></li>
            <li><Link to="/redact-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Redact PDF</Link></li>
            <li><Link to="/ocr-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">OCR PDF</Link></li>
            <li><Link to="/tools" className="text-yellow-700 dark:text-yellow-400 font-bold hover:underline">View All 25+ Tools →</Link></li>
          </ul>
        </nav>

        {/* How-To Guides */}
        <nav aria-label="PDF How-To Guides">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Knowledge Base</p>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li><Link to="/guides/how-to-convert-pdf-to-word" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Convert PDF to Word</Link></li>
            <li><Link to="/guides/how-to-compress-a-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Compress Below 2MB</Link></li>
            <li><Link to="/guides/how-to-merge-pdf-files" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Combine Multiple PDFs</Link></li>
            <li><Link to="/guides/how-to-redact-a-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Permanently Redact Data</Link></li>
            <li><Link to="/guides/how-to-protect-a-pdf" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Password Protect PDF</Link></li>
            <li><Link to="/guides" className="text-yellow-700 dark:text-yellow-400 font-bold hover:underline">All How-To Guides →</Link></li>
          </ul>
        </nav>

        {/* Workflows & Reference */}
        <nav aria-label="Workflows & Encyclopedia">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Ecosystem</p>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li><Link to="/student-pdf-tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Student Study Workflow</Link></li>
            <li><Link to="/business-pdf-tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Business Legal Workflow</Link></li>
            <li><Link to="/developer-pdf-tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Developer Architecture</Link></li>
            <li><Link to="/encyclopedia" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Format Encyclopedia</Link></li>
            <li><Link to="/compare/online-pdf-tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Privacy Comparison</Link></li>
            <li><Link to="/tools/pdf-size-calculator" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Size Calculator</Link></li>
            <li><Link to="/test-files" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Sample Test Files</Link></li>
          </ul>
        </nav>

        {/* Company & Support */}
        <div>
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Support & Legal</p>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li><Link to="/about" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">About PDFBolt</Link></li>
            <li><Link to="/contact" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors flex items-center gap-1.5"><Headphones size={13} /> Contact & Support</Link></li>
            <li><Link to="/privacy" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-500" /> Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Terms of Service</Link></li>
            <li><Link to="/offline-mode" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors flex items-center gap-1.5"><CheckCircle size={13} className="text-green-500" /> Offline PWA</Link></li>
            <li><Link to="/cookies" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Cookie Preferences</Link></li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center sm:text-left">
          Files are processed entirely within your browser using WebAssembly. No documents are uploaded to external servers.
        </p>

        <div className="flex items-center gap-6">
          <div className="flex gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setShowWipeModal(true)}
              className="text-xs font-black uppercase tracking-widest text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors py-1 cursor-pointer"
            >
              Wipe Site Data
            </button>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">© {new Date().getFullYear()} PDFBolt. All rights reserved.</p>
        </div>
      </div>

      {/* Custom Wipe Data Modal */}
      {showWipeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wipe-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
        >
          <div className={`w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-scaleIn ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 id="wipe-modal-title" className={`text-2xl font-black text-center mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Wipe All Site Data?</h3>
            <p className={`text-center font-medium mb-8 text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              This action will clear all cached tools, fonts, and application data (approx 24MB). You will need to re-download these assets on your next visit.
            </p>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setShowWipeModal(false)}
                disabled={isWiping}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-colors ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleWipeData}
                disabled={isWiping}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 disabled:opacity-50"
              >
                {isWiping ? 'Wiping...' : 'Yes, Wipe Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
