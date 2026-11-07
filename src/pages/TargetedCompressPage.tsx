import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ALL_LANDING_PAGES } from '../data/landingPages';
import SimpleTool from './SimpleTool';
import MergeTool from './MergeTool';
import EditTool from './EditTool';
import { NotifySystem } from '../types';
import AdsterraBanner from '../components/AdsterraBanner';
import DesktopSideRails from '../components/DesktopSideRails';
import { FileText, Cpu, LayoutGrid, HelpCircle, ChevronDown } from 'lucide-react';

interface TargetedCompressPageProps {
  pageSlug?: string;
  darkMode: boolean;
  notify: NotifySystem;
}

const SIZE_PRESETS = [
  { label: '20 KB', href: '/compress-pdf-to-20kb/' },
  { label: '50 KB', href: '/compress-pdf-to-50kb/' },
  { label: '100 KB', href: '/compress-pdf-to-100kb/' },
  { label: '200 KB', href: '/compress-pdf-to-200kb/' },
  { label: '300 KB', href: '/compress-pdf-to-300kb/' },
  { label: '500 KB', href: '/compress-pdf-to-500kb/' },
  { label: '1 MB', href: '/compress-pdf-to-1mb/' },
  { label: '2 MB', href: '/compress-pdf-to-2mb/' }
];

const PORTAL_PRESETS = [
  { label: 'SSC CGL / CHSL', href: '/compress-pdf-for-ssc/' },
  { label: 'UPSC OTR', href: '/compress-pdf-for-upsc/' },
  { label: 'NEET Exam', href: '/compress-pdf-for-neet/' },
  { label: 'JEE Main', href: '/compress-pdf-for-jee/' },
  { label: 'IBPS Bank', href: '/compress-pdf-for-ibps/' },
  { label: 'RRB Railway', href: '/compress-pdf-for-rrb/' },
  { label: 'Aadhaar + PAN', href: '/merge-aadhaar-and-pan-card/' },
  { label: 'All Govt Portals', href: '/pdf-size-reducer-for-government-portal/' }
];

