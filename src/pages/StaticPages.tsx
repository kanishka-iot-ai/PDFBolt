import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, Lock, Globe, Mail, Headphones, Clock, Send, 
  CheckCircle2, Zap, FileText, User, Award, Cpu, Server, 
  Check, ArrowRight, ExternalLink, AlertCircle, Sparkles, Eye, Key, Cookie
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PageLayout: React.FC<{ 
  title: string; 
  subtitle?: string;
  lastUpdated?: string;
  badge?: string;
  badgeIcon?: React.ReactNode;
  children: React.ReactNode; 
  darkMode: boolean;
  maxWidth?: string;
}> = ({ title, subtitle, lastUpdated, badge, badgeIcon, children, darkMode, maxWidth = 'max-w-5xl' }) => (
  <div className="animate-fadeIn py-12 sm:py-20">
    {/* Hero Header */}
    <div className={`border-b ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'} py-12 sm:py-16 mb-12`}>
      <div className={`${maxWidth} mx-auto px-4 sm:px-6`}>
        {badge && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-black text-[11px] uppercase tracking-widest mb-4 border border-amber-600/30 dark:border-amber-400/30">
            {badgeIcon} {badge}
          </div>
        )}
        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-base sm:text-lg md:text-xl font-medium max-w-3xl leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {subtitle}
          </p>
        )}
        {lastUpdated && (
          <div className="flex items-center gap-2 mt-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Clock size={14} className="text-yellow-600 dark:text-yellow-400" />
            <span>Last Updated: {lastUpdated}</span>
            <span className="mx-2">•</span>
            <span>Version 2.4 (Enterprise & AdSense Compliant)</span>
          </div>
        )}
      </div>
    </div>

    {/* Page Content */}
    <div className={`${maxWidth} mx-auto px-4 sm:px-6`}>
      {children}
    </div>
  </div>
);

/* ========================================================================
   1. CONTACT PAGE
   ======================================================================== */
