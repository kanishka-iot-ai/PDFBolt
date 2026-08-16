import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { WORKFLOWS, TOOLS, getIcon } from '../constants';
import { CheckCircle2, ArrowRight, ShieldCheck, Sparkles, HelpCircle, Layers } from 'lucide-react';

interface WorkflowPageProps {
  workflowSlug?: string;
  darkMode: boolean;
}

const WorkflowPage: React.FC<WorkflowPageProps> = ({ workflowSlug, darkMode }) => {
  const params = useParams<{ slug?: string }>();
  const slug = workflowSlug || params.slug || 'student-pdf-tools';
  const workflow = WORKFLOWS.find(w => w.slug === slug) || WORKFLOWS[0];

  const baseUrl = 'https://pdfbolt.com';
  const canonicalUrl = `${baseUrl}/${workflow.slug}`;

  // Structured Data
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": workflow.title,
    "description": workflow.metaDescription,
    "step": workflow.steps.map((s, idx) => ({
      "@type": "HowToStep",
      "position": idx + 1,
      "name": s.title,
      "text": s.description
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Workflows", "item": `${baseUrl}/tools` },
      { "@type": "ListItem", "position": 3, "name": workflow.title, "item": canonicalUrl }
    ]
  };

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>{workflow.metaTitle} | PDFBolt</title>
        <meta name="description" content={workflow.metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={workflow.metaTitle} />
        <meta property="og:description" content={workflow.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Hero Section */}
      <section className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-4">
            <Sparkles size={14} /> {workflow.heroBadge}
          </div>
          <h1 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {workflow.heroHeadline}
          </h1>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto mb-10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {workflow.heroSubheadline}
          </p>

          {/* Workflow Sequence Diagram */}
          <div className={`p-6 rounded-3xl border inline-block max-w-4xl mx-auto ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs md:text-sm font-bold">
              {workflow.diagram.steps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <span className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-yellow-100 text-yellow-900'}`}>
                    {step}
                  </span>
                  {idx < workflow.diagram.steps.length - 1 && (
                    <ArrowRight size={16} className="text-slate-400 hidden sm:inline" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Step-by-Step Interactive Tools */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className={`text-3xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          The Step-by-Step {workflow.title}
        </h2>
        <p className={`text-base mb-12 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Execute each phase of your workflow sequentially using client-side tools with zero data leaves your browser.
        </p>

        <div className="space-y-6">
          {workflow.steps.map((step) => {
            const tool = TOOLS.find(t => t.id === step.toolId);
            return (
              <div
                key={step.order}
                className={`p-8 rounded-3xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                  darkMode ? 'bg-slate-800/40 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-500 text-slate-950 font-black text-lg flex items-center justify-center flex-shrink-0">
                    {step.order}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>

                {tool && (
                  <Link
                    to={tool.canonicalPath || tool.path}
                    className="flex-shrink-0 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    {step.actionLabel} <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section className={`py-16 border-y ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
        <div className="max-w-5xl mx-auto px-6">
          <h2 className={`text-2xl md:text-3xl font-black mb-8 text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Why Choose PDFBolt for Your Workflow?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {workflow.benefits.map((benefit, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-3" />
                <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {benefit.title}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ & Related Links */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className={`text-2xl font-black mb-8 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <HelpCircle className="text-yellow-500" /> Frequently Asked Questions
        </h2>
        <div className="space-y-4 mb-16">
          {workflow.faqs.map((faq, i) => (
            <div key={i} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`font-black text-base mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{faq.q}</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{faq.a}</p>
            </div>
          ))}
        </div>

        {/* Other Workflows */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
          <h2 className={`text-xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Explore Other Workflows
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WORKFLOWS.filter(w => w.slug !== workflow.slug).map(otherWf => (
              <Link
                key={otherWf.slug}
                to={`/${otherWf.slug}`}
                className={`p-6 rounded-2xl border flex items-center justify-between transition-all hover:border-yellow-500/50 ${
                  darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-yellow-500">{otherWf.audience}</span>
                  <h3 className={`font-bold text-base mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{otherWf.title}</h3>
                </div>
                <ArrowRight size={18} className="text-yellow-500" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default WorkflowPage;
