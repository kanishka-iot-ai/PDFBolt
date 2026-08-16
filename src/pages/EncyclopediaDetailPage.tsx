import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { ENCYCLOPEDIA, TOOLS } from '../constants';
import { Clock, CheckCircle2, ArrowRight, Layers, Sparkles, BookOpen } from 'lucide-react';
import AdSlot from '../components/AdSlot';

interface EncyclopediaDetailPageProps {
  darkMode: boolean;
}

const EncyclopediaDetailPage: React.FC<EncyclopediaDetailPageProps> = ({ darkMode }) => {
  const { slug } = useParams<{ slug: string }>();
  const article = ENCYCLOPEDIA.find(a => a.slug === slug) || ENCYCLOPEDIA[0];

  const baseUrl = 'https://pdfbolt.com';
  const canonicalUrl = `${baseUrl}/encyclopedia/${article.slug}`;

  // TechArticle Schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": article.title,
    "description": article.metaDescription,
    "datePublished": article.updatedAt,
    "dateModified": article.updatedAt,
    "author": {
      "@type": "Organization",
      "name": "PDFBolt Engineering Team",
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

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Encyclopedia", "item": `${baseUrl}/encyclopedia` },
      { "@type": "ListItem", "position": 3, "name": article.title, "item": canonicalUrl }
    ]
  };

  const relatedArticlesList = article.relatedArticles
    .map(s => ENCYCLOPEDIA.find(a => a.slug === s))
    .filter(Boolean);

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>{article.metaTitle} | PDFBolt Encyclopedia</title>
        <meta name="description" content={article.metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={article.metaTitle} />
        <meta property="og:description" content={article.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <article className="max-w-4xl mx-auto px-6 pt-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold mb-6 text-slate-500">
          <Link to="/" className="hover:text-yellow-500 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/encyclopedia" className="hover:text-yellow-500 transition-colors">Encyclopedia</Link>
          <span>/</span>
          <span className="text-yellow-500 font-bold truncate max-w-xs">{article.title}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            {article.category}
          </span>
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Clock size={12} /> {article.readTime}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Updated {article.updatedAt}
          </span>
        </div>

        <h1 className={`text-3xl md:text-5xl font-black mb-6 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {article.title}
        </h1>

        <p className={`text-lg md:text-xl font-medium leading-relaxed mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {article.summary}
        </p>

        {/* Key Takeaways */}
        <div className={`p-6 rounded-3xl border mb-12 ${
          darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <h2 className={`text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Sparkles size={16} className="text-yellow-500" /> Key Engineering Takeaways
          </h2>
          <ul className="space-y-2.5">
            {article.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        {article.sections.map((sec, i) => (
          <section key={i} className="mb-12">
            <h2 className={`text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {sec.heading}
            </h2>
            <div className="space-y-4 mb-6">
              {sec.content.map((p, pIdx) => (
                <p key={pIdx} className={`text-base leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {p}
                </p>
              ))}
            </div>

            {/* Optional Comparison Table */}
            {sec.table && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 mt-6">
                <table className="w-full text-left text-sm">
                  <thead className={darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}>
                    <tr>
                      {sec.table.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-4 font-black">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sec.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={`p-4 ${cIdx === 0 ? 'font-bold' : ''} ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        {/* Non-Intrusive Sponsored Slot */}
        <AdSlot placement="ENCYCLOPEDIA_BOTTOM" />

        {/* Related Articles */}
        <section className="pt-12 border-t border-slate-200 dark:border-slate-800">
          <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Related Technical Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticlesList.map(ra => ra && (
              <Link
                key={ra.slug}
                to={`/encyclopedia/${ra.slug}`}
                className={`p-6 rounded-2xl border transition-all hover:border-yellow-500/50 ${
                  darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-yellow-500">{ra.category}</span>
                <h3 className={`font-bold text-base mt-1 mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{ra.title}</h3>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-500">Read Explainer <ArrowRight size={12} /></span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
};

export default EncyclopediaDetailPage;
