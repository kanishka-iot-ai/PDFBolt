
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Trash2, ChevronDown, Minimize2 } from 'lucide-react';
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
        className="fixed bottom-8 right-8 z-[100] p-5 bg-red-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group animate-bounce"
      >
        <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-2 -right-2 bg-blue-500 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-900">AI</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 z-[100] w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] flex flex-col rounded-[2.5rem] border shadow-2xl overflow-hidden animate-fadeInUp ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="p-6 bg-red-600 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Bot size={20} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-tight">PDFBolt AI</h4>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold opacity-80 uppercase">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            title="Clear History"
            onClick={() => setMessages([{ role: 'model', text: 'History cleared. How can I help?' }])}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
          <button
            title="Close Chat"
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Minimize2 size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50 scroll-smooth">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm whitespace-pre-wrap ${m.role === 'user'
                ? 'bg-red-600 text-white rounded-tr-none'
                : darkMode ? 'bg-slate-700 text-slate-200 rounded-tl-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
              }`}>
              {m.text || (isTyping && i === messages.length - 1 ? <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span> : '')}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className={`p-4 border-t shrink-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about PDFs..."
            disabled={isTyping}
            className={`w-full p-4 pr-14 rounded-2xl outline-none border-2 focus:ring-4 transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-red-600/10 focus:border-red-600' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-red-50 focus:border-red-600'
              }`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-30 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-[9px] font-bold text-slate-400 mt-3 uppercase tracking-widest">Powered by Gemini 3 Pro</p>
      </div>
    </div>
  );
};

export default AIChatbot;
