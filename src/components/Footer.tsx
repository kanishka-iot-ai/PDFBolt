import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle, Heart, Headphones, AlertTriangle, Layers, BookOpen, Calculator } from 'lucide-react';
import PaymentModal from './PaymentModal';

const Footer: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);

  const handleWipeData = async () => {
    const { clearAllAppData } = await import('../utils/privacy');
    await clearAllAppData();
    setShowWipeModal(false);
    window.location.reload();
  };

  return (
    <footer className={`py-20 border-t mt-auto transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand & Privacy Column */}
        <div className="lg:col-span-1">
          <Link to="/" className="inline-block mb-4 group" aria-label="PDFBolt Home">
            <img 
              src="/pdfbolt-logo.svg" 
              alt="PDFBolt" 
              width="160"
              height="40"
              className="h-10 w-auto max-w-[180px] object-contain transition-transform duration-300 group-hover:scale-105" 
            />
          </Link>
          <p className="text-xs font-medium leading-relaxed mb-6">
            Privacy-first browser-based PDF toolkit. 100% client-side WebAssembly execution with zero server file transfers.
          </p>
          <div className="flex gap-2">
            <div className={`p-2 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-yellow-500' : 'bg-white shadow-sm text-yellow-600'}`}>
              <Lock size={16} />
            </div>
            <div className={`p-2 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-green-500' : 'bg-white shadow-sm text-green-600'}`}>
              <ShieldCheck size={16} />
            </div>
          </div>
        </div>

        {/* Popular Tools */}
        <nav aria-label="Popular PDF Tools">
          <h4 className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>PDF Tools</h4>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li><Link to="/analyze-pdf" className="text-yellow-500 font-bold hover:underline">✨ AI PDF Analyzer</Link></li>
            <li><Link to="/merge-pdf" className="hover:text-yellow-500 transition-colors">Merge PDF</Link></li>
            <li><Link to="/split-pdf" className="hover:text-yellow-500 transition-colors">Split PDF</Link></li>
            <li><Link to="/compress-pdf" className="hover:text-yellow-500 transition-colors">Compress PDF</Link></li>
            <li><Link to="/pdf-to-word" className="hover:text-yellow-500 transition-colors">PDF to Word</Link></li>
            <li><Link to="/pdf-to-excel" className="hover:text-yellow-500 transition-colors">PDF to Excel</Link></li>
            <li><Link to="/redact-pdf" className="hover:text-yellow-500 transition-colors">Redact PDF</Link></li>
            <li><Link to="/ocr-pdf" className="hover:text-yellow-500 transition-colors">OCR PDF</Link></li>
            <li><Link to="/tools" className="text-yellow-500 font-bold hover:underline">View All 25+ Tools →</Link></li>
          </ul>
        </nav>

        {/* How-To Guides */}
        <nav aria-label="PDF How-To Guides">
          <h4 className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Knowledge Base</h4>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li><Link to="/guides/how-to-convert-pdf-to-word" className="hover:text-yellow-500 transition-colors">Convert PDF to Word</Link></li>
            <li><Link to="/guides/how-to-compress-a-pdf" className="hover:text-yellow-500 transition-colors">Compress Below 2MB</Link></li>
            <li><Link to="/guides/how-to-merge-pdf-files" className="hover:text-yellow-500 transition-colors">Combine Multiple PDFs</Link></li>
            <li><Link to="/guides/how-to-redact-a-pdf" className="hover:text-yellow-500 transition-colors">Permanently Redact Data</Link></li>
            <li><Link to="/guides/how-to-protect-a-pdf" className="hover:text-yellow-500 transition-colors">Password Protect PDF</Link></li>
            <li><Link to="/guides" className="text-yellow-500 font-bold hover:underline">All How-To Guides →</Link></li>
          </ul>
        </nav>

        {/* Workflows & Reference */}
        <nav aria-label="Workflows & Encyclopedia">
          <h4 className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Ecosystem</h4>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li><Link to="/student-pdf-tools" className="hover:text-yellow-500 transition-colors">Student Study Workflow</Link></li>
            <li><Link to="/business-pdf-tools" className="hover:text-yellow-500 transition-colors">Business Legal Workflow</Link></li>
            <li><Link to="/developer-pdf-tools" className="hover:text-yellow-500 transition-colors">Developer Architecture</Link></li>
            <li><Link to="/encyclopedia" className="hover:text-yellow-500 transition-colors">PDF Format Encyclopedia</Link></li>
            <li><Link to="/compare/online-pdf-tools" className="hover:text-yellow-500 transition-colors">Privacy Comparison</Link></li>
            <li><Link to="/tools/pdf-size-calculator" className="hover:text-yellow-500 transition-colors">PDF Size Calculator</Link></li>
            <li><Link to="/test-files" className="hover:text-yellow-500 transition-colors">Sample Test Files</Link></li>
          </ul>
        </nav>

        {/* Company & Support */}
        <div>
          <h4 className={`font-black uppercase text-xs tracking-widest mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Support & Legal</h4>
          <ul className="space-y-2.5 text-xs font-semibold mb-6">
            <li><Link to="/" aria-label="Go to PDFBolt home" className="hover:text-yellow-500 transition-colors">Home</Link></li>
            <li><Link to="/about" className="hover:text-yellow-500 transition-colors">About PDFBolt</Link></li>
            <li><Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link></li>
            <li><Link to="/contact" className="hover:text-yellow-500 transition-colors flex items-center gap-1"><Headphones size={12} /> Contact Support</Link></li>
          </ul>

          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-950 p-4 rounded-2xl text-center shadow-md">
            <Heart className="mx-auto mb-1 text-slate-950 fill-current" size={20} />
            <p className="text-[11px] font-black uppercase mb-2">Keep PDFBolt 100% Free</p>
            <button
              onClick={() => setShowPayment(true)}
              className="text-[10px] bg-slate-950 text-white px-4 py-2 rounded-xl font-black uppercase hover:bg-slate-800 transition-colors w-full shadow-sm"
            >
              Donate Now
            </button>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2 text-green-500 dark:text-green-400 text-xs font-black uppercase tracking-widest bg-green-50 dark:bg-green-500/10 px-3 py-1.5 rounded-md">
              <CheckCircle size={14} /> 100% Client-Side Processing
            </div>
            <button
              onClick={() => setShowWipeModal(true)}
              className="text-xs font-black uppercase tracking-widest text-red-500/70 hover:text-red-500 transition-colors py-1 cursor-pointer"
            >
              Wipe Site Data
            </button>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">© {new Date().getFullYear()} PDFBolt. All rights reserved.</p>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        darkMode={darkMode}
      />

      {/* Custom Wipe Data Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-scaleIn ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className={`text-2xl font-black text-center mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Wipe All Site Data?</h3>
            <p className={`text-center font-medium mb-8 text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              This action will clear all cached tools, fonts, and application data (approx 24MB). You will need to re-download these assets on your next visit.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowWipeModal(false)}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-colors ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleWipeData}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
              >
                Yes, Wipe Data
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
