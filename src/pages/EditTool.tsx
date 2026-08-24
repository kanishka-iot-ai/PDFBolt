import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUploader from '../components/FileUploader';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Type, Image as ImageIcon, PenTool, Save, Move, Trash2 } from 'lucide-react';
import { useActiveWork } from '../context/ActiveWorkContext';

// Initialize Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface EditToolProps {
    darkMode: boolean;
    notify: any;
}

type EditorMode = 'select' | 'text' | 'draw' | 'erasing';

interface TextElement {
    id: string;
    page: number;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
}

interface ImageElement {
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    dataUrl: string;
    bytes: ArrayBuffer;
}

// Simple unique ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const EditTool: React.FC<EditToolProps> = ({ darkMode, notify }) => {
    const { setHasActiveWork } = useActiveWork();

    // PDF State
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Sync active work
    useEffect(() => {
        setHasActiveWork(file !== null);
        return () => setHasActiveWork(false);
    }, [file, setHasActiveWork]);

    // Editor State
    const [mode, setMode] = useState<EditorMode>('select');
    const [textElements, setTextElements] = useState<TextElement[]>([]);
    const [imageElements, setImageElements] = useState<ImageElement[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    // Canvas references
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeCleanupRef = useRef<(() => void) | null>(null);

    // Store drawing data URLs per page
    const [pageDrawings, setPageDrawings] = useState<Record<number, string>>({}); // pageNum -> dataURL

    // Selection/Drag State
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);

    // Cleanup resize listeners on unmount
    useEffect(() => {
        return () => {
            if (resizeCleanupRef.current) {
                resizeCleanupRef.current();
                resizeCleanupRef.current = null;
            }
        };
    }, []);

    // --- PDF Loading & Rendering ---
    const handleFilesSelected = async (files: File[]) => {
        if (files.length === 0) return;
        const uploadedFile = files[0];
        if (uploadedFile.type !== 'application/pdf' && !uploadedFile.name.toLowerCase().endsWith('.pdf')) {
            setErrorMsg('Please upload a valid PDF file.');
            return;
        }

        setErrorMsg(null);
        setFile(uploadedFile);
        setLoading(true);
        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(loadedPdf);
            setCurrentPage(1);
        } catch {
            setErrorMsg('Failed to load PDF. The file may be password-protected or corrupted.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current) return;
            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport }).promise;

                // Handle Drawing Canvas Sizing
                if (drawingCanvasRef.current) {
                    drawingCanvasRef.current.width = viewport.width;
                    drawingCanvasRef.current.height = viewport.height;
                    const ctx = drawingCanvasRef.current.getContext('2d');
                    if (ctx && pageDrawings[currentPage]) {
                        const img = new Image();
                        img.src = pageDrawings[currentPage];
                        img.onload = () => ctx.drawImage(img, 0, 0);
                    }
                }
            } catch {
                // Non-fatal page render error
            }
        };
        renderPage();
    }, [pdfDoc, currentPage, scale, pageDrawings]);

    // --- Tools Logic ---

    const handleAddText = () => {
        const input = window.prompt("Enter text to add:", "New Text");
        if (!input || input.trim() === '') return;

        const newText: TextElement = {
            id: generateId(),
            page: currentPage,
            x: 50,
            y: 50,
            text: input.trim(),
            fontSize: 16,
            color: darkMode ? '#FFFFFF' : '#000000'
        };

        setTextElements(prev => [...prev, newText]);
        setSelectedElementId(newText.id);
        setMode('select');
    };

    const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            const bytes = await file.arrayBuffer();

            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const newImg: ImageElement = {
                    id: generateId(),
                    page: currentPage,
                    x: 50,
                    y: 50,
                    width: img.width > 200 ? 200 : img.width,
                    height: img.width > 200 ? (img.height * (200 / img.width)) : img.height,
                    dataUrl,
                    bytes
                };
                setImageElements(prev => [...prev, newImg]);
                setSelectedElementId(newImg.id);
                setMode('select');
            };
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const deleteSelected = () => {
        if (!selectedElementId) return;
        setTextElements(prev => prev.filter(el => el.id !== selectedElementId));
        setImageElements(prev => prev.filter(el => el.id !== selectedElementId));
        setSelectedElementId(null);
    };

    // --- Mouse Event Handlers for Moving & Resizing ---

    const handleContainerMouseDown = (e: React.MouseEvent) => {
        if (mode === 'draw') {
            startDrawing(e);
        } else if (mode === 'select') {
            // Deselect if clicked on container background
            if (e.target === canvasRef.current || e.target === drawingCanvasRef.current) {
                setSelectedElementId(null);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (mode === 'draw') {
            draw(e);
        } else if (mode === 'select' && selectedElementId && dragOffset && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const currentX = (e.clientX - rect.left) / scale;
            const currentY = (e.clientY - rect.top) / scale;

            const newX = currentX - dragOffset.x;
            const newY = currentY - dragOffset.y;

            setTextElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, x: newX, y: newY } : el));
            setImageElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, x: newX, y: newY } : el));
        }
    };

    const handleMouseUp = () => {
        if (mode === 'draw') {
            stopDrawing();
        } else if (mode === 'select') {
            setDragOffset(null);
        }
    };

    const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
        if (mode !== 'select') return;
        e.stopPropagation();
        setSelectedElementId(id);

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / scale;
        const clickY = (e.clientY - rect.top) / scale;

        const textEl = textElements.find(t => t.id === id);
        const imgEl = imageElements.find(i => i.id === id);
        const targetEl = textEl || imgEl;

        if (targetEl) {
            setDragOffset({
                x: clickX - targetEl.x,
                y: clickY - targetEl.y
            });
        }
    };

    const startResize = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const img = imageElements.find(i => i.id === id);
        if (!img) return;

        const startX = e.clientX;
        const startWidth = img.width;
        const startHeight = img.height;
        const ratio = startWidth / startHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            const newWidth = Math.max(20, startWidth + dx);
            const newHeight = newWidth / ratio;
            setImageElements(prev => prev.map(el => el.id === id ? { ...el, width: newWidth, height: newHeight } : el));
        };

        const onMouseUpEvent = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUpEvent);
            resizeCleanupRef.current = null;
        };

        // If there was a previous unremoved listener, remove it first
        if (resizeCleanupRef.current) {
            resizeCleanupRef.current();
        }

        resizeCleanupRef.current = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUpEvent);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUpEvent);
    };

    // --- Drawing Logic ---
    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const ctx = drawingCanvasRef.current?.getContext('2d');
        if (!ctx || !drawingCanvasRef.current) return;

        const rect = drawingCanvasRef.current.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.strokeStyle = darkMode ? '#FFFF00' : '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !drawingCanvasRef.current) return;
        const ctx = drawingCanvasRef.current.getContext('2d');
        if (!ctx) return;

        const rect = drawingCanvasRef.current.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (drawingCanvasRef.current) {
            const dataUrl = drawingCanvasRef.current.toDataURL('image/png');
            setPageDrawings(prev => ({ ...prev, [currentPage]: dataUrl }));
        }
    };

    // --- Save Logic ---
    const savePdf = async () => {
        if (!file || !pdfDoc) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            const { PDFDocument, rgb } = await import('pdf-lib');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);

            const pages = pdf.getPages();

            // 1. Embed Images First (Efficiency)
            const embeddedImages: Record<string, any> = {};
            for (const imgEl of imageElements) {
                let imgObj;
                if (imgEl.dataUrl.startsWith('data:image/png')) {
                    imgObj = await pdf.embedPng(imgEl.bytes);
                } else if (imgEl.dataUrl.startsWith('data:image/jpeg') || imgEl.dataUrl.startsWith('data:image/jpg')) {
                    imgObj = await pdf.embedJpg(imgEl.bytes);
                } else {
                    const img = new Image();
                    img.src = imgEl.dataUrl;
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve; // Don't hang on error
                    });
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width || 100;
                    canvas.height = img.height || 100;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        const pngUrl = canvas.toDataURL('image/png');
                        imgObj = await pdf.embedPng(pngUrl);
                    }
                }
                if (imgObj) {
                    embeddedImages[imgEl.id] = imgObj;
                }
            }

            // 2. Process Drawing Canvases
            const embeddedDrawings: Record<number, any> = {};
            for (const [pageNumStr, dataUrl] of Object.entries(pageDrawings)) {
                if (dataUrl && dataUrl.length > 100) {
                    const drawingImage = await pdf.embedPng(dataUrl);
                    embeddedDrawings[Number(pageNumStr)] = drawingImage;
                }
            }

            // 3. Draw on Pages
            for (let i = 0; i < pages.length; i++) {
                const pageNum = i + 1;
                const page = pages[i];
                const { height } = page.getSize();

                // Draw Drawings (Full Page Overlay)
                if (embeddedDrawings[pageNum]) {
                    const img = embeddedDrawings[pageNum];
                    page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: page.getWidth(),
                        height: page.getHeight()
                    });
                }

                // Draw Text Elements
                const pageTexts = textElements.filter(el => el.page === pageNum);
                for (const t of pageTexts) {
                    const hexToRgb = (hex: string) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result ? {
                            r: parseInt(result[1], 16) / 255,
                            g: parseInt(result[2], 16) / 255,
                            b: parseInt(result[3], 16) / 255
                        } : { r: 0, g: 0, b: 0 };
                    };
                    const c = hexToRgb(t.color);
                    page.drawText(t.text, {
                        x: t.x,
                        y: height - t.y - t.fontSize,
                        size: t.fontSize,
                        color: rgb(c.r, c.g, c.b)
                    });
                }

                // Draw Image Elements
                const pageImgs = imageElements.filter(el => el.page === pageNum);
                for (const imgEl of pageImgs) {
                    const pdfImg = embeddedImages[imgEl.id];
                    if (pdfImg) {
                        page.drawImage(pdfImg, {
                            x: imgEl.x,
                            y: height - imgEl.y - imgEl.height,
                            width: imgEl.width,
                            height: imgEl.height
                        });
                    }
                }
            }

            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `edited_${file.name}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1500);

            notify?.success?.();
        } catch {
            setErrorMsg('Failed to save edited PDF. Please check your added elements and try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!file) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight">Edit PDF Documents</h1>
                    <p className="text-slate-500 max-w-xl mx-auto">
                        Add text, images, and freehand drawings to your PDF directly in your browser.
                    </p>
                </div>
                {errorMsg && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm font-semibold text-center">
                        {errorMsg}
                    </div>
                )}
                <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" maxSizeMB={50} darkMode={darkMode} />
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border overflow-hidden shadow-2xl flex flex-col w-full h-full ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
            {/* Header */}
            <div className={`h-16 border-b flex items-center justify-between px-6 shrink-0 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3 truncate">
                    <span className="font-bold text-sm truncate max-w-md">{file.name}</span>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setFile(null)} className="text-red-500 font-bold text-sm px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">Close</button>
                    <button
                        type="button"
                        onClick={savePdf}
                        disabled={loading}
                        className="flex items-center gap-2 bg-yellow-500 text-slate-950 px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                    >
                        <Save size={18} /> {loading ? 'Saving...' : 'Save PDF'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Toolbar */}
                <div className={`w-16 flex flex-col items-center py-6 gap-4 border-r ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                    <button
                        type="button"
                        onClick={() => setMode('select')}
                        aria-label="Select and move elements"
                        className={`p-3 rounded-xl transition-all ${mode === 'select' ? 'bg-yellow-500 text-slate-950 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        title="Select / Move"
                    >
                        <Move size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={handleAddText}
                        aria-label="Add text element"
                        className={`p-3 rounded-xl transition-all ${mode === 'text' ? 'bg-yellow-500 text-slate-950 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        title="Add Text"
                    >
                        <Type size={20} />
                    </button>
                    <label className="p-3 rounded-xl transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Upload and insert image" title="Add Image">
                        <ImageIcon size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
                    </label>
                    <button
                        type="button"
                        onClick={() => setMode('draw')}
                        aria-label="Freehand drawing tool"
                        className={`p-3 rounded-xl transition-all ${mode === 'draw' ? 'bg-yellow-500 text-slate-950 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        title="Free Hand Draw"
                    >
                        <PenTool size={20} />
                    </button>

                    <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2"></div>

                    {selectedElementId && (
                        <button
                            type="button"
                            onClick={deleteSelected}
                            aria-label="Delete selected element"
                            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                            title="Delete Selected"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative bg-slate-200 dark:bg-slate-950 overflow-auto flex items-center justify-center p-8">
                    <div
                        className="relative shadow-2xl"
                        ref={containerRef}
                        style={{ width: canvasRef.current?.width || 'auto', height: canvasRef.current?.height || 'auto' }}
                        onMouseMove={handleMouseMove}
                        onMouseDown={handleContainerMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* PDF Layer */}
                        <canvas ref={canvasRef} className="block relative z-0" />

                        {/* Drawing Layer */}
                        <canvas
                            ref={drawingCanvasRef}
                            className={`absolute inset-0 z-10 ${mode === 'draw' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                        />

                        {/* Elements Layer */}
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            {/* Text Elements */}
                            {textElements.filter(el => el.page === currentPage).map(el => (
                                <div
                                    key={el.id}
                                    onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                                    className={`absolute cursor-move px-1 border-2 pointer-events-auto select-none ${selectedElementId === el.id ? 'border-yellow-500' : 'border-transparent hover:border-blue-300'}`}
                                    style={{
                                        left: el.x * scale,
                                        top: el.y * scale,
                                        fontSize: el.fontSize * scale,
                                        color: el.color,
                                        fontFamily: 'Helvetica, Arial, sans-serif'
                                    }}
                                >
                                    {el.text}
                                </div>
                            ))}

                            {/* Image Elements */}
                            {imageElements.filter(el => el.page === currentPage).map(el => (
                                <div
                                    key={el.id}
                                    onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                                    className={`absolute cursor-move pointer-events-auto ${selectedElementId === el.id ? 'ring-2 ring-yellow-500' : ''}`}
                                    style={{
                                        left: el.x * scale,
                                        top: el.y * scale,
                                        width: el.width * scale,
                                        height: el.height * scale
                                    }}
                                >
                                    <img src={el.dataUrl} alt={`Layer item ${el.id}`} className="w-full h-full object-contain" draggable={false} />
                                    {/* Simple Resize Handle (Bottom Right) */}
                                    {selectedElementId === el.id && (
                                        <div
                                            onMouseDown={(e) => startResize(e, el.id)}
                                            className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 rounded-full cursor-se-resize translate-x-1/2 translate-y-1/2"
                                        ></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Page Navigation */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 z-50">
                    <button
                        type="button"
                        aria-label="Previous page"
                        onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                        disabled={currentPage === 1}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-40"
                    >
                        <ChevronLeft />
                    </button>
                    <span className="font-bold text-xs">{currentPage} / {pdfDoc?.numPages || 1}</span>
                    <button
                        type="button"
                        aria-label="Next page"
                        onClick={() => setCurrentPage(c => Math.min(pdfDoc?.numPages || 1, c + 1))}
                        disabled={!pdfDoc || currentPage === pdfDoc.numPages}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-40"
                    >
                        <ChevronRight />
                    </button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-2"></div>

                    <button
                        type="button"
                        aria-label="Zoom out"
                        onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button
                        type="button"
                        aria-label="Zoom in"
                        onClick={() => setScale(s => Math.min(3, s + 0.2))}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                    >
                        <ZoomIn size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditTool;
