import React from 'react';
import { TOOLS } from '../constants';
import ToolCard from '../components/ToolCard';
import { Star, Edit3, Repeat, Shield, Settings, Download, Smartphone, Laptop, CheckCircle2, FileText } from 'lucide-react';

const Home: React.FC<{ darkMode: boolean; onInstall?: () => void }> = ({ darkMode, onInstall }) => {
  // Use the onInstall handler passed from App.tsx
  const handleDownloadClick = () => {
    if (onInstall) onInstall();
  };

  const cats = [
    { id: 'edit', title: 'Edit & Organize', icon: <Edit3 className="text-red-500" /> },
    { id: 'convert-to', title: 'To PDF', icon: <Repeat className="text-blue-500" /> },
    { id: 'convert-from', title: 'From PDF', icon: <Repeat className="text-green-500" /> },
    { id: 'security', title: 'Security', icon: <Shield className="text-orange-500" /> },
    { id: 'utilities', title: 'Utilities', icon: <Settings className="text-slate-500" /> }
  ];

  return (
    <div>
      <section className="relative py-12 overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-red-600 rounded-full blur-[200px]"></div>
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[200px]"></div>
        </div>
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-10 border border-yellow-200 dark:border-yellow-900/50">
            <Star size={14} fill="currentColor" /> Professional Grade
          </div>
          <h1 className={`text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <span className="text-yellow-500">Lightning Fast</span><br />PDF Workflow
          </h1>
          <p className={`text-2xl md:text-3xl max-w-3xl mx-auto mb-10 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            The ultimate browser-based toolkit. Fast, private, and powerful.
          </p>
          <button
            onClick={handleDownloadClick}
            className="px-10 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-xl shadow-xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"
          >
            <Download size={24} /> Download App
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-24 space-y-16">
        {(console.log('Rendering cats:', cats.length), null)}
        {(console.log('Tools count:', TOOLS.length), null)}
        {cats.map((cat, i) => (
          <div key={cat.id}>
            <div className="flex items-center gap-4 mb-12 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">{cat.icon}</div>
              <h2 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{cat.title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {TOOLS.filter(t => t.category === cat.id || (cat.id === 'utilities' && t.category === 'extra')).map(t => (
                <ToolCard key={t.id} tool={t} darkMode={darkMode} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* App Promotion Section */}
      <section className={`py-32 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className={`p-12 md:p-20 rounded-[4rem] border-4 border-dashed relative overflow-hidden transition-all ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-2xl'
            }`}>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest mb-6">
                  <Smartphone size={14} /> Desktop & Mobile App
                </div>
                <h2 className={`text-5xl md:text-6xl font-black mb-8 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  PDFBolt <span className="text-yellow-500">Anywhere.</span>
                </h2>
                <p className={`text-xl font-medium mb-12 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Install PDFBolt as a standalone application for faster access, offline capabilities, and a distraction-free workspace. No app store required.
                </p>
                <div className="space-y-4 mb-12">
                  {[
                    "Zero-latency startup from your taskbar",
                    "Works offline - process files without internet",
                    "No browser tabs or address bars",
                    "Automatically updates to latest features"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-500" size={20} />
                      <span className="font-bold text-sm uppercase tracking-tight">{feat}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleDownloadClick}
                  className="px-12 py-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-[2rem] font-black text-2xl shadow-2xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all flex items-center justify-center gap-4"
                >
                  <Download size={28} /> Download App Now
                </button>
              </div>
              <div className="relative group">
                <div className={`aspect-[4/3] rounded-[3rem] border-8 shadow-2xl overflow-hidden transition-transform group-hover:scale-[1.02] ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'
                  }`}>
                  <div className="p-4 bg-slate-200 dark:bg-slate-800 border-b dark:border-slate-700 flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="p-8 flex flex-col items-center justify-center h-full space-y-6 opacity-40">
                    {/* Added FileText icon to fix reference error */}
                    <FileText size={80} className="text-yellow-500" />
                    <div className="w-32 h-4 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                    <div className="grid grid-cols-2 gap-4 w-full px-12">
                      <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                      <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-48 aspect-[9/16] bg-slate-900 rounded-[2.5rem] border-[6px] border-slate-800 shadow-2xl hidden md:block overflow-hidden">
                  <div className="w-1/3 h-1 bg-slate-700 mx-auto mt-4 rounded-full"></div>
                  <div className="p-4 flex flex-col items-center justify-center h-full opacity-30">
                    {/* Added FileText icon to fix reference error */}
                    <FileText size={30} className="text-yellow-500 mb-2" />
                    <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Care Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className={`p-16 rounded-[4rem] border relative overflow-hidden text-center transition-all ${darkMode ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white dark:bg-slate-900 shadow-sm text-indigo-600 font-black text-xs uppercase tracking-widest mb-8">
              <Shield size={14} /> Premium Support
            </div>
            <h2 className={`text-5xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Need <span className="text-indigo-600">Assistance?</span>
            </h2>
            <p className={`text-xl font-medium mb-10 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Our dedicated support team is here to help you with any issues or questions. We pride ourselves on providing fast, human responses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a href="#/contact" className="px-10 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all w-full sm:w-auto">
                Contact Support
              </a>
              <a href="#/about" className={`px-10 py-5 rounded-2xl font-black text-lg border-2 transition-all w-full sm:w-auto ${darkMode ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-white'}`}>
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Modal moved to App.tsx */}

    </div>
  );
};
export default Home;