import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { TOOLS, WORKFLOWS } from '../constants';
import ToolCard from '../components/ToolCard';
import { Search, Sparkles, GraduationCap, Briefcase, Code, BookOpen, Calculator, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface HubPageProps {
  darkMode: boolean;
}

const HubPage: React.FC<HubPageProps> = ({ darkMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All 25+ Tools' },
    { id: 'edit', label: 'Edit & Organize' },
    { id: 'convert-to', label: 'Convert To PDF' },
    { id: 'convert-from', label: 'Convert From PDF' },
    { id: 'security', label: 'Security & Privacy' },
    { id: 'utilities', label: 'Utilities & OCR' }
  ];

  const filteredTools = useMemo(() => {
    return TOOLS.filter(tool => {
      const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.canonicalPath.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'all' || 
        tool.category === activeCategory || 
        (activeCategory === 'utilities' && tool.category === 'extra');

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>PDF Tools Hub – All 25+ Free Online PDF Converters & Editors | PDFBolt</title>
        <meta name="description" content="Discover the complete PDFBolt toolkit: Merge, Split, Compress, OCR, Convert to Word, Excel, PowerPoint, Protect, Sign, and Redact PDFs with 100% client-side privacy." />
        <link rel="canonical" href="https://pdfbolt.in/tools/" />
      </Helmet>

      {/* Hero Header */}
      <section className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-4">
            <Sparkles size={14} /> The Complete PDF Toolkit
          </div>
          <h1 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Every PDF Tool You Need. <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">100% Free & Private.</span>
          </h1>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto mb-10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Convert, organize, secure, and edit documents directly inside your browser. No files are ever sent to a remote server.
          </p>

          {/* Live Search Input */}
          <div className="max-w-2xl mx-auto relative mb-8">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools (e.g., 'word', 'compress', 'redact', 'ocr')..."
              className={`w-full pl-14 pr-6 py-4 rounded-2xl border text-base font-semibold transition-all outline-none focus:ring-2 focus:ring-yellow-500 ${
                darkMode ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-lg'
              }`}
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-yellow-500 text-slate-950 shadow-md scale-105'
                    : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Persona Workflows Highlights */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              End-to-End Persona Workflows
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Tailored multi-step PDF workflows designed for your exact use case.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {WORKFLOWS.map((wf) => {
            const icons = {
              'student-pdf-tools': <GraduationCap className="w-6 h-6 text-blue-500" />,
              'business-pdf-tools': <Briefcase className="w-6 h-6 text-emerald-500" />,
              'developer-pdf-tools': <Code className="w-6 h-6 text-purple-500" />
            };
            return (
              <Link
                key={wf.slug}
                to={`/${wf.slug}`}
                className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  darkMode ? 'bg-slate-800/40 border-slate-800 hover:border-yellow-500/50' : 'bg-white border-slate-200 hover:border-yellow-500/50 shadow-sm'
                }`}
              >
                <div>
                  <div className="p-3 rounded-2xl w-fit bg-slate-100 dark:bg-slate-800 mb-4">
                    {icons[wf.slug as keyof typeof icons] || <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400">
                    {wf.audience}
                  </span>
                  <h3 className={`text-xl font-bold mt-1 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {wf.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {wf.heroSubheadline}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-yellow-700 dark:text-yellow-400 mt-6">
                  Explore Workflow <ArrowRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {activeCategory === 'all' ? 'All PDF Tools' : categories.find(c => c.id === activeCategory)?.label}
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-3">({filteredTools.length} tools)</span>
          </h2>
        </div>

        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} darkMode={darkMode} />
            ))}
          </div>
        ) : (
          <div className={`p-12 text-center rounded-3xl border ${darkMode ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-2">No tools match your search "{searchQuery}"</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="text-xs font-bold text-yellow-700 dark:text-yellow-400 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Popular Target Sizes & Exam Portals */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full">
                High-Precision Optimization
              </span>
              <h2 className={`text-2xl font-black mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Targeted File Sizes & Official Exam Portals
              </h2>
              <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Meet exact government portal document upload specifications with zero cloud exposure.
              </p>
            </div>
            <Link
              to="/no-upload-pdf-tools"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-700 dark:text-yellow-400 hover:underline"
            >
              Learn about No-Upload Privacy <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Specific Sizes */}
            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Exact Size Reducers
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '20 KB', path: '/compress-pdf-to-20kb' },
                  { label: '50 KB', path: '/compress-pdf-to-50kb' },
                  { label: '100 KB', path: '/compress-pdf-to-100kb' },
                  { label: '200 KB', path: '/compress-pdf-to-200kb' },
                  { label: '300 KB', path: '/compress-pdf-to-300kb' },
                  { label: '500 KB', path: '/compress-pdf-to-500kb' },
                  { label: '1 MB', path: '/compress-pdf-to-1mb' },
                  { label: '2 MB', path: '/compress-pdf-to-2mb' },
                ].map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      darkMode ? 'bg-slate-700/60 text-slate-200 hover:bg-yellow-500 hover:text-slate-950' : 'bg-slate-100 text-slate-800 hover:bg-yellow-500 hover:text-slate-950'
                    }`}
                  >
                    Compress to {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 2: Exam & Govt Portals */}
            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Government & Exam Specs
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'SSC Portal', path: '/compress-pdf-for-ssc' },
                  { label: 'UPSC CSE', path: '/compress-pdf-for-upsc' },
                  { label: 'NEET Exam', path: '/compress-pdf-for-neet' },
                  { label: 'JEE Main', path: '/compress-pdf-for-jee' },
                  { label: 'IBPS Bank PO', path: '/compress-pdf-for-ibps' },
                  { label: 'RRB Railway', path: '/compress-pdf-for-rrb' },
                  { label: 'Govt Portals', path: '/pdf-size-reducer-for-government-portal' },
                ].map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      darkMode ? 'bg-slate-700/60 text-slate-200 hover:bg-yellow-500 hover:text-slate-950' : 'bg-slate-100 text-slate-800 hover:bg-yellow-500 hover:text-slate-950'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 3: Workflows & Free Alternatives */}
            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Identity KYC & Alternatives
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Aadhaar + PAN Merge', path: '/merge-aadhaar-and-pan-card' },
                  { label: 'Visa Documents Merge', path: '/merge-documents-for-visa-application' },
                  { label: 'JPG to PDF for Exams', path: '/jpg-to-pdf-for-exam' },
                  { label: 'PDF to JPG for Aadhaar', path: '/pdf-to-jpg-for-aadhaar' },
                  { label: 'Free Watermark-Free Editor', path: '/free-pdf-editor-no-watermark-no-signup' },
                  { label: 'iLovePDF Alternative', path: '/compare/ilovepdf-alternative' },
                  { label: 'Smallpdf Alternative', path: '/compare/smallpdf-alternative' },
                ].map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      darkMode ? 'bg-slate-700/60 text-slate-200 hover:bg-yellow-500 hover:text-slate-950' : 'bg-slate-100 text-slate-800 hover:bg-yellow-500 hover:text-slate-950'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculators & Utilities Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12">
        <div className={`p-8 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
          darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-2">
              <Calculator size={16} /> Interactive Tools & Utilities
            </div>
            <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Try the Interactive PDF Compression Size Calculator
            </h3>
            <p className={`text-sm mt-1 max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Estimate how much file size you can save before running compression based on page count, image resolution, and font subsets.
            </p>
          </div>
          <Link

            to="/tools/pdf-size-calculator"
            className="flex-shrink-0 px-6 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all"
          >
            Launch Calculator
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HubPage;
