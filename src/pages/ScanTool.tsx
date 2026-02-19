import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, FileText, Download, X, Scan as ScanIcon, Flashlight, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface ScanToolProps {
    darkMode: boolean;
    notify: any;
}

const ScanTool: React.FC<ScanToolProps> = ({ darkMode, notify }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // capturedImages stores base64 data URLs
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Overlay Canvas for detection feedback
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isAutoScan, setIsAutoScan] = useState(true);
    const [isLibLoading, setIsLibLoading] = useState(false);
    const scannerRef = useRef<any>(null);
    const requestRef = useRef<number>();

    // Filter State
    const [activeFilter, setActiveFilter] = useState<'none' | 'bw' | 'contrast'>('none');

    // Load OpenCV and jscanify dynamically
    const loadLibraries = useCallback(async () => {
        if ((window as any).cv && scannerRef.current) return;
        setIsLibLoading(true);

        return new Promise<void>((resolve) => {
            const scriptCv = document.createElement('script');
            scriptCv.src = '/lib/opencv.js';
            scriptCv.async = true;
            scriptCv.onload = () => {
                const scriptJscanify = document.createElement('script');
                scriptJscanify.src = '/lib/jscanify.min.js';
                scriptJscanify.onload = () => {
                    // @ts-ignore
                    scannerRef.current = new jscanify();
                    setIsLibLoading(false);
                    resolve();
                };
                document.body.appendChild(scriptJscanify);
            };
            document.body.appendChild(scriptCv);
        });
    }, []);

    // Detection Loop
    const detectionLoop = useCallback(() => {
        if (!videoRef.current || !overlayCanvasRef.current || !scannerRef.current || !isAutoScan) {
            requestRef.current = requestAnimationFrame(detectionLoop);
            return;
        }

        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            try {
                const contour = scannerRef.current.findPaperContour(video);
                if (contour) {
                    const cornerPoints = scannerRef.current.getCornerPoints(contour);
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(cornerPoints.topLeft.x, cornerPoints.topLeft.y);
                    ctx.lineTo(cornerPoints.topRight.x, cornerPoints.topRight.y);
                    ctx.lineTo(cornerPoints.bottomRight.x, cornerPoints.bottomRight.y);
                    ctx.lineTo(cornerPoints.bottomLeft.x, cornerPoints.bottomLeft.y);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
                    ctx.fill();
                }
            } catch (e) { }
        }

        requestRef.current = requestAnimationFrame(detectionLoop);
    }, [isAutoScan]);

    useEffect(() => {
        if (isCameraActive) {
            loadLibraries().then(() => {
                requestRef.current = requestAnimationFrame(detectionLoop);
            });
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isCameraActive, loadLibraries, detectionLoop]);

    // Start Camera
    const startCamera = async () => {
        setCameraError(null);
        setIsCameraActive(true);
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch (err: any) {
                console.error("Error accessing camera:", err);
                setIsCameraActive(false);
                setCameraError("Camera access error. Ensure you are on HTTPS.");
            }
        }, 100);
    };

    // Stop Camera
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    // Capture Image
    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        setProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        if (scannerRef.current && isAutoScan) {
            try {
                const resultCanvas = scannerRef.current.extractPaper(video, 1200, 1600);
                const imageData = resultCanvas.toDataURL("image/jpeg", 0.9);
                setCapturedImages(prev => [...prev, imageData]);
                setProcessing(false);
                if (notify && notify.success) notify.success("Document Scanned!");
                return;
            } catch (e) {
                console.warn("Auto-extract failed", e);
            }
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (activeFilter !== 'none') {
            if (activeFilter === 'bw') ctx.filter = 'grayscale(100%)';
            if (activeFilter === 'contrast') ctx.filter = 'contrast(150%) grayscale(100%)';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        }

        const imageData = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImages(prev => [...prev, imageData]);
        setProcessing(false);
        if (notify && notify.success) notify.success("Captured!");
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        }
    }, []);

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
                        Features AI document detection and auto-cropping for perfect scans every time.
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
                        <Camera /> Start AI Scanner
                    </button>
                    <p className="mt-4 text-xs opacity-50 uppercase tracking-widest font-bold">HTTPS required for Camera Access</p>
                </div>
            )}

            {/* Camera View - Full Screen Overlay with Clean CSS */}
            {isCameraActive && (
                <div className="fixed inset-0 z-[100] bg-black">
                    <div className="relative w-full h-full flex flex-col">
                        {/* Video Container - Production Level CSS */}
                        <div className="relative flex-grow w-full bg-black overflow-hidden flex items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ transform: 'scaleX(1)' }}
                            ></video>

                            {/* Detection Overlay */}
                            <canvas
                                ref={overlayCanvasRef}
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                            />

                            {/* Overlay UI */}
                            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-20">
                                <div className="flex justify-between pt-2">
                                    <div className="pointer-events-auto flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                                        <ScanIcon size={18} className={isLibLoading ? 'animate-pulse text-yellow-500' : 'text-blue-500'} />
                                        <span className="text-white text-xs font-black uppercase tracking-widest">
                                            {isLibLoading ? 'Loading AI...' : isAutoScan ? 'AI Detection On' : 'Manual Mode'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={stopCamera}
                                        className="pointer-events-auto p-3 bg-black/50 text-white rounded-full backdrop-blur-md"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {isAutoScan && !isLibLoading && (
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="text-white bg-blue-600/80 px-4 py-2 rounded-xl text-xs font-bold animate-pulse backdrop-blur-sm">
                                            Align document in frame
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Controls - Fixed Bottom */}
                        <div className="bg-black/95 p-6 pb-12 z-30 border-t border-white/10">
                            <div className="flex justify-between items-center max-w-md mx-auto">
                                {/* Auto Scan Toggle */}
                                <button
                                    onClick={() => setIsAutoScan(!isAutoScan)}
                                    className={`p-3 flex flex-col items-center gap-1 transition-colors ${isAutoScan ? 'text-blue-500' : 'text-white/50'}`}
                                >
                                    <ScanIcon size={24} />
                                    <span className="text-[10px] uppercase font-black">Auto</span>
                                </button>

                                {/* Capture Button */}
                                <button
                                    onClick={captureImage}
                                    disabled={processing || isLibLoading}
                                    className="group relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all duration-200"
                                >
                                    <div className={`w-16 h-16 bg-white rounded-full transition-all duration-200 ${processing ? 'scale-75 opacity-50' : 'group-hover:scale-95'}`}></div>
                                    {processing && (
                                        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                </button>

                                {/* Gallery / Done */}
                                <div className="text-white flex flex-col items-center gap-1 cursor-pointer group" onClick={stopCamera}>
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <span className="text-xl font-black">{capturedImages.length}</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-black text-white/50">Done</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Mode */}
            {!isCameraActive && capturedImages.length > 0 && (
                <div className="w-full max-w-5xl animate-fadeIn p-6">
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {capturedImages.map((img, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700">
                                <img src={img} alt={`Page ${idx}`} className="w-full h-auto" />
                                <button
                                    onClick={() => removePage(idx)}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-center text-xs py-1">
                                    Page {idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default ScanTool;
