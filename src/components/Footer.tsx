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
    <footer className={`py-16 border-t mt-auto transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        
        {/* Col 1: Brand & Privacy Column */}
        <div className="sm:col-span-2 md:col-span-1 lg:col-span-1">
          <Link to="/" className="inline-block mb-4 group" aria-label="Go to PDFBolt home">
            <img 
              src="/pdfbolt-logo.webp" 
              alt="PDFBolt" 
              width="98"
              height="80"
              loading="lazy"
              decoding="async"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
          </Link>
          <p className="text-xs font-medium leading-relaxed mb-6">
            Privacy-first browser-based PDF toolkit. Local WebAssembly processing and ephemeral zero-retention cloud conversions.
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
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-transform hover:scale-105 ${darkMode ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-white shadow-sm text-emerald-700 border border-slate-200'}`}
              aria-label="Trustpilot Reviews"
            >
              ★ Trustpilot
            </a>
          </div>
          <div className="mt-3.5">
            <a 
              href="https://launchstag.com/p/pdfbolt" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center transition-transform hover:scale-105"
              aria-label="Featured on Launchstag"
            >
              <img 
                src="https://launchstag.com/badge-light.svg" 
                alt="Featured on Launchstag" 
                width="198" 
                height="62" 
                loading="lazy" 
                decoding="async" 
                className={`${darkMode ? 'hidden' : 'block'} h-9 w-auto object-contain`} 
              />
              <img 
                src="https://launchstag.com/badge-dark.svg" 
                alt="Featured on Launchstag" 
                width="198" 
                height="62" 
                loading="lazy" 
                decoding="async" 
                className={`${darkMode ? 'block' : 'hidden'} h-9 w-auto object-contain`} 
              />
            </a>
          </div>
        </div>

        {/* Col 2: Core PDF Tools */}
        <nav aria-label="Core PDF Tools">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>PDF Tools</p>
          <ul className="space-y-2 text-xs font-semibold">
            <li><Link to="/analyze-pdf/" className="text-yellow-700 dark:text-yellow-400 font-bold hover:underline">PDF Document Inspector</Link></li>
            <li><Link to="/merge-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Merge PDF</Link></li>
            <li><Link to="/split-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Split PDF</Link></li>
            <li><Link to="/compress-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Compress PDF</Link></li>
            <li><Link to="/pdf-to-word/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF to Word</Link></li>
            <li><Link to="/pdf-to-excel/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF to Excel</Link></li>
            <li><Link to="/edit-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Edit PDF</Link></li>
            <li><Link to="/redact-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Redact PDF</Link></li>
            <li><Link to="/ocr-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">OCR PDF</Link></li>
            <li><Link to="/scan-to-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Scan to PDF</Link></li>
            <li><Link to="/color-pdf-to-black-and-white/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Color PDF to B&W</Link></li>
            <li><Link to="/tools/" className="text-yellow-700 dark:text-yellow-400 font-bold hover:underline">View All 25+ Tools →</Link></li>
          </ul>
        </nav>

        {/* Col 3: Target Size Compressors (GSC High-Impression Queries) */}
        <nav aria-label="Target Size Compressors">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Target Size</p>
          <ul className="space-y-2 text-xs font-semibold">
            <li><Link to="/compress-pdf-to-300kb/" className="text-yellow-700 dark:text-yellow-400 font-bold hover:underline">300KB Compressor</Link></li>
            <li><Link to="/compress-pdf-to-20kb/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">20KB Compressor</Link></li>
            <li><Link to="/compress-pdf-to-50kb/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">50KB Compressor</Link></li>
            <li><Link to="/compress-pdf-to-100kb/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">100KB Compressor</Link></li>
            <li><Link to="/compress-pdf-to-200kb/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">200KB Compressor</Link></li>
            <li><Link to="/compress-pdf-to-500kb/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">500KB Compressor</Link></li>
            <li><Link to="/compress-pdf-to-1mb/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">1MB Compressor</Link></li>
            <li><Link to="/pdf-size-reducer-for-government-portal/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Govt Portal Reducer</Link></li>
            <li><Link to="/tools/pdf-size-calculator/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Size Calculator</Link></li>
          </ul>
        </nav>

        {/* Col 4: Exam & Portal Tools (High CTR Niches) */}
        <nav aria-label="Government and Exam Portal Tools">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Exam & Govt</p>
          <ul className="space-y-2 text-xs font-semibold">
            <li><Link to="/compress-pdf-for-rrb/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">RRB Application</Link></li>
            <li><Link to="/compress-pdf-for-jee/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">JEE Main Form</Link></li>
            <li><Link to="/compress-pdf-for-ssc/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">SSC CGL / CHSL</Link></li>
            <li><Link to="/compress-pdf-for-upsc/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">UPSC OTR & CSE</Link></li>
            <li><Link to="/compress-pdf-for-neet/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">NEET UG Portal</Link></li>
            <li><Link to="/compress-pdf-for-ibps/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">IBPS Bank Exam</Link></li>
            <li><Link to="/merge-aadhaar-and-pan-card/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Merge Aadhaar & PAN</Link></li>
            <li><Link to="/merge-documents-for-visa-application/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Visa Documents Merge</Link></li>
            <li><Link to="/jpg-to-pdf-for-exam/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">JPG to PDF for Exam</Link></li>
            <li><Link to="/pdf-to-jpg-for-aadhaar/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF to JPG for Aadhaar</Link></li>
          </ul>
        </nav>

        {/* Col 5: Knowledge Base & Alternatives */}
        <nav aria-label="Knowledge Base and Alternatives">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Guides & Compare</p>
          <ul className="space-y-2 text-xs font-semibold">
            <li><Link to="/guides/how-to-edit-a-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">How to Edit a PDF</Link></li>
            <li><Link to="/guides/how-to-sign-a-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">How to Sign a PDF</Link></li>
            <li><Link to="/guides/how-to-ocr-a-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">How to OCR a PDF</Link></li>
            <li><Link to="/guides/how-to-convert-pdf-to-word/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Convert PDF to Word</Link></li>
            <li><Link to="/guides/how-to-compress-a-pdf/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Compress Below 2MB</Link></li>
            <li><Link to="/compare/adobe-acrobat-alternative/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Adobe Acrobat Alt</Link></li>
            <li><Link to="/compare/ilovepdf-alternative/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">iLovePDF Alternative</Link></li>
            <li><Link to="/compare/smallpdf-alternative/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Smallpdf Alternative</Link></li>
            <li><Link to="/free-pdf-editor-no-watermark-no-signup/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Free PDF Editor</Link></li>
            <li><Link to="/guides/" className="text-yellow-700 dark:text-yellow-400 font-bold hover:underline">All How-To Guides →</Link></li>
          </ul>
        </nav>

        {/* Col 6: Support, Ecosystem & Legal */}
        <nav aria-label="Ecosystem and Legal">
          <p className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>About & Legal</p>
          <ul className="space-y-2 text-xs font-semibold">
            <li><Link to="/about/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">About PDFBolt</Link></li>
            <li><Link to="/contact/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors flex items-center gap-1.5"><Headphones size={13} /> Contact Support</Link></li>
            <li><Link to="/privacy/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-500" /> Privacy Policy</Link></li>
            <li><Link to="/terms/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Terms of Service</Link></li>
            <li><Link to="/student-pdf-tools/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Student Workflow</Link></li>
            <li><Link to="/business-pdf-tools/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Business Workflow</Link></li>
            <li><Link to="/encyclopedia/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Encyclopedia</Link></li>
            <li><Link to="/offline-mode/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors flex items-center gap-1.5"><CheckCircle size={13} className="text-green-500" /> Offline Mode</Link></li>
            <li><Link to="/cookies/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Cookie Preferences</Link></li>
          </ul>
        </nav>

      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center sm:text-left">
          Core PDF utilities process locally in your browser with WebAssembly. Heavy conversions execute via ephemeral zero-retention server workers deleted within 15 minutes.
        </p>

        <div className="flex flex-wrap items-center gap-6">
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
