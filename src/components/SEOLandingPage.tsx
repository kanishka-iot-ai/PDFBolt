import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Clock, UserX, HelpCircle, CheckCircle, ArrowRight, BookOpen, Layers, Sparkles } from 'lucide-react';
import { TOOLS, GUIDES, getIcon } from '../constants';
import { Link, useLocation } from 'react-router-dom';
import AdSlot from './AdSlot';
import { useActiveWork } from '../context/ActiveWorkContext';

interface SEOLandingPageProps {
  tool?: typeof TOOLS[0];
  toolId?: string;
  darkMode: boolean;
  children: React.ReactNode;
}

const SEOLandingPage: React.FC<SEOLandingPageProps> = ({ tool: toolProp, toolId, darkMode, children }) => {
  const tool = toolProp || (toolId ? TOOLS.find(t => t.id === toolId) : undefined);
  const location = useLocation();
  const { hasActiveWork } = useActiveWork();

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
    <div className="animate-fadeIn w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] lg:overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900">
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

      {/* 1. HERO HEADER (Clean, Minimal, Non-Scrolling) */}
      <div className={`pt-6 pb-4 border-b shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Breadcrumb Navigation */}
          <nav className="flex justify-center items-center gap-2 text-xs font-semibold mb-1 text-slate-500">
            <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
            <span>/</span>
            <span className="text-yellow-700 dark:hover:text-yellow-400 font-bold">{tool.title}</span>
          </nav>

          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black mb-2 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {tool.title}
          </h1>
          <p className={`text-sm sm:text-base max-w-xl mx-auto font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {tool.description}
          </p>
        </div>
      </div>

      {/* 2. THE WORKING INTERACTIVE TOOL (Center Select File Area) */}
      <div className="flex-grow flex items-center justify-center p-4 sm:p-6 my-auto">
        {children}
      </div>

      {/* 3. NON-INTRUSIVE HIGH-VISIBILITY AD PLACEMENT (BELOW UPLOADER) */}
      <div className="max-w-4xl mx-auto px-4 w-full my-2 shrink-0 flex justify-center">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
      </div>

      {/* 4. RELATED PDF TOOLS (Sleek Suggestive Bottom Bar) */}
      {relatedToolsList.length > 0 && (
        <div className={`border-t px-6 py-2.5 shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-white'}`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0 hidden sm:inline">
              Suggested Tools:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {relatedToolsList.map(rt => rt && (
                <Link
                  key={rt.id}
                  to={rt.canonicalPath || rt.path}
                  className={`px-3 py-1 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    darkMode ? 'bg-slate-800 border-slate-700 hover:border-yellow-500/50 text-slate-200' : 'bg-slate-50 border-slate-200 hover:border-yellow-500/50 text-slate-700'
                  }`}
                >
                  <div className="text-yellow-600 dark:text-yellow-400 shrink-0">
                    {React.cloneElement(getIcon(rt.icon) as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                  </div>
                  <span>{rt.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SEOLandingPage;
