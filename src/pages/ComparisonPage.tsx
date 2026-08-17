import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { COMPARISON_FEATURES, TOOLS } from '../constants';
import { ShieldCheck, CheckCircle2, XCircle, Sparkles, ArrowRight, Zap, Lock } from 'lucide-react';

interface ComparisonPageProps {
  darkMode: boolean;
}

const ComparisonPage: React.FC<ComparisonPageProps> = ({ darkMode }) => {
  const baseUrl = 'https://pdfbolt.in';
  const canonicalUrl = `${baseUrl}/compare/online-pdf-tools`;

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>Online PDF Tools Comparison (2026) – Client-Side Privacy vs Cloud Converters | PDFBolt</title>
        <meta name="description" content="Transparent architectural comparison: Compare PDFBolt client-side WebAssembly processing vs cloud server upload tools (Smallpdf, iLovePDF) and desktop Adobe Acrobat." />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      {/* Hero Header */}
      <section className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-4">
            <Sparkles size={14} /> Comprehensive 2026 Comparison
          </div>
          <h1 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Client-Side Browser Processing vs <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">Cloud Upload Services</span>
          </h1>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            An honest, transparent evaluation of document privacy, speed, file size limits, and security architecture across modern PDF platforms.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className={darkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}>
              <tr>
                <th className="p-5 font-black text-base w-1/4">Feature & Architecture</th>
                <th className="p-5 font-black text-base text-yellow-400 w-1/4 bg-slate-800/80 dark:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-yellow-400 fill-current" /> PDFBolt (Client-Side)
                  </div>
                </th>
                <th className="p-5 font-black text-base w-1/4 text-slate-300">
                  Cloud Upload Tools <br />
                  <span className="text-[10px] font-normal text-slate-400">(Smallpdf, iLovePDF, etc.)</span>
                </th>
                <th className="p-5 font-black text-base w-1/4 text-slate-300">
                  Desktop Acrobat <br />
                  <span className="text-[10px] font-normal text-slate-400">(Adobe DC Pro)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {COMPARISON_FEATURES.map((feat, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? (darkMode ? 'bg-slate-900/30' : 'bg-white') : (darkMode ? 'bg-slate-800/20' : 'bg-slate-50/50')}>
                  <td className="p-5">
                    <div className="font-bold text-slate-900 dark:text-white">{feat.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{feat.notes}</div>
                  </td>
                  <td className="p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-yellow-500/5 dark:bg-yellow-500/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                      {String(feat.pdfBolt)}
                    </div>
                  </td>
                  <td className="p-5 text-slate-600 dark:text-slate-300">
                    {String(feat.serverCompetitor)}
                  </td>
                  <td className="p-5 text-slate-600 dark:text-slate-300">
                    {String(feat.desktopAcrobat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Why Zero-Upload Architecture Matters */}
        <div className="mt-16">
          <h2 className={`text-2xl md:text-3xl font-black mb-8 text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Why Zero-Upload Architecture Matters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <ShieldCheck className="w-8 h-8 text-emerald-500 mb-4" />
              <h3 className={`font-bold text-xl mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Zero Server Exposure</h3>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                With traditional cloud PDF converters, your confidential invoices and medical records travel across the public internet to third-party servers. PDFBolt keeps all bytes inside your browser RAM.
              </p>
            </div>

            <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <Zap className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className={`font-bold text-xl mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Zero Upload Latency</h3>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Uploading a 200MB PDF on a slow connection can take minutes. With local WebAssembly execution, processing starts instantly the moment you select your file.
              </p>
            </div>

            <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <Lock className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className={`font-bold text-xl mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>True Permanent Redaction</h3>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Many web tools only paint a superficial black box over selectable text. PDFBolt permanently rasterizes redacted sectors to ensure text cannot be recovered via DevTools or copy-paste.
              </p>
            </div>
          </div>
        </div>

        {/* CTA to Tools Hub */}
        <div className={`p-10 rounded-3xl border text-center mt-16 ${
          darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
        }`}>
          <h2 className={`text-3xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Ready to Experience Private PDF Processing?
          </h2>
          <p className={`text-sm max-w-xl mx-auto mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Explore all 25+ client-side tools with no file limits, no registrations, and 100% privacy.
          </p>
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all"
          >
            Open All PDF Tools <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ComparisonPage;
