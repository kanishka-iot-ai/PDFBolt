import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, Zap, Award, Sparkles, HelpCircle } from 'lucide-react';
import AdSlot from '../components/AdSlot';

interface CompetitorData {
  slug: string;
  name: string;
  badge: string;
  title: string;
  h1: string;
  subtitle: string;
  seoTitle: string;
  metaDescription: string;
  frustrationPoint: string;
  comparisonRows: {
    feature: string;
    pdfbolt: string;
    competitor: string;
    advantage: 'pdfbolt' | 'neutral';
  }[];
  sections: {
    heading: string;
    paragraphs: string[];
  }[];
  faqs: { q: string; a: string }[];
}

const COMPETITORS: Record<string, CompetitorData> = {
  'ilovepdf-alternative': {
    slug: 'compare/ilovepdf-alternative',
    name: 'iLovePDF',
    badge: '100% Free & Unlimited Alternative',
    title: 'Best Free iLovePDF Alternative (No Daily Limits & Private) | PDFBolt',
    h1: 'Free iLovePDF Alternative Without Daily Limits',
    subtitle: 'Tired of "Daily task limit reached" and slow file upload queues? PDFBolt delivers unlimited free PDF merging, compression, and editing with in-browser privacy.',
    seoTitle: 'Best Free iLovePDF Alternative 2026 – No Daily Task Limits | PDFBolt',
    metaDescription: 'Looking for a free iLovePDF alternative? PDFBolt provides unlimited free PDF merging, compression, and editing with zero daily task limits and local in-browser privacy.',
    frustrationPoint: 'iLovePDF restricts free users with daily task limits and upload queues, prompting users to buy recurring monthly subscriptions just to merge simple receipts.',
    comparisonRows: [
      { feature: 'Daily Free Tasks', pdfbolt: 'Unlimited (No Caps)', competitor: 'Strict Daily Limits & Queues', advantage: 'pdfbolt' },
      { feature: 'Processing Architecture', pdfbolt: '100% In-Browser WebAssembly', competitor: 'Cloud Server Upload', advantage: 'pdfbolt' },
      { feature: 'Mandatory Account Signup', pdfbolt: 'Never (Zero Registration)', competitor: 'Prompts for Email & Account', advantage: 'pdfbolt' },
      { feature: 'File Privacy & Exposure', pdfbolt: 'Zero Bytes Transmitted (Local RAM)', competitor: 'Uploaded & Stored on Cloud', advantage: 'pdfbolt' },
      { feature: 'Output Watermarks', pdfbolt: 'Zero Watermarks Ever', competitor: 'Watermark-free (Limited)', advantage: 'neutral' },
      { feature: 'Document Retention', pdfbolt: 'Destroyed on Tab Close', competitor: 'Stored up to 2 hours', advantage: 'pdfbolt' }
    ],
    sections: [
      {
        heading: 'Why PDFBolt is the Strongest iLovePDF Alternative',
        paragraphs: [
          'iLovePDF has long been a staple of online document utilities, but modern internet users increasingly demand higher privacy standards and freedom from artificial paywalls.',
          'When you process a document on iLovePDF, your confidential tax filings, patient healthcare records, and legal contracts travel over public networks to remote cloud infrastructure. With PDFBolt, core tools execute right inside your browser memory using high-speed WebAssembly bytecode. Your documents never touch our servers.'
        ]
      }
    ],
    faqs: [
      { q: 'What should I do if iLovePDF says "Daily limit reached"?', a: 'Switch to PDFBolt! There are zero daily limits on PDFBolt. You can merge, split, compress, or edit as many files as you need for free.' },
      { q: 'Is PDFBolt really free without hidden charges?', a: 'Yes! PDFBolt is supported by clean display advertising, allowing us to keep all 25+ PDF tools completely free forever.' }
    ]
  },
  'smallpdf-alternative': {
    slug: 'compare/smallpdf-alternative',
    name: 'Smallpdf',
    badge: 'No 2-Task-Per-Day Paywall',
    title: 'Best Smallpdf Alternative (Free Unlimited PDF Tools) | PDFBolt',
    h1: 'Free Smallpdf Alternative (No 2-Task Paywall)',
    subtitle: 'Frustrated by Smallpdf locking you out after just 2 free tasks? PDFBolt gives you unlimited conversions, compressions, and merges with complete privacy.',
    seoTitle: 'Best Free Smallpdf Alternative 2026 – No 2-Task Paywall | PDFBolt',
    metaDescription: 'Tired of Smallpdf daily limits? PDFBolt is a free Smallpdf alternative with unlimited tasks, no 2-file cap, no credit cards, and client-side document processing.',
    frustrationPoint: 'Smallpdf allows only 2 free operations every 24 hours before blocking access behind an aggressive $12/month subscription wall.',
    comparisonRows: [
      { feature: 'Free Operations Per Day', pdfbolt: 'Unlimited (Zero Limits)', competitor: 'Only 2 Tasks Per 24 Hours', advantage: 'pdfbolt' },
      { feature: 'Subscription Cost', pdfbolt: '$0 Free Forever', competitor: '$108 to $144 / year', advantage: 'pdfbolt' },
      { feature: 'Credit Card Required for Trial', pdfbolt: 'No Credit Card Needed', competitor: 'Requires Card for 7-Day Trial', advantage: 'pdfbolt' },
      { feature: 'Processing Location', pdfbolt: 'Local In-Browser Sandbox', competitor: 'Remote Cloud Infrastructure', advantage: 'pdfbolt' },
      { feature: 'Offline Operation Support', pdfbolt: 'Supported via PWA', competitor: 'Requires Paid Desktop App', advantage: 'pdfbolt' }
    ],
    sections: [
      {
        heading: 'Escape Smallpdf’s Aggressive Subscription Trap',
        paragraphs: [
          'Nothing is more irritating than converting two files for an urgent job application and being abruptly locked out with a screen demanding your credit card number for a "free trial".',
          'PDFBolt was engineered as an open, accessible counterweight to rent-seeking PDF monopolies. We leverage efficient client-side WebAssembly to keep server overhead minimal, passing those savings on to you with genuinely unlimited, free tools.'
        ]
      }
    ],
    faqs: [
      { q: 'How does PDFBolt compare to Smallpdf in speed?', a: 'Because PDFBolt processes files locally in your browser RAM, there is zero network upload or download wait time for core operations. It executes significantly faster on large files.' }
    ]
  },
  'adobe-acrobat-alternative': {
    slug: 'compare/adobe-acrobat-alternative',
    name: 'Adobe Acrobat Pro',
    badge: '100% Free Browser Alternative',
    title: 'Free Adobe Acrobat Alternative Online (No Subscription) | PDFBolt',
    h1: 'Free Adobe Acrobat Alternative Online',
    subtitle: 'Don’t want to pay $239/year for basic PDF tools? PDFBolt gives you powerful PDF editing, merging, compression, and signing right in your browser.',
    seoTitle: 'Free Adobe Acrobat Alternative Online – No $20/Month Fee | PDFBolt',
    metaDescription: 'Free Adobe Acrobat alternative online. Merge, compress, edit, redact, and sign PDFs in your browser without paying $19.99/month for Acrobat DC Pro.',
    frustrationPoint: 'Adobe Acrobat Pro costs $19.99 to $29.99 per month and requires massive software installations that slow down your computer.',
    comparisonRows: [
      { feature: 'Annual Cost', pdfbolt: '$0 Free Forever', competitor: '$239.88 / year', advantage: 'pdfbolt' },
      { feature: 'Software Installation', pdfbolt: 'Zero Install (Instant Web App)', competitor: 'Heavy Desktop Client (2GB+)', advantage: 'pdfbolt' },
      { feature: 'Platform Compatibility', pdfbolt: 'Windows, Mac, Linux, iOS, Android', competitor: 'OS-specific licenses', advantage: 'pdfbolt' },
      { feature: 'Visual Redaction', pdfbolt: 'Built-in Canvas Rasterization', competitor: 'Included in Pro tier only', advantage: 'pdfbolt' },
      { feature: 'Handwriting OCR', pdfbolt: 'In-Browser Neural OCR', competitor: 'Included in Pro tier only', advantage: 'pdfbolt' }
    ],
    sections: [
      {
        heading: 'Enterprise Features Without the Enterprise Price Tag',
        paragraphs: [
          'For 95% of students, small business owners, and legal professionals, paying hundreds of dollars annually to Adobe simply to combine contracts, compress scans, and redact sensitive numbers is unnecessary.',
          'PDFBolt delivers the core tools you actually use—visual redaction, password security, document stitching, and format conversions—accessible from any device with an active internet browser.'
        ]
      }
    ],
    faqs: [
      { q: 'Can PDFBolt replace Adobe Acrobat for basic business needs?', a: 'Yes! PDFBolt covers all standard business workflows: merging contracts, compressing invoices, adding digital signatures, and redacting private figures.' }
    ]
  }
};

