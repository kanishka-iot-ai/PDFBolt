
import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUploader from '../components/FileUploader';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Eraser, Type, Image as ImageIcon, PenTool, Download, Save, MousePointer, Move, Trash2, Check } from 'lucide-react';

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
    // PDF State
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(false);

    // Editor State
    const [mode, setMode] = useState<EditorMode>('select');
    const [textElements, setTextElements] = useState<TextElement[]>([]);
    const [imageElements, setImageElements] = useState<ImageElement[]>([]);

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null); // Rendering PDF
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null); // Drawing layer
    const containerRef = useRef<HTMLDivElement>(null);

    // Store drawing data URLs per page to persistence? 
    // For simplicity in this version, we'll just have one drawing canvas per page active? 
    // Ideally we store "paths" but for "Offline PDF Edit" usually we just bake it. 
    // Let's store "pageDrawings" as dataURLs.
    const [pageDrawings, setPageDrawings] = useState<Record<number, string>>({}); // pageNum -> dataURL

    // Selection/Drag State
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);

    // Text Editing State
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [inputText, setInputText] = useState("");

    // --- PDF Loading & Rendering ---
    const handleFilesSelected = async (files: File[]) => {
        if (files.length === 0) return;
        const uploadedFile = files[0];
        if (uploadedFile.type !== 'application/pdf') return alert('Please upload a valid PDF file.');

        setFile(uploadedFile);
        setLoading(true);
        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(loadedPdf);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Failed to load PDF.');
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
            } catch (error) {
                console.error('Error rendering page:', error);
            }
        };
        renderPage();
    }, [pdfDoc, currentPage, scale]);

    // --- Tools Logic ---

    const handleAddText = () => {
        const input = prompt("Enter text:", "New Text");
        if (!input) return;

        const newText: TextElement = {
            id: generateId(),
            page: currentPage,
            x: 50, // Default position
            y: 50,
            text: input,
            fontSize: 24,
            color: '#000000'
        };
        setTextElements([...textElements, newText]);
        setMode('select');
        setSelectedElementId(newText.id);
    };

    const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const imgFile = e.target.files[0];
        const arrayBuffer = await imgFile.arrayBuffer();
        const reader = new FileReader();

        reader.onload = () => {
            const newImg: ImageElement = {
                id: generateId(),
                page: currentPage,
                x: 100,
                y: 100,
                width: 200,
                height: 200, // Default size, maybe adjust based on actual img aspect ratio later
                dataUrl: reader.result as string,
                bytes: arrayBuffer
            };
            setImageElements([...imageElements, newImg]);
            setMode('select');
            setSelectedElementId(newImg.id);
        };
        reader.readAsDataURL(imgFile);
    };

    // --- Drag & Drop Logic ---

    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        // Handle touch or mouse
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return {
            x: (clientX - rect.left) / scale, // Unscale to match PDF points logic roughly
            y: (clientY - rect.top) / scale
        };
    };

    const handleContainerMouseDown = (e: React.MouseEvent) => {
        if (mode === 'draw') {
            startDrawing(e);
            return;
        }
        // Deselect if clicking empty space
        if (e.target === containerRef.current || e.target === drawingCanvasRef.current) {
            setSelectedElementId(null);
            setEditingTextId(null);
        }
    };

    const handleElementMouseDown = (e: React.MouseEvent, id: string, type: 'text' | 'image') => {
        e.stopPropagation();
        if (mode !== 'select') return;

        setSelectedElementId(id);
        const pos = getMousePos(e);

        let elem;
        if (type === 'text') elem = textElements.find(t => t.id === id);
        else elem = imageElements.find(i => i.id === id);

        if (elem) {
            setDragOffset({
                x: pos.x - elem.x,
                y: pos.y - elem.y
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (mode === 'draw' && isDrawing) {
            draw(e);
            return;
        }

        if (mode === 'select' && selectedElementId && dragOffset) {
            const pos = getMousePos(e);
            const newX = pos.x - dragOffset.x;
            const newY = pos.y - dragOffset.y;

            setTextElements(prev => prev.map(t => t.id === selectedElementId ? { ...t, x: newX, y: newY } : t));
            setImageElements(prev => prev.map(i => i.id === selectedElementId ? { ...i, x: newX, y: newY } : i));
        }
    };

    const handleMouseUp = () => {
        if (mode === 'draw') stopDrawing();
        setDragOffset(null);
    };

    // --- Drawing Logic ---
    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const ctx = drawingCanvasRef.current?.getContext('2d');
        if (!ctx || !drawingCanvasRef.current) return;

        const rect = drawingCanvasRef.current.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.strokeStyle = darkMode ? '#FFFF00' : '#000000'; // Yellow in dark mode, Black in light
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
        // Save current canvas to store
        if (drawingCanvasRef.current) {
            const dataUrl = drawingCanvasRef.current.toDataURL('image/png');
            setPageDrawings(prev => ({ ...prev, [currentPage]: dataUrl }));
        }
    };

    // --- Save Logic ---
    const savePdf = async () => {
        if (!file || !pdfDoc) return;
        setLoading(true);
        try {
            const { PDFDocument, rgb } = await import('pdf-lib');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);

            // Process Pages
            const pages = pdf.getPages();

            // 1. Embed Images First (Efficiency)
            // Map of ImageElement.id -> PDFImage
            const embeddedImages: Record<string, any> = {};
            for (const imgEl of imageElements) {
                // Determine type from bytes/header or just try-catch? 
                // dataUrl usually has mime type.
                let imgObj;
                if (imgEl.dataUrl.startsWith('data:image/png')) {
                    imgObj = await pdf.embedPng(imgEl.bytes);
                } else {
                    imgObj = await pdf.embedJpg(imgEl.bytes); // Fallback to JPG
                }
                embeddedImages[imgEl.id] = imgObj;
            }

            // 2. Process Drawing Canvases (Convert to PNG and Embed)
            const embeddedDrawings: Record<number, any> = {};
            for (const [pageNumStr, dataUrl] of Object.entries(pageDrawings)) {
                if (dataUrl && dataUrl.length > 100) { // Check if not empty
                    const drawingImage = await pdf.embedPng(dataUrl);
                    embeddedDrawings[Number(pageNumStr)] = drawingImage;
                }
            }

            // 3. Draw on Pages
            for (let i = 0; i < pages.length; i++) {
                const pageNum = i + 1;
                const page = pages[i];
                const { height } = page.getSize(); // PDF sizing // pdf-lib uses points (72dpi), coords from bottom-left

                // Draw Drawings (Full Page Overlay)
                if (embeddedDrawings[pageNum]) {
                    page.drawImage(embeddedDrawings[pageNum], {
                        x: 0,
                        y: 0,
                        width: page.getWidth(),
                        height: page.getHeight(),
                    });
                }

                // Draw Images
                const pageImages = imageElements.filter(e => e.page === pageNum);
                pageImages.forEach(img => {
                    const embed = embeddedImages[img.id];
                    if (embed) {
                        page.drawImage(embed, {
                            x: img.x, // Need to scale? No, we stored unscaled PDF-point coords? 
                            // Wait, getMousePos divides by `scale` (viewport scale). 
                            // Pdfjs-dist viewport at scale 1 usually matches PDF points 1:1 if 72dpi.
                            // So `img.x` should be in PDF points.
                            y: height - img.y - img.height, // Flip Y for pdf-lib
                            width: img.width,
                            height: img.height
                        });
                    }
                });

                // Draw Text
                const pageTexts = textElements.filter(e => e.page === pageNum);
                pageTexts.forEach(txt => {
                    page.drawText(txt.text, {
                        x: txt.x,
                        y: height - txt.y - txt.fontSize + 12, // Approximate adjustment for baseline
                        size: txt.fontSize,
                        color: rgb(0, 0, 0) // Support colors later
                    });
                });
            }

            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `edited_${file.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (notify && notify.success) notify.success("PDF Edited Successfully!");

        } catch (error) {
            console.error(error);
            alert("Error saving PDF");
        } finally {
            setLoading(false);
        }
    };

    // --- Deletion ---
    const deleteSelected = () => {
        if (!selectedElementId) return;
        setTextElements(prev => prev.filter(t => t.id !== selectedElementId));
        setImageElements(prev => prev.filter(i => i.id !== selectedElementId));
        setSelectedElementId(null);
    };

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Header */}
            <div className={`h-16 border-b flex items-center justify-between px-6 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <h1 className="font-black text-xl">Edit PDF</h1>
                {file && (
                    <div className="flex gap-2">
                        <button onClick={() => setFile(null)} className="text-red-500 font-bold text-sm">Close</button>
                        <button onClick={savePdf} className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600 transition-colors">
                            <Save size={18} /> Save PDF
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {!file ? (
                    <div className="max-w-xl mx-auto flex flex-col items-center justify-center p-10">
                        <h2 className="text-3xl font-black mb-4">Upload PDF to Edit</h2>
                        <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" darkMode={darkMode} />
                    </div>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className={`w-16 flex flex-col items-center py-6 gap-4 border-r ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                            <button
                                onClick={() => setMode('select')}
                                className={`p-3 rounded-xl transition-all ${mode === 'select' ? 'bg-yellow-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                title="Select / Move"
                            >
                                <Move size={20} />
                            </button>
                            <button
                                onClick={handleAddText}
                                className={`p-3 rounded-xl transition-all ${mode === 'text' ? 'bg-yellow-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                title="Add Text"
                            >
                                <Type size={20} />
                            </button>
                            <label className={`p-3 rounded-xl transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700`}>
                                <ImageIcon size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
                            </label>
                            <button
                                onClick={() => setMode('draw')}
                                className={`p-3 rounded-xl transition-all ${mode === 'draw' ? 'bg-yellow-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                title="Free Hand Draw"
                            >
                                <PenTool size={20} />
                            </button>

                            <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2"></div>

                            {selectedElementId && (
                                <button onClick={deleteSelected} className="p-3 text-red-500 hover:bg-red-50 rounded-xl" title="Delete Selected">
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
                                            onMouseDown={(e) => handleElementMouseDown(e, el.id, 'text')}
                                            className={`absolute cursor-move px-1 border-2 pointer-events-auto ${selectedElementId === el.id ? 'border-yellow-500' : 'border-transparent hover:border-blue-300'}`}
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
                                            onMouseDown={(e) => handleElementMouseDown(e, el.id, 'image')}
                                            className={`absolute cursor-move pointer-events-auto ${selectedElementId === el.id ? 'ring-2 ring-yellow-500' : ''}`}
                                            style={{
                                                left: el.x * scale,
                                                top: el.y * scale,
                                                width: el.width * scale,
                                                height: el.height * scale
                                            }}
                                        >
                                            <img src={el.dataUrl} className="w-full h-full object-contain" draggable={false} />
                                            {/* Simple Resize Handle (Bottom Right) */}
                                            {selectedElementId === el.id && (
                                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 rounded-full cursor-se-resize translate-x-1/2 translate-y-1/2"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Page Navigation */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 z-50">
                            <button onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
                            <span className="font-bold">{currentPage} / {pdfDoc?.numPages}</span>
                            <button onClick={() => setCurrentPage(c => Math.min(pdfDoc?.numPages, c + 1))} disabled={!pdfDoc || currentPage === pdfDoc.numPages} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight /></button>

                            <div className="w-px h-4 bg-slate-300 mx-2"></div>

                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-slate-100 rounded-full"><ZoomOut size={16} /></button>
                            <span className="text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1 hover:bg-slate-100 rounded-full"><ZoomIn size={16} /></button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EditTool;
