import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../constants';
import { ToolType, ToolMetadata } from '../types';
import ToolCard from '../components/ToolCard';
import AdSlot from '../components/AdSlot';
import {
  Star,
  Edit3,
  Repeat,
  Shield,
  Settings,
  FileText,
  Search,
  Zap,
  Lock,
  Globe,
  Flame,
  Layers,
  ChevronDown,
  X
} from 'lucide-react';

const POPULAR_TOOL_IDS: ToolType[] = [
  ToolType.MERGE,
  ToolType.COMPRESS,
  ToolType.SPLIT,
  ToolType.PDF_TO_WORD,
  ToolType.PDF_TO_EXCEL,
  ToolType.PDF_TO_JPG,
  ToolType.PDF_TO_PPT,
  ToolType.PROTECT,
  ToolType.UNLOCK,
  ToolType.ROTATE,
  ToolType.WATERMARK,
  ToolType.ORGANIZE
];

const Home: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('popular');
  const [showAllTools, setShowAllTools] = useState(false);

  const categories = [
    { id: 'popular', title: 'Popular Tools', icon: <Flame size={16} /> },
    { id: 'all', title: 'All 25+ Tools', icon: <Globe size={16} /> },
    { id: 'edit', title: 'Edit & Organize', icon: <Edit3 size={16} /> },
    { id: 'convert-from', title: 'Convert From PDF', icon: <Repeat size={16} /> },
    { id: 'convert-to', title: 'Convert To PDF', icon: <Repeat size={16} /> },
    { id: 'security', title: 'Security', icon: <Shield size={16} /> },
    { id: 'utilities', title: 'Utilities', icon: <Settings size={16} /> }
  ];

  // Lookup popular tools in exact order
  const popularTools = useMemo(() => {
    return POPULAR_TOOL_IDS.map(id => TOOLS.find(t => t.id === id)).filter(Boolean) as ToolMetadata[];
  }, []);

  // Filtered tools when searching or viewing specific categories
  const filteredTools = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return TOOLS.filter(tool =>
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q)
      );
    }

    if (activeCategory === 'popular' && !showAllTools) {
      return popularTools;
    }

    if (activeCategory === 'all' || (activeCategory === 'popular' && showAllTools)) {
      return TOOLS;
    }

    return TOOLS.filter(tool => {
      return (
        tool.category === activeCategory ||
        (activeCategory === 'utilities' && tool.category === 'extra')
      );
    });
  }, [searchQuery, activeCategory, showAllTools, popularTools]);

  const handleSuggestionClick = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="animate-fadeIn">
      {/* 1. NEW COMPACT HERO SECTION (Above the fold) */}
      <section
        className={`relative pt-6 pb-6 sm:pt-10 sm:pb-8 text-center border-b ${
          darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-yellow-500/15 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Small Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-500/20 border border-amber-600/30 dark:border-amber-400/30 text-amber-900 dark:text-amber-300 font-black text-[11px] uppercase tracking-widest mb-3 animate-slideDown">
            <Star size={12} className="fill-current" /> PROFESSIONAL PDF TOOLKIT
          </div>


          {/* Primary H1 */}
          <h1
            className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-3 leading-tight ${
              darkMode ? 'text-white' : 'text-slate-900'
            } animate-slideUp`}
          >
            Free Online PDF Tools for Every Task
          </h1>

          {/* Supporting Text */}
          <p
            className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-5 sm:mb-6 font-normal leading-relaxed ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            } animate-slideUp`}
          >
            Merge, compress, split, convert, edit and protect PDFs online. Fast, private and easy to use.
          </p>

          {/* Compact Search Bar */}
          <div className="max-w-xl mx-auto relative animate-slideUp">
            <div
              className={`relative flex items-center px-3 py-1.5 sm:py-2 rounded-full border shadow-md transition-all duration-200 ${
                darkMode
                  ? 'border-slate-700 bg-slate-900/90 focus-within:border-yellow-500'
                  : 'border-slate-300 bg-white focus-within:border-yellow-500 shadow-slate-200/50'
              }`}
            >
              <Search
                className={`ml-2 mr-2 shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}
                size={18}
              />
              <input
                type="text"
                aria-label="Search PDF tools"
                placeholder="Search PDF tools..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none py-1 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick Pill Suggestions */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2.5 flex-wrap text-xs text-slate-400">
              <span className="hidden sm:inline font-medium text-slate-400">Try:</span>
              {['Merge PDF', 'Compress PDF', 'PDF to Word', 'Protect PDF'].map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                    darkMode
                      ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-yellow-500/50 hover:text-yellow-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-yellow-600 hover:text-yellow-700'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR PDF TOOLS & TOOL GRID (Immediately Above the fold) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Category Selector Tabs */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {searchQuery
                ? `Search Results (${filteredTools.length})`
                : activeCategory === 'popular' && !showAllTools
                ? 'Popular PDF Tools'
                : categories.find(c => c.id === activeCategory)?.title || 'PDF Tools'}
            </h2>
            <p className={`text-xs sm:text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {searchQuery
                ? `Showing tools matching "${searchQuery}"`
                : activeCategory === 'popular' && !showAllTools
                ? 'Most frequently used document utilities — 100% free and in-browser'
                : 'Full suite of fast, secure browser-based PDF utilities'}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory(cat.id);
                  if (cat.id === 'all') setShowAllTools(true);
                  if (cat.id === 'popular') setShowAllTools(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat.id && !searchQuery
                    ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                    : darkMode
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                    : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat.icon}
                <span>{cat.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Tools Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {filteredTools.map(tool => (
            <ToolCard key={tool.id} tool={tool} darkMode={darkMode} />
          ))}
        </div>

        {/* No Search Results */}
        {filteredTools.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-base font-medium">
              No PDF tools found matching "{searchQuery}"
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('popular');
                setShowAllTools(false);
              }}
              className="mt-4 px-5 py-2 bg-yellow-500 text-slate-950 rounded-full font-bold text-xs hover:bg-yellow-400 transition-colors"
            >
              Reset Search
            </button>
          </div>
        )}

        {/* Expand / View All Tools Action (When on Popular view) */}
        {!searchQuery && activeCategory === 'popular' && !showAllTools && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setShowAllTools(true);
                setActiveCategory('all');
              }}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm border transition-all hover:scale-[1.02] shadow-sm cursor-pointer ${
                darkMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-yellow-400'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-yellow-700'
              }`}
            >
              <Layers size={16} />
              View all 25+ PDF tools
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </section>


      {/* 3. TRUST & VALUE INDICATORS SECTION (Moved below primary tool discovery) */}
      <section
        className={`py-8 sm:py-10 border-y ${
          darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200/80 bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-x-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            <div className="flex flex-col items-center text-center px-2">
              <Shield className="text-yellow-500 mb-2" size={28} />
              <h3 className={`text-2xl font-black mb-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                100% Private
              </h3>
              <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Local In-Browser Processing
              </p>
            </div>

            <div className="flex flex-col items-center text-center px-2">
              <FileText className="text-yellow-500 mb-2" size={28} />
              <h3 className={`text-2xl font-black mb-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                25+ Tools
              </h3>
              <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Complete Document Suite
              </p>
            </div>

            <div className="flex flex-col items-center text-center px-2">
              <Lock className="text-yellow-500 mb-2" size={28} />
              <h3 className={`text-2xl font-black mb-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Zero Uploads
              </h3>
              <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Files Never Leave Device
              </p>
            </div>

            <div className="flex flex-col items-center text-center px-2">
              <Zap className="text-yellow-500 mb-2" size={28} />
              <h3 className={`text-2xl font-black mb-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Fast & Free
              </h3>
              <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                No Signup or Limits
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Non-Intrusive Sponsored Slot */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AdSlot placement="HOME_CONTENT" className="my-10" />
      </div>

      {/* 4. EDUCATIONAL GUIDES & KNOWLEDGE HUB */}
      <section
        className={`py-12 sm:py-16 border-t ${
          darkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold text-xs uppercase tracking-widest mb-2">
                <FileText size={14} /> Knowledge Base & Tutorials
              </div>
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Learn How to Master Your PDFs
              </h2>
            </div>
            <Link
              to="/guides"
              className="inline-flex items-center gap-2 font-bold text-sm text-yellow-700 dark:text-yellow-400 hover:underline"
            >
              View All 13+ Guides <Globe size={16} />
            </Link>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Link
              to="/guides/how-to-convert-pdf-to-word"
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:border-yellow-500/50 flex flex-col justify-between ${
                darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                  4 min read
                </span>
                <h3 className={`font-bold text-base sm:text-lg mt-3 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  How to Convert PDF to Word Without Losing Formatting
                </h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Convert PDF to editable DOCX format with native font reconstruction and margin preservation.
                </p>
              </div>
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mt-4 inline-flex items-center gap-1">
                Read Guide &rarr;
              </span>
            </Link>

            <Link
              to="/guides/how-to-compress-a-pdf"
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:border-yellow-500/50 flex flex-col justify-between ${
                darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                  3 min read
                </span>
                <h3 className={`font-bold text-base sm:text-lg mt-3 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  How to Compress a PDF Below 10MB or 2MB
                </h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Shrink heavy documents for email attachments and portal submissions while keeping text crisp.
                </p>
              </div>
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mt-4 inline-flex items-center gap-1">
                Read Guide &rarr;
              </span>
            </Link>

            <Link
              to="/guides/how-to-merge-pdf-files"
              className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:border-yellow-500/50 flex flex-col justify-between ${
                darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                  2 min read
                </span>
                <h3 className={`font-bold text-base sm:text-lg mt-3 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  How to Merge Multiple PDF Files into One Document
                </h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Combine reports, contracts, and receipts in custom order with 100% in-browser privacy.
                </p>
              </div>
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mt-4 inline-flex items-center gap-1">
                Read Guide &rarr;
              </span>
            </Link>
          </div>

          {/* Persona Workflows & Encyclopedia Sub-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-6">
            <Link
              to="/student-pdf-tools"
              className={`p-5 sm:p-6 rounded-2xl border transition-all hover:border-yellow-500/40 ${
                darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h3 className={`font-bold text-base mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                🎓 Student PDF Suite
              </h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Merge lecture slides, compress lab reports, and convert handwritten notes.
              </p>
            </Link>

            <Link
              to="/business-pdf-tools"
              className={`p-5 sm:p-6 rounded-2xl border transition-all hover:border-yellow-500/40 ${
                darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h3 className={`font-bold text-base mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                💼 Business & Legal Toolkit
              </h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Sign NDAs, redact sensitive data, password protect contracts, and OCR invoices.
              </p>
            </Link>

            <Link
              to="/encyclopedia"
              className={`p-5 sm:p-6 rounded-2xl border transition-all hover:border-yellow-500/40 ${
                darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h3 className={`font-bold text-base mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                📖 PDF Encyclopedia
              </h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Deep technical dives into PDF/A archiving standards, OCR engines, and font rendering.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. CUSTOMER CARE & SUPPORT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div
          className={`p-8 sm:p-12 md:p-16 rounded-[2.5rem] border relative overflow-hidden text-center transition-all ${
            darkMode ? 'bg-yellow-950/15 border-yellow-500/20' : 'bg-yellow-50 border-yellow-100'
          }`}
        >
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 shadow-sm text-yellow-700 dark:text-yellow-400 font-bold text-xs uppercase tracking-widest mb-4">
              <Shield size={14} /> Free & Fast Support
            </div>
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Need <span className="text-yellow-700 dark:text-yellow-400">Assistance?</span>
            </h2>
            <p
              className={`text-sm sm:text-base md:text-lg font-medium mb-8 leading-relaxed max-w-2xl mx-auto ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              Our dedicated support team is here to help you with any questions or document workflows. Fast, private, and human responses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/contact"
                className="px-6 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-full font-bold text-base shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              >
                Contact Support
              </Link>
              <Link
                to="/about"
                className={`px-6 py-3.5 rounded-full font-bold text-base border transition-all w-full sm:w-auto ${
                  darkMode
                    ? 'border-slate-700 text-white hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-white'
                }`}
              >
                Learn more about PDF Bolt
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
