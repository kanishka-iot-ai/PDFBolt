import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Zap, CheckCircle2, ArrowRight, Laptop, Server, EyeOff, HardDrive, Cpu } from 'lucide-react';
import { TOOLS } from '../constants';
import AdSlot from '../components/AdSlot';

interface NoUploadToolsPageProps {
  darkMode: boolean;
}

const NoUploadToolsPage: React.FC<NoUploadToolsPageProps> = ({ darkMode }) => {
  const baseUrl = 'https://pdfbolt.in';
  const canonicalUrl = `${baseUrl}/no-upload-pdf-tools/`;

  const clientTools = TOOLS.filter(t => 
    ['merge', 'split', 'compress', 'rotate', 'delete-pages', 'page-numbers', 'watermark', 'organize', 'pdf-to-jpg', 'jpg-to-pdf', 'edit', 'sign', 'redact', 'pdf-to-qr', 'scan-to-pdf', 'scan-handwriting'].includes(t.id)
  );

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "PDFBolt No-Upload PDF Tools",
    "url": canonicalUrl,
    "description": "100% in-browser private PDF tools. Merge, compress, split, redact, and edit documents with zero cloud uploads.",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web Browser, Windows, macOS, Linux, iOS, Android",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
      { "@type": "ListItem", "position": 2, "name": "No-Upload PDF Tools", "item": canonicalUrl }
    ]
  };

  return (
    <div className="animate-fadeIn min-h-screen pb-20">
      <Helmet>
        <title>No-Upload PDF Tools – 100% Client-Side Private Document Toolkit | PDFBolt</title>
        <meta name="description" content="Merge, compress, split, redact, and edit PDF files in your browser with zero file uploads. Powered by WebAssembly for 100% data confidentiality and zero data leaks." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="No-Upload PDF Tools – 100% Client-Side Private Document Toolkit | PDFBolt" />
        <meta property="og:description" content="Process your confidential contracts, medical records, and tax filings directly in your browser. Zero bytes leave your device." />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(webAppSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Hero Header */}
      <div className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-widest mb-4 border border-emerald-500/30">
            <ShieldCheck size={14} /> 100% In-Browser Local Sandbox
          </div>
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            No-Upload PDF Tools <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Zero Cloud Transfers</span>
          </h1>
          <p className={`text-base sm:text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Process sensitive contracts, financial audits, medical records, and government identity proofs entirely within your browser memory. Your documents never touch remote servers.
          </p>
        </div>
      </div>

      {/* Ad Placement */}
      <div className="max-w-4xl mx-auto px-4 my-6 flex justify-center">
        <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
      </div>

      {/* Architecture Comparison: Cloud Upload vs PDFBolt WebAssembly */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Legacy Cloud Upload */}
          <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-red-950/10 border-red-900/30' : 'bg-red-50/50 border-red-200'}`}>
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <Server size={24} />
              <h2 className="text-xl font-black">Legacy Cloud PDF Converters</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>Transmits complete document bytes across public networks to remote servers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>Files are saved to disk in third-party storage clusters during processing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>Vulnerable to cloud database breaches, interception, and rogue insider access.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>Subject to upload queues, network lag, and restrictive daily task limits.</span>
              </li>
            </ul>
          </div>

          {/* PDFBolt Client-Side WebAssembly */}
          <div className={`p-8 rounded-3xl border ring-2 ring-emerald-500/20 shadow-lg ${darkMode ? 'bg-emerald-950/15 border-emerald-800/40' : 'bg-emerald-50/50 border-emerald-200'}`}>
            <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
              <Laptop size={24} />
              <h2 className="text-xl font-black">PDFBolt WebAssembly Core</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>100% In-Browser Execution:</strong> Compiled C/Rust and JavaScript run inside your tab.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Zero File Uploads:</strong> Files stay in your local computer or phone RAM.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Instant Memory Cleanup:</strong> Temporary data is purged when the tab is closed.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Unlimited Free Tasks:</strong> No daily caps, paywalls, or forced account creation.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Directory of No-Upload Tools */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className={`text-2xl sm:text-3xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Available No-Upload Browser Tools
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Every tool below executes 100% client-side without transmitting document bytes over the internet.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clientTools.map(t => (
              <Link
                key={t.id}
                to={t.path}
                className={`p-6 rounded-2xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-sm'
                }`}
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase mb-3">
                    <ShieldCheck size={12} /> Local RAM Only
                  </div>
                  <h3 className={`font-black text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {t.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
                  <span>Open Tool</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* How to Verify via DevTools */}
        <div className={`p-8 sm:p-10 rounded-3xl border mb-16 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <h2 className={`text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            How to Verify No-Upload Execution Yourself
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            We don’t ask you to blindly trust marketing copy. You can independently verify that your document bytes never leave your device using standard browser diagnostic tools:
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-xs font-medium">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <p className="font-bold mb-1 text-slate-900 dark:text-white">1. Open DevTools</p>
              <p className="text-slate-500 dark:text-slate-400">Press F12 or right-click anywhere and choose "Inspect". Switch to the <strong>Network</strong> tab.</p>
            </div>
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <p className="font-bold mb-1 text-slate-900 dark:text-white">2. Process a File</p>
              <p className="text-slate-500 dark:text-slate-400">Drop a PDF into Merge, Compress, or Redact. Watch the network traffic monitor.</p>
            </div>
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <p className="font-bold mb-1 text-slate-900 dark:text-white">3. Zero Data Out</p>
              <p className="text-slate-500 dark:text-slate-400">Notice that <strong>no POST or file upload requests</strong> are transmitted. The process happens entirely on your CPU.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NoUploadToolsPage;
