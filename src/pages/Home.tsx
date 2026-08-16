import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../constants';
import ToolCard from '../components/ToolCard';
import AdSlot from '../components/AdSlot';
import { Star, Edit3, Repeat, Shield, Settings, CheckCircle2, FileText, Search, Zap, Lock, Globe } from 'lucide-react';

const Home: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', title: 'All Tools', icon: <Globe size={18} /> },
    { id: 'edit', title: 'Edit & Organize', icon: <Edit3 size={18} /> },
    { id: 'convert-to', title: 'Convert To PDF', icon: <Repeat size={18} /> },
    { id: 'convert-from', title: 'Convert From PDF', icon: <Repeat size={18} /> },
    { id: 'security', title: 'Security', icon: <Shield size={18} /> },
    { id: 'utilities', title: 'Utilities', icon: <Settings size={18} /> }
  ];

  const filteredTools = useMemo(() => {
    return TOOLS.filter(tool => {
      const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || 
                              tool.category === activeCategory || 
                              (activeCategory === 'utilities' && tool.category === 'extra');
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className={`relative pt-24 pb-20 overflow-hidden text-center border-b ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 text-yellow-600 dark:text-yellow-500 font-bold text-xs uppercase tracking-widest mb-8 animate-slideDown">
            <Star size={14} fill="currentColor" /> Professional Grade Toolkit
          </div>
          <h1 className={`text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.1] ${darkMode ? 'text-white' : 'text-slate-900'} animate-slideUp`} style={{animationDelay: '100ms'}}>
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Smart Way</span><br />to handle PDFs.
          </h1>
          <p className={`text-xl md:text-2xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'} animate-slideUp`} style={{animationDelay: '200ms'}}>
            Merge, split, convert, and protect your documents instantly. 100% private, browser-based processing with zero uploads.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative animate-slideUp" style={{animationDelay: '300ms'}}>
            <div className={`absolute inset-0 bg-yellow-500 blur-xl opacity-20 rounded-full transition-opacity duration-300 ${searchQuery ? 'opacity-40' : ''}`}></div>
            <div className={`relative flex items-center p-2 rounded-full glass border shadow-xl ${darkMode ? 'border-slate-700/50 bg-slate-900/80' : 'border-slate-200 bg-white/90'}`}>
              <Search className={`ml-4 mr-2 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} size={24} />
              <input
                type="text"
                placeholder="Search tools (e.g., 'merge', 'compress')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none p-3 text-lg font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                >
                  <Settings size={20} className="rotate-45" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Stats Section */}
      <section className={`py-12 border-b ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="flex flex-col items-center text-center px-4">
              <Shield className="text-yellow-500 mb-3" size={32} />
              <h3 className={`text-3xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>100%</h3>
              <p className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Private</p>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <FileText className="text-yellow-500 mb-3" size={32} />
              <h3 className={`text-3xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>25+</h3>
              <p className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tools</p>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <Lock className="text-yellow-500 mb-3" size={32} />
              <h3 className={`text-3xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Zero</h3>
              <p className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Uploads</p>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <Zap className="text-yellow-500 mb-3" size={32} />
              <h3 className={`text-3xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fast</h3>
              <p className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Processing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs & Tools Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        {/* Category Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-6 mb-12 no-scrollbar justify-start md:justify-center">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/25 scale-105'
                  : darkMode
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat.icon}
              {cat.title}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} darkMode={darkMode} />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg font-medium">No tools found matching "{searchQuery}"</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-6 py-2 bg-yellow-500 text-slate-950 rounded-full font-bold text-sm"
            >
              Reset Search
            </button>
          </div>
        )}
      </section>

      {/* Non-Intrusive Sponsored Slot */}
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <AdSlot placement="HOME_CONTENT" />
      </div>

      {/* Customer Care Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className={`p-12 md:p-16 rounded-[3rem] border relative overflow-hidden text-center transition-all ${darkMode ? 'bg-yellow-900/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-100'}`}>
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 shadow-sm text-yellow-600 font-bold text-xs uppercase tracking-widest mb-6">
              <Shield size={14} /> Premium Support
            </div>
            <h2 className={`text-4xl md:text-5xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Need <span className="text-yellow-500">Assistance?</span>
            </h2>
            <p className={`text-xl font-medium mb-10 leading-relaxed max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Our dedicated support team is here to help you with any issues or questions. We pride ourselves on providing fast, human responses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/contact" className="px-8 py-4 bg-yellow-500 text-white rounded-full font-bold text-lg shadow-lg hover:bg-yellow-600 hover:-translate-y-1 transition-all w-full sm:w-auto">
                Contact Support
              </Link>
              <Link to="/about" className={`px-8 py-4 rounded-full font-bold text-lg border-2 transition-all w-full sm:w-auto ${darkMode ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-white'}`}>
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
