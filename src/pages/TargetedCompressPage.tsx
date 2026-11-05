import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Target } from 'lucide-react';
import { ALL_LANDING_PAGES, LandingPageContent } from '../data/landingPages';
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
            <Link to="/tools/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
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

      {/* Ad Placement */}
      <div className="max-w-4xl mx-auto px-4 my-6 flex flex-col items-center justify-center">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
        <AdsterraBanner format="responsive" className="my-2" />
      </div>

      {/* Internal Linking & Quick Size Switcher */}
      <div className="max-w-4xl mx-auto px-4">
        <div className={`p-6 sm:p-8 rounded-3xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <p className="text-xs font-black uppercase tracking-wider mb-2 text-slate-500">Explore More Targeted PDF Tools</p>
          <h2 className={`text-lg sm:text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Need a Different File Size or Portal Target?</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: '20 KB', href: '/compress-pdf-to-20kb/' },
              { label: '50 KB', href: '/compress-pdf-to-50kb/' },
              { label: '100 KB', href: '/compress-pdf-to-100kb/' },
              { label: '200 KB', href: '/compress-pdf-to-200kb/' },
              { label: '300 KB', href: '/compress-pdf-to-300kb/' },
              { label: '500 KB', href: '/compress-pdf-to-500kb/' },
              { label: '1 MB', href: '/compress-pdf-to-1mb/' },
              { label: '2 MB', href: '/compress-pdf-to-2mb/' },
              { label: 'SSC CGL/CHSL', href: '/compress-pdf-for-ssc/' },
              { label: 'UPSC OTR', href: '/compress-pdf-for-upsc/' },
              { label: 'NEET Exam', href: '/compress-pdf-for-neet/' },
              { label: 'JEE Main', href: '/compress-pdf-for-jee/' },
              { label: 'IBPS Bank', href: '/compress-pdf-for-ibps/' },
              { label: 'Aadhaar + PAN Merge', href: '/merge-aadhaar-and-pan-card/' },
              { label: 'Govt Portals', href: '/pdf-size-reducer-for-government-portal/' }
            ].map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  link.href.replace(/\/$/, '') === `/${page.slug}`
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
