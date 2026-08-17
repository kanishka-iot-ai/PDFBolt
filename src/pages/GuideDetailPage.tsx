import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { GUIDES, TOOLS, getIcon } from '../constants';
import { Clock, CheckCircle2, ArrowRight, BookOpen, HelpCircle, Layers, Sparkles, AlertCircle } from 'lucide-react';
import AdSlot from '../components/AdSlot';

interface GuideDetailPageProps {
  darkMode: boolean;
}

const GuideDetailPage: React.FC<GuideDetailPageProps> = ({ darkMode }) => {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find(g => g.slug === slug) || GUIDES[0];
  const tool = guide.toolId ? TOOLS.find(t => t.id === guide.toolId) : null;

  const baseUrl = 'https://pdfbolt.in';
  const canonicalUrl = `${baseUrl}/guides/${guide.slug}`;

  // Article Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": guide.title,
    "description": guide.metaDescription,
    "datePublished": guide.updatedAt,
    "dateModified": guide.updatedAt,
    "author": {
      "@type": "Organization",
      "name": "PDFBolt Editorial Team",
      "url": baseUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "PDFBolt",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/pdfbolt-logo-transparent.png`
      }
    },
    "mainEntityOfPage": canonicalUrl
  };

  // HowTo Schema
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": guide.title,
    "description": guide.metaDescription,
    "step": guide.steps.map((s, idx) => ({
      "@type": "HowToStep",
      "position": idx + 1,
      "name": s.name,
      "text": s.text
    }))
  };

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": guide.faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Guides", "item": `${baseUrl}/guides` },
      { "@type": "ListItem", "position": 3, "name": guide.title, "item": canonicalUrl }
    ]
  };

  const relatedGuidesList = guide.relatedGuides
    .map(s => GUIDES.find(g => g.slug === s))
    .filter(Boolean);

  const relatedToolsList = guide.relatedTools
    .map(id => TOOLS.find(t => t.id === id))
    .filter(Boolean);

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>{guide.metaTitle} | PDFBolt</title>
        <meta name="description" content={guide.metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={guide.metaTitle} />
        <meta property="og:description" content={guide.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Hero Header */}
      <article className="max-w-4xl mx-auto px-6 pt-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold mb-6 text-slate-500">
          <Link to="/" className="hover:text-yellow-500 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/guides" className="hover:text-yellow-500 transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-yellow-500 font-bold truncate max-w-xs">{guide.title}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            {guide.category}
          </span>
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Clock size={12} /> {guide.readTime}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Updated on {guide.updatedAt}
          </span>
        </div>

        <h1 className={`text-3xl md:text-5xl font-black mb-6 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {guide.title}
        </h1>

        <p className={`text-lg md:text-xl font-medium leading-relaxed mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {guide.summary}
        </p>

        {/* Quick Answer Snippet Box */}
        <div className={`p-6 rounded-2xl border-l-4 border-yellow-500 mb-12 ${
          darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-yellow-50/70 border-yellow-200'
        }`}>
          <h2 className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
            <Sparkles size={16} /> Quick Answer
          </h2>
          <p className={`text-sm md:text-base leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {guide.quickAnswer}
          </p>
        </div>

        {/* Interactive Tool Banner CTA */}
        {tool && (
          <div className={`p-8 rounded-3xl border mb-12 flex flex-col sm:flex-row items-center justify-between gap-6 ${
            darkMode ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-yellow-500/30' : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-sm'
          }`}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                Official Web Tool
              </span>
              <h3 className={`text-xl font-black mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {tool.title} – 100% Free & Local
              </h3>
              <p className={`text-xs mt-1 max-w-md ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Execute this conversion directly in your browser with zero file uploads.
              </p>
            </div>
            <Link
              to={tool.canonicalPath || tool.path}
              className="flex-shrink-0 px-6 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              Open {tool.title} <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Step-by-Step Instructions */}
        <section className="mb-12">
          <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Step-by-Step Walkthrough
          </h2>
          <div className="space-y-4">
            {guide.steps.map((step, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl border flex items-start gap-4 ${
                  darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <h3 className={`font-bold text-base mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {step.name}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Sections & Pro Tips */}
        {guide.detailedContent.map((sec, i) => (
          <section key={i} className="mb-12">
            <h2 className={`text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {sec.heading}
            </h2>
            <div className="space-y-4">
              {sec.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className={`text-base leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {p}
                </p>
              ))}
            </div>

            {sec.proTips && sec.proTips.length > 0 && (
              <div className={`p-5 rounded-2xl border mt-6 ${
                darkMode ? 'bg-blue-950/20 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <h4 className="font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlertCircle size={16} /> Pro Tips
                </h4>
                <ul className="space-y-1 text-sm list-disc pl-5">
                  {sec.proTips.map((tip, tIdx) => (
                    <li key={tIdx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}

        {/* Non-Intrusive In-Content Sponsored Slot */}
        <AdSlot placement="GUIDE_IN_CONTENT" />

        {/* FAQ Section */}
        {guide.faqs && guide.faqs.length > 0 && (
          <section className="mb-12">
            <h2 className={`text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <HelpCircle className="text-yellow-500" /> Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {guide.faqs.map((faq, i) => (
                <div key={i} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`font-black text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{faq.q}</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Guides & Tools */}
        <section className="pt-12 border-t border-slate-200 dark:border-slate-800">
          <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Related Guides & Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedGuidesList.map(rg => rg && (
              <Link
                key={rg.slug}
                to={`/guides/${rg.slug}`}
                className={`p-5 rounded-2xl border transition-all hover:border-yellow-500/50 ${
                  darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-yellow-500">{rg.category}</span>
                <h3 className={`font-bold text-base mt-1 mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{rg.title}</h3>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-500">Read Guide <ArrowRight size={12} /></span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
};

export default GuideDetailPage;
