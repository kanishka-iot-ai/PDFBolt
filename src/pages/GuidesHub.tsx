import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { GUIDES } from '../constants';
import { BookOpen, Search, Clock, ArrowRight, Sparkles, Filter } from 'lucide-react';

interface GuidesHubProps {
  darkMode: boolean;
}

const GuidesHub: React.FC<GuidesHubProps> = ({ darkMode }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Guides' },
    { id: 'convert', label: 'Conversions' },
    { id: 'manage', label: 'Manage & Organize' },
    { id: 'edit', label: 'Edit & Sign' },
    { id: 'security', label: 'Security & Redaction' },
    { id: 'ocr', label: 'OCR & Recognition' }
  ];

  const filteredGuides = GUIDES.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(search.toLowerCase()) ||
      guide.summary.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>PDF Knowledge Base & How-To Guides | PDFBolt</title>
        <meta name="description" content="Comprehensive step-by-step guides on converting, compressing, merging, redacting, signing, and editing PDF files online with 100% privacy." />
        <link rel="canonical" href="https://pdfbolt.in/guides" />
      </Helmet>

      {/* Hero Header */}
      <section className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-4">
            <BookOpen size={14} /> PDF Knowledge Base & Tutorials
          </div>
          <h1 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Master Every PDF Task. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">Step-by-Step Guides.</span>
          </h1>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto mb-10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Clear, actionable tutorials covering document conversion, permanent redaction, encryption, OCR extraction, and multi-file organization.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides (e.g., 'word', 'compress', 'redact')..."
              className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-yellow-500 ${
                darkMode ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm'
              }`}
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-yellow-500 text-slate-950 shadow-sm scale-105'
                    : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map(guide => (
            <Link
              key={guide.slug}
              to={`/guides/${guide.slug}`}
              className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                darkMode ? 'bg-slate-800/40 border-slate-800 hover:border-yellow-500/50' : 'bg-white border-slate-200 hover:border-yellow-500/50 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                    {guide.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {guide.readTime}
                  </span>
                </div>
                <h2 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {guide.title}
                </h2>
                <p className={`text-xs leading-relaxed line-clamp-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {guide.summary}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Updated {guide.updatedAt}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-black text-yellow-700 dark:text-yellow-400">
                  Read Guide <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
};

export default GuidesHub;
