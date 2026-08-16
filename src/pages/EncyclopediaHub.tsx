import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ENCYCLOPEDIA } from '../constants';
import { Layers, BookOpen, Clock, ArrowRight, Sparkles } from 'lucide-react';

interface EncyclopediaHubProps {
  darkMode: boolean;
}

const EncyclopediaHub: React.FC<EncyclopediaHubProps> = ({ darkMode }) => {
  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>PDF Format Encyclopedia & Standards Guide | PDFBolt</title>
        <meta name="description" content="Explore the deep technical architecture of PDF standards: PDF/A archival compliance, WebAssembly OCR, Vector vs Raster rendering, and security cryptography." />
        <link rel="canonical" href="https://pdfbolt.com/encyclopedia" />
      </Helmet>

      {/* Hero Header */}
      <section className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-4">
            <Layers size={14} /> Technical Reference & Standards
          </div>
          <h1 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            The PDF Format Encyclopedia
          </h1>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Deep-dive technical explainers on PDF specifications (ISO 32000), PDF/A digital preservation standards, OCR neural networks, and vector rendering mathematics.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ENCYCLOPEDIA.map((art) => (
            <Link
              key={art.slug}
              to={`/encyclopedia/${art.slug}`}
              className={`p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                darkMode ? 'bg-slate-800/40 border-slate-800 hover:border-yellow-500/50' : 'bg-white border-slate-200 hover:border-yellow-500/50 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    {art.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {art.readTime}
                  </span>
                </div>
                <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {art.title}
                </h2>
                <p className={`text-sm leading-relaxed mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {art.summary}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Updated {art.updatedAt}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-black text-yellow-500">
                  Read Article <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default EncyclopediaHub;
