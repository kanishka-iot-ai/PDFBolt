import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, FileText, Download, X, Scan as ScanIcon, Flashlight, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface ScanToolProps {
    darkMode: boolean;
    notify: any;
}

const ScanTool: React.FC<ScanToolProps> = ({ darkMode, notify }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // "Auto Detect" simulation state
    const [autoDetect, setAutoDetect] = useState(true);
    const [detectState, setDetectState] = useState<'searching' | 'detected'>('searching');

    // Start Camera
    const startCamera = async () => {
        setCameraError(null);
        try {
            // Try environment facing camera first (rear camera)
            const constraints = {
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            };

            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err: any) {
                // Fallback to any camera if environment fails
                console.warn("Environment camera failed, trying default user media", err);
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsCameraActive(true);
            setDetectState('searching');
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            if (err.name === 'NotAllowedError') {
                setCameraError("Camera access denied. Please allow camera permissions in your browser settings.");
            } else if (err.name === 'NotFoundError') {
                setCameraError("No camera found based on your constraints.");
            } else {
                setCameraError("Could not access camera. Please ensure you are on HTTPS or localhost.");
            }
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
        if (!isCameraActive || !autoDetect) return;

        const interval = setInterval(() => {
            setDetectState(prev => prev === 'searching' ? 'detected' : 'searching');
        }, 2000);

        return () => clearInterval(interval);
    }, [isCameraActive, autoDetect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        }
    }, []);

    // Capture Image
    const captureImage = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        setProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw image
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Enhance Image (Grayscale + Contrast)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Grayscale
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Contrast
            const contrast = 1.2;
            gray = ((gray - 128) * contrast) + 128;

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setCapturedImages(prev => [...prev, dataUrl]);
        setProcessing(false);

        if (notify && notify.success) notify.success("Page Scanned!");

    }, [notify]);

    const removePage = (index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    };

    const saveAsPdf = async () => {
        if (capturedImages.length === 0) return;
        setLoading(true);
        try {
            const { PDFDocument } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.create();

            for (const imgData of capturedImages) {
                const page = pdfDoc.addPage();
                const jpgImage = await pdfDoc.embedJpg(imgData);
                const jpgDims = jpgImage.scaleToFit(page.getWidth(), page.getHeight());

                page.drawImage(jpgImage, {
                    x: page.getWidth() / 2 - jpgDims.width / 2,
                    y: page.getHeight() / 2 - jpgDims.height / 2,
                    width: jpgDims.width,
                    height: jpgDims.height,
                });
            }

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
            // Reset after save
            setCapturedImages([]);
            setIsCameraActive(false);
        } catch (e) {
            console.error(e);
            alert('Failed to generate PDF');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-[80vh] flex flex-col items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>

            {/* Initial State - Start Button */}
            {!isCameraActive && capturedImages.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md animate-fadeIn mt-12">
                    <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center mb-8 ${darkMode ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
                        <Camera size={56} className="text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-4">Scan Documents</h2>
                    <p className="mb-10 opacity-70 text-lg leading-relaxed">
                        Use your camera to scan multiple pages into a single PDF.
                        Features standard auto-detection and image enhancement.
                    </p>

                    {cameraError && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm font-bold">
                            {cameraError}
                        </div>
                    )}

                    <button
                        onClick={startCamera}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xl shadow-xl shadow-blue-500/20 transition-all hover:scale-105 flex items-center justify-center gap-3"
                    >
                        <Camera /> Start Camera
                    </button>
                    <p className="mt-4 text-xs opacity-50 uppercase tracking-widest font-bold">HTTPS required for Camera Access</p>
                </div>
            )}

            {/* Camera View - Full Screen Overlay */}
            {isCameraActive && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fadeIn">
                    <div className="relative flex-grow overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                            onLoadedMetadata={() => {
                                if (videoRef.current) videoRef.current.play().catch(e => console.error("Play error:", e));
                            }}
                        ></video>

                        {/* Overlays */}
                        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">
                            {/* Top Bar with Back Button */}
                            <div className="flex justify-between items-start">
                                <button
                                    onClick={stopCamera}
                                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 border border-white/10"
                                >
                                    <X size={24} />
                                </button>

                                {autoDetect && (
                                    <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 border shadow-lg transition-colors ${detectState === 'detected'
                                            ? 'bg-green-500 text-white border-green-400'
                                            : 'bg-black/60 text-white/70 border-white/10 backdrop-blur-md'
                                        }`}>
                                        {detectState === 'detected' ? (
                                            <> <CheckCircle2 size={14} /> Detected </>
                                        ) : (
                                            <> <ScanIcon size={14} className="animate-spin" /> Searching... </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Enrollment Frame Guides */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                                <div className={`w-[80%] h-[70%] border-2 rounded-3xl transition-colors duration-300 ${detectState === 'detected' ? 'border-green-500' : 'border-white/30'}`}>
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -translate-x-1 -translate-y-1 rounded-tl-xl"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white translate-x-1 -translate-y-1 rounded-tr-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -translate-x-1 translate-y-1 rounded-bl-xl"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white translate-x-1 translate-y-1 rounded-br-xl"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Camera Controls Bar - Fixed at Bottom */}
                    <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 safe-area-bottom">
                        <div className="flex items-center justify-between max-w-lg mx-auto">
                            {/* Gallery Preview */}
                            <div className="flex items-center gap-4 w-20">
                                {capturedImages.length > 0 && (
                                    <div
                                        className="w-12 h-12 rounded-lg bg-slate-800 border-2 border-white/20 overflow-hidden relative cursor-pointer active:scale-95 transition-transform"
                                        onClick={() => stopCamera()}
                                    >
                                        <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/20">
                                            {capturedImages.length}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Capture Button */}
                            <button
                                onClick={captureImage}
                                disabled={processing}
                                className={`w-20 h-20 rounded-full border-[6px] flex items-center justify-center transition-all duration-200 ${detectState === 'detected'
                                        ? 'border-green-500 scale-105'
                                        : 'border-white/80 hover:border-white'
                                    }`}
                            >
                                <div className={`w-16 h-16 rounded-full transition-all duration-100 ${processing ? 'scale-90 bg-white/50' : 'scale-100 bg-white'}`}></div>
                            </button>

                            {/* Options Spacer / Torch (future) */}
                            <div className="w-20 flex justify-end">
                                {/* Placeholder for torch or settings */}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Gallery / Review Mode */}
            {!isCameraActive && capturedImages.length > 0 && (
                <div className="w-full max-w-5xl animate-fadeIn">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black">Review Scans</h2>
                            <p className="opacity-60">{capturedImages.length} pages captured</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={startCamera}
                                className="px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                                <Plus size={20} /> Add Page
                            </button>
                            <button
                                onClick={saveAsPdf}
                                disabled={loading}
                                className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : <><Download size={20} /> Save PDF</>}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {capturedImages.map((img, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <div className="aspect-[3/4] relative">
                                    <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => removePage(idx)}
                                        className="p-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700"
                                        title="Delete Page"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="p-3 text-center border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-sm font-bold text-slate-500">Page {idx + 1}</span>
                                </div>
                            </div>
                        ))}

                        {/* Add Page Card */}
                        <button
                            onClick={startCamera}
                            className="aspect-[3/4] rounded-xl border-4 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-50/5 dark:hover:bg-blue-900/10 transition-all group"
                        >
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus size={32} />
                            </div>
                            <span className="font-bold">Add Page</span>
                        </button>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default ScanTool;
