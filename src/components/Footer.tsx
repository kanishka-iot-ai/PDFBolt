
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle, Heart, Headphones } from 'lucide-react';
import PaymentModal from './PaymentModal';

const Footer: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <footer className={`py-16 border-t mt-auto ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-1">
          <h3 className={`text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>PDFBolt</h3>
          <p className="text-sm leading-relaxed mb-6">High-performance tools for every PDF task. No registration, 100% free, and completely private.</p>
          <div className="flex gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-yellow-500"><Lock size={18} /></div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-orange-500"><ShieldCheck size={18} /></div>
          </div>
        </div>

        <div>
          <h4 className={`font-black uppercase text-xs tracking-widest mb-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Top Tools</h4>
          <ul className="space-y-3 text-sm font-bold">
            <li><Link to="/merge-pdf-online" className="hover:text-yellow-500 transition-colors">Merge PDF</Link></li>
            <li><Link to="/compress-pdf-online" className="hover:text-yellow-500 transition-colors">Compress PDF</Link></li>
            <li><Link to="/split-pdf-pages" className="hover:text-yellow-500 transition-colors">Split PDF</Link></li>
            <li><Link to="/pdf-to-qr-code" className="hover:text-yellow-500 transition-colors">PDF to QR</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={`font-black uppercase text-xs tracking-widest mb-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Company</h4>
          <ul className="space-y-3 text-sm font-bold">
            <li><Link to="/contact" className="hover:text-yellow-500 transition-colors flex items-center gap-2"><Headphones size={14} /> Contact Us</Link></li>
            <li><Link to="/tutorials" className="hover:text-yellow-500 transition-colors">Tutorials</Link></li>
            <li><Link to="/about" className="hover:text-yellow-500 transition-colors">About Us</Link></li>
            <li><Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={`font-black uppercase text-xs tracking-widest mb-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Community</h4>
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-6 rounded-3xl text-center">
            <Heart className="mx-auto mb-2 fill-current" />
            <p className="text-xs font-black uppercase tracking-tighter mb-4">Support Free Tools</p>
            <button
              onClick={() => setShowPayment(true)}
              className="text-[10px] bg-white text-orange-600 px-4 py-2 rounded-full font-black uppercase hover:bg-slate-50 transition-colors"
            >
              Buy us a Coffee
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest">
          <CheckCircle size={14} /> 100% Private Browser Execution
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">© 2025 PDFBolt. Built for Privacy and Speed.</p>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        darkMode={darkMode}
      />
    </footer>
  );
};

export default Footer;
