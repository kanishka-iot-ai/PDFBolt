import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Clock, UserX, HelpCircle, CheckCircle, ArrowRight, BookOpen, Layers, Sparkles } from 'lucide-react';
import { TOOLS, GUIDES, getIcon } from '../constants';
import { Link, useLocation } from 'react-router-dom';
import AdSlot from './AdSlot';

interface SEOLandingPageProps {
  toolId: string;
  darkMode: boolean;
  children: React.ReactNode;
}

const SEOLandingPage: React.FC<SEOLandingPageProps> = ({ toolId, darkMode, children }) => {
  const tool = TOOLS.find(t => t.id === toolId);
  const location = useLocation();

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

  const relatedGuidesList = (tool.relatedGuides || [])
    .map(slug => GUIDES.find(g => g.slug === slug))
    .filter(Boolean);

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
      <div className={`pt-6 pb-6 sm:pt-8 sm:pb-8 border-b ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Breadcrumb Visual Navigation */}
          <nav className="flex justify-center items-center gap-2 text-xs font-semibold mb-3 text-slate-500">
            <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">PDF Tools</Link>
            <span>/</span>
            <span className="text-yellow-700 dark:text-yellow-400 font-bold">{tool.title}</span>
          </nav>

          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {tool.title}
          </h1>
          <p className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {tool.description}
          </p>

          {/* Privacy & Speed Badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <ShieldCheck size={14} /> {tool.id === 'pdf-to-qr' ? 'Encrypted Ephemeral Cloud' : '100% Local In-Browser Privacy'}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
              <UserX size={14} /> Free & No Sign-Up
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <Clock size={14} /> Instant Processing
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE WORKING INTERACTIVE TOOL */}
      <div className="relative z-10 py-4 sm:py-6">
        {children}
      </div>

      {/* 3. NON-INTRUSIVE HIGH-VISIBILITY AD PLACEMENT (BELOW UPLOADER) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 my-4 sm:my-6">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" />
      </div>

      {/* 4. HOW-TO GUIDE & FEATURES (BELOW THE FOLD - DOES NOT OBSTRUCT UPLOAD) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
        
        {/* Step-by-Step Instructions */}
        {tool.howToSteps && tool.howToSteps.length > 0 && (
          <section className={`p-6 sm:p-8 rounded-3xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
            <h2 className={`text-xl sm:text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <BookOpen className="text-yellow-500" size={22} /> How to {tool.title} Online
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tool.howToSteps.map((step, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="w-8 h-8 rounded-xl bg-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center mb-3">
                    {idx + 1}
                  </div>
                  <h3 className={`font-black text-sm mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{step.name}</h3>
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{step.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Features & Architecture */}
        {tool.features && tool.features.length > 0 && (
          <section className={`p-6 sm:p-8 rounded-3xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
            <h2 className={`text-xl sm:text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Sparkles className="text-yellow-500" size={22} /> Key Capabilities & Security
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tool.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <CheckCircle size={16} />
                  </div>
                  <span className={`text-xs sm:text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{feat}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Frequently Asked Questions */}
        {tool.faqs && tool.faqs.length > 0 && (
          <section className={`p-6 sm:p-8 rounded-3xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
            <h2 className={`text-xl sm:text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <HelpCircle className="text-yellow-500" size={22} /> Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {tool.faqs.map((faq, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <h3 className={`font-black text-sm sm:text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{faq.q}</h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* 5. RELATED PDF TOOLS */}
      {relatedToolsList.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Layers className="text-yellow-500" /> Related PDF Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedToolsList.map(rt => rt && (
                <Link
                  key={rt.id}
                  to={rt.canonicalPath || rt.path}
                  className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between ${
                    darkMode ? 'bg-slate-800/60 border-slate-700 hover:border-yellow-500/50' : 'bg-white border-slate-200 hover:border-yellow-500/50'
                  }`}
                >
                  <div>
                    <div className="p-2 w-fit rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 mb-3">
                      {React.cloneElement(getIcon(rt.icon) as React.ReactElement, { className: 'w-5 h-5' })}
                    </div>

                    <h3 className={`font-bold text-sm mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {rt.title}
                    </h3>
                    <p className={`text-xs line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {rt.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-700 dark:text-yellow-400 mt-3">
                    Open Tool <ArrowRight size={12} />
                  </span>
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
