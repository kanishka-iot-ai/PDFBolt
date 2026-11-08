import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Clock, UserX, HelpCircle, CheckCircle, ArrowRight, BookOpen, Layers, Sparkles, Star } from 'lucide-react';
import { TOOLS, GUIDES, getIcon } from '../constants';
import { Link, useLocation } from 'react-router-dom';
import AdSlot from './AdSlot';
import AdsterraBanner from './AdsterraBanner';
import DesktopSideRails from './DesktopSideRails';
import TrustMicroAnchor from './TrustMicroAnchor';
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
  const rawPath = tool?.canonicalPath || location.pathname;
  const canonicalPath = rawPath.endsWith('/') ? rawPath : `${rawPath}/`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  // Software Application Schema
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `PDFBolt ${tool?.title || 'Tool'}`,
    "url": canonicalUrl,
    "description": tool?.description,
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
    },
    "featureList": tool?.features?.join(', ') || "PDF Tools"
  };

  // HowTo Schema
  const howToSchema = tool?.howToSteps ? {
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
  const faqSchema = tool?.faqs ? {
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
        "item": `${baseUrl}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "PDF Tools",
        "item": `${baseUrl}/tools/`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": tool?.title || 'PDF Tool',
        "item": canonicalUrl
      }
    ]
  };

  // Fetch related tools & guides objects
  const relatedToolsList = (tool?.relatedTools || [])
    .map(id => TOOLS.find(t => t.id === id))
    .filter(Boolean);

  return (
    <div className={`animate-fadeIn w-full ${hasActiveWork ? 'h-[calc(100vh-64px)] overflow-hidden bg-[#f4f5f8] dark:bg-slate-950 flex flex-col' : 'md:h-[calc(100dvh-4rem)] md:max-h-[calc(100dvh-4rem)] md:overflow-hidden min-h-[calc(100vh-64px)] flex flex-col justify-between bg-white dark:bg-slate-900'}`}>
      <Helmet>
        <title>{tool?.seoTitle || `${tool?.title || 'PDF Tool'} - Free & Private Online Tool | PDFBolt`}</title>
        <meta name="description" content={tool?.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={tool?.seoTitle || tool?.title} />
        <meta property="og:description" content={tool?.description} />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {howToSchema && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>

      {/* 1. HERO HEADER (Always retained in DOM for SEO & A11y, visually hidden during active interaction) */}
      <div className={hasActiveWork ? "sr-only" : `pt-1.5 pb-1 sm:pt-2 sm:pb-1.5 border-b shrink-0 ${darkMode ? 'border-slate-800/80 bg-slate-900/30' : 'border-slate-200/80 bg-white/40'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Breadcrumb Navigation & Rating in 1 single line */}
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mb-0.5">
            <nav className="flex items-center gap-1.5">
              <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
              <span>/</span>
              <Link to="/tools/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
              <span>/</span>
              <span className="text-yellow-700 dark:text-yellow-400 font-bold">{tool?.title}</span>
            </nav>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              <Star size={11} fill="currentColor" />
              <span>4.9/5 (1,420+ ratings)</span>
            </div>
          </div>

          <h1 className={`text-lg sm:text-xl md:text-2xl font-black mb-0.5 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {tool?.title}
          </h1>
          <p className={`text-[11px] sm:text-xs max-w-lg mx-auto font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {tool?.description}
          </p>
        </div>
      </div>

      {/* 2. THE WORKING INTERACTIVE TOOL (Full space when active, flanked with zero-CLS side rails when landing) */}
      <div className={`w-full flex-grow flex flex-col min-h-0 ${hasActiveWork ? 'h-full overflow-hidden' : 'my-auto justify-center items-center py-1 sm:py-2 overflow-hidden'}`}>
        <DesktopSideRails
          hasActiveWork={hasActiveWork}
          centerWidthClass={hasActiveWork ? 'max-w-full' : 'max-w-4xl'}
          className={hasActiveWork ? '!px-0 w-full h-full min-h-0' : 'my-auto'}
        >
          <div className={`w-full ${hasActiveWork ? 'h-full min-h-0 p-0 flex flex-col' : 'flex flex-col items-center justify-center p-0 sm:p-1'}`}>
            <div className={`w-full ${hasActiveWork ? 'h-full min-h-0 flex flex-col' : ''}`}>
              {children}
            </div>
          </div>
        </DesktopSideRails>
      </div>

      {/* 3. DEDICATED LOWER DOCK (Review Strip + Horizontal Sponsor + Suggested Tools) */}
      {!hasActiveWork && (
        <div className="w-full shrink-0 flex flex-col items-center border-t border-slate-200/70 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/40">
          
          {/* 3A. Compact Community Review Strip (Height: 28px) */}
          <div className="w-full max-w-4xl mx-auto px-4 py-1 flex items-center justify-between text-xs border-b border-slate-200/40 dark:border-white/5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-[11px]">
              <span className="flex text-amber-500"><Star size={12} fill="currentColor" /></span>
              <span className="font-bold">Community Rated 4.9/5</span>
              <span className="hidden md:inline text-slate-400">• Free & 100% Client-Side Private</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <Link
                to={`/reviews/?tool=${encodeURIComponent(tool?.title || tool?.id || '')}&write=true#write-review`}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Star size={10} fill="currentColor" /> Write a Review
              </Link>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <Link
                to={`/reviews/?tool=${encodeURIComponent(tool?.title || tool?.id || '')}`}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Read Reviews
              </Link>
            </div>
          </div>

          {/* 3B. Horizontal Sponsor Banner (Height: ~92px) */}
          <div className="w-full max-w-3xl mx-auto flex items-center justify-center py-0.5 min-h-[90px] md:min-h-[92px]">
            <AdsterraBanner format="responsive" showLabel={false} className="!my-0" />
          </div>

          {/* 3C. Suggested Tools Bottom Strip (Height: ~28px) */}
          {relatedToolsList.length > 0 && (
            <div className="w-full border-t border-slate-200/60 dark:border-white/5 px-4 py-0.5 overflow-x-auto no-scrollbar">
              <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-[11px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Suggested:</span>
                {relatedToolsList.slice(0, 6).map(rt => rt && (
                  <Link
                    key={rt.id}
                    to={rt.canonicalPath || rt.path}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                      darkMode ? 'bg-slate-800 border-slate-700 hover:border-yellow-500/50 text-slate-200' : 'bg-white border-slate-200 hover:border-yellow-500/50 text-slate-700'
                    }`}
                  >
                    <div className="text-yellow-600 dark:text-yellow-400 shrink-0">
                      {React.cloneElement(getIcon(rt.icon) as React.ReactElement, { className: 'w-3 h-3' })}
                    </div>
                    <span>{rt.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SEOLandingPage;
