import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Camera, RefreshCw, FileText, Download, X, Scan as ScanIcon, Flashlight,
    CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Zap, ZapOff,
    Grid, Settings, Sliders, Image as ImageIcon, FileUp, RotateCw, Copy, Check,
    Sparkles, ArrowLeft, ZoomIn, Eye, Layers, Move, Smartphone, Sparkle, ShieldCheck
} from 'lucide-react';
import { soundEngine } from '../utils/sounds';
import { useActiveWork } from '../context/ActiveWorkContext';
import {
    DocumentCorners, Point, extractDocumentPerspective, applyScanFilter, ScanFilterType
} from '../services/documentDetector';
import {
    triggerNativeDocumentScanner, getMobilePlatform, isNativeScannerBridgeAvailable
} from '../services/nativeScannerBridge';

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
    const platform = getMobilePlatform();

    // Scanned Pages State
    const [pages, setPages] = useState<ScannedPage[]>([]);
    const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
    const [currentMode, setCurrentMode] = useState<ScanMode>('docs');
    const [activeFilter, setActiveFilter] = useState<ScanFilterType>('magic');
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    // Interactive Crop / Corner Tuning Modal
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [manualCorners, setManualCorners] = useState<DocumentCorners | null>(null);
    const [activeDragCorner, setActiveDragCorner] = useState<keyof DocumentCorners | null>(null);
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const [cropCanvasScale, setCropCanvasScale] = useState({ scaleX: 1, scaleY: 1 });

    // Text OCR extraction
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [ocrTextResult, setOcrTextResult] = useState<string | null>(null);
    const [copiedText, setCopiedText] = useState(false);

    // File Inputs (Native Scanner Camera Intent & File Pickers)
    const nativeCameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync active work state
    useEffect(() => {
        setHasActiveWork(pages.length > 0);
        return () => setHasActiveWork(false);
    }, [pages.length, setHasActiveWork]);

    // -------------------------------------------------------------
    // Launch Native Document Scanner (Google ML Kit / Apple VisionKit)
    // -------------------------------------------------------------
    const handleLaunchScanner = () => {
        triggerNativeDocumentScanner(
            nativeCameraInputRef.current,
            (images) => {
                images.forEach((imgUrl, idx) => {
                    const img = new Image();
                    img.onload = () => {
                        const corners: DocumentCorners = {
                            topLeft: { x: 0, y: 0 },
                            topRight: { x: img.width, y: 0 },
                            bottomRight: { x: img.width, y: img.height },
                            bottomLeft: { x: 0, y: img.height },
                        };

                        const newPage: ScannedPage = {
                            id: `scan_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                            originalImage: imgUrl,
                            processedImage: imgUrl,
                            corners,
                            filter: 'none',
                            rotation: 0,
                        };

                        setPages(prev => [...prev, newPage]);
                    };
                    img.src = imgUrl;
                });
                if (notify && notify.success) notify.success("Document scanned successfully!");
            },
            (err) => {
                if (notify && notify.error) notify.error(err);
            }
        );
    };

    // -------------------------------------------------------------
    // Image Files Ingestion Handler
    // -------------------------------------------------------------
    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file, idx) => {
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
                    if (ctx) ctx.drawImage(img, 0, 0);

                    const corners: DocumentCorners = {
                        topLeft: { x: 0, y: 0 },
                        topRight: { x: img.width, y: 0 },
                        bottomRight: { x: img.width, y: img.height },
                        bottomLeft: { x: 0, y: img.height },
                    };

                    const newPage: ScannedPage = {
                        id: `import_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                        originalImage: dataUrl,
                        processedImage: dataUrl,
                        corners,
                        filter: 'none',
                        rotation: 0,
                    };

                    setPages(prev => [...prev, newPage]);
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });

        if (e.target) e.target.value = '';
        if (notify && notify.success) notify.success("Pages added to document!");
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
            console.warn("OCR error:", e);
            setOcrTextResult("OCR extraction unavailable. You can still export as PDF.");
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
            const containerWidth = canvas.parentElement?.clientWidth || 500;
            const containerHeight = Math.min(window.innerHeight * 0.55, 450);

            const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;

            canvas.width = drawW;
            canvas.height = drawH;

            setCropCanvasScale({ scaleX: scale, scaleY: scale });

            ctx.drawImage(img, 0, 0, drawW, drawH);

            const cTL = { x: manualCorners.topLeft.x * scale, y: manualCorners.topLeft.y * scale };
            const cTR = { x: manualCorners.topRight.x * scale, y: manualCorners.topRight.y * scale };
            const cBR = { x: manualCorners.bottomRight.x * scale, y: manualCorners.bottomRight.y * scale };
            const cBL = { x: manualCorners.bottomLeft.x * scale, y: manualCorners.bottomLeft.y * scale };

            // Dim mask outside quad
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, drawW, drawH);

            // Highlight quad
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

    // Touch/mouse dragging on crop canvas
    const handleCropPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!cropCanvasRef.current || !manualCorners) return;
        const rect = cropCanvasRef.current.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        const scale = cropCanvasScale.scaleX;
        const cornersList: (keyof DocumentCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

        let closestCorner: keyof DocumentCorners | null = null;
        let minDist = 45;

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

    return (
        <div className={`min-h-[85vh] w-full flex flex-col items-center justify-start ${darkMode ? 'text-white' : 'text-slate-900'}`}>

            {/* Native Mobile Camera Input: Google ML Kit (Android) & Apple VisionKit (iOS) */}
            <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
            />

            {/* Gallery & File System Inputs */}
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
            />

            {/* ------------------------------------------------------------- */}
            {/* MAIN SCANNER HUB */}
            {/* ------------------------------------------------------------- */}
            {pages.length === 0 && (
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-lg animate-fadeIn mt-4 sm:mt-8 w-full">
                    {/* Hero Icon */}
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl flex items-center justify-center mb-5 shadow-2xl ${darkMode ? 'bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/60' : 'bg-gradient-to-tr from-emerald-50 to-white border border-slate-200'}`}>
                        <Camera size={40} className="text-emerald-500" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 sm:mb-3">
                        Native Document Scanner
                    </h1>
                    <p className="mb-6 sm:mb-8 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2">
                        {platform === 'android'
                            ? 'Powered by Google Play Services ML Kit for auto edge detection, shadow removal, and instant PDF creation.'
                            : platform === 'ios'
                                ? 'Powered by Apple VisionKit for high-precision document framing, perspective warp, and crisp PDF export.'
                                : 'Auto edge detection, perspective warping, shadow removal, and instant client-side PDF export.'}
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        {/* Primary Action: Native Scanner Trigger */}
                        <button
                            onClick={handleLaunchScanner}
                            className="w-full py-4 sm:py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-3 active:scale-95"
                        >
                            <Camera size={22} />
                            <span>
                                {platform === 'android'
                                    ? 'Scan with Google ML Kit'
                                    : platform === 'ios'
                                        ? 'Scan with Apple VisionKit'
                                        : 'Open Document Camera'}
                            </span>
                        </button>

                        {/* Secondary Actions: Gallery & Files */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="py-3 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                            >
                                <ImageIcon size={16} className="text-emerald-500" /> Import Photos
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="py-3 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                            >
                                <FileUp size={16} className="text-emerald-500" /> Import Files
                            </button>
                        </div>
                    </div>

                    {/* Platform Badge */}
                    <div className="mt-8 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span>
                            {platform === 'android'
                                ? 'Android Google ML Kit Integration'
                                : platform === 'ios'
                                    ? 'iOS Apple VisionKit Integration'
                                    : 'Native Document Scanner Engine'}
                        </span>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* POST-CAPTURE REVIEW & MULTI-PAGE MANAGEMENT */}
            {/* ------------------------------------------------------------- */}
            {pages.length > 0 && (
                <div className="w-full max-w-6xl animate-fadeIn p-4 sm:p-6 lg:p-8 space-y-6">

                    {/* Top Action Bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Scanned Document</h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                                    {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-semibold">
                                {platform === 'android'
                                    ? 'Processed via Google ML Kit. Ready for PDF download.'
                                    : platform === 'ios'
                                        ? 'Processed via Apple VisionKit. Ready for PDF download.'
                                        : 'Auto-perspective corrected & ready for PDF download.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            <button
                                onClick={handleLaunchScanner}
                                className="flex-1 sm:flex-none px-4 sm:px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all flex items-center justify-center gap-2 text-xs active:scale-95"
                            >
                                <Plus size={16} className="text-emerald-500" /> Add Page
                            </button>

                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to discard all scanned pages?")) {
                                        setPages([]);
                                    }
                                }}
                                className="px-3.5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 transition-all flex items-center justify-center gap-1.5 text-xs"
                            >
                                <RefreshCw size={14} /> Clear
                            </button>

                            <button
                                onClick={saveAsPdf}
                                disabled={isPdfGenerating}
                                className="flex-1 sm:flex-none px-6 sm:px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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

                    {/* OCR Text Result Drawer */}
                    {ocrTextResult && (
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-3">
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
                                                {f === 'none' ? 'Orig' : f === 'magic' ? 'Magic' : 'B&W'}
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
                <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-2xl w-full text-white shadow-2xl flex flex-col space-y-3 sm:space-y-4 animate-scaleUp max-h-[95dvh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Sliders className="text-emerald-400" size={20} />
                                <h3 className="text-sm sm:text-base font-black tracking-tight">Fine-Tune 4 Corners</h3>
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
                                className="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-700 font-bold text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveManualCrop}
                                className="px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
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
