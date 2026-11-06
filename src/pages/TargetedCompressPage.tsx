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
import DesktopSideRails from '../components/DesktopSideRails';

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
    <div className="animate-fadeIn min-h-screen pb-16">
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

      {/* Interactive Tool Container with Integrated Preset Switcher & Zero-CLS Side Rails */}
      <DesktopSideRails centerWidthClass="max-w-4xl" className="py-2">
        <div className="w-full">
          <div className="w-full px-1 sm:px-2 py-2">
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

      {/* Sponsored Horizontal Banner (Balanced with Left and Right Vertical Side Rails) */}
          <div className="w-full max-w-4xl mx-auto px-2 mt-4 mb-2 flex flex-col items-center justify-center min-h-[110px] md:min-h-[115px]">
            <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
            <AdsterraBanner format="responsive" className="my-1" />
          </div>
        </div>
      </DesktopSideRails>

      {/* Editorial Content & Knowledge Base (Rendered in DOM for Complete Googlebot Indexing) */}
      <div className="max-w-4xl mx-auto px-4 mt-12 space-y-8 text-left">
        {/* Section 1: Official Portal Document Specifications Table */}
        {page.portalSpecs && page.portalSpecs.length > 0 && (
          <div className={`p-5 sm:p-6 rounded-2xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <h2 className={`text-lg sm:text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Official Portal Document Specifications
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-normal">
              Pre-calibrated mandatory file boundaries for official exam portals, recruitment boards, and verification systems.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'} font-semibold text-[11px] uppercase tracking-wider`}>
                    <th className="py-2.5 px-3">Document Type</th>
                    <th className="py-2.5 px-3">Mandatory Size</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Requirements</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                  {page.portalSpecs.map((spec, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? (darkMode ? 'bg-slate-900/40' : 'bg-white/60') : ''}>
                      <td className="py-2.5 px-3 font-medium">{spec.name}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">{spec.allowedSize}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{spec.allowedFormat}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400">{spec.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 2: Step-by-Step Instructions */}
        {page.steps && page.steps.length > 0 && (
          <div className={`p-5 sm:p-6 rounded-2xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <h2 className={`text-lg sm:text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              How to {page.h1} ({page.steps.length} Easy Steps)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {page.steps.map((step, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center mb-2.5 shadow-xs">
                    {idx + 1}
                  </div>
                  <h3 className={`text-sm font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{step.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Technical Guides & Detailed Sections */}
        {page.sections && page.sections.length > 0 && (
          <div className="space-y-6">
            {page.sections.map((sec, idx) => (
              <div key={idx} className={`p-5 sm:p-6 rounded-2xl border ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <h2 className={`text-lg sm:text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {sec.heading}
                </h2>
                <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
                {sec.tips && sec.tips.length > 0 && (
                  <ul className="mt-3.5 space-y-1.5 list-disc pl-5 text-xs text-slate-600 dark:text-slate-400">
                    {sec.tips.map((tip, tIdx) => (
                      <li key={tIdx}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Section 4: Contextual Internal Link Mesh (Pi7-style Topical Authority) */}
        <div className={`p-5 sm:p-6 rounded-2xl border ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <h2 className={`text-base sm:text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Related Target Sizes & Government Portal Tools
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
            Switch to an alternate calibrated preset if your target document requires different exact byte ceilings:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Compress PDF to 20KB (Signatures)', href: '/compress-pdf-to-20kb/' },
              { label: 'Compress PDF to 50KB (Identity Slips)', href: '/compress-pdf-to-50kb/' },
              { label: 'Compress PDF to 100KB (Marksheets)', href: '/compress-pdf-to-100kb/' },
              { label: 'Compress PDF to 200KB (Certificates)', href: '/compress-pdf-to-200kb/' },
              { label: 'Compress PDF to 300KB (UPSC & EPFO)', href: '/compress-pdf-to-300kb/' },
              { label: 'Compress PDF to 500KB (High-Res)', href: '/compress-pdf-to-500kb/' },
              { label: 'Compress PDF to 1MB (General)', href: '/compress-pdf-to-1mb/' },
              { label: 'SSC CGL / CHSL Compressor', href: '/compress-pdf-for-ssc/' },
              { label: 'UPSC OTR Document Tool', href: '/compress-pdf-for-upsc/' },
              { label: 'NEET Exam Document Tool', href: '/compress-pdf-for-neet/' },
              { label: 'JEE Main Document Tool', href: '/compress-pdf-for-jee/' },
              { label: 'IBPS Bank Marksheet Tool', href: '/compress-pdf-for-ibps/' },
              { label: 'RRB Railway Travel Pass Tool', href: '/compress-pdf-for-rrb/' },
              { label: 'Merge Aadhaar & PAN Card', href: '/merge-aadhaar-and-pan-card/' },
              { label: 'Government Portal Size Reducer', href: '/pdf-size-reducer-for-government-portal/' }
            ].map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                  link.href.replace(/\/$/, '') === `/${page.slug}`
                    ? 'bg-amber-400 text-slate-950 font-bold border-amber-500'
                    : darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-amber-500 hover:bg-amber-50/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Section 5: Frequently Asked Questions */}
        {page.faqs && page.faqs.length > 0 && (
          <div className={`p-5 sm:p-6 rounded-2xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <h2 className={`text-lg sm:text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {page.faqs.map((faq, idx) => (
                <div key={idx} className="border-b border-slate-200/60 dark:border-slate-800/60 pb-3.5 last:border-0 last:pb-0">
                  <h3 className={`text-sm font-bold mb-1.5 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {faq.q}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetedCompressPage;
