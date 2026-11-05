import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ALL_LANDING_PAGES } from '../data/landingPages';
import SimpleTool from './SimpleTool';
import MergeTool from './MergeTool';
import EditTool from './EditTool';
import { NotifySystem } from '../types';
import AdSlot from '../components/AdSlot';
import AdsterraBanner from '../components/AdsterraBanner';

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

  // Schemas
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

      {/* Top Breadcrumbs & Hero Header (Ultra-Compact for Instant Viewport Visibility) */}
      <div className={`pt-4 pb-3 sm:pt-5 sm:pb-3.5 border-b ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <nav aria-label="Breadcrumb" className="flex justify-center items-center gap-2 text-xs font-semibold mb-1.5 text-slate-500">
            <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/tools/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
            <span>/</span>
            <span className="text-yellow-700 dark:text-yellow-400 font-bold">{page.h1}</span>
          </nav>

          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1.5 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {page.h1}
          </h1>
          <p className={`text-xs sm:text-sm max-w-2xl mx-auto font-normal ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {page.subtitle}
          </p>
        </div>
      </div>

      {/* Interactive Tool Container with Integrated Preset Switcher (Zero Scroll) */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className={`rounded-2xl sm:rounded-3xl border shadow-lg overflow-hidden transition-all ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Integrated Size & Portal Preset Rail */}
          <div className={`px-3 sm:px-5 py-2.5 sm:py-3 border-b flex flex-col gap-2 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/90 border-slate-100'
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

      {/* Sponsored Ad Banner (Directly Beneath Tool, 100% Above The Fold) */}
      <div className="max-w-4xl mx-auto px-4 mt-2 mb-4 flex flex-col items-center justify-center">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
        <AdsterraBanner format="responsive" className="my-1" />
      </div>
    </div>
  );
};

export default TargetedCompressPage;
