import React from 'react';
import { Laptop } from 'lucide-react';

interface DownloadModalProps {
    onClose: () => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
            <div className="relative max-w-lg w-full bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-1 rounded-[2.5rem] shadow-2xl animate-scaleIn">
                <div className="bg-slate-900 rounded-[2.3rem] p-10 text-center relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg rotate-3 transform hover:rotate-6 transition-all">
                        <Laptop className="text-white" size={40} />
                    </div>

                    <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Desktop App <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">Coming Soon!</span></h3>

                    <p className="text-slate-300 text-lg font-medium leading-relaxed mb-8">
                        We are building a powerful offline experience just for you. Get ready for zero-latency editing directly from your desktop.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-100 hover:scale-[1.02] transition-all shadow-xl"
                        >
                            Notify Me When Ready!
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-transparent text-slate-400 font-bold hover:text-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadModal;
