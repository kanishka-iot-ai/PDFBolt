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

  const baseUrl = 'https://pdfbolt.com';
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

      {/* 1. HERO HEADER */}
      <div className={`py-12 border-b ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          
          {/* Breadcrumb Visual Navigation */}
          <nav className="flex justify-center items-center gap-2 text-xs font-semibold mb-6 text-slate-500">
            <Link to="/" className="hover:text-yellow-500 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/tools" className="hover:text-yellow-500 transition-colors">PDF Tools</Link>
            <span>/</span>
            <span className="text-yellow-500 font-bold">{tool.title}</span>
          </nav>

          <h1 className={`text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {tool.seoTitle?.split('–')[0] || tool.title}
          </h1>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto mb-8 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {tool.description}
          </p>

          {/* Privacy Badges */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <ShieldCheck size={16} /> {tool.id === 'pdf-to-qr' ? 'Encrypted Cloud Storage' : '100% Local In-Browser Privacy'}
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
              <UserX size={16} /> No Sign-Up or Fees
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <Clock size={16} /> Instant Processing
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE WORKING INTERACTIVE TOOL */}
      <div className="relative z-10 -mt-6">
        {children}
      </div>

      {/* 3. COMPREHENSIVE PEOPLE-FIRST CONTENT SECTION */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">

        {/* Quick Answer Snippet Box (For Google Search & AI Optimization) */}
        {tool.quickAnswer && (
          <div className={`p-6 rounded-2xl border-l-4 border-yellow-500 ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-yellow-50/70 border-yellow-200'}`}>
            <h2 className={`text-base font-black uppercase tracking-wider mb-2 flex items-center gap-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
              <Sparkles size={18} /> Quick Summary: How to {tool.title}
            </h2>
            <p className={`text-sm md:text-base leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
              {tool.quickAnswer}
            </p>
          </div>
        )}

        {/* In-depth Overview */}
        <section>
          <h2 className={`text-2xl md:text-3xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            About PDFBolt {tool.title}
          </h2>
          <p className={`text-base md:text-lg leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {tool.longDescription || tool.description}
          </p>
        </section>

        {/* Step-by-Step Visual How-To */}
        {tool.howToSteps && tool.howToSteps.length > 0 && (
          <section className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h2 className={`text-2xl font-black mb-8 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <CheckCircle className="text-yellow-500" /> How to {tool.title} in 3 Simple Steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tool.howToSteps.map((step, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-yellow-500 text-slate-900 font-black text-sm flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h3 className={`font-black text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {step.name}
                    </h3>
                  </div>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Use Cases */}
        {tool.useCases && tool.useCases.length > 0 && (
          <section>
            <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Common Use Cases
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tool.useCases.map((uc, i) => (
                <div key={i} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {uc.title}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {uc.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Features */}
        {tool.features && tool.features.length > 0 && (
          <section>
            <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Key Features & Benefits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tool.features.map((feature, i) => (
                <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${darkMode ? 'bg-slate-800/30 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}>
                  <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-semibold">{feature}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Non-Intrusive In-Content Sponsored Slot */}
        <AdSlot placement="TOOL_CONTENT_BOTTOM" />

        {/* FAQ Accordion Section */}
        {tool.faqs && tool.faqs.length > 0 && (
          <section>
            <h2 className={`text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <HelpCircle className="text-slate-400" /> Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {tool.faqs.map((faq, i) => (
                <div key={i} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`font-black text-base md:text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{faq.q}</h3>
                  <p className={`text-sm md:text-base leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contextual Internal Linking: Related Tools */}
        {relatedToolsList.length > 0 && (
          <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className={`text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
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
                    <div className="p-2 w-fit rounded-lg bg-yellow-500/10 text-yellow-500 mb-3">
                      {React.cloneElement(getIcon(rt.icon) as React.ReactElement, { className: 'w-5 h-5' })}
                    </div>
                    <h3 className={`font-bold text-sm mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {rt.title}
                    </h3>
                    <p className={`text-xs line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {rt.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-500 mt-3">
                    Open Tool <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Contextual Internal Linking: Related Guides */}
        {relatedGuidesList.length > 0 && (
          <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className={`text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <BookOpen className="text-yellow-500" /> Step-by-Step Educational Guides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedGuidesList.map(guide => guide && (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className={`p-5 rounded-2xl border transition-all hover:border-yellow-500/50 flex flex-col justify-between ${
                    darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                      {guide.readTime}
                    </span>
                    <h3 className={`font-bold text-base mt-2 mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {guide.title}
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {guide.summary}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-500 mt-4">
                    Read Full Guide <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default SEOLandingPage;