const AlternativeLandingPage: React.FC<{ darkMode: boolean; defaultCompetitor?: string }> = ({ darkMode, defaultCompetitor }) => {
  const params = useParams<{ competitor?: string }>();
  const rawKey = defaultCompetitor || params.competitor || 'ilovepdf-alternative';
  const competitorKey = rawKey.replace(/^compare\//, '');
  const data = COMPETITORS[competitorKey] || COMPETITORS['ilovepdf-alternative'];

  const baseUrl = 'https://pdfbolt.in';
  const canonicalUrl = `${baseUrl}/${data.slug}/`;

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `PDFBolt – ${data.h1}`,
    "url": canonicalUrl,
    "description": data.metaDescription,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web Browser, Windows, macOS, Linux, iOS, Android",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
      { "@type": "ListItem", "position": 2, "name": "Comparisons", "item": `${baseUrl}/compare/online-pdf-tools/` },
      { "@type": "ListItem", "position": 3, "name": data.h1, "item": canonicalUrl }
    ]
  };

  return (
    <div className="animate-fadeIn min-h-screen pb-20">
      <Helmet>
        <title>{data.seoTitle}</title>
        <meta name="description" content={data.metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={data.seoTitle} />
        <meta property="og:description" content={data.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(webAppSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Hero Header */}
      <div className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <nav aria-label="Breadcrumb" className="flex justify-center items-center gap-2 text-xs font-semibold mb-3 text-slate-500">
            <Link to="/" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/compare/online-pdf-tools" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Comparisons</Link>
            <span>/</span>
            <span className="text-yellow-700 dark:text-yellow-400 font-bold">{data.name} Alternative</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/15 text-yellow-900 dark:text-yellow-300 font-black text-xs uppercase tracking-widest mb-4 border border-yellow-500/30">
            <Sparkles size={14} /> {data.badge}
          </div>

          <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black mb-4 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {data.h1}
          </h1>
          <p className={`text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {data.subtitle}
          </p>
        </div>
      </div>

      {/* Ad Slot */}
      <div className="max-w-4xl mx-auto px-4 my-6 flex justify-center">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
      </div>

      {/* Quick Launch Cards for Top Tools */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Instant Access • No Signup Required</p>
          <h2 className={`text-xl sm:text-2xl font-black mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Start Using Free PDF Tools Right Now</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {[
            { label: 'Merge PDF', path: '/merge-pdf', desc: 'Combine multiple files with zero limits' },
            { label: 'Compress PDF', path: '/compress-pdf', desc: 'Shrink file size with local privacy' },
            { label: 'PDF to Word', path: '/pdf-to-word', desc: 'Convert to editable DOCX formatting' },
            { label: 'Sign & Edit', path: '/edit-pdf', desc: 'Annotate and draw digital signatures' }
          ].map(tool => (
            <Link
              key={tool.path}
              to={tool.path}
              className={`p-5 rounded-2xl border transition-all hover:scale-105 flex flex-col justify-between ${
                darkMode ? 'bg-slate-900 border-slate-800 hover:border-yellow-500' : 'bg-white border-slate-200 hover:border-yellow-500 shadow-sm'
              }`}
            >
              <div>
                <p className={`font-black text-sm mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{tool.label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{tool.desc}</p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-yellow-700 dark:text-yellow-400">
                <span>Launch</span> <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h2 className={`text-2xl sm:text-3xl font-black text-center mb-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Feature Comparison: PDFBolt vs {data.name}
          </h2>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className={darkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}>
                <tr>
                  <th className="p-4 sm:p-5 font-black">Capability & Feature</th>
                  <th className="p-4 sm:p-5 font-black text-yellow-400 bg-slate-800/90 dark:bg-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-yellow-400 fill-current" />
                      PDFBolt (Free)
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 font-black text-slate-300">
                    {data.name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.comparisonRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? (darkMode ? 'bg-slate-900/40' : 'bg-white') : (darkMode ? 'bg-slate-800/30' : 'bg-slate-50/50')}>
                    <td className="p-4 sm:p-5 font-bold text-slate-900 dark:text-white">{row.feature}</td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-yellow-500/5 dark:bg-yellow-500/10">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <span>{row.pdfbolt}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600 dark:text-slate-300">
                      {row.advantage === 'pdfbolt' ? (
                        <div className="flex items-center gap-2 text-slate-500">
                          <XCircle size={16} className="text-red-400 shrink-0" />
                          <span>{row.competitor}</span>
                        </div>
                      ) : (
                        <span>{row.competitor}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Technical Narrative Sections */}
        <div className="space-y-8 mb-16">
          {data.sections.map((sec, idx) => (
            <div key={idx} className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h2 className={`text-xl sm:text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {sec.heading}
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className={`p-8 rounded-3xl border mb-12 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="text-yellow-600 dark:text-yellow-400" size={20} />
            <h2 className={`text-xl sm:text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Frequently Asked Questions About Switching from {data.name}
            </h2>
          </div>
          <div className="space-y-4">
            {data.faqs.map((faq, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`font-bold text-sm mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{faq.q}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AlternativeLandingPage;
