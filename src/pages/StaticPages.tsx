
import React, { useState } from 'react';
import { ShieldCheck, Lock, Globe, Mail, Headphones, Clock, Send, CheckCircle2 } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center animate-fadeIn">
        <div className="inline-flex p-6 rounded-full bg-green-50 dark:bg-green-900/20 mb-8 border-4 border-green-100 dark:border-green-800">
          <CheckCircle2 className="text-green-500 w-16 h-16" />
        </div>
        <h1 className={`text-5xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Message Received!</h1>
        <p className="text-xl font-medium text-slate-500 max-w-lg mx-auto mb-10">
          Our customer care team has received your inquiry. We typically respond within 24 hours.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 animate-fadeIn">
      <div className="grid lg:grid-cols-2 gap-20">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-black text-[10px] uppercase tracking-widest mb-6 border border-yellow-200 dark:border-yellow-900/50">
            <Headphones size={14} /> Customer Care
          </div>
          <h1 className={`text-7xl font-black mb-8 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            How can we <span className="text-yellow-500">help?</span>
          </h1>
          <p className={`text-xl font-medium mb-12 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Have questions about our serverless security model? Found a bug? Or just want to say hi? Our team is ready to assist you.
          </p>

          <div className="space-y-6">
            <a href="mailto:support@pdfbolt.com" className={`p-6 rounded-3xl border flex items-center gap-6 transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl text-yellow-500 shadow-sm"><Mail size={24} /></div>
              <div>
                <h4 className={`font-black uppercase text-xs tracking-widest mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Email Support</h4>
                <p className="text-sm font-bold text-slate-500">Click to Send Email</p>
              </div>
            </a>
            <a href="tel:993234232" className={`p-6 rounded-3xl border flex items-center gap-6 transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl text-orange-500 shadow-sm"><Headphones size={24} /></div>
              <div>
                <h4 className={`font-black uppercase text-xs tracking-widest mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Phone Support</h4>
                <p className="text-sm font-bold text-slate-500">Click to Call Us</p>
              </div>
            </a>
          </div>
        </div>

        <div className={`p-10 rounded-[3rem] border shadow-2xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <input required type="text" className={`w-full p-4 rounded-2xl border-2 outline-none focus:ring-4 transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-red-600/10 focus:border-red-600' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-red-50 focus:border-red-600'}`} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <input required type="email" className={`w-full p-4 rounded-2xl border-2 outline-none focus:ring-4 transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-red-600/10 focus:border-red-600' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-red-50 focus:border-red-600'}`} placeholder="john@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
              <select required className={`w-full p-4 rounded-2xl border-2 outline-none focus:ring-4 transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-red-600/10 focus:border-red-600' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-red-50 focus:border-red-600'}`}>
                <option value="">Select an option</option>
                <option value="support">Technical Support</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="business">Business Inquiry</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Message</label>
              <textarea required rows={5} className={`w-full p-4 rounded-2xl border-2 outline-none focus:ring-4 transition-all resize-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-red-600/10 focus:border-red-600' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-red-50 focus:border-red-600'}`} placeholder="How can we help you master your PDFs?"></textarea>
            </div>
            <button
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-xl hover:from-yellow-600 hover:to-orange-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Send Message <Send size={20} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout title="Privacy Policy" darkMode={darkMode}>
    <p>Your privacy is our top priority. Unlike traditional PDF websites, <strong>PDFBolt does not upload your files to any server.</strong></p>
    <h3>Local Processing</h3>
    <p>Every operation performed on this website happens entirely within your browser using JavaScript and WebAssembly. Your sensitive data never leaves your computer.</p>
    <ul>
      <li>No data storage</li>
      <li>No file logging</li>
      <li>No third-party tracking</li>
    </ul>
    <h3>Contact Us</h3>
    <p>If you have questions about our security model, contact us at <span className="text-yellow-600 font-bold">privacy@pdfbolt.com</span>.</p>
  </PageLayout>
);

export const TermsPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <PageLayout title="Terms of Service" darkMode={darkMode}>
    <p>By using PDFBolt, you agree to the following terms:</p>
    <h3>1. Free Use</h3>
    <p>PDFBolt is 100% free for personal and commercial use. There are no hidden fees or subscriptions.</p>
    <h3>2. "As-Is" Service</h3>
    <p>While we strive for 100% accuracy, we are not responsible for any data loss or formatting issues resulting from document processing.</p>
    <h3>3. No Redistribution</h3>
    <p>You may not scrape or redistribute our browser-based tools without written consent.</p>
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
          <h4 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
          <p className="text-sm font-medium text-slate-500">{item.desc}</p>
        </div>
      ))}
    </div>
    <p>PDFBolt was built with one goal: to provide professional-grade PDF tools that respect user privacy. By leveraging modern browser technology, we eliminated the need for expensive server-side processing, allowing us to keep the service free for everyone.</p>
  </PageLayout>
);
