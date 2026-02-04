
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, FileText, Download, X, Scan as ScanIcon, Flashlight, CheckCircle2 } from 'lucide-react';

interface ScanToolProps {
    darkMode: boolean;
    notify: any;
}

const ScanTool: React.FC<ScanToolProps> = ({ darkMode, notify }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // "Auto Detect" simulation state
    const [autoDetect, setAutoDetect] = useState(true);
    const [detectState, setDetectState] = useState<'searching' | 'detected'>('searching');

    // Start Camera
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsCameraActive(true);
            setDetectState('searching');
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure you have granted permission.");
        }
    };

    // Stop Camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraActive(false);
    };

    // Simulated Auto-Detect Logic
    useEffect(() => {
        if (!isCameraActive || !autoDetect || capturedImage) return;

        // Simulate "searching" vs "detected" state change every few seconds
        const interval = setInterval(() => {
            setDetectState(prev => prev === 'searching' ? 'detected' : 'searching');
        }, 2000);

        return () => clearInterval(interval);
    }, [isCameraActive, autoDetect, capturedImage]);

    // Capture Image
    const captureImage = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        // Flash effect
        setProcessing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw raw image
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply "Document Scan" enhancements (Contrast + Grayscale simulation)
        // We get the data and manipulate it
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Simple filter: High Contrast Grayscale
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Grayscale standard: 0.299R + 0.587G + 0.114B
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Contrast
            const contrast = 1.2; // Increase contrast
            gray = ((gray - 128) * contrast) + 128;

            // Thresholding (Optional, for "Scanner" look) - let's keep it grayscale for quality
            // if (gray > 160) gray = 255;
            // else if (gray < 80) gray = 0;

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        setProcessing(false);
        stopCamera();

        if (notify && notify.success) notify.success("Document Scanned!");

    }, [notify]);

    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const saveAsPdf = async () => {
        if (!capturedImage) return;
        setLoading(true);
        try {
            const { PDFDocument } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();

            const jpgImage = await pdfDoc.embedJpg(capturedImage);
            const jpgDims = jpgImage.scaleToFit(page.getWidth(), page.getHeight());

            page.drawImage(jpgImage, {
                x: page.getWidth() / 2 - jpgDims.width / 2,
                y: page.getHeight() / 2 - jpgDims.height / 2,
                width: jpgDims.width,
                height: jpgDims.height,
            });

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `scanned_document_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (notify && notify.complete) notify.complete();
        } catch (e) {
            console.error(e);
            alert('Failed to generate PDF');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopCamera();
        }
    }, []);

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Header */}
            <div className={`h-16 border-b flex items-center justify-between px-6 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <h1 className="font-black text-xl flex items-center gap-2">
                    <ScanIcon className="text-blue-500" /> Scan to PDF
                </h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {!isCameraActive && !capturedImage && (
                    <div className="text-center max-w-md">
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
                            <Camera size={48} className="text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-black mb-4">Start Scanning</h2>
                        <p className="mb-8 opacity-70">Use your camera to scan documents directly to PDF. We use smart detection to enhance your scans.</p>
                        <button
                            onClick={startCamera}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-105 flex items-center gap-3 mx-auto"
                        >
                            <Camera /> Activate Camera
                        </button>
                    </div>
                )}

                {isCameraActive && (
                    <div className="relative w-full max-w-2xl aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        ></video>

                        {/* Overlay Grid */}
                        <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
                            <div className="flex justify-between">
                                <div className={`w-12 h-12 border-t-4 border-l-4 rounded-tl-xl transition-colors ${detectState === 'detected' ? 'border-green-500' : 'border-white/50'}`}></div>
                                <div className={`w-12 h-12 border-t-4 border-r-4 rounded-tr-xl transition-colors ${detectState === 'detected' ? 'border-green-500' : 'border-white/50'}`}></div>
                            </div>

                            {/* Scan Line Animation */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-gradient-to-b from-transparent via-blue-500 to-transparent animate-pulse"></div>

                            <div className="flex justify-between">
                                <div className={`w-12 h-12 border-b-4 border-l-4 rounded-bl-xl transition-colors ${detectState === 'detected' ? 'border-green-500' : 'border-white/50'}`}></div>
                                <div className={`w-12 h-12 border-b-4 border-r-4 rounded-br-xl transition-colors ${detectState === 'detected' ? 'border-green-500' : 'border-white/50'}`}></div>
                            </div>
                        </div>

                        {/* Detect Status */}
                        {autoDetect && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                {detectState === 'detected' ? (
                                    <> <CheckCircle2 size={14} className="text-green-400" /> Document Detected </>
                                ) : (
                                    <> <ScanIcon size={14} className="animate-spin" /> Searching... </>
                                )}
                            </div>
                        )}

                        {/* Controls */}
                        <div className="absolute bottom-6 left-0 w-full flex items-center justify-center gap-6">
                            <button onClick={stopCamera} className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20">
                                <X size={24} />
                            </button>
                            <button
                                onClick={captureImage}
                                className={`p-6 rounded-full border-4 shadow-xl transition-all ${detectState === 'detected' ? 'bg-white border-green-500 scale-110' : 'bg-white border-transparent'
                                    }`}
                            >
                                <div className="w-4 h-4 rounded-full bg-slate-900"></div>
                            </button>
                            <button
                                className={`p-4 backdrop-blur-md rounded-full text-white ${autoDetect ? 'bg-green-500/80' : 'bg-white/10 hover:bg-white/20'}`}
                                onClick={() => setAutoDetect(!autoDetect)}
                            >
                                <ScanIcon size={24} />
                            </button>
                        </div>
                    </div>
                )}

                {capturedImage && (
                    <div className="w-full max-w-lg">
                        <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-700 mb-8">
                            <img src={capturedImage} alt="Scanned" className="w-full" />
                            <div className="absolute bottom-4 right-4 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow">
                                Enhanced (Grayscale)
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={retake} className="flex-1 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <RefreshCw size={20} /> Retake
                            </button>
                            <button onClick={saveAsPdf} disabled={loading} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2">
                                {loading ? 'Processing...' : <><Download size={20} /> Save PDF</>}
                            </button>
                        </div>
                    </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
};

export default ScanTool;