const TargetedCompressPage: React.FC<TargetedCompressPageProps> = ({ pageSlug: propSlug, darkMode, notify }) => {
  const params = useParams<{ slug?: string }>();
  const currentSlug = propSlug || params.slug || 'compress-pdf-to-100kb';

  const page = ALL_LANDING_PAGES.find(p => p.slug === currentSlug) || ALL_LANDING_PAGES[0];
  const baseUrl = 'https://pdfbolt.in';
  const canonicalUrl = `${baseUrl}/${page.slug}/`;

  // Information Console Active Tab & FAQ state
  const [activeTab, setActiveTab] = useState<'specs' | 'guide' | 'tools' | 'faqs'>(() => {
    if (page.portalSpecs && page.portalSpecs.length > 0) return 'specs';
    if (page.sections && page.sections.length > 0) return 'guide';
    return 'faqs';
  });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Schemas with AggregateRating for Rich SERP Review Stars
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `PDFBolt ${page.h1}`,
    "url": canonicalUrl,
    "description": page.metaDescription,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web Browser, Windows, macOS, Linux, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1420",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `How to ${page.h1}`,
    "description": page.metaDescription,
    "step": page.steps.map((s, idx) => ({
      "@type": "HowToStep",
      "position": idx + 1,
      "name": s.name,
      "text": s.text
    }))
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": page.faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
      { "@type": "ListItem", "position": 2, "name": "PDF Tools", "item": `${baseUrl}/tools/` },
      { "@type": "ListItem", "position": 3, "name": page.h1, "item": canonicalUrl }
    ]
  };

  return (
    <div className="animate-fadeIn min-h-screen pb-12">
      <Helmet>
        <title>{page.seoTitle}</title>
        <meta name="description" content={page.metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={page.seoTitle} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(webAppSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Top Breadcrumbs & Compact Header */}
      <div className={`pt-3 pb-2.5 sm:pt-4 sm:pb-3 border-b ${darkMode ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200/80 bg-white/60'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <nav aria-label="Breadcrumb" className="flex justify-center items-center gap-1.5 text-[11px] font-semibold mb-1 text-slate-500">
            <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/tools/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
            <span>/</span>
            <span className="text-yellow-700 dark:text-yellow-400 font-bold">{page.h1}</span>
          </nav>

          <h1 className={`text-xl sm:text-2xl md:text-3xl font-extrabold mb-1 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {page.h1}
          </h1>
          <p className={`text-xs sm:text-sm max-w-2xl mx-auto font-normal ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {page.subtitle}
          </p>
        </div>
      </div>

      {/* Interactive Tool Container with Integrated Preset Switcher & Zero-CLS Side Rails */}
      <DesktopSideRails centerWidthClass="max-w-4xl" className="py-2">
        <div className="w-full">
          <div className="w-full px-1 sm:px-2 py-1">
            <div className={`rounded-2xl sm:rounded-3xl border craft-card backdrop-blur-xl overflow-hidden transition-all ${
              darkMode 
                ? 'bg-[#0e1422]/85 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.36)]' 
                : 'bg-white/90 border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
            }`}>
              {/* Integrated Size & Portal Preset Rail */}
              <div className={`px-3 sm:px-5 py-2 sm:py-2.5 border-b flex flex-col gap-1.5 ${
                darkMode ? 'bg-[#0b101c]/90 border-white/[0.06]' : 'bg-slate-50/80 border-slate-200/70'
              }`}>
                {/* Row 1: Target Size Presets */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 shrink-0">
                    Target Size:
                  </span>
                  <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                    {SIZE_PRESETS.map(link => {
                      const isActive = link.href.replace(/\/$/, '') === `/${page.slug}`;
                      return (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-500/50'
                              : darkMode
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 shadow-2xs'
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: Exam & Portal Shortcuts */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 border-t border-slate-200/50 dark:border-slate-800/50 pt-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 shrink-0">
                    Portals:
                  </span>
                  <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                    {PORTAL_PRESETS.map(link => {
                      const isActive = link.href.replace(/\/$/, '') === `/${page.slug}`;
                      return (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                            isActive
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                              : darkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tool Workspace Area */}
              <div className="p-3 sm:p-5">
                {page.toolType === 'compress' && (
                  <SimpleTool
                    title={page.h1}
                    mode="compress"
                    darkMode={darkMode}
                    notify={notify}
                    initialCompressionLevel={page.presetLevel}
                    targetSizeHint={page.targetSizeHint}
                  />
                )}

                {page.toolType === 'merge' && (
                  <MergeTool
                    darkMode={darkMode}
                    notify={notify}
                    customHint={page.customHint}
                    allowImages={page.slug === 'merge-aadhaar-and-pan-card' || page.slug.includes('merge')}
                  />
                )}

                {page.toolType === 'jpg2pdf' && (
                  <SimpleTool
                    title={page.h1}
                    mode="jpg2pdf"
                    darkMode={darkMode}
                    notify={notify}
                    targetSizeHint={page.targetSizeHint}
                  />
                )}

                {page.toolType === 'pdf2jpg' && (
                  <SimpleTool
                    title={page.h1}
                    mode="pdf2jpg"
                    darkMode={darkMode}
                    notify={notify}
                    targetSizeHint={page.targetSizeHint}
                  />
                )}

                {page.toolType === 'edit' && (
                  <EditTool
                    darkMode={darkMode}
                    notify={notify}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sponsored Horizontal Banner */}
          <div className="w-full max-w-4xl mx-auto px-2 my-2 flex flex-col items-center justify-center min-h-[105px]">
            <AdsterraBanner format="responsive" className="my-1" showLabel={true} />
          </div>

          {/* Precision Information & Guidelines Console (Single-Screen Multi-Tab Architecture) */}
          <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 mt-4 text-left">
            <div className={`rounded-2xl border craft-card backdrop-blur-xl transition-all overflow-hidden ${
              darkMode 
                ? 'bg-[#0e1422]/85 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.36)]' 
                : 'bg-white/90 border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
            }`}>
              {/* Segmented Tab Navigation Bar */}
              <div className={`p-1.5 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
                darkMode ? 'bg-[#0b101c]/80 border-white/[0.06]' : 'bg-slate-50/80 border-slate-200/70'
              }`}>
                {page.portalSpecs && page.portalSpecs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('specs')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeTab === 'specs'
                        ? darkMode
                          ? 'bg-slate-800 text-amber-400 shadow-xs ring-1 ring-slate-700'
                          : 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText size={14} className={activeTab === 'specs' ? 'text-amber-500' : 'text-slate-400'} />
                    <span>Portal Specs</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      activeTab === 'specs'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {page.portalSpecs.length}
                    </span>
                  </button>
                )}

                {page.sections && page.sections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('guide')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeTab === 'guide'
                        ? darkMode
                          ? 'bg-slate-800 text-amber-400 shadow-xs ring-1 ring-slate-700'
                          : 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Cpu size={14} className={activeTab === 'guide' ? 'text-amber-500' : 'text-slate-400'} />
                    <span>Technical Guide</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('tools')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeTab === 'tools'
                      ? darkMode
                        ? 'bg-slate-800 text-amber-400 shadow-xs ring-1 ring-slate-700'
                        : 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid size={14} className={activeTab === 'tools' ? 'text-amber-500' : 'text-slate-400'} />
                  <span>Related Portals</span>
                </button>

                {page.faqs && page.faqs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('faqs')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeTab === 'faqs'
                        ? darkMode
                          ? 'bg-slate-800 text-amber-400 shadow-xs ring-1 ring-slate-700'
                          : 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <HelpCircle size={14} className={activeTab === 'faqs' ? 'text-amber-500' : 'text-slate-400'} />
                    <span>FAQs</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      activeTab === 'faqs'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {page.faqs.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Active Tab Panel Body */}
              <div className="p-4 sm:p-5 max-h-[360px] overflow-y-auto">
                {/* TAB 1: Portal Specs */}
                {activeTab === 'specs' && page.portalSpecs && (
                  <div className="animate-fadeIn space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Official Portal Document Specifications
                      </h3>
                      <span className="text-[11px] text-slate-400">Pre-calibrated mandatory file boundaries</span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className={`border-b ${darkMode ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'} font-bold text-[11px] uppercase tracking-wider`}>
                            <th className="py-2 px-3">Document Type</th>
                            <th className="py-2 px-3">Mandatory Size</th>
                            <th className="py-2 px-3">Format</th>
                            <th className="py-2 px-3">Requirements</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                          {page.portalSpecs.map((spec, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? (darkMode ? 'bg-slate-900/40' : 'bg-white') : (darkMode ? 'bg-slate-950/20' : 'bg-slate-50/50')}>
                              <td className="py-2 px-3 font-semibold">{spec.name}</td>
                              <td className="py-2 px-3 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{spec.allowedSize}</td>
                              <td className="py-2 px-3 whitespace-nowrap">{spec.allowedFormat}</td>
                              <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{spec.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: Technical Guide */}
                {activeTab === 'guide' && page.sections && (
                  <div className="animate-fadeIn space-y-3">
                    {page.sections.map((sec, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/60 border-slate-200/80'}`}>
                        <h4 className={`text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {sec.heading}
                        </h4>
                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                          {sec.paragraphs.map((p, pIdx) => (
                            <p key={pIdx}>{p}</p>
                          ))}
                        </div>
                        {sec.tips && sec.tips.length > 0 && (
                          <ul className="mt-2.5 space-y-1 list-disc pl-4 text-xs text-slate-500 dark:text-slate-400">
                            {sec.tips.map((tip, tIdx) => (
                              <li key={tIdx}>{tip}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: Related Portals */}
                {activeTab === 'tools' && (
                  <div className="animate-fadeIn space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Calibrated Target Sizes
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SIZE_PRESETS.map(preset => {
                          const isActive = preset.href.replace(/\/$/, '') === `/${page.slug}`;
                          return (
                            <Link
                              key={preset.href}
                              to={preset.href}
                              className={`p-2 rounded-xl border text-center transition-all text-xs font-bold ${
                                isActive
                                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                                  : darkMode
                                    ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-amber-400 hover:text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-500 hover:bg-amber-50/30'
                              }`}
                            >
                              {preset.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Official Exam & Recruitment Portals
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PORTAL_PRESETS.map(portal => {
                          const isActive = portal.href.replace(/\/$/, '') === `/${page.slug}`;
                          return (
                            <Link
                              key={portal.href}
                              to={portal.href}
                              className={`p-2 rounded-xl border text-center transition-all text-xs font-medium truncate ${
                                isActive
                                  ? 'bg-amber-400 text-slate-950 font-bold border-amber-500 shadow-xs'
                                  : darkMode
                                    ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-amber-400 hover:text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-500 hover:bg-amber-50/30'
                              }`}
                            >
                              {portal.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: Frequently Asked Questions */}
                {activeTab === 'faqs' && page.faqs && (
                  <div className="animate-fadeIn space-y-2">
                    {page.faqs.map((faq, idx) => {
                      const isOpen = expandedFaq === idx;
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border transition-all ${
                            isOpen
                              ? darkMode
                                ? 'bg-slate-950/60 border-amber-500/30 ring-1 ring-amber-500/20'
                                : 'bg-amber-50/30 border-amber-200/80 ring-1 ring-amber-200/40'
                              : darkMode
                                ? 'bg-slate-950/30 border-slate-800/80'
                                : 'bg-slate-50/60 border-slate-200/60'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFaq(isOpen ? null : idx)}
                            className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl"
                          >
                            <h4 className={`text-xs sm:text-sm font-bold ${
                              isOpen
                                ? 'text-amber-700 dark:text-amber-400'
                                : darkMode ? 'text-slate-200' : 'text-slate-800'
                            }`}>
                              {faq.q}
                            </h4>
                            <ChevronDown
                              size={16}
                              className={`shrink-0 transition-transform duration-200 ${
                                isOpen ? 'rotate-180 text-amber-500' : 'text-slate-400'
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-3.5 pb-3.5 pt-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal border-t border-slate-200/50 dark:border-slate-800/50 mt-1">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DesktopSideRails>
    </div>
  );
};

export default TargetedCompressPage;