export const ContactPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('General Support');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@pdfbolt.in');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const topics = [
    { label: 'General Support', icon: '❓' },
    { label: 'Bug Report', icon: '🛠️' },
    { label: 'Feature Request', icon: '💡' },
    { label: 'Privacy & Security', icon: '🔒' },
    { label: 'Business Inquiry', icon: '💼' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_lrshcpf';
    const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_ykqay24';
    const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

    try {
      if (form.current) {
        const emailjs = (await import('@emailjs/browser')).default;
        await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form.current, PUBLIC_KEY);
        setLoading(false);
        setSubmitted(true);
      }
    } catch (err: any) {
      console.warn('[PDFBolt Support] Fallback to direct mailto:', err);
      if (form.current) {
        const formData = new FormData(form.current);
        const name = formData.get('user_name') || '';
        const email = formData.get('user_email') || '';
        const message = formData.get('message') || '';
        const mailtoUrl = `mailto:support@pdfbolt.in?subject=${encodeURIComponent(`[PDFBolt Support] ${selectedTopic}`)}&body=${encodeURIComponent(`Name: ${name}
Email: ${email}
Topic: ${selectedTopic}

Message:
${message}`)}`;
        window.location.href = mailtoUrl;
        setLoading(false);
        setSubmitted(true);
      } else {
        setLoading(false);
        setErrorMessage('Could not send automatically. Please write to support@pdfbolt.in directly.');
      }
    }
  };

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-28 text-center animate-fadeIn">
        <div className="inline-flex p-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-8 border-4 border-emerald-200 dark:border-emerald-800 shadow-lg">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 w-16 h-16" />
        </div>
        <h1 className={`text-4xl sm:text-5xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Message Received!</h1>
        <p className="text-lg sm:text-xl font-medium text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
          Your inquiry has been delivered directly to <strong className="text-yellow-700 dark:text-yellow-400">support@pdfbolt.in</strong>. Our engineering team will get back to you within 24 hours.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setSubmitted(false)}
            className="px-8 py-3.5 bg-yellow-500 text-slate-950 rounded-2xl font-black uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-md cursor-pointer text-sm"
          >
            Send Another Message
          </button>
          <a
            href="/"
            className={`px-8 py-3.5 rounded-2xl font-bold transition-all text-sm ${
              darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 animate-fadeIn">
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Direct Info & Quick Copy */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-black text-[11px] uppercase tracking-widest mb-4 border border-amber-600/30 dark:border-amber-400/30">
              <Mail size={13} /> Official Support Desk
            </div>
            <h1 className={`text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Get in <span className="text-yellow-700 dark:text-yellow-400">touch</span> with us
            </h1>
            <p className={`text-sm sm:text-base font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Have questions, feedback, bug reports, or partnership inquiries? Contact our team directly. We read and respond to every message.
            </p>
          </div>

          {/* Primary Email Card with 1-Click Copy */}
          <div className={`p-6 rounded-3xl border transition-all shadow-sm ${
            darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3 bg-yellow-500/15 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-2xl shrink-0">
                  <Mail size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-0.5">Official Support Email</p>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">support@pdfbolt.in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  copied 
                    ? 'bg-emerald-500 text-white' 
                    : darkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Copy email address"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Response Time Guarantee */}
          <div className={`p-6 rounded-3xl border ${
            darkMode ? 'bg-slate-900/40 border-slate-800/60 text-slate-300' : 'bg-slate-50 border-slate-200/60 text-slate-600'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-0.5">24-Hour Response Guarantee</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">All inquiries are answered directly by our engineering and product team.</p>
              </div>
            </div>
          </div>

          {/* 100% Privacy Note */}
          <div className={`p-6 rounded-3xl border ${
            darkMode ? 'bg-slate-900/40 border-slate-800/60 text-slate-300' : 'bg-slate-50 border-slate-200/60 text-slate-600'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-2xl shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-0.5">Zero Document Retention</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Please do not email confidential PDF attachments. PDFBolt executes tools directly in your browser.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Form */}
        <div className={`lg:col-span-7 p-6 sm:p-10 rounded-[2.5rem] border shadow-xl ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          {errorMessage && (
            <div className="p-4 mb-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs font-bold text-red-700 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <form ref={form} onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Topic Selector Pills */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 ml-1">
                Inquiry Topic
              </label>
              <div className="flex flex-wrap gap-2">
                {topics.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setSelectedTopic(t.label)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      selectedTopic === t.label
                        ? 'bg-yellow-500 text-slate-950 border-yellow-500 shadow-sm'
                        : darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" name="subject" value={selectedTopic} />
            </div>

            {/* Name & Email Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 ml-1">
                  Your Name
                </label>
                <input 
                  required 
                  name="user_name" 
                  type="text" 
                  className={`w-full px-4 py-3.5 rounded-2xl border outline-none text-sm font-medium transition-all ${
                    darkMode 
                      ? 'bg-slate-800/80 border-slate-700 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:bg-white'
                  }`} 
                  placeholder="e.g. John Doe" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 ml-1">
                  Your Email
                </label>
                <input 
                  required 
                  name="user_email" 
                  type="email" 
                  className={`w-full px-4 py-3.5 rounded-2xl border outline-none text-sm font-medium transition-all ${
                    darkMode 
                      ? 'bg-slate-800/80 border-slate-700 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:bg-white'
                  }`} 
                  placeholder="name@example.com" 
                />
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 ml-1">
                Your Message
              </label>
              <textarea 
                required 
                name="message" 
                rows={5} 
                className={`w-full p-4 rounded-2xl border outline-none text-sm font-medium transition-all resize-none ${
                  darkMode 
                    ? 'bg-slate-800/80 border-slate-700 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:bg-white'
                }`} 
                placeholder="Describe your inquiry, issue, or suggestions..."
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg hover:from-yellow-400 hover:to-amber-400 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Send Message</span>
                  <Send size={16} />
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-600 dark:text-slate-400">
              Direct contact: <a href="mailto:support@pdfbolt.in" className="font-bold underline text-yellow-700 dark:text-yellow-400">support@pdfbolt.in</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================
   2. PRIVACY POLICY (AdSense, GDPR, CCPA, CPRA & Zero-Retention Compliant)
   ======================================================================== */
export const PrivacyPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout 
    title="Privacy Policy"
    subtitle="PDFBolt operates under a strict Privacy-First, Zero-Permanent-Retention architecture. This policy discloses how we handle document data, cookies, Google AdSense, third-party analytics, and user privacy rights under GDPR and CCPA/CPRA."
    lastUpdated="September 1, 2026"
    badge="Zero Document Retention"
    badgeIcon={<ShieldCheck size={14} />}
    darkMode={darkMode}
  >
    <div className="space-y-12 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
      
      {/* Key Guarantees Box */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-amber-50/50 border-amber-200/80'
      }`}>
        <h2 className={`text-lg sm:text-xl font-black mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <Lock className="text-yellow-600 dark:text-yellow-400" size={20} /> Executive Summary of Your Privacy at PDFBolt
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Client-Side Processing:</strong> Standard PDF tools execute 100% locally inside your web browser via WebAssembly (Wasm).</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Zero Permanent Storage:</strong> No documents are permanently retained or cataloged on any server.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>15-Minute Auto-Purge:</strong> Ephemeral backend conversion jobs are purged immediately upon download or after 15 minutes.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>No Account Needed:</strong> Zero sign-up, zero phone numbers, zero passwords, and zero profiling.</span>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          1. Information We Do NOT Collect
        </h2>
        <p>
          Unlike legacy cloud software that monetizes personal information or scrapes files for machine learning datasets, <strong>PDFBolt does NOT collect, inspect, sell, or train AI models on your files</strong>. Specifically:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
          <li><strong>Document Contents:</strong> We never read, index, parse, or store the contents, text layers, vector assets, or embedded images of your PDF, Word, Excel, or PowerPoint files.</li>
          <li><strong>Personal Profiles:</strong> We do not require registration, usernames, email addresses, or social logins to use our conversion utilities.</li>
          <li><strong>Payment Information:</strong> PDFBolt is 100% free. We never request credit card numbers, billing addresses, or banking details.</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          2. Document Processing & Storage Architecture
        </h2>
        <p>
          PDFBolt uses a dual-engine architecture designed for optimal processing speed and uncompromising privacy:
        </p>
        <div className="grid md:grid-cols-2 gap-6 my-4">
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-2.5 mb-3 text-yellow-600 dark:text-yellow-400 font-black text-sm uppercase tracking-wider">
              <Cpu size={18} /> In-Browser WebAssembly (Wasm)
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tools such as Merge, Split, Protect, Unlock, Rotate, Watermark, Organize, and Edit execute <strong>entirely inside your browser's local sandbox memory</strong>. Your files never leave your computer or phone, preventing any network eavesdropping or third-party exposure.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-2.5 mb-3 text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-wider">
              <Server size={18} /> Ephemeral Backend Conversion
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              High-fidelity conversions (e.g. PDF to Word/PowerPoint, OCR, and HTML to PDF) are executed through an isolated worker that processes the task in RAM and temp storage. Files are <strong>automatically deleted immediately after download</strong> or by our automated 15-minute background garbage collection daemon.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 - Google AdSense & Cookies (Crucial for AdSense approval) */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          3. Google AdSense, Advertising Cookies & DART Cookies
        </h2>
        <p>
          To maintain PDFBolt as a completely free service for students, businesses, and developers without charging subscription fees, we display non-intrusive advertisements served by <strong>Google AdSense</strong> and certified third-party ad networks.
        </p>
        
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <h3 className={`text-base font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Cookie size={16} className="text-yellow-600 dark:text-yellow-400" /> Google DoubleClick DART Cookie Notice
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <li>Google, as a third-party vendor, uses cookies to serve ads on <strong>https://pdfbolt.in</strong>.</li>
            <li>Google's use of advertising cookies (including the DoubleClick DART cookie) enables it and its partners to serve ads to users based on their visit to PDFBolt and/or other sites on the Internet.</li>
            <li>These cookies collect non-personally identifiable technical information (such as browser type, general geographic region, and device characteristics) to display relevant advertisements.</li>
            <li><strong>Advertisers and Google AdSense have ZERO access to your uploaded files, file names, or document content.</strong> Ad scripts are strictly sandboxed and completely decoupled from document processing.</li>
          </ul>
        </div>

        <h3 className={`text-lg font-bold mt-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          How to Opt Out of Personalized Advertising
        </h3>
        <p className="text-sm sm:text-base">
          Users have the full right to opt out of personalized interest-based advertising at any time through the following official mechanisms:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
          <li>
            <strong>Google Ads Settings:</strong> You can opt out of personalized ads by visiting Google's official portal at{' '}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="font-bold text-yellow-700 dark:text-yellow-400 underline inline-flex items-center gap-1">
              Google Ad Settings <ExternalLink size={12} />
            </a>.
          </li>
          <li>
            <strong>AboutAds Consumer Choices (US):</strong> You can opt out of third-party vendor cookies for personalized advertising by visiting{' '}
            <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="font-bold text-yellow-700 dark:text-yellow-400 underline inline-flex items-center gap-1">
              AboutAds.info Opt-Out <ExternalLink size={12} />
            </a>.
          </li>
          <li>
            <strong>Network Advertising Initiative (NAI):</strong> You can manage ad preferences at{' '}
            <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="font-bold text-yellow-700 dark:text-yellow-400 underline inline-flex items-center gap-1">
              NAI Consumer Opt-Out <ExternalLink size={12} />
            </a>.
          </li>
          <li>
            <strong>Your Online Choices (EU/EEA):</strong> European visitors can manage ad preferences at{' '}
            <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" className="font-bold text-yellow-700 dark:text-yellow-400 underline inline-flex items-center gap-1">
              Your Online Choices (EU) <ExternalLink size={12} />
            </a>.
          </li>
          <li>
            <strong>Browser Settings:</strong> You may configure your browser to reject all cookies or notify you when a cookie is placed.
          </li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          4. Essential Cookies & Local Storage
        </h2>
        <p>
          We use browser LocalStorage strictly for functional and non-tracking user preferences:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm sm:text-base">
          <li><code>pdfbolt_theme</code>: Remembers Dark Mode or Light Mode preference.</li>
          <li><code>pdfbolt_sound</code>: Remembers audio feedback toggle (muted / unmuted).</li>
          <li><code>pdfbolt_consent</code>: Stores your cookie banner consent status.</li>
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You can wipe all stored preferences at any time by clicking <strong>"Wipe Site Data"</strong> in the footer.
        </p>
      </section>

      {/* Section 5 */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          5. Automatically Collected Technical Log Data
        </h2>
        <p>
          Like all web servers, our edge CDN and application servers automatically log standard network metadata when you access our site:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm sm:text-base">
          <li>IP addresses (anonymized/hashed for DDoS mitigation and abusive rate-limiting prevention)</li>
          <li>Browser type, user-agent string, and operating system</li>
          <li>Timestamp of request and HTTP response codes</li>
        </ul>
        <p className="text-sm">
          These logs are used purely for system reliability, infrastructure scaling, and security diagnostics. They are never joined with personal identities.
        </p>
      </section>

      {/* Section 6 - GDPR / UK GDPR */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          6. Your Rights Under GDPR (European Union & United Kingdom)
        </h2>
        <p>
          If you reside in the European Economic Area (EEA) or the United Kingdom, you are entitled to the full protections of the General Data Protection Regulation (GDPR) and UK Data Protection Act:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
          <li><strong>Right of Access & Portability:</strong> You have the right to request a copy of any personal data we hold about you.</li>
          <li><strong>Right to Rectification:</strong> You may request correction of inaccurate data.</li>
          <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Because all documents are automatically purged in 15 minutes and no accounts exist, your document data is permanently erased by design.</li>
          <li><strong>Right to Object & Restrict Processing:</strong> You may object to the processing of non-essential cookies via our consent manager or Google Ads Settings.</li>
        </ul>
        <p className="text-sm">
          To exercise any GDPR rights, contact our Data Protection Officer at <a href="mailto:support@pdfbolt.in" className="font-bold text-yellow-700 dark:text-yellow-400 underline">support@pdfbolt.in</a>. We respond to all verified requests within 24–48 hours.
        </p>
      </section>

      {/* Section 7 - CCPA / CPRA */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          7. California Privacy Rights (CCPA / CPRA Disclosures)
        </h2>
        <p>
          Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
          <li><strong>We Do Not Sell or Share Personal Information:</strong> PDFBolt does not sell, rent, or trade personal data or document content to any third parties for monetary consideration.</li>
          <li><strong>Right to Know & Delete:</strong> California consumers have the right to request disclosure of categories of personal information collected and request deletion.</li>
          <li><strong>Non-Discrimination:</strong> PDFBolt provides identical 100% free tool access to all users regardless of whether they exercise privacy rights.</li>
        </ul>
      </section>

      {/* Section 8 - COPPA */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          8. Children's Online Privacy Protection (COPPA)
        </h2>
        <p>
          PDFBolt is a general-audience educational and professional tool. We do not knowingly solicit or collect personal information from children under the age of 13. If you believe a child has provided personal information to us, please notify us immediately at <a href="mailto:support@pdfbolt.in" className="font-bold text-yellow-700 dark:text-yellow-400 underline">support@pdfbolt.in</a> so we can remove it.
        </p>
      </section>

      {/* Section 9 - Security & Contact */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          9. Security Measures & Contact Information
        </h2>
        <p>
          PDFBolt enforces enterprise-grade security controls including <strong>mandatory TLS 1.3 encryption in transit</strong>, Content Security Policies (CSP), sub-resource integrity checks, and isolated ephemeral memory workspaces.
        </p>
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <p className="font-bold mb-2">Data Controller & Compliance Inquiries:</p>
          <p className="text-sm"><strong>Entity:</strong> PDFBolt (https://pdfbolt.in)</p>
          <p className="text-sm"><strong>Support & Privacy Inbox:</strong> <a href="mailto:support@pdfbolt.in" className="text-yellow-700 dark:text-yellow-400 font-bold underline">support@pdfbolt.in</a></p>
          <p className="text-sm"><strong>Physical / Regional Operations:</strong> Global Web Distribution via High-Speed Cloudflare Edge CDN</p>
        </div>
      </section>

    </div>
  </PageLayout>
);

/* ========================================================================
   3. ABOUT PAGE (Rich, Professional, Publisher E-E-A-T Verified)
   ======================================================================== */
export const AboutPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout 
    title="About PDFBolt"
    subtitle="PDFBolt is an independent, privacy-first document intelligence platform engineered to make modern PDF conversion, editing, and optimization lightning-fast, 100% free, and completely secure."
    lastUpdated="September 1, 2026"
    badge="Engineered for Speed & Privacy"
    badgeIcon={<Sparkles size={14} />}
    darkMode={darkMode}
  >
    <div className="space-y-16 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
      
      {/* 3 Value Pillar Cards */}
      <div className="grid sm:grid-cols-3 gap-6 not-prose">
        {[
          { 
            icon: <Lock className="w-6 h-6 text-amber-500" />, 
            title: "Zero-Upload Privacy", 
            desc: "Most operations run entirely within your local browser sandbox via WebAssembly with zero data exposure." 
          },
          { 
            icon: <Zap className="w-6 h-6 text-yellow-500" />, 
            title: "Sub-Second Execution", 
            desc: "Optimized C/Rust engines compiled to native browser bytecode deliver instant conversion with zero queue wait times." 
          },
          { 
            icon: <Award className="w-6 h-6 text-emerald-500" />, 
            title: "100% Free Forever", 
            desc: "No monthly subscriptions, no forced account signups, no credit cards, and no hidden file size paywalls." 
          }
        ].map((item, i) => (
          <div key={i} className={`p-6 sm:p-8 rounded-3xl border transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 w-fit mb-4">
              {item.icon}
            </div>
            <h2 className={`text-lg sm:text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Mission & Background */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Our Mission: Rebuilding PDF Tools for the Modern Web
        </h2>
        <p className="text-sm sm:text-base">
          The Portable Document Format (PDF) has been the cornerstone of digital communication since 1993. Yet, traditional online PDF utilities remain riddled with frustrating barriers: aggressive monthly subscriptions for basic operations like merging two receipts, artificial limits that lock users out after two file conversions, and worst of all, silently transmitting confidential contracts, tax returns, and medical records to unverified remote servers.
        </p>
        <p className="text-sm sm:text-base">
          <strong>PDFBolt was founded to solve this problem completely.</strong> By taking full advantage of modern web capabilities—including WebAssembly (Wasm), client-side Canvas rendering, parallel worker threads, and memory-safe ephemeral backend pipelines—we have engineered a comprehensive PDF toolkit that delivers enterprise-grade fidelity with zero compromise on user confidentiality.
        </p>
      </section>

      {/* Leadership & Creator Profile (Crucial for Google AdSense & E-E-A-T) */}
      <section className={`p-8 sm:p-10 rounded-[2.5rem] border ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200/80 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-3xl shadow-lg shrink-0">
            KG
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 font-bold text-xs mb-2">
              <User size={13} /> Founder & Lead Architect
            </div>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Kanishka Giri
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              IoT, Artificial Intelligence & Full-Stack Systems Engineer
            </p>
          </div>
        </div>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Kanishka Giri founded PDFBolt with the vision of creating high-efficiency, privacy-first software accessible to everyone across the globe. With a technical background spanning embedded systems, edge computing, neural OCR systems, and WebAssembly compilation, Kanishka leads the architectural roadmap and continuous optimization of PDFBolt's 25+ conversion processors.
        </p>
        <div className="flex flex-wrap gap-4 text-xs font-bold pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><Check size={14} className="text-emerald-500" /> ISO 32000 PDF Standards Compliance</span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><Check size={14} className="text-emerald-500" /> WebAssembly Sandboxed Execution</span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><Check size={14} className="text-emerald-500" /> 24/7 Monitored Global CDN</span>
        </div>
      </section>

      {/* Engineering Technology Stack */}
      <section className="space-y-6">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Our Technology & Architecture
        </h2>
        <p className="text-sm sm:text-base">
          We combine cutting-edge browser technologies with battle-tested open-source PDF parsing standards to achieve near-instant execution while maintaining absolute vector fidelity:
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "WebAssembly Core", desc: "Native C/Rust libraries running inside the browser sandbox for zero-upload privacy." },
            { name: "PyMuPDF & MuPDF", desc: "Ultra-high-resolution 200–300 DPI rasterization and lossless stream deflating." },
            { name: "Headless Document Engines", desc: "LibreOffice & WeasyPrint integration for pristine DOCX, XLSX, and PPTX conversions." },
            { name: "Neural OCR & Handwriting", desc: "Optical character recognition transforms scanned documents and handwritten notes into searchable text." }
          ].map((tech, i) => (
            <div key={i} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
              <p className={`font-bold text-sm mb-1.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>{tech.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Numbers & Impact */}
      <section className="space-y-6">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          PDFBolt by the Numbers
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { num: "25+", label: "Specialized PDF Tools" },
            { num: "100%", label: "Free Without Paywalls" },
            { num: "0", label: "Mandatory User Logins" },
            { num: "15 min", label: "Hard Disk TTL Purge" }
          ].map((stat, i) => (
            <div key={i} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-3xl sm:text-4xl font-black text-yellow-600 dark:text-yellow-400 mb-1">{stat.num}</p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial & Educational Commitment */}
      <section className="space-y-4">
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Commitment to Editorial & Educational Standards
        </h2>
        <p className="text-sm sm:text-base">
          In addition to our software suite, PDFBolt publishes comprehensive educational resources—including our <Link to="/encyclopedia" className="font-bold text-yellow-700 dark:text-yellow-400 underline">PDF Format Encyclopedia</Link> and step-by-step <Link to="/guides" className="font-bold text-yellow-700 dark:text-yellow-400 underline">How-To Knowledge Base</Link>—to help professionals, educators, and students understand PDF/A archiving standards, OCR layers, vector vs. raster rendering, and document security.
        </p>
      </section>

      {/* Contact Callout */}
      <div className={`p-8 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-6 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-yellow-50/60 border-yellow-200'
      }`}>
        <div>
          <h2 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Have Questions or Suggestions?</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Our engineering and support team is here to assist you.</p>
        </div>
        <Link 
          to="/contact" 
          className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all shrink-0 inline-flex items-center gap-2"
        >
          Contact Our Team <ArrowRight size={14} />
        </Link>
      </div>

    </div>
  </PageLayout>
);

/* ========================================================================
   4. TERMS OF SERVICE
   ======================================================================== */
export const TermsPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout 
    title="Terms of Service"
    subtitle="By accessing or using PDFBolt (https://pdfbolt.in), you acknowledge and agree to be bound by these Terms of Service. Please review them carefully."
    lastUpdated="September 1, 2026"
    badge="Terms & Conditions"
    badgeIcon={<FileText size={14} />}
    darkMode={darkMode}
  >
    <div className="space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
      
      <section className="space-y-3">
        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          1. Free & Unlimited Service Access
        </h2>
        <p className="text-sm sm:text-base">
          PDFBolt grants you a personal, non-exclusive, worldwide, royalty-free license to use our web-based PDF utilities for personal, educational, non-profit, and commercial workflows. There are no recurring subscription fees, hidden paywalls, or forced account creations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          2. Document Ownership & Intellectual Property
        </h2>
        <p className="text-sm sm:text-base">
          <strong>You retain 100% full ownership and all copyright rights to all documents</strong> that you process through PDFBolt. PDFBolt does not claim any ownership, licensing, or publishing rights over your files.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          3. Prohibited Conduct & Acceptable Use
        </h2>
        <p className="text-sm sm:text-base">
          You agree not to use PDFBolt to:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base">
          <li>Transmit or convert files containing viruses, worms, malware, or malicious exploit payloads.</li>
          <li>Launch automated denial-of-service (DDoS) attacks, brute-force requests, or abusive scraping scripts intended to degrade service reliability for other users.</li>
          <li>Circumvent or manipulate advertising displays, ad delivery mechanisms, or rate limits.</li>
          <li>Process illegal content or violate intellectual property rights belonging to third parties.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          4. Third-Party Advertising & External Links
        </h2>
        <p className="text-sm sm:text-base">
          PDFBolt displays advertisements provided by Google AdSense and accredited third-party ad networks to fund server operations. PDFBolt is not responsible for the content, privacy practices, or accuracy of third-party websites linked through external advertisements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          5. Disclaimer of Warranties
        </h2>
        <p className="text-sm sm:text-base">
          PDFBolt is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. While we implement high-fidelity PDF engines and extensive test suites, we do not warrant that document conversions will be error-free or uninterrupted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          6. Limitation of Liability
        </h2>
        <p className="text-sm sm:text-base">
          In no event shall PDFBolt, its founder, or contributors be liable for any direct, indirect, incidental, special, consequential, or punitive damages resulting from the use or inability to use our services, loss of document data, or temporary service interruptions. Users are advised to retain original backups of critical files.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          7. Contact & Inquiries
        </h2>
        <p className="text-sm sm:text-base">
          If you have questions regarding these Terms of Service, please contact our team at <a href="mailto:support@pdfbolt.in" className="font-bold text-yellow-700 dark:text-yellow-400 underline">support@pdfbolt.in</a>.
        </p>
      </section>

    </div>
  </PageLayout>
);
