import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Moon, Sun, FileText, Menu, X, ChevronDown,
  ArrowRight, FileSearch, ShieldCheck, Calculator, Home, AlertTriangle, Heart,
  Wrench, BookOpen, Layers, GraduationCap, Briefcase, Star, Sparkles
} from 'lucide-react';
import { TOOLS, getIcon } from '../constants';
import { useActiveWork } from '../context/ActiveWorkContext';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  soundEnabled?: boolean;
  toggleSound?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode, soundEnabled, toggleSound }) => {
  const [isOpen, setIsOpen] = useState(false);
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
  }, []);

  // Categories mapping with static color tokens for Tailwind JIT
  const toolCategories = [
    { 
      id: 'edit', 
      name: 'Edit & Organize', 
      dotColor: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      iconBox: 'bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40'
    },
    { 
      id: 'convert-to', 
      name: 'Convert To PDF', 
      dotColor: 'bg-sky-500',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
      iconBox: 'bg-sky-50 text-sky-600 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40'
    },
    { 
      id: 'convert-from', 
      name: 'Convert From PDF', 
      dotColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
      iconBox: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
    },
    { 
      id: 'security', 
      name: 'Security & Legal', 
      dotColor: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      iconBox: 'bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40'
    },
    { 
      id: 'utilities', 
      name: 'Utilities & Lab', 
      dotColor: 'bg-indigo-500',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40',
      iconBox: 'bg-indigo-50 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/40'
    }
  ];

  const getCategorizedTools = (categoryId: string) => {
    return TOOLS.filter(t => t.category === categoryId || (categoryId === 'utilities' && t.category === 'extra'));
  };

  // Safe navigation interceptor for Home / Logo navigation when active work exists
  const handleSafeNavigation = (e: React.MouseEvent, targetPath: string) => {
    if (location.pathname === targetPath) {
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
          isActive ? 'text-yellow-700 dark:text-yellow-400 font-extrabold' : 'text-slate-700 dark:text-slate-200 hover:text-yellow-700 dark:hover:text-yellow-400'
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
      <nav className={`sticky top-0 z-50 transition-all duration-300 glass border-b ${darkMode ? 'border-white/[0.08] bg-[#090D15]/80 backdrop-blur-xl' : 'border-slate-200/80 bg-[#FBFBF9]/85 backdrop-blur-xl'} shadow-sm`}>
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
              width="49"
              height="40"
              loading="eager"
              decoding="async"
              {...({ fetchpriority: "high" } as any)}
              className="h-9 w-[44px] md:h-10 md:w-[49px] object-contain shrink-0 transition-transform duration-300 group-hover:scale-105" 
              style={{ aspectRatio: '98/80' }}
            />
          </Link>
          
          <div className="hidden lg:flex items-center gap-6">
            {/* Global Home Button */}
            <NavLink to="/" ariaLabel="Go to PDFBolt home">
              <Home size={16} className="text-yellow-700 dark:text-yellow-400" />
              <span>Home</span>
            </NavLink>

            {/* All Tools Mega Menu Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                type="button"
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`flex items-center gap-1.5 text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-lg px-1.5 py-0.5 ${isToolsOpen ? 'text-yellow-700 dark:text-yellow-400' : 'text-slate-700 dark:text-slate-200 hover:text-yellow-700 dark:hover:text-yellow-400'}`}
                aria-expanded={isToolsOpen}
              >
                All Tools <ChevronDown size={16} className={`transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Mega Menu - 100% Solid Backplate (Zero Bleed-Through) */}
              {isToolsOpen && (
                <div 
                  id="mega-menu-dropdown"
                  role="region"
                  aria-label="All PDF Tools Directory"
                  className="absolute top-full -left-32 md:-left-48 mt-3.5 w-[880px] max-w-[96vw] rounded-[2rem] mega-menu-panel animate-slideDown overflow-hidden z-[100]"
                >
                  <div className="grid grid-cols-12 divide-x divide-slate-100 dark:divide-slate-800/80">
                    
                    {/* Primary Tool Categories (8 cols) */}
                    <div className="col-span-8 p-6 grid grid-cols-2 gap-x-6 gap-y-5 bg-white dark:bg-[#0c111d]">
                      {toolCategories.slice(0, 4).map(cat => (
                        <div key={cat.id} className="space-y-2">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider border ${cat.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cat.dotColor}`} />
                            <span>{cat.name}</span>
                          </div>
                          
                          <ul className="space-y-0.5">
                            {getCategorizedTools(cat.id).slice(0, 5).map(tool => (
                              <li key={tool.id}>
                                <Link 
                                  to={tool.canonicalPath || tool.path} 
                                  onClick={(e) => {
                                    setIsToolsOpen(false);
                                    handleSafeNavigation(e, tool.canonicalPath || tool.path);
                                  }}
                                  className="group flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all duration-150 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-110 shadow-2xs ${cat.iconBox}`}>
                                    {React.cloneElement(getIcon(tool.icon) as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                                  </div>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                                    {tool.title}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Pro Intelligence & Utilities Column (4 cols) */}
                    <div className={`col-span-4 p-5 flex flex-col justify-between ${darkMode ? 'bg-[#0f1524]' : 'bg-slate-50/90'}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                            Pro Utilities
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">100% Client RAM</span>
                        </div>

                        {/* PDF Inspector Feature Card */}
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                              Featured
                            </span>
                            <ShieldCheck size={13} className="text-emerald-500" />
                          </div>

                          <Link 
                            to="/analyze-pdf/" 
                            onClick={(e) => {
                              setIsToolsOpen(false);
                              handleSafeNavigation(e, "/analyze-pdf");
                            }}
                            className="block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                          >
                            <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                              <FileSearch size={14} className="text-amber-500 shrink-0" />
                              PDF Inspector
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug mb-2 font-medium">
                              Deep document tree, font diagnostics and metadata audit.
                            </p>
                          </Link>

                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Zero Server Uploads
                          </div>
                        </div>

                        {/* Quick Utility Links */}
                        <ul className="space-y-0.5">
                          <li>
                            <Link 
                              to="/tools/pdf-size-calculator/" 
                              onClick={(e) => {
                                setIsToolsOpen(false);
                                handleSafeNavigation(e, "/tools/pdf-size-calculator");
                              }}
                              className="group flex items-center gap-2 px-2 py-1 rounded-xl transition-colors hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/40">
                                <Calculator size={13} />
                              </div>
                              <span className="text-xs font-bold truncate">Size Calculator</span>
                            </Link>
                          </li>
                          <li>
                            <Link 
                              to="/test-files/" 
                              onClick={(e) => {
                                setIsToolsOpen(false);
                                handleSafeNavigation(e, "/test-files");
                              }}
                              className="group flex items-center gap-2 px-2 py-1 rounded-xl transition-colors hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/40">
                                <FileText size={13} />
                              </div>
                              <span className="text-xs font-bold truncate">Sample Test Files</span>
                            </Link>
                          </li>
                          <li>
                            <Link 
                              to="/compare/online-pdf-tools/" 
                              onClick={(e) => {
                                setIsToolsOpen(false);
                                handleSafeNavigation(e, "/compare/online-pdf-tools");
                              }}
                              className="group flex items-center gap-2 px-2 py-1 rounded-xl transition-colors hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40">
                                <ShieldCheck size={13} />
                              </div>
                              <span className="text-xs font-bold truncate">Privacy Comparison</span>
                            </Link>
                          </li>
                        </ul>

                        {/* Social Proof Review Pill */}
                        <Link
                          to="/reviews/"
                          onClick={(e) => {
                            setIsToolsOpen(false);
                            handleSafeNavigation(e, "/reviews/");
                          }}
                          className="flex items-center justify-between p-2 rounded-xl bg-amber-500/[0.08] dark:bg-amber-400/[0.06] border border-amber-500/20 text-slate-800 dark:text-slate-200 transition-transform hover:scale-[1.02]"
                        >
                          <div className="flex items-center gap-1.5">
                            <Star size={13} fill="currentColor" className="text-amber-500" />
                            <span className="text-[11px] font-black">4.9 / 5 Rating</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">1,420+ reviews</span>
                        </Link>
                      </div>

                      <Link
                        to="/tools/"
                        onClick={(e) => {
                          setIsToolsOpen(false);
                          handleSafeNavigation(e, "/tools");
                        }}
                        className="mt-3.5 w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(245,158,11,0.22)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.32)] active:scale-[0.98]"
                      >
                        <span>View All 28 Tools</span>
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>

                  </div>
                </div>
              )}
            </div>
            
            <NavLink to="/analyze-pdf/">
              <span className="inline-flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400 font-extrabold">
                <FileSearch size={14} /> PDF Inspector
              </span>
            </NavLink>

            <NavLink to="/tools/">Tools Hub</NavLink>
            <NavLink to="/guides/">Guides</NavLink>
            <NavLink to="/encyclopedia/">Encyclopedia</NavLink>
            <NavLink to="/student-pdf-tools/">Workflows</NavLink>

            {/* Community Rating Pill */}
            <Link
              to="/reviews/"
              onClick={(e) => handleSafeNavigation(e, "/reviews/")}
              title="Read verified community reviews & ratings (4.9/5 based on 1,420+ ratings)"
              aria-label="PDFBolt Community Reviews: rated 4.9 out of 5 stars based on 1,420+ ratings"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] bg-amber-500/[0.08] dark:bg-amber-400/[0.1] border-amber-500/25 dark:border-amber-400/25 text-amber-900 dark:text-amber-200 hover:border-amber-500/40 shadow-xs"
            >
              <Star size={13} fill="currentColor" className="text-amber-500" />
              <span className="font-extrabold text-slate-800 dark:text-slate-100">4.9</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">(1.4k)</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
            
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
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
            <Link
              to="/reviews/"
              onClick={(e) => handleSafeNavigation(e, "/reviews/")}
              aria-label="PDFBolt Reviews rated 4.9 out of 5"
              className="px-2 py-1.5 rounded-xl flex items-center gap-1 text-xs font-bold border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              <Star size={12} fill="currentColor" className="text-amber-500" /> 4.9
            </Link>
            <button 
              type="button"
              onClick={toggleDarkMode} 
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className={`p-2 rounded-full ${darkMode ? 'text-yellow-400' : 'text-slate-700'}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              type="button"
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
              to="/reviews/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/reviews/");
              }} 
              className="flex items-center justify-between font-bold text-sm p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300"
            >
              <div className="flex items-center gap-2">
                <Star size={16} fill="currentColor" className="text-amber-500 shrink-0" />
                <span>Community Reviews</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20">4.9 ★ (1.4k)</span>
            </Link>
            <Link 
              to="/tools/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/tools");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <Wrench size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span>PDF Tools Hub</span>
            </Link>
            <Link 
              to="/analyze-pdf/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/analyze-pdf");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <FileSearch size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span>PDF Inspector</span>
            </Link>
            <Link 
              to="/guides/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/guides");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <BookOpen size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span>How-To Guides</span>
            </Link>
            <Link 
              to="/encyclopedia/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/encyclopedia");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <Layers size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span>Format Encyclopedia</span>
            </Link>
            <Link 
              to="/student-pdf-tools/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/student-pdf-tools");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <GraduationCap size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span>Student Workflow</span>
            </Link>
            <Link 
              to="/business-pdf-tools/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/business-pdf-tools");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <Briefcase size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span>Business Workflow</span>
            </Link>
            <Link 
              to="/compare/online-pdf-tools/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/compare/online-pdf-tools");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>Privacy Comparison</span>
            </Link>
            <Link 
              to="/tools/pdf-size-calculator/" 
              onClick={(e) => {
                setIsOpen(false);
                handleSafeNavigation(e, "/tools/pdf-size-calculator");
              }} 
              className="flex items-center gap-2.5 font-bold text-sm"
            >
              <Calculator size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span>Size Calculator</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Unsaved Active Work Confirmation Modal */}
      {showLeaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
        >
          <div className={`w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border animate-scaleIn ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-16 h-16 bg-amber-500/15 text-amber-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            
            <h3 id="leave-modal-title" className="text-2xl font-black text-center mb-2">Leave this tool?</h3>
            <p className={`text-center font-medium mb-8 text-xs sm:text-sm leading-relaxed ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Your current files and progress may be cleared if you leave this page.
            </p>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={handleCancelLeave}
                className={`flex-1 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Stay
              </button>
              <button 
                type="button"
                onClick={handleConfirmLeave}
                className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition-all shadow-lg shadow-yellow-500/20"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
