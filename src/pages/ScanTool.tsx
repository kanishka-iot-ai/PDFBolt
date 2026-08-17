import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, FileText, Download, X, Scan as ScanIcon, Flashlight, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Zap, ZapOff } from 'lucide-react';
import { soundEngine } from '../utils/sounds';
import { useActiveWork } from '../context/ActiveWorkContext';

interface ScanToolProps {
    darkMode: boolean;
    notify: any;
}

const ScanTool: React.FC<ScanToolProps> = ({ darkMode, notify }) => {
    const { setHasActiveWork } = useActiveWork();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Sync active work state
    useEffect(() => {
        setHasActiveWork(isCameraActive || capturedImages.length > 0);
        return () => setHasActiveWork(false);
    }, [isCameraActive, capturedImages.length, setHasActiveWork]);

    // Overlay Canvas for detection feedback
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isAutoScan, setIsAutoScan] = useState(true);
    const [isLibLoading, setIsLibLoading] = useState(false);
    const scannerRef = useRef<any>(null);
    const requestRef = useRef<number>();

    // OKEN Scanner Features
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isSteady, setIsSteady] = useState(false);
    const steadyCountRef = useRef(0);
    const lastCornersRef = useRef<any>(null);
    const [isAutoCapturing, setIsAutoCapturing] = useState(false);
    const laserPosRef = useRef(0);
    const videoTrackRef = useRef<MediaStreamTrack | null>(null);

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

    // Detection Loop - Professional Area Detection Logic
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

            // 1. Premium Laser Scan Animation
            laserPosRef.current = (laserPosRef.current + 8) % canvas.height;
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
            ctx.lineWidth = 3;
            ctx.setLineDash([15, 5]);
            ctx.beginPath();
            ctx.moveTo(0, laserPosRef.current);
            ctx.lineTo(canvas.width, laserPosRef.current);
            ctx.stroke();
            ctx.setLineDash([]); // Reset

            try {
                // 2. Core Detection using jscanify (OpenCV powered)
                // This finds the document area exactly like professional apps
                const contour = scannerRef.current.findPaperContour(video);

                if (contour) {
                    const corners = scannerRef.current.getCornerPoints(contour);

                    // 3. Area Stability & Snapping Logic
                    if (lastCornersRef.current) {
                        const dist = Math.abs(corners.topLeft.x - lastCornersRef.current.topLeft.x) +
                            Math.abs(corners.topLeft.y - lastCornersRef.current.topLeft.y);

                        if (dist < 8) { // OKEN-level precision tolerance
                            steadyCountRef.current++;
                        } else {
                            steadyCountRef.current = 0;
                            setIsSteady(false);
                        }

                        if (steadyCountRef.current > 25) {
                            setIsSteady(true);
                        }
                    }
                    lastCornersRef.current = corners;

                    // 4. Draw the GORGEOUS BORDER (Professional Feedback)
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = steadyCountRef.current > 25 ? '#22c55e' : '#3b82f6';
                    ctx.strokeStyle = steadyCountRef.current > 25 ? '#22c55e' : '#3b82f6';
                    ctx.lineWidth = 12;
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
                    ctx.lineTo(corners.topRight.x, corners.topRight.y);
                    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
                    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.shadowBlur = 0; // Reset

                    // 5. Fill with semi-transparent premium overlay
                    ctx.fillStyle = steadyCountRef.current > 25 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.2)';
                    ctx.fill();

                    // 6. Pulse effect on corners for target locking
                    const pulseSize = Math.sin(Date.now() / 200) * 5 + 15;
                    ctx.fillStyle = steadyCountRef.current > 25 ? '#22c55e' : '#3b82f6';
                    [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft].forEach(p => {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 4;
                        ctx.stroke();
                    });

                    // 7. Auto capture trigger when steady
                    if (steadyCountRef.current === 50 && !isAutoCapturing) {
                        setIsAutoCapturing(true);
                        setTimeout(() => {
                            captureImage();
                            setIsAutoCapturing(false);
                            steadyCountRef.current = 0;
                        }, 100);
                    }
                } else {
                    steadyCountRef.current = 0;
                    setIsSteady(false);
                }
            } catch (e) { }
        }

        requestRef.current = requestAnimationFrame(detectionLoop);
    }, [isAutoScan, isAutoCapturing]);

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
                    const tracks = stream.getVideoTracks();
                    if (tracks.length > 0) {
                        videoTrackRef.current = tracks[0];
                    }
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
            videoTrackRef.current = null;
        }
        setIsCameraActive(false);
        setIsSteady(false);
        steadyCountRef.current = 0;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const toggleTorch = async () => {
        if (videoTrackRef.current) {
            try {
                const capabilities = videoTrackRef.current.getCapabilities() as any;
                if (capabilities && capabilities.torch) {
                    await videoTrackRef.current.applyConstraints({
                        // @ts-ignore
                        advanced: [{ torch: !isTorchOn }]
                    });
                    setIsTorchOn(!isTorchOn);
                } else {
                    notify.error("Flashlight not supported on this device");
                }
            } catch (e) {
                console.error("Torch error", e);
            }
        }
    };

    const applyFilter = (sourceCanvas: HTMLCanvasElement): string => {
        if (activeFilter === 'none') return sourceCanvas.toDataURL("image/jpeg", 0.95);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceCanvas.width;
        tempCanvas.height = sourceCanvas.height;
        const tctx = tempCanvas.getContext('2d');
        if (tctx) {
            if (activeFilter === 'bw') tctx.filter = 'grayscale(100%)';
            if (activeFilter === 'contrast') tctx.filter = 'contrast(150%) grayscale(100%)';
            tctx.drawImage(sourceCanvas, 0, 0);
            tctx.filter = 'none';
        }
        return tempCanvas.toDataURL("image/jpeg", 0.95);
    };

    // Capture Image with Perspective Correction
    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        setProcessing(true);
        soundEngine.playShutter();

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        if (scannerRef.current && isAutoScan) {
            try {
                // Professional Perspective Warp (Extracts perfectly rectangular document)
                const resultCanvas = scannerRef.current.extractPaper(video, 1200, 1600);
                const imageData = applyFilter(resultCanvas);
                setCapturedImages(prev => [...prev, imageData]);
                setProcessing(false);
                if (notify && notify.success) notify.success("Document area detected and cropped!");
                return;
            } catch (e) {
                console.warn("Auto-extract failed", e);
            }
        }

        // Fallback to manual capture
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = applyFilter(canvas);
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
            link.download = `pdfbolt_scan_${Date.now()}.pdf`;
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
                    <h2 className="text-3xl font-black mb-4 tracking-tight">Professional AI Scanner</h2>
                    <p className="mb-10 opacity-70 text-lg leading-relaxed">
                        Features <span className="text-blue-500 font-bold">Auto Area Detection</span> and <span className="text-green-500 font-bold">Smart Perspective Correction</span> just like OKEN Scanner.
                    </p>

                    {cameraError && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm font-bold">
                            {cameraError}
                        </div>
                    )}

                    <button
                        onClick={startCamera}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.03] flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Camera /> Start Detection
                    </button>
                    <p className="mt-4 text-[10px] opacity-50 uppercase tracking-[0.2em] font-black">Powered by OpenCV.js</p>
                </div>
            )}

            {/* Camera View - Professional Interface */}
            {isCameraActive && (
                <div className="fixed inset-0 z-[100] bg-black">
                    <div className="relative w-full h-full flex flex-col">
                        {/* Video Layer */}
                        <div className="relative flex-grow w-full bg-black overflow-hidden flex items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                            ></video>

                            {/* Detection Overlay Layer */}
                            <canvas
                                ref={overlayCanvasRef}
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                            />

                            {/* HUD UI Layer */}
                            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-20">
                                <div className="flex justify-between pt-2">
                                    <div className="pointer-events-auto flex items-center gap-2 bg-black/60 px-5 py-2.5 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl">
                                        <div className={`w-2.5 h-2.5 rounded-full ${isSteady ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                                        <span className="text-white text-[10px] font-black uppercase tracking-[0.15em]">
                                            {isLibLoading ? 'Initializing AI...' : isSteady ? 'Steady... Area Locked' : isAutoScan ? 'Detecting Area' : 'Manual'}
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={toggleTorch}
                                            aria-label={isTorchOn ? "Turn off camera flash" : "Turn on camera flash"}
                                            className="pointer-events-auto p-3.5 bg-black/60 text-white rounded-full backdrop-blur-xl border border-white/10 active:scale-90"
                                        >
                                            {isTorchOn ? <Zap className="text-yellow-400 fill-current" size={24} /> : <ZapOff size={24} />}
                                        </button>
                                        <button
                                            onClick={stopCamera}
                                            aria-label="Close camera scanner"
                                            className="pointer-events-auto p-3.5 bg-black/60 text-white rounded-full backdrop-blur-xl border border-white/10 active:scale-90"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                {/* Status Messages */}
                                <div className="flex flex-col items-center mb-8 gap-4">
                                    {isAutoScan && !isLibLoading && !isSteady && (
                                        <div className="text-white bg-blue-600/90 px-5 py-2.5 rounded-2xl text-[11px] font-black animate-pulse backdrop-blur-md border border-white/20 uppercase tracking-widest shadow-2xl">
                                            Place document in frame
                                        </div>
                                    )}

                                    {isSteady && (
                                        <div className="text-white bg-green-600/90 px-8 py-3 rounded-2xl text-sm font-black animate-bounce backdrop-blur-md border-2 border-white/30 shadow-2xl shadow-green-500/20 uppercase tracking-widest">
                                            Area Locked • Capturing
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Professional Control Bar */}
                        <div className="bg-black/95 p-8 pb-12 z-30 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                            <div className="flex justify-between items-center max-w-lg mx-auto">
                                {/* Auto Scan Mode Toggle */}
                                <button
                                    onClick={() => setIsAutoScan(!isAutoScan)}
                                    className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${isAutoScan ? 'text-blue-500' : 'text-white/40'}`}
                                >
                                    <div className={`p-3 rounded-2xl border-2 ${isAutoScan ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10'}`}>
                                        <ScanIcon size={24} />
                                    </div>
                                    <span className="text-[9px] uppercase font-black tracking-widest">AI Area</span>
                                </button>

                                {/* Shutter Button */}
                                <button
                                    onClick={captureImage}
                                    disabled={processing || isLibLoading}
                                    className={`group relative w-24 h-24 rounded-full border-4 flex items-center justify-center active:scale-90 transition-all duration-300 ${isSteady ? 'border-green-500 scale-110 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
                                >
                                    <div className={`w-20 h-20 rounded-full transition-all duration-300 ${processing ? 'scale-75 opacity-50' : 'group-hover:scale-95'} ${isSteady ? 'bg-green-500' : 'bg-white'}`}></div>
                                    {processing && (
                                        <div className="absolute inset-0 border-[6px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                </button>

                                {/* Page Gallery / Export */}
                                <button onClick={stopCamera} className="flex flex-col items-center gap-1.5 group active:scale-90">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
                                        <span className="text-2xl font-black text-white">{capturedImages.length}</span>
                                    </div>
                                    <span className="text-[9px] uppercase font-black tracking-widest text-white/40 group-hover:text-white transition-colors">Done</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Post-Scan Review */}
            {!isCameraActive && capturedImages.length > 0 && (
                <div className="w-full max-w-6xl animate-fadeIn p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl">
                        <div>
                            <h2 className="text-4xl font-black tracking-tight mb-2">Scan Result</h2>
                            <p className="opacity-50 font-bold uppercase tracking-widest text-xs">
                                {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'} • AI Optimized • Ready for PDF
                            </p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button
                                onClick={startCamera}
                                className="flex-1 px-8 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-black hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                            >
                                <Plus size={18} /> Add More
                            </button>
                            <button
                                onClick={saveAsPdf}
                                disabled={loading}
                                className="flex-1 px-10 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                            >
                                {loading ? 'Processing...' : <><Download size={18} /> Save PDF Document</>}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {capturedImages.map((img, idx) => (
                            <div key={idx} className="relative group rounded-3xl overflow-hidden shadow-2xl border-[6px] border-white dark:border-slate-800 transform hover:scale-[1.05] transition-all duration-300">
                                <img src={img} alt={`Scanned Page ${idx + 1}`} className="w-full h-auto" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                    <button
                                        onClick={() => removePage(idx)}
                                        className="w-full py-3 bg-red-600/90 hover:bg-red-700 text-white rounded-xl font-bold text-xs backdrop-blur-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={14} /> Remove Page
                                    </button>
                                </div>
                                <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                                    P{idx + 1}
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
