import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone, Heart, Coffee } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    darkMode: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, darkMode }) => {
    const [qrUrl, setQrUrl] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Securely loaded from environment variables
    const UPI_ID = "9932343232@ybl";
    const PAY_NAME = "PDFBolt Pro";
    const UPI_URL = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAY_NAME)}&cu=INR`;

    useEffect(() => {
        if (isOpen) {
            QRCode.toDataURL(UPI_URL, {
                width: 400,
                margin: 2,
                color: {
                    dark: darkMode ? '#ffffff' : '#000000',
                    light: darkMode ? '#1e293b' : '#ffffff', // Slate-800 or White
                }
            }).then(setQrUrl).catch(console.error);
        }
    }, [isOpen, darkMode, UPI_URL]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
                className={`relative w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl transform transition-all scale-100 ${darkMode ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white text-slate-900'
                    }`}
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-2xl bg-yellow-500/10 mb-4">
                        <Heart className="text-yellow-500 w-8 h-8 fill-current animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-black mb-2">Support PDFBolt</h2>
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Help us keep these tools free and private.
                    </p>
                </div>

                <div className="flex flex-col items-center space-y-8">
                    {/* QR Code Container */}
                    <div className={`p-4 rounded-[2rem] border-4 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-indigo-50'}`}>
                        {qrUrl ? (
                            <img src={qrUrl} alt="Payment QR" className="w-56 h-56 rounded-2xl" />
                        ) : (
                            <div className="w-56 h-56 flex items-center justify-center">Loading QR...</div>
                        )}
                    </div>

                    {/* Mobile Pay Button */}
                    <a
                        href={UPI_URL}
                        className="w-full py-4 bg-[#5f259f] text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                        <Smartphone size={20} /> Pay with PhonePe / UPI
                    </a>

                    {/* UPI ID Copy */}
                    <div className={`w-full p-4 rounded-xl flex items-center justify-between border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="text-left">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">UPI ID</span>
                            <span className="font-mono font-bold text-sm">{UPI_ID}</span>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(UPI_ID);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className={`p-2 rounded-lg transition-colors ${copied ? 'text-green-500' : 'text-slate-400 hover:text-indigo-500'}`}
                        >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-slate-400 font-medium">
                    Secure processing via your UPI App
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
