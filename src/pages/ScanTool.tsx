import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Camera, RefreshCw, FileText, Download, X, Scan as ScanIcon, Flashlight,
    CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Zap, ZapOff,
    Grid, Settings, Sliders, Image as ImageIcon, FileUp, RotateCw, Copy, Check,
    Sparkles, ArrowLeft, ZoomIn, Eye, Layers, Move
} from 'lucide-react';
import { soundEngine } from '../utils/sounds';
import { useActiveWork } from '../context/ActiveWorkContext';
import { loadOpenCV } from '../services/openCVLoader';
import {
    DocumentCorners, Point, detectDocumentOpenCV, smoothCorners, getCornerDelta,
    extractDocumentPerspective, applyScanFilter, ScanFilterType
} from '../services/documentDetector';

interface ScanToolProps {
    darkMode: boolean;
    notify: any;
}

type ScanMode = 'book' | 'text' | 'docs' | 'idcard' | 'qrcode';

interface ScannedPage {
    id: string;
    originalImage: string;
    processedImage: string;
    corners: DocumentCorners;
    filter: ScanFilterType;
    rotation: number;
    extractedText?: string;
}

const ScanTool: React.FC<ScanToolProps> = ({ darkMode, notify }) => {
    const { setHasActiveWork } = useActiveWork();

    // Camera & Canvas references
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const processingCanvasRef = useRef<HTMLCanvasElement>(null);
    const videoTrackRef = useRef<MediaStreamTrack | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Camera & UI State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [showGrid, setShowGrid] = useState(false);
    const [isAutoScan, setIsAutoScan] = useState(true);
    const [currentMode, setCurrentMode] = useState<ScanMode>('docs');
    const [activeFilter, setActiveFilter] = useState<ScanFilterType>('magic');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    // Detection & Stability State
    const [isDocDetected, setIsDocDetected] = useState(false);
    const [isSteady, setIsSteady] = useState(false);
    const [steadyProgress, setSteadyProgress] = useState(0);
    const [isAutoCapturing, setIsAutoCapturing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>("Failed to find the doc. Try to scan manually");
    const [capturedFlash, setCapturedFlash] = useState(false);

    // Detection Tracking Refs
    const smoothedCornersRef = useRef<DocumentCorners | null>(null);
    const lastRawCornersRef = useRef<DocumentCorners | null>(null);
    const steadyFramesRef = useRef(0);
    const isCapturingRef = useRef(false);

    // Scanned Pages State
    const [pages, setPages] = useState<ScannedPage[]>([]);
    const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

    // Interactive Crop / Corner Tuning Modal
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [manualCorners, setManualCorners] = useState<DocumentCorners | null>(null);
    const [activeDragCorner, setActiveDragCorner] = useState<keyof DocumentCorners | null>(null);
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const [cropCanvasScale, setCropCanvasScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });

    // Settings Modal
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [autoCaptureDelay, setAutoCaptureDelay] = useState(20); // ~0.7s steady

    // Text OCR extraction
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [ocrTextResult, setOcrTextResult] = useState<string | null>(null);
    const [copiedText, setCopiedText] = useState(false);

    // Sync active work state
    useEffect(() => {
        setHasActiveWork(isCameraActive || pages.length > 0);
        return () => setHasActiveWork(false);
    }, [isCameraActive, pages.length, setHasActiveWork]);

    // Load OpenCV on mount or when camera opens
    useEffect(() => {
        loadOpenCV().catch(err => console.warn('[PDFBolt] OpenCV lazy-load warning:', err));
    }, []);

    // File input references for Import and Import Files
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // -------------------------------------------------------------
    // Real-Time Detection Loop
    // -------------------------------------------------------------
    const runDetection = useCallback(() => {
        if (!videoRef.current || !overlayCanvasRef.current || !isCameraActive) {
            animFrameRef.current = requestAnimationFrame(runDetection);
            return;
        }

        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.readyState < 2 || video.videoWidth === 0) {
            animFrameRef.current = requestAnimationFrame(runDetection);
            return;
        }

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        // Draw 3x3 Grid if enabled
        if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Verticals
            ctx.moveTo(width / 3, 0); ctx.lineTo(width / 3, height);
            ctx.moveTo((width * 2) / 3, 0); ctx.lineTo((width * 2) / 3, height);
            // Horizontals
            ctx.moveTo(0, height / 3); ctx.lineTo(width, height / 3);
            ctx.moveTo(0, (height * 2) / 3); ctx.lineTo(width, (height * 2) / 3);
            ctx.stroke();
        }

        // Draw ID Card Guide Overlay if in ID card mode
        if (currentMode === 'idcard') {
            const cardW = width * 0.75;
            const cardH = cardW * 0.63; // Standard credit / ID card aspect ratio
            const cardX = (width - cardW) / 2;
            const cardY = (height - cardH) / 2;

            ctx.strokeStyle = 'rgba(0, 230, 118, 0.85)';
            ctx.lineWidth = 4;
            ctx.setLineDash([16, 8]);
            ctx.strokeRect(cardX, cardY, cardW, cardH);
            ctx.setLineDash([]);

            ctx.fillStyle = 'rgba(0, 230, 118, 0.12)';
            ctx.fillRect(cardX, cardY, cardW, cardH);

            setStatusMessage("Align ID Card within the guide frame");
            animFrameRef.current = requestAnimationFrame(runDetection);
            return;
        }

        // Run Document Detection if AutoScan is active
        if (isAutoScan) {
            const result = detectDocumentOpenCV(video, width, height);

            if (result.found && result.corners) {
                // Smooth corners across frames for stable, fluid rendering
                const smoothed = smoothCorners(result.corners, smoothedCornersRef.current, 0.35);
                smoothedCornersRef.current = smoothed;

                // Check stability / delta
                const delta = getCornerDelta(result.corners, lastRawCornersRef.current);
                lastRawCornersRef.current = result.corners;

                if (delta < 12) {
                    steadyFramesRef.current = Math.min(autoCaptureDelay, steadyFramesRef.current + 1);
                } else {
                    steadyFramesRef.current = Math.max(0, steadyFramesRef.current - 2);
                }

                const steadyRatio = steadyFramesRef.current / autoCaptureDelay;
                setSteadyProgress(steadyRatio);

                const isLocked = steadyFramesRef.current >= autoCaptureDelay;
                setIsSteady(isLocked);
                setIsDocDetected(true);

                if (isLocked) {
                    setStatusMessage("Document Locked • Capturing");
                } else {
                    setStatusMessage("Document detected • Hold steady");
                }

                // Render Neon Green Quad & Translucent Emerald Fill
                const { topLeft, topRight, bottomRight, bottomLeft } = smoothed;

                // 1. Semi-transparent green interior fill
                ctx.fillStyle = isLocked ? 'rgba(0, 230, 118, 0.28)' : 'rgba(0, 230, 118, 0.18)';
                ctx.beginPath();
                ctx.moveTo(topLeft.x, topLeft.y);
                ctx.lineTo(topRight.x, topRight.y);
                ctx.lineTo(bottomRight.x, bottomRight.y);
                ctx.lineTo(bottomLeft.x, bottomLeft.y);
                ctx.closePath();
                ctx.fill();

                // 2. Neon Green Contour Stroke with Glow
                ctx.shadowColor = isLocked ? 'rgba(0, 230, 118, 0.9)' : 'rgba(0, 230, 118, 0.6)';
                ctx.shadowBlur = isLocked ? 18 : 10;
                ctx.strokeStyle = '#00e676'; // Vivid emerald neon green
                ctx.lineWidth = isLocked ? 5 : 3.5;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(topLeft.x, topLeft.y);
                ctx.lineTo(topRight.x, topRight.y);
                ctx.lineTo(bottomRight.x, bottomRight.y);
                ctx.lineTo(bottomLeft.x, bottomLeft.y);
                ctx.closePath();
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow

                // 3. Four Sleek Corner Anchors
                const cornerPoints = [topLeft, topRight, bottomRight, bottomLeft];
                cornerPoints.forEach(pt => {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, isLocked ? 10 : 8, 0, Math.PI * 2);
                    ctx.fillStyle = '#00e676';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                });

                // 4. Trigger Auto-Capture if Locked
                if (isLocked && !isCapturingRef.current && !isAutoCapturing) {
                    isCapturingRef.current = true;
                    setIsAutoCapturing(true);
                    setTimeout(() => {
                        handleCapture();
                        setTimeout(() => {
                            isCapturingRef.current = false;
                            setIsAutoCapturing(false);
                            steadyFramesRef.current = 0;
                        }, 500);
                    }, 150);
                }
            } else {
                // No valid document quad found
                smoothedCornersRef.current = null;
                steadyFramesRef.current = 0;
                setSteadyProgress(0);
                setIsSteady(false);
                setIsDocDetected(false);
                setStatusMessage("Failed to find the doc. Try to scan manually");
            }
        } else {
            // Manual Mode
            smoothedCornersRef.current = null;
            setIsDocDetected(false);
            setIsSteady(false);
            setSteadyProgress(0);
            setStatusMessage("Manual Mode: Tap shutter to scan");
        }

        animFrameRef.current = requestAnimationFrame(runDetection);
    }, [isCameraActive, isAutoScan, showGrid, currentMode, autoCaptureDelay, isAutoCapturing]);

    // Start/Stop detection animation loop with camera
    useEffect(() => {
        if (isCameraActive) {
            animFrameRef.current = requestAnimationFrame(runDetection);
        }
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isCameraActive, runDetection]);

    // -------------------------------------------------------------
    // Camera Lifecycle
    // -------------------------------------------------------------
    const startCamera = async () => {
        setCameraError(null);
        setIsCameraActive(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
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
            console.error("Camera access error:", err);
            setIsCameraActive(false);
            setCameraError("Camera access was denied or is unavailable. Please check your camera permissions.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            videoTrackRef.current = null;
        }
        setIsCameraActive(false);
        setIsSteady(false);
        setIsTorchOn(false);
        steadyFramesRef.current = 0;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

    const toggleTorch = async () => {
        if (videoTrackRef.current) {
            try {
                const capabilities = videoTrackRef.current.getCapabilities() as any;
                if (capabilities && capabilities.torch) {
                    await videoTrackRef.current.applyConstraints({
                        // @ts-ignore
                        advanced: [{ torch: !isTorchOn }],
                    });
                    setIsTorchOn(!isTorchOn);
                } else {
                    if (notify && notify.error) notify.error("Flashlight is not supported on this device/browser");
                }
            } catch (e) {
                console.error("Torch error:", e);
            }
        }
    };

    // -------------------------------------------------------------
    // Capture & Image Processing Engine
    // -------------------------------------------------------------
    const handleCapture = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        setIsProcessing(true);
        if (soundEnabled) soundEngine.playShutter();

        // Shutter flash effect
        setCapturedFlash(true);
        setTimeout(() => setCapturedFlash(false), 200);

        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = video.videoWidth;
        fullCanvas.height = video.videoHeight;
        const fctx = fullCanvas.getContext('2d');
        if (!fctx) {
            setIsProcessing(false);
            return;
        }

        fctx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
        const originalDataUrl = fullCanvas.toDataURL('image/jpeg', 0.95);

        // Determine corners to use: either detected quad or full frame bounding box
        let corners: DocumentCorners;
        if (smoothedCornersRef.current && isDocDetected) {
            corners = smoothedCornersRef.current;
        } else {
            // Default 4-corner full rectangle with 4% border inset
            const insetX = fullCanvas.width * 0.04;
            const insetY = fullCanvas.height * 0.04;
            corners = {
                topLeft: { x: insetX, y: insetY },
                topRight: { x: fullCanvas.width - insetX, y: insetY },
                bottomRight: { x: fullCanvas.width - insetX, y: fullCanvas.height - insetY },
                bottomLeft: { x: insetX, y: fullCanvas.height - insetY },
            };
        }

        // Perspective Warp & Flatten
        const warpedCanvas = extractDocumentPerspective(fullCanvas, corners, 1440, 1920);
        const filteredCanvas = applyScanFilter(warpedCanvas, activeFilter);
        const processedDataUrl = filteredCanvas.toDataURL('image/jpeg', 0.92);

        const newPage: ScannedPage = {
            id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            originalImage: originalDataUrl,
            processedImage: processedDataUrl,
            corners,
            filter: activeFilter,
            rotation: 0,
        };

        setPages(prev => {
            const next = [...prev, newPage];
            setSelectedPageIndex(next.length - 1);
            return next;
        });

        setIsProcessing(false);

        if (currentMode === 'text') {
            performOcrOnImage(processedDataUrl);
        }

        if (notify && notify.success) {
            notify.success(isDocDetected ? "Document auto-detected & perspective cropped!" : "Page captured!");
        }
    };

    // -------------------------------------------------------------
    // Gallery & File System Import
    // -------------------------------------------------------------
    const handleImportImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                if (!dataUrl) return;

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0);

                    // Try auto-detecting document on the imported photo
                    const result = detectDocumentOpenCV(canvas, img.width, img.height);
                    let corners: DocumentCorners;
                    if (result.found && result.corners) {
                        corners = result.corners;
                    } else {
                        const insetX = img.width * 0.03;
                        const insetY = img.height * 0.03;
                        corners = {
                            topLeft: { x: insetX, y: insetY },
                            topRight: { x: img.width - insetX, y: insetY },
                            bottomRight: { x: img.width - insetX, y: img.height - insetY },
                            bottomLeft: { x: insetX, y: img.height - insetY },
                        };
                    }

                    const warpedCanvas = extractDocumentPerspective(canvas, corners, 1440, 1920);
                    const filteredCanvas = applyScanFilter(warpedCanvas, activeFilter);
                    const processedDataUrl = filteredCanvas.toDataURL('image/jpeg', 0.92);

                    const newPage: ScannedPage = {
                        id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        originalImage: dataUrl,
                        processedImage: processedDataUrl,
                        corners,
                        filter: activeFilter,
                        rotation: 0,
                    };

                    setPages(prev => [...prev, newPage]);
                    if (notify && notify.success) notify.success(`Imported: ${file.name}`);
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });

        // Reset file input
        if (e.target) e.target.value = '';
    };

    // -------------------------------------------------------------
    // OCR Text Recognition (For 'To Text' mode)
    // -------------------------------------------------------------
    const performOcrOnImage = async (dataUrl: string) => {
        setIsOcrProcessing(true);
        setOcrTextResult(null);
        try {
            // @ts-ignore
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng');
            const ret = await worker.recognize(dataUrl);
            setOcrTextResult(ret.data.text || "No text detected on document.");
            await worker.terminate();
        } catch (e) {
            console.warn("OCR recognition error:", e);
            setOcrTextResult("OCR module initialization error. You can still export as PDF.");
        } finally {
            setIsOcrProcessing(false);
        }
    };

    // -------------------------------------------------------------
    // Interactive 4-Corner Manual Crop Editor
    // -------------------------------------------------------------
    const openCornerEditor = (page: ScannedPage) => {
        setEditingPageId(page.id);
        setManualCorners({ ...page.corners });
        setCropModalOpen(true);
    };

    const drawCropCanvas = useCallback(() => {
        if (!cropCanvasRef.current || !editingPageId || !manualCorners) return;
        const targetPage = pages.find(p => p.id === editingPageId);
        if (!targetPage) return;

        const canvas = cropCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            const containerWidth = canvas.parentElement?.clientWidth || 600;
            const containerHeight = Math.min(window.innerHeight * 0.6, 500);

            const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;

            canvas.width = drawW;
            canvas.height = drawH;

            setCropCanvasScale({
                scaleX: scale,
                scaleY: scale,
                offsetX: 0,
                offsetY: 0,
            });

            ctx.drawImage(img, 0, 0, drawW, drawH);

            // Scaled corner points
            const cTL = { x: manualCorners.topLeft.x * scale, y: manualCorners.topLeft.y * scale };
            const cTR = { x: manualCorners.topRight.x * scale, y: manualCorners.topRight.y * scale };
            const cBR = { x: manualCorners.bottomRight.x * scale, y: manualCorners.bottomRight.y * scale };
            const cBL = { x: manualCorners.bottomLeft.x * scale, y: manualCorners.bottomLeft.y * scale };

            // Draw Dim Mask outside quad
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(0, 0, drawW, drawH);

            // Cutout & highlight quad
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cTL.x, cTL.y);
            ctx.lineTo(cTR.x, cTR.y);
            ctx.lineTo(cBR.x, cBR.y);
            ctx.lineTo(cBL.x, cBL.y);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, drawW, drawH);
            ctx.fillStyle = 'rgba(0, 230, 118, 0.15)';
            ctx.fill();
            ctx.restore();

            // Neon Green Quad Border
            ctx.strokeStyle = '#00e676';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cTL.x, cTL.y);
            ctx.lineTo(cTR.x, cTR.y);
            ctx.lineTo(cBR.x, cBR.y);
            ctx.lineTo(cBL.x, cBL.y);
            ctx.closePath();
            ctx.stroke();

            // Corner Handles
            const cornersList: { name: keyof DocumentCorners; pt: Point }[] = [
                { name: 'topLeft', pt: cTL },
                { name: 'topRight', pt: cTR },
                { name: 'bottomRight', pt: cBR },
                { name: 'bottomLeft', pt: cBL },
            ];

            cornersList.forEach(({ name, pt }) => {
                const isActive = activeDragCorner === name;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, isActive ? 14 : 10, 0, Math.PI * 2);
                ctx.fillStyle = isActive ? '#ffeb3b' : '#00e676';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();
            });
        };
        img.src = targetPage.originalImage;
    }, [editingPageId, manualCorners, activeDragCorner, pages]);

    useEffect(() => {
        if (cropModalOpen) {
            drawCropCanvas();
        }
    }, [cropModalOpen, drawCropCanvas]);

    // Handle touch/mouse dragging on crop canvas
    const handleCropPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!cropCanvasRef.current || !manualCorners) return;
        const rect = cropCanvasRef.current.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        const scale = cropCanvasScale.scaleX;
        const cornersList: (keyof DocumentCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

        let closestCorner: keyof DocumentCorners | null = null;
        let minDist = 40; // 40px touch grab radius

        cornersList.forEach(k => {
            const pt = manualCorners[k];
            const dist = Math.hypot(pt.x * scale - touchX, pt.y * scale - touchY);
            if (dist < minDist) {
                minDist = dist;
                closestCorner = k;
            }
        });

        if (closestCorner) {
            setActiveDragCorner(closestCorner);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    };

    const handleCropPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!activeDragCorner || !manualCorners || !cropCanvasRef.current) return;
        const rect = cropCanvasRef.current.getBoundingClientRect();
        const touchX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const touchY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

        const scale = cropCanvasScale.scaleX;
        const originalX = touchX / scale;
        const originalY = touchY / scale;

        setManualCorners(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [activeDragCorner]: { x: originalX, y: originalY },
            };
        });
    };

    const handleCropPointerUp = () => {
        setActiveDragCorner(null);
    };

    const saveManualCrop = () => {
        if (!editingPageId || !manualCorners) return;

        const targetPage = pages.find(p => p.id === editingPageId);
        if (!targetPage) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);

            const warpedCanvas = extractDocumentPerspective(canvas, manualCorners, 1440, 1920);
            const filteredCanvas = applyScanFilter(warpedCanvas, targetPage.filter);
            const processedDataUrl = filteredCanvas.toDataURL('image/jpeg', 0.92);

            setPages(prev => prev.map(p => {
                if (p.id === editingPageId) {
                    return {
                        ...p,
                        corners: manualCorners,
                        processedImage: processedDataUrl,
                    };
                }
                return p;
            }));

            setCropModalOpen(false);
            if (notify && notify.success) notify.success("Perspective adjustments applied!");
        };
        img.src = targetPage.originalImage;
    };

    // Change page filter
    const handleFilterChange = (pageId: string, filter: ScanFilterType) => {
        setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                const img = new Image();
                img.src = p.originalImage;
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const warped = extractDocumentPerspective(canvas, p.corners, 1440, 1920);
                    const filtered = applyScanFilter(warped, filter);
                    return {
                        ...p,
                        filter,
                        processedImage: filtered.toDataURL('image/jpeg', 0.92),
                    };
                }
            }
            return p;
        }));
    };

    // Rotate page 90 degrees
    const rotatePage = (pageId: string) => {
        setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.height;
                    canvas.height = img.width;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate((90 * Math.PI) / 180);
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        const rotatedUrl = canvas.toDataURL('image/jpeg', 0.92);
                        setPages(current => current.map(item => item.id === pageId ? { ...item, processedImage: rotatedUrl, rotation: (item.rotation + 90) % 360 } : item));
                    }
                };
                img.src = p.processedImage;
            }
            return p;
        }));
    };

    // Delete single page
    const removePage = (id: string) => {
        setPages(prev => {
            const next = prev.filter(p => p.id !== id);
            if (selectedPageIndex >= next.length) {
                setSelectedPageIndex(Math.max(0, next.length - 1));
            }
            return next;
        });
    };

    // -------------------------------------------------------------
    // High-Resolution PDF Export
    // -------------------------------------------------------------
    const saveAsPdf = async () => {
        if (pages.length === 0) return;
        setIsPdfGenerating(true);

        try {
            const { PDFDocument } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.create();

            for (const pageItem of pages) {
                const page = pdfDoc.addPage();
                const jpgImage = await pdfDoc.embedJpg(pageItem.processedImage);
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
            link.download = `PDFBolt_Scan_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            if (notify && notify.complete) notify.complete();
            if (notify && notify.success) notify.success("High-Quality PDF Document downloaded!");
        } catch (e) {
            console.error("PDF generation error:", e);
            alert("Failed to compile PDF document. Please try again.");
        } finally {
            setIsPdfGenerating(false);
        }
    };

    // Modes list for horizontal carousel
    const MODES: { id: ScanMode; label: string }[] = [
        { id: 'book', label: 'Book' },
        { id: 'text', label: 'To Text' },
        { id: 'docs', label: 'Docs' },
        { id: 'idcard', label: 'ID Card' },
        { id: 'qrcode', label: 'QR Code' },
    ];

    return (
        <div className={`min-h-[85vh] flex flex-col items-center justify-start ${darkMode ? 'text-white' : 'text-slate-900'}`}>

            {/* Hidden file inputs for gallery & document imports */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImportImages}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleImportImages}
            />

            {/* ------------------------------------------------------------- */}
            {/* INITIAL LANDING STATE */}
            {/* ------------------------------------------------------------- */}
            {!isCameraActive && pages.length === 0 && (
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg animate-fadeIn mt-8">
                    <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-2xl ${darkMode ? 'bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/60' : 'bg-gradient-to-tr from-blue-50 to-white border border-slate-200'}`}>
                        <Camera size={44} className="text-emerald-500" />
                    </div>

                    <h1 className="text-3xl font-black tracking-tight mb-3">
                        AI Document Scanner
                    </h1>
                    <p className="mb-8 text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Real-time automatic edge detection, perspective warping, shadow removal, and instant PDF compilation.
                    </p>

                    {cameraError && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-xs font-bold text-left w-full">
                            {cameraError}
                        </div>
                    )}

                    <div className="flex flex-col gap-3.5 w-full">
                        <button
                            onClick={startCamera}
                            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-3 active:scale-95"
                        >
                            <Camera size={22} /> Launch Camera Scanner
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="py-3.5 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                            >
                                <ImageIcon size={16} className="text-emerald-500" /> Import Photos
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="py-3.5 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                            >
                                <FileUp size={16} className="text-emerald-500" /> Import Files
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <Sparkles size={14} className="text-emerald-500" />
                        <span>Client-Side Computer Vision Engine</span>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FULLSCREEN CAMERA VIEWFINDER (Exact Match with Reference Image) */}
            {/* ------------------------------------------------------------- */}
            {isCameraActive && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col select-none overflow-hidden">

                    {/* Camera Flash Animation */}
                    {capturedFlash && (
                        <div className="absolute inset-0 bg-white z-50 animate-fadeOut pointer-events-none" />
                    )}

                    {/* 1. TOP NAVIGATION & CONTROLS HEADER */}
                    <div className="relative z-30 w-full px-5 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                        {/* Flashlight Button */}
                        <button
                            onClick={toggleTorch}
                            aria-label="Toggle Flash"
                            className="p-2.5 rounded-full text-white/90 hover:text-white bg-black/40 backdrop-blur-md border border-white/10 active:scale-90 transition-all"
                        >
                            {isTorchOn ? <Zap className="text-yellow-400 fill-current" size={20} /> : <ZapOff size={20} />}
                        </button>

                        {/* Mode Indicator: Auto vs Manual */}
                        <button
                            onClick={() => setIsAutoScan(!isAutoScan)}
                            className="px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white flex items-center gap-2 text-xs font-bold active:scale-95 transition-all"
                        >
                            <span className={`w-2 h-2 rounded-full ${isAutoScan ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                            <span>{isAutoScan ? 'Auto Detect' : 'Manual'}</span>
                        </button>

                        {/* Color Filter Quick Selector */}
                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full">
                            {(['none', 'magic', 'bw'] as ScanFilterType[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${activeFilter === f ? 'bg-emerald-500 text-white' : 'text-white/60 hover:text-white'}`}
                                >
                                    {f === 'none' ? 'Orig' : f === 'magic' ? 'Magic' : 'B&W'}
                                </button>
                            ))}
                        </div>

                        {/* 3x3 Grid Toggle */}
                        <button
                            onClick={() => setShowGrid(!showGrid)}
                            aria-label="Toggle Framing Grid"
                            className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 active:scale-90 transition-all ${showGrid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-black/40 text-white/90'}`}
                        >
                            <Grid size={20} />
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            aria-label="Scanner Settings"
                            className="p-2.5 rounded-full text-white/90 hover:text-white bg-black/40 backdrop-blur-md border border-white/10 active:scale-90 transition-all"
                        >
                            <Settings size={20} />
                        </button>
                    </div>

                    {/* 2. VIEWFINDER VIDEO & OVERLAY CANVAS LAYER */}
                    <div className="relative flex-1 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Real-Time Green Document Contour Detection Overlay */}
                        <canvas
                            ref={overlayCanvasRef}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                        />

                        {/* 3. CENTER GUIDANCE CAPSULE / PILL BANNER (Exact Match from Image) */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20">
                            <div className="bg-black/75 backdrop-blur-xl border border-white/15 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 text-white max-w-[90%] pointer-events-auto transform transition-all duration-300 animate-fadeIn">
                                {/* Left Document Scan Frame Icon */}
                                <div className="p-1 rounded-md bg-white/10 text-emerald-400">
                                    <ScanIcon size={18} />
                                </div>

                                {/* Status Guidance Text */}
                                <span className="text-xs font-semibold tracking-wide select-none">
                                    {statusMessage}
                                </span>

                                {/* Auto-Capture Progress Ring */}
                                {steadyProgress > 0 && isAutoScan && (
                                    <div className="w-4 h-4 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                                )}
                            </div>
                        </div>

                        {/* Settings Drawer Overlay */}
                        {settingsOpen && (
                            <div className="absolute top-4 right-4 z-40 bg-black/90 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 text-white w-64 shadow-2xl space-y-4 animate-fadeIn">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider">Scanner Options</h4>
                                    <button onClick={() => setSettingsOpen(false)} className="text-white/60 hover:text-white">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span>Shutter Sound</span>
                                    <input
                                        type="checkbox"
                                        checked={soundEnabled}
                                        onChange={(e) => setSoundEnabled(e.target.checked)}
                                        className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span>Framing Grid (3x3)</span>
                                    <input
                                        type="checkbox"
                                        checked={showGrid}
                                        onChange={(e) => setShowGrid(e.target.checked)}
                                        className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-1.5 text-xs font-semibold">
                                    <div className="flex justify-between">
                                        <span>Auto-Capture Speed</span>
                                        <span className="text-emerald-400">{autoCaptureDelay < 25 ? 'Fast' : 'Normal'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="12"
                                        max="35"
                                        value={autoCaptureDelay}
                                        onChange={(e) => setAutoCaptureDelay(Number(e.target.value))}
                                        className="w-full accent-emerald-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. BOTTOM MODE SELECTOR CAROUSEL */}
                    <div className="relative z-30 w-full bg-gradient-to-t from-black via-black/95 to-transparent pt-3 pb-2 px-4">
                        <div className="flex items-center justify-center gap-6 overflow-x-auto no-scrollbar max-w-md mx-auto py-1">
                            {MODES.map((mode) => {
                                const isSelected = currentMode === mode.id;
                                return (
                                    <button
                                        key={mode.id}
                                        onClick={() => setCurrentMode(mode.id)}
                                        className={`relative pb-1.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap active:scale-90 ${isSelected ? 'text-emerald-400 font-extrabold' : 'text-white/40 hover:text-white/80'}`}
                                    >
                                        <span>{mode.label}</span>
                                        {isSelected && (
                                            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 5. BOTTOM CAPTURE & ACTION BAR */}
                    <div className="relative z-30 w-full bg-black/95 px-6 pt-2 pb-10 flex items-center justify-between border-t border-white/10 max-w-lg mx-auto">
                        {/* Left: Close Button */}
                        <button
                            onClick={stopCamera}
                            aria-label="Close Camera"
                            className="p-3.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md active:scale-90 transition-all"
                        >
                            <X size={24} />
                        </button>

                        {/* Center: Large Shutter Button */}
                        <div className="relative flex items-center justify-center">
                            {/* Animated Outer Ring when doc is steady */}
                            <button
                                onClick={handleCapture}
                                disabled={isProcessing}
                                aria-label="Capture Scan"
                                className={`group relative w-20 h-20 rounded-full border-4 flex items-center justify-center active:scale-90 transition-all duration-200 ${isSteady ? 'border-emerald-400 shadow-[0_0_25px_rgba(0,230,118,0.6)] scale-105' : 'border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.2)]'}`}
                            >
                                <div className={`w-16 h-16 rounded-full transition-all duration-200 ${isProcessing ? 'scale-75 opacity-50' : 'group-hover:scale-95'} ${isSteady ? 'bg-emerald-400' : 'bg-white'}`} />
                                {isProcessing && (
                                    <div className="absolute inset-0 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                )}
                            </button>
                        </div>

                        {/* Right: Import & Import Files Buttons */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-90 transition-all"
                            >
                                <div className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20">
                                    <ImageIcon size={20} />
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider">Import</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-90 transition-all"
                            >
                                <div className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20">
                                    <FileUp size={20} />
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider">Import Files</span>
                            </button>

                            {/* Captured Count Badge */}
                            {pages.length > 0 && (
                                <button
                                    onClick={stopCamera}
                                    className="relative flex flex-col items-center gap-1 text-emerald-400 font-bold active:scale-90 ml-1"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                                        <span className="text-sm font-black text-white">{pages.length}</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider">Done</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* POST-CAPTURE REVIEW & MULTI-PAGE MANAGEMENT */}
            {/* ------------------------------------------------------------- */}
            {!isCameraActive && pages.length > 0 && (
                <div className="w-full max-w-6xl animate-fadeIn p-4 sm:p-6 lg:p-8 space-y-6">

                    {/* Top Action Bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black tracking-tight">Scanned Document</h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                                    {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-semibold">
                                High-res perspective warped & AI enhanced. Ready for PDF compilation.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            <button
                                onClick={startCamera}
                                className="flex-1 sm:flex-none px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all flex items-center justify-center gap-2 text-xs active:scale-95"
                            >
                                <Plus size={16} className="text-emerald-500" /> Add Page
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to discard all scanned pages?")) {
                                        setPages([]);
                                    }
                                }}
                                className="px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 transition-all flex items-center justify-center gap-2 text-xs"
                            >
                                <RefreshCw size={14} /> Clear
                            </button>

                            <button
                                onClick={saveAsPdf}
                                disabled={isPdfGenerating}
                                className="flex-1 sm:flex-none px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isPdfGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Compiling PDF...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        <span>Download PDF</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* OCR Text Result Drawer (if available in To Text mode) */}
                    {ocrTextResult && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-emerald-500" />
                                    <h4 className="text-sm font-black uppercase tracking-wider">Extracted OCR Text</h4>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(ocrTextResult);
                                        setCopiedText(true);
                                        setTimeout(() => setCopiedText(false), 2000);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
                                >
                                    {copiedText ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
                                </button>
                            </div>
                            <textarea
                                readOnly
                                value={ocrTextResult}
                                rows={4}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono select-all focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Pages Gallery Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {pages.map((page, idx) => (
                            <div
                                key={page.id}
                                className="relative group bg-white dark:bg-slate-800/90 rounded-3xl overflow-hidden shadow-xl border-2 border-slate-200/80 dark:border-slate-700/80 transition-all hover:shadow-2xl hover:border-emerald-500/50"
                            >
                                {/* Page Image Container */}
                                <div className="relative aspect-[3/4] bg-slate-900 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={page.processedImage}
                                        alt={`Page ${idx + 1}`}
                                        className="w-full h-full object-contain"
                                    />

                                    {/* Page Number Pill */}
                                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider border border-white/20">
                                        Page {idx + 1}
                                    </div>

                                    {/* Filter Label Pill */}
                                    <div className="absolute top-3 right-3 bg-emerald-500/80 backdrop-blur-md text-white text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                        {page.filter}
                                    </div>

                                    {/* Hover Actions Bar */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Crop / Fine Tune Corners */}
                                        <button
                                            onClick={() => openCornerEditor(page)}
                                            title="Fine-tune 4 corners"
                                            className="p-2 rounded-xl bg-white/20 hover:bg-emerald-500 text-white backdrop-blur-md transition-colors"
                                        >
                                            <Sliders size={16} />
                                        </button>

                                        {/* Rotate 90 deg */}
                                        <button
                                            onClick={() => rotatePage(page.id)}
                                            title="Rotate 90°"
                                            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                                        >
                                            <RotateCw size={16} />
                                        </button>

                                        {/* OCR on single page */}
                                        <button
                                            onClick={() => performOcrOnImage(page.processedImage)}
                                            title="Extract Text"
                                            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                                        >
                                            <FileText size={16} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => removePage(page.id)}
                                            title="Remove Page"
                                            className="p-2 rounded-xl bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Filter Quick Selector below Card */}
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Filter</span>
                                    <div className="flex gap-1">
                                        {(['none', 'magic', 'bw', 'contrast'] as ScanFilterType[]).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => handleFilterChange(page.id, f)}
                                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${page.filter === f ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                            >
                                                {f === 'none' ? 'Orig' : f === 'magic' ? 'Magic' : f === 'bw' ? 'B&W' : 'Contrast'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* INTERACTIVE 4-CORNER FINE-TUNING MODAL WITH LOUPE */}
            {/* ------------------------------------------------------------- */}
            {cropModalOpen && (
                <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full text-white shadow-2xl flex flex-col space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Sliders className="text-emerald-400" size={20} />
                                <h3 className="text-base font-black tracking-tight">Fine-Tune 4 Corners</h3>
                            </div>
                            <button
                                onClick={() => setCropModalOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400">
                            Drag any of the 4 neon green corner handles to align precisely with your document edges.
                        </p>

                        {/* Interactive Canvas */}
                        <div className="relative w-full flex items-center justify-center bg-black/50 rounded-2xl overflow-hidden border border-slate-800 touch-none py-2">
                            <canvas
                                ref={cropCanvasRef}
                                onPointerDown={handleCropPointerDown}
                                onPointerMove={handleCropPointerMove}
                                onPointerUp={handleCropPointerUp}
                                className="cursor-crosshair max-w-full h-auto"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setCropModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-slate-700 font-bold text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveManualCrop}
                                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                            >
                                <Check size={16} /> Apply Perspective Warp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScanTool;
