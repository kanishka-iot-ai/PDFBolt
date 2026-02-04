
import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, FileText, Menu, X, Volume2, VolumeX, Headphones, Download, Laptop } from 'lucide-react';

import PaymentModal from './PaymentModal';

interface NavbarProps {
  darkMode: boolean; toggleDarkMode: () => void;
  soundEnabled: boolean; toggleSound: () => void;
  canInstall?: boolean; onInstall?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode, soundEnabled, toggleSound, canInstall, onInstall }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showPayment, setShowPayment] = React.useState(false);

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-md border-b`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-1.5 rounded-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
              <FileText className="text-white w-6 h-6" />
            </div>
            <span className={`text-xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              PDF<span className="text-yellow-500">Bolt</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/merge" className="text-sm font-bold hover:text-yellow-500 transition-colors">Merge</Link>
            <Link to="/split" className="text-sm font-bold hover:text-yellow-500 transition-colors">Split</Link>
            <Link to="/compress" className="text-sm font-bold hover:text-yellow-500 transition-colors">Compress</Link>
            <Link to="/tutorials" className="text-sm font-bold hover:text-yellow-500 transition-colors">Tutorials</Link>

            {/* Support Button */}
            <button
              onClick={() => setShowPayment(true)}
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
            >
              Donate
            </button>

            <button
              onClick={onInstall}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${darkMode ? 'bg-white text-slate-900 hover:bg-yellow-500 hover:text-white' : 'bg-slate-900 text-white hover:bg-yellow-500'
                }`}
            >
              {canInstall ? (
                <>
                  <Download size={14} className="animate-bounce" />
                  Install App
                </>
              ) : (
                <>
                  <Laptop size={14} />
                  Desktop App
                </>
              )}
            </button>

            <Link to="/contact" className="text-sm font-black text-yellow-600 flex items-center gap-1.5 hover:scale-105 transition-transform">
              <Headphones size={16} /> Contact
            </Link>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
            <button onClick={toggleSound} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button onClick={toggleDarkMode} className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
        {isOpen && (
          <div className={`md:hidden p-6 space-y-4 border-t ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <Link onClick={() => setIsOpen(false)} to="/merge" className="block text-lg font-bold">Merge PDF</Link>
            <Link onClick={() => setIsOpen(false)} to="/split" className="block text-lg font-bold">Split PDF</Link>
            <Link onClick={() => setIsOpen(false)} to="/compress" className="block text-lg font-bold">Compress PDF</Link>

            <button onClick={() => { setShowPayment(true); setIsOpen(false); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-center uppercase tracking-widest shadow-lg">
              Donate / Support
            </button>

            <button onClick={() => { onInstall?.(); setIsOpen(false); }} className="flex items-center gap-3 text-lg font-black text-blue-600 uppercase tracking-tight">
              <Download size={20} /> Download App
            </button>
            <Link onClick={() => setIsOpen(false)} to="/contact" className="block text-lg font-black text-yellow-600">Contact Support</Link>
            <button onClick={() => { toggleSound(); setIsOpen(false); }} className="flex items-center gap-3 text-lg font-bold">{soundEnabled ? <Volume2 /> : <VolumeX />} Sounds</button>
            <button onClick={() => { toggleDarkMode(); setIsOpen(false); }} className="flex items-center gap-3 text-lg font-bold">{darkMode ? <Sun /> : <Moon />} Theme</button>
          </div>
        )}
      </nav>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        darkMode={darkMode}
      />
    </>
  );
};
export default Navbar;
