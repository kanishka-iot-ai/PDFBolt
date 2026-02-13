import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Download, Plus, Trash2, Zap, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { ocrImage } from '../services/ocrService';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface HandwritingToolProps {
    darkMode: boolean;
    notify: any;
}

const HandwritingTool: React.FC<HandwritingToolProps> = ({ darkMode, notify }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ocrText, setOcrText] = useState('');
    const [step, setStep] = useState<'scan' | 'edit' | 'preview'>('scan');
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Start Camera (Reusing logic from ScanTool)
    const startCamera = async () => {
        setCameraError(null);
        setIsCameraActive(true);
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch (err: any) {
                setIsCameraActive(false);
                setCameraError("Camera access error. Ensure you are on HTTPS.");
            }
        }, 100);
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        const imgData = canvasRef.current.toDataURL('image/jpeg', 0.85);
        setCapturedImages(prev => [...prev, imgData]);
        if (notify?.success) notify.success();
    };

    const performOCR = async () => {
        if (capturedImages.length === 0) return;
        setIsProcessing(true);
        try {
            let combinedText = '';
            for (let i = 0; i < capturedImages.length; i++) {
                const text = await ocrImage(capturedImages[i]);
                combinedText += text + '\n\n';
            }
            setOcrText(combinedText.trim());
            setStep('edit');
            if (notify?.complete) notify.complete();
        } catch (err) {
            if (notify?.error) notify.error();
            alert("OCR failed. Please try again with a clearer image.");
        } finally {
            setIsProcessing(false);
        }
    };

    const generatePdf = async () => {
        setLoading(true);
        try {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontSize = 12;
            const margin = 50;

            let page = pdfDoc.addPage();
            const { width, height } = page.getSize();

            const lines = ocrText.split('\n');
            let currentY = height - margin;

            for (const line of lines) {
                if (currentY < margin + 20) {
                    page = pdfDoc.addPage();
                    currentY = height - margin;
                }

                // Simple line wrapping logic would be better but for now we'll do direct
                page.drawText(line, {
                    x: margin,
                    y: currentY,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                });
                currentY -= fontSize + 5;
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `handwritten_ocr_${Date.now()}.pdf`;
            link.click();

            setStep('scan');
            setCapturedImages([]);
            setOcrText('');
        } catch (err) {
            alert("Failed to generate PDF");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-[85vh] p-4 md:p-8 flex flex-col items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>

            {/* Header Section */}
            <div className="text-center mb-12 max-w-2xl">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-3">
                    <Zap size={40} className="text-white fill-white" />
                </div>
                <h1 className="text-4xl font-black mb-4 tracking-tight">Scan Handwriting to PDF</h1>
                <p className="opacity-70 text-lg uppercase tracking-widest font-bold text-[10px]">Premium OCR Engine (Offline & Private)</p>
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">

                {/* Step Indicator */}
                <div className="flex border-b border-slate-100 dark:border-slate-700">
                    {['scan', 'edit'].map((s: any) => (
                        <div
                            key={s}
                            className={`flex-1 py-4 text-center font-black uppercase tracking-widest text-[10px] transition-all
              ${step === s ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'opacity-40'}`}
                        >
                            {s}
                        </div>
                    ))}
                </div>

                {/* Step 1: Scan / Capture */}
                {step === 'scan' && (
                    <div className="flex-grow flex flex-col items-center justify-center p-8">
                        {!isCameraActive && capturedImages.length === 0 ? (
                            <div className="text-center group">
                                <div
                                    onClick={startCamera}
                                    className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all border-2 border-dashed border-slate-300 dark:border-slate-600 group-hover:border-indigo-500"
                                >
                                    <Camera size={48} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Ready to Scan?</h3>
                                <p className="opacity-60 text-sm mb-8">Point your camera at the handwriting or printed text.</p>
                                <button
                                    onClick={startCamera}
                                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
                                >
                                    START CAMERA
                                </button>
                            </div>
                        ) : (
                            <div className="w-full space-y-6">
                                {/* Captured Gallery */}
                                {capturedImages.length > 0 && (
                                    <div className="flex gap-4 overflow-x-auto pb-4 px-2">
                                        {capturedImages.map((img, idx) => (
                                            <div key={idx} className="relative flex-shrink-0 w-32 h-44 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 group">
                                                <img src={img} className="w-full h-full object-cover" alt="Captured" />
                                                <button
                                                    onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <div
                                            onClick={startCamera}
                                            className="flex-shrink-0 w-32 h-44 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <Plus className="text-slate-400" />
                                            <span className="text-[10px] font-bold uppercase mt-2">Add Page</span>
                                        </div>
                                    </div>
                                )}

                                {/* Processing Button */}
                                {capturedImages.length > 0 && (
                                    <button
                                        onClick={performOCR}
                                        disabled={isProcessing}
                                        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <RefreshCw className="animate-spin" />
                                        ) : (
                                            <CheckCircle2 />
                                        )}
                                        {isProcessing ? 'SCANNING TEXT...' : 'CONVERT HANDWRITING TO TEXT'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Edit / Refine */}
                {step === 'edit' && (
                    <div className="flex-grow flex flex-col p-6 animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black uppercase tracking-tighter text-indigo-600">Computerized Text Output</h3>
                            <button
                                onClick={() => setStep('scan')}
                                className="text-[10px] font-black uppercase opacity-60 hover:opacity-100"
                            >
                                ← Back to Scan
                            </button>
                        </div>

                        <textarea
                            value={ocrText}
                            onChange={(e) => setOcrText(e.target.value)}
                            className="flex-grow w-full p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 ring-indigo-500"
                            placeholder="Your recognized text will appear here..."
                            spellCheck={false}
                        />

                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={generatePdf}
                                disabled={loading}
                                className="flex-grow py-5 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 transition-all"
                            >
                                <Download />
                                {loading ? 'GENERATING PDF...' : 'GENERATE TEXT PDF'}
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Camera Overlay (Internal reused logic) */}
            {isCameraActive && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                    <div className="relative flex-grow">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <button
                            onClick={stopCamera}
                            className="absolute top-6 right-6 p-4 bg-black/50 text-white rounded-full backdrop-blur-md"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="bg-black/90 p-12 flex items-center justify-center">
                        <button
                            onClick={captureImage}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
                        >
                            <div className="w-16 h-16 bg-white rounded-full"></div>
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl opacity-50">
                {[
                    { icon: <Camera />, t: 'Step 1', d: 'Capture clear photos of your notes' },
                    { icon: <Zap />, t: 'Step 2', d: 'Magic OCR converts images to text' },
                    { icon: <FileText />, t: 'Step 3', d: 'Edit and save as clean Typed PDF' }
                ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-center">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">{item.icon}</div>
                        <div>
                            <p className="font-black text-[10px] uppercase">{item.t}</p>
                            <p className="text-xs font-medium">{item.d}</p>
                        </div>
                    </div>
                ))}
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default HandwritingTool;
