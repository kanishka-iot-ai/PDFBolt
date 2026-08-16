
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, Trash2, ChevronDown, Minimize2 } from 'lucide-react';
import { aiService } from '../services/aiService';
import { Content } from '@google/genai';

const AIChatbot: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Hi! I am your PDFBolt AI. How can I help you with your documents today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');

    // Construct history for Gemini (exclude the very first greeting if it was static)
    const geminiHistory: Content[] = messages.slice(1).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      let fullResponse = '';
      // Add a placeholder for the model response
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      const stream = aiService.streamChat(userMsg, geminiHistory);
      for await (const chunk of stream) {
        if (chunk) {
          fullResponse += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = fullResponse;
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Gemini Stream Error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error connecting to my brain. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[100] p-4 bg-yellow-500 text-white rounded-full shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95 transition-all group animate-pulse-slow"
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 bg-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-800">AI</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 z-[100] w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-slideUp glass border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="p-4 bg-yellow-500 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-white/20 rounded-lg flex items-center justify-center">
            <img src="/pdfbolt-logo-transparent.png" alt="PDFBolt AI" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-tight">PDFBolt AI</h4>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-semibold opacity-90 uppercase">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="Clear History"
            onClick={() => setMessages([{ role: 'model', text: 'History cleared. How can I help?' }])}
            className="p-2 hover:bg-white/20 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button
            title="Close Chat"
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-md transition-colors"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${m.role === 'user'
                ? 'bg-yellow-500 text-white rounded-tr-sm'
                : darkMode ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'
              }`}>
              {m.text || (isTyping && i === messages.length - 1 ? <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span> : '')}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className={`p-4 border-t shrink-0 ${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white/80 border-slate-200'}`}>
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about PDFs..."
            disabled={isTyping}
            className={`w-full p-3.5 pr-12 rounded-xl outline-none border transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-yellow-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-yellow-500 focus:bg-white shadow-inner'
              }`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] font-medium text-slate-400 mt-2">Powered by Gemini Pro</p>
      </div>
    </div>
  );
};

export default AIChatbot;
