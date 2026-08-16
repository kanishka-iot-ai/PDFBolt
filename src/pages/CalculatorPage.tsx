import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Calculator, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Sliders, FileText } from 'lucide-react';
import AdSlot from '../components/AdSlot';
import { ToolType } from '../types';

interface CalculatorPageProps {
  darkMode: boolean;
}

const CalculatorPage: React.FC<CalculatorPageProps> = ({ darkMode }) => {
  const [currentSizeMB, setCurrentSizeMB] = useState<number>(25);
  const [pageCount, setPageCount] = useState<number>(30);
  const [contentType, setContentType] = useState<'text' | 'mixed' | 'image-heavy' | 'scanned'>('mixed');
  const [targetDPI, setTargetDPI] = useState<number>(150);
  const [compressionMode, setCompressionMode] = useState<'smart' | 'maximum' | 'extreme'>('smart');

  // Calculation model
  const estimation = useMemo(() => {
    let reductionRatio = 0.5; // default 50%

    // Content factor
    if (contentType === 'text') reductionRatio = 0.35; // 65% reduction
    else if (contentType === 'mixed') reductionRatio = 0.45; // 55% reduction
    else if (contentType === 'image-heavy') reductionRatio = 0.3; // 70% reduction
    else if (contentType === 'scanned') reductionRatio = 0.25; // 75% reduction

    // DPI factor
    if (targetDPI === 72) reductionRatio *= 0.6;
    else if (targetDPI === 150) reductionRatio *= 0.85;
    else if (targetDPI === 300) reductionRatio *= 1.1;

    // Mode factor
    if (compressionMode === 'maximum') reductionRatio *= 0.75;
    if (compressionMode === 'extreme') reductionRatio *= 0.55;

    // Boundary clamps
    reductionRatio = Math.min(0.9, Math.max(0.1, reductionRatio));

    const estimatedSizeMB = Math.max(0.1, Number((currentSizeMB * reductionRatio).toFixed(2)));
    const savedMB = Math.max(0, Number((currentSizeMB - estimatedSizeMB).toFixed(2)));
    const percentageSaved = Math.round(((currentSizeMB - estimatedSizeMB) / currentSizeMB) * 100);

    return {
      estimatedSizeMB,
      savedMB,
      percentageSaved,
      emailReady: estimatedSizeMB <= 10,
      portalReady: estimatedSizeMB <= 2
    };
  }, [currentSizeMB, pageCount, contentType, targetDPI, compressionMode]);

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>Interactive PDF File Size & Compression Calculator | PDFBolt</title>
        <meta name="description" content="Calculate and estimate how much file size you can save when compressing PDF documents based on page count, image DPI, and content type." />
        <link rel="canonical" href="https://pdfbolt.com/tools/pdf-size-calculator" />
      </Helmet>

      {/* Hero Header */}
      <section className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-4">
            <Calculator size={14} /> Interactive PDF Calculator
          </div>
          <h1 className={`text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            PDF Compression & Size Calculator
          </h1>
          <p className={`text-base md:text-lg max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Estimate your storage savings, email deliverability, and target document weight before compressing.
          </p>
        </div>
      </section>

      {/* Calculator Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls (7 cols) */}
          <div className={`lg:col-span-7 p-8 rounded-3xl border space-y-6 ${
            darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Sliders size={20} className="text-yellow-500" /> Document Parameters
            </h2>

            {/* Current Size Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Current PDF File Size
                </label>
                <span className="text-sm font-black text-yellow-500">{currentSizeMB} MB</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={currentSizeMB}
                onChange={(e) => setCurrentSizeMB(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 MB</span>
                <span>50 MB</span>
                <span>100 MB</span>
                <span>200 MB</span>
              </div>
            </div>

            {/* Page Count */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Total Pages
                </label>
                <span className="text-sm font-black text-yellow-500">{pageCount} Pages</span>
              </div>
              <input
                type="range"
                min="1"
                max="500"
                value={pageCount}
                onChange={(e) => setPageCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            {/* Document Content Type */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Primary Content Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'text', label: 'Vector Text / Books' },
                  { id: 'mixed', label: 'Mixed Text & Photos' },
                  { id: 'image-heavy', label: 'High-Res Presentation' },
                  { id: 'scanned', label: 'Scanned Paper Archive' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id as any)}
                    className={`p-3 rounded-xl text-xs font-bold border transition-all text-left ${
                      contentType === type.id
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400'
                        : darkMode
                          ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Resolution DPI */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Target DPI Resolution
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { dpi: 72, label: '72 DPI (Web Screen)' },
                  { dpi: 150, label: '150 DPI (Balanced)' },
                  { dpi: 300, label: '300 DPI (High Print)' }
                ].map(item => (
                  <button
                    key={item.dpi}
                    onClick={() => setTargetDPI(item.dpi)}
                    className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      targetDPI === item.dpi
                        ? 'bg-yellow-500 text-slate-950 font-black border-yellow-500 shadow-sm'
                        : darkMode
                          ? 'border-slate-700 text-slate-300'
                          : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className={`p-8 rounded-3xl border flex flex-col justify-between h-full ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 shadow-lg'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                  Estimated Result
                </span>
                <h3 className={`text-3xl font-black mt-2 mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {estimation.estimatedSizeMB} MB
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-6">
                  ↓ Saved ~{estimation.savedMB} MB ({estimation.percentageSaved}% Reduction)
                </p>

                {/* Compatibility Badges */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>Email Deliverability (&lt;10MB):</span>
                    <span className={`font-black px-2 py-0.5 rounded ${estimation.emailReady ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {estimation.emailReady ? '✓ Compatible' : '✕ Oversized'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>Portal Submission (&lt;2MB):</span>
                    <span className={`font-black px-2 py-0.5 rounded ${estimation.portalReady ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {estimation.portalReady ? '✓ Compatible' : 'Need Max Mode'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  to="/compress"
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Compress My PDF Now <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          {/* Non-Intrusive Sponsored Slot */}
          <div className="mt-8">
            <AdSlot placement="CALCULATOR_BOTTOM" />
          </div>

        </div>
      </section>
    </div>
  );
};

export default CalculatorPage;
