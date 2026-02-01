import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Clock, UserX, HelpCircle, CheckCircle } from 'lucide-react';
import { TOOLS } from '../constants';
import { useLocation } from 'react-router-dom';

interface SEOLandingPageProps {
  toolId: string;
  darkMode: boolean;
  children: React.ReactNode;
}

const SEOLandingPage: React.FC<SEOLandingPageProps> = ({ toolId, darkMode, children }) => {
  const tool = TOOLS.find(t => t.id === toolId);
  const location = useLocation();

  if (!tool) return <>{children}</>;

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `PDFBolt ${tool.title}`,
    "applicationCategory": "Productivity",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": tool.features?.join(', ') || "PDF Tools"
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": tool.faqs?.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    })) || []
  };

  const canonicalUrl = `${window.location.origin}${location.pathname}`;

  return (
    <div className="animate-fadeIn">
      <Helmet>
        <title>{tool.seoTitle || `${tool.title} - Free Online Tool`}</title>
        <meta name="description" content={tool.description} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
        {tool.faqs && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>

      {/* 1. HERO & PROMISE SECTION */}
      <div className={`py-12 text-center border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto px-6">
          <h1 className={`text-4xl md:text-6xl font-black mb-6 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {tool.seoTitle?.split('–')[0] || tool.title}
          </h1>
          <p className={`text-xl md:text-2xl mb-8 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {tool.description} No login required.
          </p>

          {/* Privacy Trust Signals */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-xs uppercase tracking-widest">
              <ShieldCheck size={16} /> 100% Private (Local)
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
              <UserX size={16} /> No Sign-Up
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-widest">
              <Clock size={16} /> Instant Processing
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOOL UI SECTION */}
      <div className="relative z-10 -mt-8">
        {children}
      </div>

      {/* 3. CONTENT & SEO SECTION */}
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-20">

        {/* About / Long Description */}
        <section>
          <h2 className={`text-3xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            About {tool.title}
          </h2>
          <p className={`text-lg leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {tool.longDescription || tool.description}
          </p>
        </section>

        {/* Features Section */}
        {tool.features && tool.features.length > 0 && (
          <section>
            <h2 className={`text-3xl font-black mb-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tool.features.map((feature, i) => (
                <div
                  key={i}
                  className={`group p-8 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:scale-105 ${darkMode
                      ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-red-600'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-red-600 shadow-lg'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${darkMode
                        ? 'bg-red-600/20 group-hover:bg-red-600'
                        : 'bg-red-100 group-hover:bg-red-600'
                      }`}>
                      <CheckCircle className={`w-6 h-6 transition-colors duration-300 ${darkMode
                          ? 'text-red-400 group-hover:text-white'
                          : 'text-red-600 group-hover:text-white'
                        }`} />
                    </div>
                    <p className={`font-bold text-lg pt-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {feature}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How To Guide */}
        <section className={`p-8 rounded-[2rem] border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-lg'}`}>
          <h2 className={`text-2xl font-black mb-8 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <CheckCircle className="text-red-600" /> How to use {tool.title}
          </h2>
          <ol className="space-y-6">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-sm">1</span>
              <p className={`font-medium pt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Select your files or drag and drop them into the box above.</p>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-sm">2</span>
              <p className={`font-medium pt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Configure your options (e.g. rotation, compression level) if needed.</p>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-sm">3</span>
              <p className={`font-medium pt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Click "Process" and download your file instantly.</p>
            </li>
          </ol>
        </section>

        {/* FAQ Section */}
        {tool.faqs && tool.faqs.length > 0 && (
          <section>
            <h2 className={`text-3xl font-black mb-10 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <HelpCircle className="text-slate-400" /> Frequently Asked Questions
            </h2>
            <div className="grid gap-6">
              {tool.faqs.map((faq, i) => (
                <div key={i} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`font-black text-lg mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{faq.q}</h3>
                  <p className={`text-base ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default SEOLandingPage;
