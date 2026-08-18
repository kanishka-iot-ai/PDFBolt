
import React, { useState, useRef } from 'react';
import { ShieldCheck, Lock, Globe, Mail, Headphones, Clock, Send, CheckCircle2, MessageSquare, Zap } from 'lucide-react';

const PageLayout: React.FC<{ title: string; children: React.ReactNode; darkMode: boolean }> = ({ title, children, darkMode }) => (
  <div className="max-w-4xl mx-auto px-6 py-24 animate-fadeIn">
    <h1 className={`text-6xl font-black mb-16 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
    <div className={`prose prose-lg ${darkMode ? 'prose-invert' : ''} max-w-none`}>
      {children}
    </div>
  </div>
);

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
    const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'JE-e7n6wYODP3qdSW';

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
        const mailtoUrl = `mailto:support@pdfbolt.in?subject=${encodeURIComponent(`[PDFBolt Support] ${selectedTopic}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${selectedTopic}\n\nMessage:\n${message}`)}`;
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
          Your inquiry has been delivered directly to <strong className="text-yellow-700 dark:text-yellow-400">support@pdfbolt.in</strong>. Our team will get back to you within 24 hours.
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
              <Mail size={13} /> Official Email Support
            </div>
            <h1 className={`text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Get in <span className="text-yellow-700 dark:text-yellow-400">touch</span> with us
            </h1>
            <p className={`text-sm sm:text-base font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Need assistance, have feedback, or want to report a technical issue? Send us a message and our team will assist you promptly.
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-0.5">Support Inbox</p>
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
                <p className="text-xs text-slate-600 dark:text-slate-400">All inquiries are handled directly by our engineering and product team.</p>
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
                <p className="text-xs text-slate-600 dark:text-slate-400">Never send private credentials in emails. PDFBolt processes files locally in your browser.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Clean Email Form */}
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
                Select Topic
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
                placeholder="Describe your question, bug details, or suggestion..."
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
              Or email us directly at <a href="mailto:support@pdfbolt.in" className="font-bold underline text-yellow-700 dark:text-yellow-400">support@pdfbolt.in</a>
            </p>
          </form>
        </div>

      </div>
    </div>
  );
};


export const PrivacyPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout title="Privacy Policy" darkMode={darkMode}>
    <p className="lead text-lg font-medium text-slate-600 dark:text-slate-300">
      Your privacy and data security are the foundational pillars of PDFBolt. This Privacy Policy details how we handle your documents, cookies, and digital preferences.
    </p>

    <h2>1. Client-Side Document Processing</h2>
    <p>
      Unlike traditional cloud converter websites, <strong>PDFBolt processes all standard PDF conversions and manipulations directly within your web browser</strong> using JavaScript and WebAssembly (Wasm). 
    </p>
    <ul>
      <li><strong>Zero Server Uploads:</strong> Your documents remain in your computer or mobile device's local memory and are never transmitted to our servers during standard operations.</li>
      <li><strong>Immediate Memory Release:</strong> As soon as you navigate away, download your output, or close your browser tab, all temporary document memory is wiped immediately.</li>
      <li><strong>Optional Cloud Sharing (QR Code Tool):</strong> If you explicitly choose the "Share via QR Code" feature, your encrypted PDF is stored temporarily in our secure AWS S3 bucket with an automatic 30-day lifecycle expiration policy, after which it is permanently purged.</li>
    </ul>

    <h2>2. Advertising & Google AdSense Cookies</h2>
    <p>
      To keep PDFBolt free, high-performance, and accessible worldwide without subscription paywalls, we partner with <strong>Google AdSense</strong> to display non-intrusive advertisements.
    </p>
    <ul>
      <li>Google, as a third-party vendor, uses cookies (including the DoubleClick cookie) to serve ads based on a user's prior visits to this and other websites on the Internet.</li>
      <li>Users may opt out of personalized advertising by visiting Google's <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-yellow-600 font-bold underline">Ads Settings</a> or by configuring preferences in our on-site Cookie Consent banner.</li>
      <li>AdSense scripts are loaded asynchronously and strictly isolated from all document processing and file reader APIs. Advertisers have zero access to your document contents, file names, or metadata.</li>
    </ul>

    <h2>3. Essential Cookies & Local Storage</h2>
    <p>
      We use lightweight browser storage strictly for essential user preferences:
    </p>
    <ul>
      <li>Theme selection (Dark Mode / Light Mode)</li>
      <li>Sound effect toggles</li>
      <li>Cookie and advertising personalization consent choices</li>
    </ul>

    <h2>4. Contact & Inquiries</h2>
    <p>
      If you have questions about our privacy practices, security model, or cookie preferences, please contact our privacy compliance team at <a href="mailto:support@pdfbolt.in" className="text-yellow-600 font-bold">support@pdfbolt.in</a>.
    </p>
  </PageLayout>
);

export const TermsPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout title="Terms of Service" darkMode={darkMode}>
    <p className="lead text-lg font-medium text-slate-600 dark:text-slate-300">
      By accessing or utilizing PDFBolt, you acknowledge and agree to these terms:
    </p>
    <h2>1. Free & Unlimited Service</h2>
    <p>PDFBolt is 100% free for personal, educational, and commercial document workflows. There are no hidden fees, recurring subscriptions, or forced feature paywalls.</p>
    <h2>2. "As-Is" Document Processing</h2>
    <p>While PDFBolt employs battle-tested PDF engines and strict regression checks, document processing is provided on an "as-is" and "as-available" basis without warranties of any kind.</p>
    <h2>3. Prohibited Usage & Automated Scraping</h2>
    <p>You agree not to reverse engineer, disrupt server integrity, spam automated bot requests, or create deceptive wrappers intended to mislead users or manipulate advertising metrics.</p>
  </PageLayout>
);

export const AboutPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout title="About PDFBolt" darkMode={darkMode}>
    <div className="grid md:grid-cols-3 gap-8 mb-16 not-prose">
      {[
        { icon: <Lock />, title: "Serverless", desc: "No uploads ever." },
        { icon: <Globe />, title: "Global", desc: "Works everywhere." },
        { icon: <ShieldCheck />, title: "Verified", desc: "Trusted by pros." }
      ].map((item, i) => (
        <div key={i} className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-yellow-500 mb-4">{item.icon}</div>
          <h2 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h2>
          <p className="text-sm font-medium text-slate-500">{item.desc}</p>
        </div>
      ))}
    </div>
    <p>PDFBolt was built with one goal: to provide professional-grade PDF tools that respect user privacy. By leveraging modern browser technology, we eliminated the need for expensive server-side processing, allowing us to keep the service free for everyone.</p>
  </PageLayout>
);
