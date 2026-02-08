
import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUploader from '../components/FileUploader';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Eraser, MousePointer, Hand } from 'lucide-react';

// Initialize Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface RedactToolProps {
    darkMode: boolean;
    notify: any;
}

const RedactTool: React.FC<RedactToolProps> = ({ darkMode, notify }) => {
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null); // pdfjs types can be tricky
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(false);

    // Redaction State
    const [redactions, setRedactions] = useState<{ page: number; x: number; y: number; w: number; h: number }[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle File Upload
    const handleFilesSelected = async (files: File[]) => {
        if (files.length === 0) return;
        const uploadedFile = files[0];

        if (uploadedFile.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }
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

    // Render Page
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

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                await page.render(renderContext).promise;
            } catch (error) {
                console.error('Error rendering page:', error);
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale]);

    // Handle Drawing Logic
    const getMousePos = (e: React.MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const pos = getMousePos(e);
        setIsDrawing(true);
        setStartPos(pos);
        setCurrentRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !startPos) return;
        const pos = getMousePos(e);

        const x = Math.min(pos.x, startPos.x);
        const y = Math.min(pos.y, startPos.y);
        const w = Math.abs(pos.x - startPos.x);
        const h = Math.abs(pos.y - startPos.y);

        setCurrentRect({ x, y, w, h });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentRect || !pdfDoc) return;

        // Minimum size check (to avoid accidental clicks)
        if (currentRect.w > 5 && currentRect.h > 5) {
            // Store as unscaled coords (PDF Points relative to top-left for now)
            const unscaledRect = {
                page: currentPage,
                x: currentRect.x / scale,
                y: currentRect.y / scale,
                w: currentRect.w / scale,
                h: currentRect.h / scale
            };
            setRedactions([...redactions, unscaledRect]);
        }

        setIsDrawing(false);
        setStartPos(null);
        setCurrentRect(null);
    };

    const undoLastRedaction = () => {
        setRedactions(redactions.slice(0, -1));
    };

    const clearAllRedactions = () => {
        if (confirm('Clear all redactions?')) {
            setRedactions([]);
        }
    };

    const applyRedactions = async () => {
        if (!file || redactions.length === 0) return;
        if (!confirm('This will permanently remove the selected areas and metadata. Continue?')) return;

        setLoading(true);
        try {
            const { PDFDocument, rgb } = await import('pdf-lib');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);

            redactions.forEach(r => {
                const page = pdf.getPage(r.page - 1); // pdf-lib is 0-indexed
                const { height } = page.getSize();
                // Convert Top-Left (Canvas) to Bottom-Left (PDF)
                // Also adjust logic because pdf-lib coordinates are from bottom-left
                page.drawRectangle({
                    x: r.x,
                    y: height - r.y - r.h,
                    width: r.w,
                    height: r.h,
                    color: rgb(0, 0, 0),
                });
            });

            // Metadata cleaning
            pdf.setTitle('');
            pdf.setAuthor('');
            pdf.setSubject('');
            pdf.setKeywords([]);
            pdf.setProducer('PDFBolt Redactor');
            pdf.setCreator('PDFBolt');
            pdf.setCreationDate(new Date());
            pdf.setModificationDate(new Date());

            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // Trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = `redacted_${file.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (notify && notify.success) notify.success('Redactions applied and PDF downloaded!');
        } catch (e) {
            console.error(e);
            if (notify && notify.error) notify.error('Error applying redactions');
            alert('Error applying redactions');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>

            {/* Header / Toolbar */}
            <div className={`h-16 border-b flex items-center justify-between px-6 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <h1 className="font-black text-xl">PDF Redactor <span className="text-yellow-500 text-xs uppercase ml-2 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">Beta</span></h1>

                {file && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setFile(null); setRedactions([]); }} className="text-sm font-bold text-red-500 hover:text-red-400">Close File</button>
                    </div>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">

                {!file ? (
                    <div className="max-w-4xl mx-auto w-full p-10 flex flex-col items-center justify-center">
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black mb-4">Secure PDF Redaction</h2>
                            <p className="text-slate-500 text-lg">Permanently remove sensitive information. 100% Offline.</p>
                        </div>
                        <FileUploader
                            onFilesSelected={handleFilesSelected}
                            accept=".pdf"
                            maxSizeMB={30}
                            darkMode={darkMode}
                        />
                    </div>
                ) : (
                    <>
                        {/* Sidebar - Thumbnails (Placeholder) */}
                        <div className={`w-64 border-r flex flex-col hidden lg:flex ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="p-4 border-b border-inherit font-bold text-sm uppercase tracking-wider text-slate-500">Pages</div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* We can iterate pages here later */}
                                <div className="aspect-[3/4] bg-white shadow-sm rounded-lg border-2 border-indigo-500"></div>
                                <div className="aspect-[3/4] bg-white shadow-sm rounded-lg opacity-50"></div>
                            </div>
                        </div>

                        {/* Main Content - Viewer */}
                        <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-auto flex items-center justify-center p-8">
                            <div className={`relative shadow-2xl transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
                                <canvas ref={canvasRef} className="block bg-white" />

                                {/* Redaction Overlay Layer */}
                                <div
                                    className="absolute inset-0 cursor-crosshair touch-none"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    {/* Existing Redactions for this page */}
                                    {redactions.filter(r => r.page === currentPage).map((r, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                left: r.x * scale,
                                                top: r.y * scale,
                                                width: r.w * scale,
                                                height: r.h * scale
                                            }}
                                            className="absolute bg-black/70 border border-red-500/50 group"
                                        >
                                            {/* Hover delete could go here */}
                                        </div>
                                    ))}

                                    {/* Current Drawing Box */}
                                    {isDrawing && currentRect && (
                                        <div
                                            style={{
                                                left: currentRect.x,
                                                top: currentRect.y,
                                                width: currentRect.w,
                                                height: currentRect.h
                                            }}
                                            className="absolute bg-black/30 border-2 border-dashed border-red-500"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar - Tools */}
                        <div className={`w-80 border-l flex flex-col ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                            <div className="p-4 border-b border-inherit font-bold text-sm uppercase tracking-wider text-slate-500">Redaction Tools</div>

                            <div className="p-6 space-y-6">

                                {/* Selection Mode */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold uppercase text-slate-400">Tools</label>
                                        <span className="text-xs font-bold text-red-500">{redactions.length} regions</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={undoLastRedaction} title="Undo" className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-500 font-bold text-sm flex items-center justify-center gap-2">
                                            <ZoomOut size={16} className="rotate-180" /> Undo
                                        </button>
                                        <button onClick={clearAllRedactions} title="Clear All" className="flex-1 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm flex items-center justify-center gap-2">
                                            <Eraser size={16} /> Clear
                                        </button>
                                    </div>

                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl">
                                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-500">
                                            Drag on the page to mark areas for redaction. These areas will be permanently removed.
                                        </p>
                                    </div>
                                </div>

                                {/* Page Controls */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase text-slate-400">Navigation</label>
                                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage <= 1}
                                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md disabled:opacity-30"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <span className="font-bold font-mono">{currentPage} / {pdfDoc?.numPages || '-'}</span>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1))}
                                            disabled={!pdfDoc || currentPage >= pdfDoc.numPages}
                                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md disabled:opacity-30"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Zoom Controls */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase text-slate-400">Zoom</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 border rounded-lg hover:bg-slate-50"><ZoomOut size={18} /></button>
                                        <span className="flex-1 text-center font-bold">{Math.round(scale * 100)}%</span>
                                        <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-2 border rounded-lg hover:bg-slate-50"><ZoomIn size={18} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto p-6 border-t border-inherit">
                                <button
                                    onClick={applyRedactions}
                                    disabled={loading || redactions.length === 0}
                                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? 'Processing...' : 'Apply Redactions'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
};

export default RedactTool;
