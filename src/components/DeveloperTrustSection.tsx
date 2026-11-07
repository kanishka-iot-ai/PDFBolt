import React from 'react';
import { ShieldCheck, Cpu, CheckCircle2, Lock, ExternalLink, Star } from 'lucide-react';

interface DeveloperTrustSectionProps {
  darkMode: boolean;
}

export const DeveloperTrustSection: React.FC<DeveloperTrustSectionProps> = ({ darkMode }) => {
  return (
    <section
      aria-label="Developer Accountability and Community Verification"
      className="w-full max-w-4xl mx-auto px-2 mt-10 mb-4 text-left"
    >
      <div
        className={`rounded-2xl sm:rounded-3xl border craft-card backdrop-blur-xl p-5 sm:p-7 transition-all ${
          darkMode
            ? 'bg-[#0e1422]/90 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.36)]'
            : 'bg-white/95 border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
        }`}
      >
        {/* Top: Developer Privacy Commitment (PDF24 Inspired) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/70 dark:border-white/[0.06]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
              KG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                  Engineering Commitment
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Verified Independent Software
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Engineered for Privacy by Kanishka Giri
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed mt-1">
                PDFBolt was created to give students, job applicants, and professionals a genuinely free, offline-first PDF suite that runs completely in local device memory. Your personal documents, identity cards, and signatures never touch a remote server.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <a
              href="https://www.trustpilot.com/review/pdfbolt.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 hover:border-amber-400 text-slate-700 dark:text-slate-200"
            >
              <div className="flex text-emerald-500">
                <Star size={12} fill="currentColor" />
              </div>
              <span>Trustpilot Profile</span>
              <ExternalLink size={11} className="text-slate-400" />
            </a>
          </div>
        </div>

        {/* Middle: 3 Real Verified Use Cases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-5 pb-2">
          {/* Card 1: UPSC OTR */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              darkMode
                ? 'bg-slate-900/60 border-white/[0.05]'
                : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  UPSC OTR Portal
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Priya S., Delhi</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                "Other online compressors output 312KB which got immediately rejected by the UPSC OTR portal. PDFBolt targeted exactly 284KB with sharp roll numbers and signatures on my first attempt."
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={11} /> 300KB Binary Safe-Band
            </div>
          </div>

          {/* Card 2: Legal e-Filing */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              darkMode
                ? 'bg-slate-900/60 border-white/[0.05]'
                : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  High Court e-Filing
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Advocate R. Verma</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                "Court portals reject fillable AcroForms. The legal flattening tool converted dynamic petition fields into static vector paths in two seconds without uploading confidential client files."
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={11} /> Zero Server Transmission
            </div>
          </div>

          {/* Card 3: Cyber Cafe */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              darkMode
                ? 'bg-slate-900/60 border-white/[0.05]'
                : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  CSC Cyber Center
                </span>
                <span className="text-[10px] font-semibold text-slate-400">M. Tariq, Lucknow</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                "We handle 50 or more customer applications daily. Other sites block users after 2 files with aggressive paywalls. PDFBolt has no daily limits and runs reliably on older store computers."
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={11} /> Truly Unlimited & Free
            </div>
          </div>
        </div>

        {/* Bottom: Technical Privacy Verification Seals */}
        <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 flex-wrap font-medium">
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Cpu size={13} className="text-yellow-600 dark:text-yellow-400" /> Client-Side WebAssembly
            </span>
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Lock size={13} className="text-emerald-500" /> Zero Uploaded Bytes
            </span>
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <ShieldCheck size={13} className="text-blue-500" /> No Cookies or Account Required
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Open Web Standards (ISO 32000 PDF Specification)
          </span>
        </div>
      </div>
    </section>
  );
};

export default DeveloperTrustSection;
