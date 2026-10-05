import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Target, ArrowRight, HelpCircle, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { ALL_LANDING_PAGES, LandingPageContent } from '../data/landingPages';
import SimpleTool from './SimpleTool';
import MergeTool from './MergeTool';
import EditTool from './EditTool';
import { NotifySystem } from '../types';
import AdSlot from '../components/AdSlot';

interface TargetedCompressPageProps {
  pageSlug?: string;
  darkMode: boolean;
  notify: NotifySystem;
}

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
    <div className="animate-fadeIn min-h-screen pb-20">
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

      {/* Top Breadcrumbs & Hero Header */}
      <div className={`pt-8 pb-6 border-b ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <nav aria-label="Breadcrumb" className="flex justify-center items-center gap-2 text-xs font-semibold mb-3 text-slate-500">
            <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
            <span>/</span>
            <span className="text-yellow-700 dark:text-yellow-400 font-bold">{page.h1}</span>
          </nav>

          {page.targetSizeHint && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-black text-[11px] uppercase tracking-widest mb-3 border border-amber-600/30">
              <Target size={14} /> {page.targetSizeHint}
            </div>
          )}

          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {page.h1}
          </h1>
          <p className={`text-sm sm:text-base max-w-2xl mx-auto font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {page.subtitle}
          </p>
        </div>
      </div>

      {/* Interactive Tool Above The Fold */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className={`p-4 sm:p-6 rounded-3xl border shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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

      {/* Ad Placement */}
      <div className="max-w-4xl mx-auto px-4 my-6 flex justify-center">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
      </div>

      {/* Quick Summary Banner */}
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50/80 border-amber-200 text-amber-900'}`}>
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-black text-xs uppercase tracking-wider mb-1">Quick Answer & Intent</p>
              <p className="text-sm font-medium leading-relaxed">{page.quickAnswer}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Specifications Table (If applicable, e.g. for SSC, UPSC, NEET, JEE) */}
      {page.portalSpecs && page.portalSpecs.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mb-12">
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-yellow-600 dark:text-yellow-400" size={20} />
              <h2 className={`text-xl sm:text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Official Portal Document Specifications
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Always confirm file boundaries with the official exam notification before submitting.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className={darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'}>
                  <tr>
                    <th className="p-3.5 font-black">Document Type</th>
                    <th className="p-3.5 font-black">Mandatory Size</th>
                    <th className="p-3.5 font-black">Format</th>
                    <th className="p-3.5 font-black">Requirements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {page.portalSpecs.map((spec, i) => (
                    <tr key={i} className={i % 2 === 0 ? (darkMode ? 'bg-slate-900/40' : 'bg-white') : (darkMode ? 'bg-slate-800/30' : 'bg-slate-50/50')}>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{spec.name}</td>
                      <td className="p-3.5 font-black text-amber-700 dark:text-amber-400">{spec.allowedSize}</td>
                      <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-300">{spec.allowedFormat}</td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 text-xs">{spec.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Instructions */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-xl sm:text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            How to {page.h1} (3 Easy Steps)
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {page.steps.map((s, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-8 h-8 rounded-xl bg-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center mb-3">
                  {idx + 1}
                </div>
                <h3 className={`font-bold text-sm mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{s.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Technical Sections */}
      <div className="max-w-4xl mx-auto px-4 space-y-8 mb-12">
        {page.sections.map((sec, idx) => (
          <div key={idx} className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-xl sm:text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {sec.heading}
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {sec.paragraphs.map((p, pIdx) => (
                <p key={pIdx}>{p}</p>
              ))}
            </div>

            {sec.tips && sec.tips.length > 0 && (
              <div className={`mt-6 p-4 rounded-xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <p className="font-black text-xs uppercase tracking-wider mb-2 text-slate-900 dark:text-white">Pro Tips for Portal Submissions</p>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {sec.tips.map((t, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rich FAQs Section */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="text-yellow-600 dark:text-yellow-400" size={20} />
            <h2 className={`text-xl sm:text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {page.faqs.map((faq, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`font-bold text-sm mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {faq.q}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Internal Linking & Quick Size Switcher */}
      <div className="max-w-4xl mx-auto px-4">
        <div className={`p-6 sm:p-8 rounded-3xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <p className="text-xs font-black uppercase tracking-wider mb-2 text-slate-500">Explore More Targeted PDF Tools</p>
          <h2 className={`text-lg sm:text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Need a Different File Size or Portal Target?</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: '20 KB', href: '/compress-pdf-to-20kb' },
              { label: '50 KB', href: '/compress-pdf-to-50kb' },
              { label: '100 KB', href: '/compress-pdf-to-100kb' },
              { label: '200 KB', href: '/compress-pdf-to-200kb' },
              { label: '300 KB', href: '/compress-pdf-to-300kb' },
              { label: '500 KB', href: '/compress-pdf-to-500kb' },
              { label: '1 MB', href: '/compress-pdf-to-1mb' },
              { label: '2 MB', href: '/compress-pdf-to-2mb' },
              { label: 'SSC CGL/CHSL', href: '/compress-pdf-for-ssc' },
              { label: 'UPSC OTR', href: '/compress-pdf-for-upsc' },
              { label: 'NEET Exam', href: '/compress-pdf-for-neet' },
              { label: 'JEE Main', href: '/compress-pdf-for-jee' },
              { label: 'IBPS Bank', href: '/compress-pdf-for-ibps' },
              { label: 'Aadhaar + PAN Merge', href: '/merge-aadhaar-and-pan-card' },
              { label: 'Govt Portals', href: '/pdf-size-reducer-for-government-portal' }
            ].map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  link.href === `/${page.slug}`
                    ? 'bg-yellow-500 text-slate-950 border-yellow-500'
                    : darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TargetedCompressPage;
