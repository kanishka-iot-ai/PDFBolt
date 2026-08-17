import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Moon, Sun, FileText, Menu, X, Volume2, VolumeX, ChevronDown,
  ArrowRight, Sparkles, Calculator, Home, AlertTriangle
} from 'lucide-react';
import PaymentModal from './PaymentModal';
import { TOOLS, getIcon } from '../constants';
import { useActiveWork } from '../context/ActiveWorkContext';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode, soundEnabled, toggleSound }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { hasActiveWork, setHasActiveWork, stopAllMediaStreams } = useActiveWork();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Categories mapping
  const toolCategories = [
    { id: 'edit', name: 'Edit & Organize', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' },
    { id: 'convert-to', name: 'Convert To PDF', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
    { id: 'convert-from', name: 'Convert From PDF', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
    { id: 'security', name: 'Security', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/10' },
    { id: 'utilities', name: 'Utilities', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50' }
  ];

  const getCategorizedTools = (categoryId: string) => {
    return TOOLS.filter(t => t.category === categoryId || (categoryId === 'utilities' && t.category === 'extra'));
  };

  // Safe navigation interceptor for Home / Logo navigation when active work exists
  const handleSafeNavigation = (e: React.MouseEvent, targetPath: string) => {
    if (location.pathname === targetPath) {
      // Already on page
      return;
    }

    if (hasActiveWork) {
      e.preventDefault();
      setPendingNavPath(targetPath);
      setShowLeaveModal(true);
    } else {
      if (isOpen) setIsOpen(false);
      if (isToolsOpen) setIsToolsOpen(false);
    }
  };

  const handleConfirmLeave = () => {
    stopAllMediaStreams();
    setHasActiveWork(false);
    setShowLeaveModal(false);
    if (isOpen) setIsOpen(false);
    if (isToolsOpen) setIsToolsOpen(false);
    if (pendingNavPath) {
      navigate(pendingNavPath);
      setPendingNavPath(null);
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
    setPendingNavPath(null);
  };

  const NavLink = ({ to, children, ariaLabel }: { to: string; children: React.ReactNode; ariaLabel?: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        onClick={(e) => handleSafeNavigation(e, to)}
        aria-label={ariaLabel}
        className={`text-sm font-bold transition-all relative flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 rounded-lg px-1.5 py-0.5 ${
          isActive ? 'text-yellow-500 font-extrabold' : 'hover:text-yellow-500'
        }`}
      >
        {children}
        {isActive && (
          <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-yellow-500 rounded-full animate-scaleIn"></span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 glass border-b ${darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Brand Logo (Links to /) */}
          <Link
            to="/"
            onClick={(e) => handleSafeNavigation(e, "/")}
            className="flex items-center group py-1 outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-xl"
            aria-label="Go to PDFBolt home"
          >
            <img 
              src="/pdfbolt-logo.webp" 
              alt="PDFBolt" 
              width="150"
              height="40"
              className="h-9 md:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
          </Link>
          
          <div className="hidden lg:flex items-center gap-6">
            {/* Global Home Button */}
            <NavLink to="/" ariaLabel="Go to PDFBolt home">
              <Home size={16} className="text-yellow-500" />
              <span>Home</span>
            </NavLink>

            {/* All Tools Mega Menu Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`flex items-center gap-1.5 text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-lg px-1.5 py-0.5 ${isToolsOpen ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                aria-expanded={isToolsOpen}
              >
                All Tools <ChevronDown size={16} className={`transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Mega Menu */}
              {isToolsOpen && (
                <div className={`absolute top-full -left-48 mt-4 w-[840px] rounded-3xl shadow-2xl border animate-slideDown overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="grid grid-cols-3 gap-0">
                    <div className="col-span-2 p-6 grid grid-cols-2 gap-6">
                      {toolCategories.slice(0, 4).map(cat => (
                        <div key={cat.id}>
                          <h3 className={`text-xs font-black uppercase tracking-widest mb-3 ${cat.color}`}>{cat.name}</h3>
                          <ul className="space-y-1">
                            {getCategorizedTools(cat.id).slice(0, 5).map(tool => (
                              <li key={tool.id}>
                                <Link 
                                  to={tool.canonicalPath || tool.path} 
                                  onClick={(e) => {
                                    setIsToolsOpen(false);
                                    handleSafeNavigation(e, tool.canonicalPath || tool.path);
                                  }}
                                  className={`group flex items-center gap-2.5 p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                                >
                                  <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white shadow-sm text-slate-600'} group-hover:${cat.color} group-hover:scale-110 transition-all`}>
                                    {React.cloneElement(getIcon(tool.icon) as React.ReactElement, { className: 'w-4 h-4' })}
                                  </div>
                                  <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                    {tool.title}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className={`p-6 border-l flex flex-col justify-between ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest mb-3 text-slate-500">Utilities & Calculators</h3>
                        <ul className="space-y-1 mb-6">
                          <li>
                            <Link 
                              to="/analyze-pdf" 
                              onClick={(e) => {
                                setIsToolsOpen(false);
                                handleSafeNavigation(e, "/analyze-pdf");
                              }}
                              className={`group flex items-center gap-2 p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-white text-slate-700'}`}
                            >
                              <Sparkles size={16} className="text-yellow-500" />
                              <span className="text-xs font-bold">AI PDF Analyzer</span>
                            </Link>
                          </li>
                          <li>
                            <Link 
                              to="/tools/pdf-size-calculator" 
                              onClick={(e) => {
                                setIsToolsOpen(false);
                                handleSafeNavigation(e, "/tools/pdf-size-calculator");
                              }}
                              className={`group flex items-center gap-2 p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-white text-slate-700'}`}
                            >
                              <Calculator size={16} className="text-yellow-500" />
                              <span className="text-xs font-bold">Size Calculator</span>
                            </Link>
                          </li>
                          <li>
                            <Link 
                              to="/test-files" 
                              onClick={(e) => {
                                setIsToolsOpen(false);
                                handleSafeNavigation(e, "/test-files");
                              }}
                              className={`group flex items-center gap-2 p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-white text-slate-700'}`}
                            >
                              <FileText size={16} className="text-blue-500" />
                              <span className="text-xs font-bold">Sample Test Files</span>
                            </Link>
                          </li>
                          <li>
                            <Link 
                              to="/compare/online-pdf-tools" 
                              onClick={(e) => {
                                setIsToolsOpen(false);
                                handleSafeNavigation(e, "/compare/online-pdf-tools");
                              }}
                              className={`group flex items-center gap-2 p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-white text-slate-700'}`}
                            >
                              <Sparkles size={16} className="text-emerald-500" />
                              <span className="text-xs font-bold">Privacy Comparison</span>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <Link
                        to="/tools"
                        onClick={(e) => {
                          setIsToolsOpen(false);
                          handleSafeNavigation(e, "/tools");
                        }}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all text-center flex items-center justify-center gap-1 shadow-md"
                      >
                        View All Tools Hub <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <NavLink to="/analyze-pdf">
              <span className="inline-flex items-center gap-1 text-yellow-500 font-extrabold">
                <Sparkles size={14} /> AI Analyzer
              </span>
            </NavLink>
            <NavLink to="/tools">Tools Hub</NavLink>
            <NavLink to="/guides">Guides</NavLink>
            <NavLink to="/encyclopedia">Encyclopedia</NavLink>
            <NavLink to="/student-pdf-tools">Workflows</NavLink>

            {/* Support Button */}
            <button
              onClick={() => setShowPayment(true)}
              className="px-4 py-1.5 bg-yellow-500 text-slate-950 text-xs font-black uppercase tracking-widest rounded-full hover:bg-yellow-400 shadow-md transition-all flex items-center gap-2"
            >
              Donate
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={toggleSound} 
                aria-label={soundEnabled ? "Mute audio effects" : "Enable audio effects"}
                className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button 
                onClick={toggleDarkMode} 
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-700'}`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/"
              onClick={(e) => handleSafeNavigation(e, "/")}
              aria-label="Go to PDFBolt home"
              className={`p-2 rounded-xl flex items-center gap-1 text-xs font-bold ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-700'}`}
            >
              <Home size={16} /> Home
            </Link>
            <button 
              onClick={toggleDarkMode} 
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className={`p-2 rounded-full ${darkMode ? 'text-yellow-400' : 'text-slate-700'}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className={`p-2 rounded-xl ${darkMode ? 'text-white' : 'text-slate-900'}`} 
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {isOpen && (
          <div className={`lg:hidden border-t px-6 py-6 space-y-4 animate-slideDown ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Link 
              to="/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/");
              }} 
              aria-label="Go to PDFBolt home"
              className="flex items-center gap-2 font-black text-sm text-yellow-500"
            >
              <Home size={18} /> Home
            </Link>
            <Link 
              to="/tools" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/tools");
              }} 
              className="block font-bold text-sm"
            >
              🛠️ PDF Tools Hub
            </Link>
            <Link 
              to="/analyze-pdf" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/analyze-pdf");
              }} 
              className="block font-bold text-sm"
            >
              ✨ AI PDF Analyzer
            </Link>
            <Link 
              to="/guides" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/guides");
              }} 
              className="block font-bold text-sm"
            >
              📚 How-To Guides
            </Link>
            <Link 
              to="/encyclopedia" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/encyclopedia");
              }} 
              className="block font-bold text-sm"
            >
              🔬 Format Encyclopedia
            </Link>
            <Link 
              to="/student-pdf-tools" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/student-pdf-tools");
              }} 
              className="block font-bold text-sm"
            >
              🎓 Student Workflow
            </Link>
            <Link 
              to="/business-pdf-tools" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/business-pdf-tools");
              }} 
              className="block font-bold text-sm"
            >
              💼 Business Workflow
            </Link>
            <Link 
              to="/compare/online-pdf-tools" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/compare/online-pdf-tools");
              }} 
              className="block font-bold text-sm"
            >
              ⚖️ Privacy Comparison
            </Link>
            <Link 
              to="/tools/pdf-size-calculator" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/tools/pdf-size-calculator");
              }} 
              className="block font-bold text-sm"
            >
              🧮 Size Calculator
            </Link>
          </div>
        )}
      </nav>

      {/* Unsaved Active Work Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border animate-scaleIn ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-16 h-16 bg-amber-500/15 text-amber-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-center mb-2">Leave this tool?</h3>
            <p className={`text-center font-medium mb-8 text-xs sm:text-sm leading-relaxed ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Your current files and progress may be cleared if you leave this page.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={handleCancelLeave}
                className={`flex-1 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Stay
              </button>
              <button 
                onClick={handleConfirmLeave}
                className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition-all shadow-lg shadow-yellow-500/20"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        darkMode={darkMode}
      />
    </>
  );
};

export default Navbar;
