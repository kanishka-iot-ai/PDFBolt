import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Clock, UserX, HelpCircle, CheckCircle, ArrowRight, BookOpen, Layers, Sparkles } from 'lucide-react';
import { TOOLS, GUIDES, getIcon } from '../constants';
import { Link, useLocation } from 'react-router-dom';
import AdSlot from './AdSlot';
import { useActiveWork } from '../context/ActiveWorkContext';

interface SEOLandingPageProps {
  toolId: string;
  darkMode: boolean;
  children: React.ReactNode;
}

const SEOLandingPage: React.FC<SEOLandingPageProps> = ({ toolId, darkMode, children }) => {
  const tool = TOOLS.find(t => t.id === toolId);
  const location = useLocation();
  const { hasActiveWork } = useActiveWork();

  if (!tool) return <>{children}</>;

  const baseUrl = 'https://pdfbolt.in';
  const canonicalUrl = `${baseUrl}${tool.canonicalPath || location.pathname}`;

  // Software Application Schema
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `PDFBolt ${tool.title}`,
    "url": canonicalUrl,
    "description": tool.description,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": tool.features?.join(', ') || "PDF Tools"
  };

  // HowTo Schema
  const howToSchema = tool.howToSteps ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `How to ${tool.title}`,
    "description": tool.description,
    "step": tool.howToSteps.map((step, idx) => ({
      "@type": "HowToStep",
      "position": idx + 1,
      "name": step.name,
      "text": step.text
    }))
  } : null;

  // FAQ Schema
  const faqSchema = tool.faqs ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": tool.faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  } : null;

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "PDF Tools",
        "item": `${baseUrl}/tools`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": tool.title,
        "item": canonicalUrl
      }
    ]
  };

  // Fetch related tools & guides objects
  const relatedToolsList = (tool.relatedTools || [])
    .map(id => TOOLS.find(t => t.id === id))
    .filter(Boolean);

  // When files are actively loaded, render the focused single-viewport interactive workspace
  if (hasActiveWork) {
    return (
      <div className="animate-fadeIn w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-[#f4f5f8] dark:bg-slate-950">
        <Helmet>
          <title>{tool.seoTitle || `${tool.title} – Free & Private Online Tool | PDFBolt`}</title>
          <meta name="description" content={tool.description} />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:title" content={tool.seoTitle || tool.title} />
          <meta property="og:description" content={tool.description} />
          <meta property="og:url" content={canonicalUrl} />
          <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
          <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
          {howToSchema && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
          {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
        </Helmet>

        {/* The 2-Column Working Tool Area (Edge-to-Edge Full Height) */}
        <div className="w-full h-full flex-grow overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // Default Landing / Dropzone View (When no file uploaded yet)
  return (
    <div className="animate-fadeIn">
      <Helmet>
        <title>{tool.seoTitle || `${tool.title} – Free & Private Online Tool | PDFBolt`}</title>
        <meta name="description" content={tool.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={tool.seoTitle || tool.title} />
        <meta property="og:description" content={tool.description} />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {howToSchema && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>
      {/* 1. HERO HEADER (Compact & Modern) */}
      <div className={`pt-4 pb-4 sm:pt-6 sm:pb-6 border-b ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Breadcrumb Visual Navigation */}
          <nav className="flex justify-center items-center gap-2 text-xs font-semibold mb-2 text-slate-500">
            <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
            <span>/</span>
            <span className="text-yellow-700 dark:text-yellow-400 font-bold">{tool.title}</span>
          </nav>

          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black mb-2 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {tool.title}
          </h1>
          <p className={`text-xs sm:text-sm md:text-base max-w-2xl mx-auto mb-3 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {tool.description}
          </p>

          {/* Privacy & Speed Badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <ShieldCheck size={13} /> {tool.id === 'pdf-to-qr' ? 'Encrypted Ephemeral Cloud' : '100% Local In-Browser Privacy'}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
              <UserX size={13} /> Free & No Sign-Up
            </div>
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
              <Clock size={13} /> Instant Processing
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE WORKING INTERACTIVE TOOL */}
      <div className="relative z-10 py-3 sm:py-5">
        {children}
      </div>

      {/* 3. NON-INTRUSIVE HIGH-VISIBILITY AD PLACEMENT (BELOW UPLOADER) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 my-3 sm:my-5">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" />
      </div>

      {/* 4. RELATED PDF TOOLS (Sleek Suggestive Bottom Bar) */}
      {relatedToolsList.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Layers size={14} className="text-yellow-500" /> Suggestive PDF Tools
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold">100% Free & Private</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {relatedToolsList.map(rt => rt && (
                <Link
                  key={rt.id}
                  to={rt.canonicalPath || rt.path}
                  className={`p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex items-center gap-3 shrink-0 min-w-[200px] max-w-[260px] ${
                    darkMode ? 'bg-slate-800/80 border-slate-700 hover:border-yellow-500/50 text-white' : 'bg-white border-slate-200 hover:border-yellow-500/50 text-slate-900'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 shrink-0">
                    {React.cloneElement(getIcon(rt.icon) as React.ReactElement, { className: 'w-4 h-4' })}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-xs truncate">
                      {rt.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">
                      {rt.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SEOLandingPage;
