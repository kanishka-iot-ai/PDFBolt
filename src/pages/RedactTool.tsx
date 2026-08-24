import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUploader from '../components/FileUploader';
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Search,
    ShieldAlert,
    Sparkles,
    CheckSquare,
    Square,
    Download,
    CheckCircle2,
    Lock,
    RefreshCw,
    SlidersHorizontal,
    FileText
} from 'lucide-react';
import { useActiveWork } from '../context/ActiveWorkContext';
import { detectSensitiveDataClient, redactPdf, SensitiveItem, SENSITIVE_PATTERNS } from '../services/sanitizeService';
import { apiClient } from '../services/apiClient';

// Initialize Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface RedactToolProps {
    darkMode: boolean;
    notify: any;
}

type RedactMode = 'auto' | 'search' | 'manual';

const RedactTool: React.FC<RedactToolProps> = ({ darkMode, notify }) => {
    const { setHasActiveWork } = useActiveWork();
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Active tool mode
    const [activeMode, setActiveMode] = useState<RedactMode>('auto');

    // Auto-detect State
    const [scanning, setScanning] = useState(false);
    const [detectedItems, setDetectedItems] = useState<SensitiveItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    // Search & Redact State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResultsCount, setSearchResultsCount] = useState<number | null>(null);
    const [searchPages, setSearchPages] = useState<number[]>([]);

    // Manual Canvas Redaction State
    const [redactions, setRedactions] = useState<{ page: number; x: number; y: number; w: number; h: number }[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    // Completed Download State
    const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync active work
    useEffect(() => {
        setHasActiveWork(file !== null && !resultBlobUrl);
        return () => setHasActiveWork(false);
    }, [file, resultBlobUrl, setHasActiveWork]);

    // Unified Scan Function
    const triggerScan = async (targetFile: File) => {
        setScanning(true);
        setStatusMessage('Scanning document with multi-pass geometry & PII detectors...');
        const aggregatedFindings: SensitiveItem[] = [];
        const seen = new Set<string>();

        const addItem = (item: any) => {
            const key = `${item.type}_p${item.page}_${item.value?.toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                aggregatedFindings.push({
                    id: item.id || `${item.type}_p${item.page}_${Math.random().toString(36).substr(2, 6)}`,
                    type: item.type,
                    label: item.label || item.type,
                    value: item.value,
                    masked: item.masked || (item.value ? `${item.value.slice(0, 2)}****${item.value.slice(-2)}` : '***'),
                    page: item.page || 1,
                    selected: true
                });
            }
        };

        try {
            // 1. Run local client-side geometry-aware detector
            const clientFindings = await detectSensitiveDataClient(targetFile);
            clientFindings.forEach(addItem);

            // 2. Query backend deep detector if online
            const isBackendUp = await apiClient.checkBackend();
            if (isBackendUp) {
                try {
                    const serverFindings = await apiClient.scanPdfSensitive(targetFile);
                    serverFindings.forEach(addItem);
                } catch (bErr) {
                    console.warn('Backend scan notice:', bErr);
                }
            }

            setDetectedItems(aggregatedFindings);
        } catch (err) {
            console.error('Scan error:', err);
        } finally {
            setScanning(false);
            setStatusMessage(null);
        }
    };

    // Handle File Upload
    const handleFilesSelected = async (files: File[]) => {
        if (files.length === 0) return;
        const uploadedFile = files[0];

        if (uploadedFile.type !== 'application/pdf' && !uploadedFile.name.toLowerCase().endsWith('.pdf')) {
            alert('Please upload a valid PDF file.');
            return;
        }

        setFile(uploadedFile);
        setResultBlobUrl(null);
        setRedactions([]);
        setDetectedItems([]);
        setSearchTerm('');
        setSearchResultsCount(null);
        setLoading(true);
        setStatusMessage('Loading PDF document...');

        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(loadedPdf);
            setCurrentPage(1);

            // Trigger deep scan
            await triggerScan(uploadedFile);
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Failed to load PDF.');
        } finally {
            setLoading(false);
            setStatusMessage(null);
        }
    };

    // Live search match count on term change
    useEffect(() => {
        if (!file || !searchTerm.trim() || !pdfDoc) {
            setSearchResultsCount(null);
            setSearchPages([]);
            return;
        }

        let cancelled = false;
        const countOccurrences = async () => {
            let total = 0;
            const pages: number[] = [];
            const termLower = searchTerm.toLowerCase();

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                try {
                    const page = await pdfDoc.getPage(i);
                    const content = await page.getTextContent();
                    const text = content.items.map((it: any) => it.str || '').join(' ').toLowerCase();
                    if (text.includes(termLower)) {
                        pages.push(i);
                        const matches = text.split(termLower).length - 1;
                        total += matches;
                    }
                } catch {
                    // skip
                }
            }

            if (!cancelled) {
                setSearchResultsCount(total);
                setSearchPages(pages);
            }
        };

        const timer = setTimeout(countOccurrences, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [file, searchTerm, pdfDoc]);

    // Render Page on Canvas for Manual Mode
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

    // Manual Drawing Handlers
    const getMousePos = (e: React.MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const pos = getMousePos(e);
        setIsDrawing(true);
        setStartPos(pos);
        setCurrentRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !startPos) return;
        const pos = getMousePos(e);
        const w = pos.x - startPos.x;
        const h = pos.y - startPos.y;

        setCurrentRect({
            x: w > 0 ? startPos.x : pos.x,
            y: h > 0 ? startPos.y : pos.y,
            w: Math.abs(w),
            h: Math.abs(h),
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentRect) return;
        setIsDrawing(false);

        if (currentRect.w > 5 && currentRect.h > 5) {
            setRedactions(prev => [
                ...prev,
                {
                    page: currentPage,
                    x: currentRect.x / scale,
                    y: currentRect.y / scale,
                    w: currentRect.w / scale,
                    h: currentRect.h / scale,
                }
            ]);
        }
        setCurrentRect(null);
        setStartPos(null);
    };

    const toggleItemSelection = (id: string) => {
        setDetectedItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
    };

    const selectAllDetected = (select: boolean) => {
        setDetectedItems(prev => prev.map(item => {
            if (selectedCategory === 'ALL' || item.type === selectedCategory) {
                return { ...item, selected: select };
            }
            return item;
        }));
    };

    // Execute Redaction (Supports Backend API with Client-Side Fallback)
    const executeRedaction = async (regionsToRedact: any[], termsToRedact: string[]) => {
        if (!file) return;
        setLoading(true);
        setStatusMessage('Irreversibly purging underlying text vectors and burning solid redactions...');

        try {
            let outputBytes: Uint8Array;
            const isBackendUp = await apiClient.checkBackend();

            if (isBackendUp) {
                try {
                    const res = await apiClient.submitJob('redact', file, {
                        redactions: regionsToRedact,
                        terms: termsToRedact
                    });
                    const arrayBuf = await res.outputBlob.arrayBuffer();
                    outputBytes = new Uint8Array(arrayBuf);
                } catch (bErr) {
                    console.warn("Backend redaction unavailable, executing client-side redaction:", bErr);
                    outputBytes = await redactPdf(file, regionsToRedact, termsToRedact);
                }
            } else {
                outputBytes = await redactPdf(file, regionsToRedact, termsToRedact);
            }

            const blob = new Blob([outputBytes as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setResultBlobUrl(url);
            if (notify && notify.complete) notify.complete();
        } catch (e: any) {
            console.error('Redaction failed:', e);
            alert(e.message || 'Redaction failed. Please try again.');
            if (notify && notify.error) notify.error();
        } finally {
            setLoading(false);
            setStatusMessage(null);
        }
    };

    // Trigger Redact from Auto-Detect
    const handleApplyAutoRedactions = async () => {
        const selectedValues = detectedItems.filter(i => i.selected).map(i => i.value);
        if (selectedValues.length === 0) {
            alert('Please select at least one item to redact.');
            return;
        }
        await executeRedaction([], selectedValues);
    };

    // Trigger Redact from Search
    const handleApplySearchRedactions = async () => {
        const term = searchTerm.trim();
        if (!term) {
            alert('Please enter a term to search and redact.');
            return;
        }
        await executeRedaction([], [term]);
    };

    // Trigger Redact from Manual Canvas
    const handleApplyManualRedactions = async () => {
        if (redactions.length === 0) {
            alert('Please draw at least one redaction box on the document.');
            return;
        }
        await executeRedaction(redactions, []);
    };

    // Initial Dropzone (Matches Merge PDF cleanly without top empty gaps)
    if (!file) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-2 animate-fadeIn">
                <FileUploader
                    onFilesSelected={handleFilesSelected}
                    accept=".pdf"
                    maxSizeMB={50}
                    darkMode={darkMode}
                />
            </div>
        );
    }

    const selectedCount = detectedItems.filter(i => i.selected).length;
    const categories = ['ALL', ...Array.from(new Set(detectedItems.map(i => i.type)))];

    return (
        <div className={`max-w-6xl mx-auto px-4 py-2 animate-fadeIn space-y-6`}>

            {/* Top Document Bar */}
            <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-sm ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm truncate max-w-sm sm:max-w-md">{file.name}</h2>
                        <span className="text-xs text-slate-400 font-medium">
                            {pdfDoc ? `${pdfDoc.numPages} Pages • ${Math.round(file.size / 1024)} KB` : 'Loading...'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => file && triggerScan(file)}
                        disabled={scanning}
                        className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                        title="Re-scan document for sensitive PII"
                    >
                        <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                        <span>{scanning ? 'Scanning...' : 'Re-Scan'}</span>
                    </button>
                    <button
                        onClick={() => {
                            setFile(null);
                            setResultBlobUrl(null);
                            setRedactions([]);
                            setDetectedItems([]);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                    >
                        Change File
                    </button>
                </div>
            </div>

            {/* Scanning Progress Banner */}
            {scanning && (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 flex items-center gap-3 text-amber-800 dark:text-amber-300 animate-pulse">
                    <Sparkles size={20} className="animate-spin text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-bold">Scanning document with multi-pass geometry & PII detectors (Aadhaar, PAN, Phone, Email, Bank Accounts)...</span>
                </div>
            )}

            {/* Completed Output Banner */}
            {resultBlobUrl && (
                <div className={`p-8 rounded-3xl border shadow-xl flex flex-col items-center gap-6 text-center animate-fadeIn ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-green-100'
                }`}>
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                        <CheckCircle2 size={36} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black">Document Redacted & Sanitized</h3>
                        <p className="text-sm text-slate-500 max-w-md">
                            All targeted sensitive text vectors, character glyphs, and metadata packets have been permanently eradicated.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <a
                            href={resultBlobUrl}
                            download={`pdfbolt_redacted_${file.name}`}
                            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black rounded-2xl text-lg shadow-xl hover:scale-105 transition-all flex items-center gap-3"
                        >
                            <Download size={22} /> Download Redacted PDF
                        </a>
                        <button
                            onClick={() => setResultBlobUrl(null)}
                            className="px-6 py-4 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                        >
                            Redact Another Item
                        </button>
                        <button
                            onClick={() => {
                                setFile(null);
                                setResultBlobUrl(null);
                                setRedactions([]);
                                setDetectedItems([]);
                            }}
                            className="px-6 py-4 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all flex items-center gap-2"
                        >
                            <FileText size={16} /> Process Another File
                        </button>
                    </div>
                </div>
            )}

            {/* Redaction Mode Switcher Tabs */}
            {!resultBlobUrl && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => setActiveMode('auto')}
                            className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-3 ${
                                activeMode === 'auto'
                                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 shadow-md'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <Sparkles size={18} className="text-red-600 dark:text-red-400" />
                            <span>1. Auto-Detect PII ({detectedItems.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveMode('search')}
                            className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-3 ${
                                activeMode === 'search'
                                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 shadow-md'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <Search size={18} className="text-red-600 dark:text-red-400" />
                            <span>2. Find & Redact Text</span>
                        </button>

                        <button
                            onClick={() => setActiveMode('manual')}
                            className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-3 ${
                                activeMode === 'manual'
                                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 shadow-md'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <ShieldAlert size={18} className="text-red-600 dark:text-red-400" />
                            <span>3. Manual Visual Studio ({redactions.length})</span>
                        </button>
                    </div>

                    {/* Mode 1: Auto-Detect Panel */}
                    {activeMode === 'auto' && (
                        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
                            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-black flex items-center gap-2">
                                        <Sparkles size={20} className="text-yellow-600" />
                                        Auto-Detected Sensitive Information
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {detectedItems.length > 0
                                            ? `Found ${detectedItems.length} candidate sensitive items (Aadhaar, PAN, Phone, Email, Bank Details).`
                                            : 'No standard patterns detected on document text layer. Click Re-Scan or use Find & Redact below.'}
                                    </p>
                                </div>

                                {detectedItems.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => selectAllDetected(true)}
                                            className="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => selectAllDetected(false)}
                                            className="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Category Filter Pills & 1-Click Auto Action */}
                            {detectedItems.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
                                        <div className="space-y-0.5">
                                            <span className="font-black text-sm uppercase tracking-wider block">1-Click Universal Auto-Redaction</span>
                                            <span className="text-xs text-white/90 font-medium">Instantly purge all {detectedItems.length} detected confidential details & sanitize metadata.</span>
                                        </div>
                                        <button
                                            disabled={loading}
                                            onClick={() => {
                                                selectAllDetected(true);
                                                handleApplyAutoRedactions();
                                            }}
                                            className="px-6 py-3 bg-white text-red-600 font-black rounded-xl text-sm shadow-md hover:scale-105 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                                        >
                                            <Lock size={16} /> ⚡ Auto-Redact All ({detectedItems.length})
                                        </button>
                                    </div>

                                    {categories.length > 1 && (
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(cat => {
                                                const count = cat === 'ALL' ? detectedItems.length : detectedItems.filter(i => i.type === cat).length;
                                                return (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setSelectedCategory(cat)}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                                            selectedCategory === cat
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <span>{cat === 'ALL' ? 'All' : cat}</span>
                                                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">{count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Detected Items List */}
                            {detectedItems.length === 0 ? (
                                <div className="p-8 text-center border border-dashed rounded-2xl text-slate-400 space-y-4">
                                    <ShieldAlert className="mx-auto w-10 h-10 text-slate-300 dark:text-slate-600" />
                                    <div className="space-y-1">
                                        <p className="text-base font-bold">No standard sensitive tokens detected automatically.</p>
                                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                                            If your document is a scanned image or has custom names/numbers, you can search and purge exact terms or draw boxes manually.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center pt-2">
                                        <button
                                            onClick={() => setActiveMode('search')}
                                            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 hover:opacity-90"
                                        >
                                            <Search size={14} /> Find & Redact by Name / Word
                                        </button>
                                        <button
                                            onClick={() => setActiveMode('manual')}
                                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                            <FileText size={14} /> Draw Boxes in Visual Studio
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                                    {detectedItems
                                        .filter(item => selectedCategory === 'ALL' || item.type === selectedCategory)
                                        .map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    toggleItemSelection(item.id);
                                                    if (item.page && item.page !== currentPage) {
                                                        setCurrentPage(item.page);
                                                    }
                                                }}
                                                className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                                                    item.selected
                                                        ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 truncate">
                                                    {item.selected ? (
                                                        <CheckSquare size={20} className="text-red-600 shrink-0" />
                                                    ) : (
                                                        <Square size={20} className="text-slate-400 shrink-0" />
                                                    )}
                                                    <div className="truncate">
                                                        <span className="text-xs font-black uppercase text-red-700 dark:text-red-400 block truncate">
                                                            {item.label}
                                                        </span>
                                                        <span className="font-mono font-bold text-sm tracking-wider block truncate">
                                                            {item.masked}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                    Page {item.page}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {detectedItems.length > 0 && (
                                <button
                                    disabled={loading || selectedCount === 0}
                                    onClick={handleApplyAutoRedactions}
                                    className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-2xl shadow-xl hover:scale-[1.01] transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Lock size={20} />
                                            <span>Redact Selected Items ({selectedCount})</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Mode 2: Find & Redact Panel */}
                    {activeMode === 'search' && (
                        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
                            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}>
                            <div>
                                <h3 className="text-lg font-black flex items-center gap-2">
                                    <Search size={20} className="text-yellow-600" />
                                    Find & Redact Specific Terms
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Type any person name, account number, company name, or confidential keyword to purge across all pages.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="e.g. Rahul Sharma, Confidential Project, ACME-1029..."
                                        className={`w-full p-5 pl-14 rounded-2xl text-lg font-bold border-2 focus:ring-4 transition-all outline-none ${
                                            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                    />
                                </div>

                                {searchResultsCount !== null && (
                                    <div className={`p-4 rounded-xl text-xs flex items-center justify-between ${
                                        searchResultsCount > 0
                                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                    }`}>
                                        <span className="font-bold">
                                            {searchResultsCount > 0
                                                ? `Found ${searchResultsCount} occurrence(s) on Pages ${searchPages.join(', ')}`
                                                : 'No occurrences found for this term.'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={loading || !searchTerm.trim() || searchResultsCount === 0}
                                onClick={handleApplySearchRedactions}
                                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-2xl shadow-xl hover:scale-[1.01] transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Lock size={20} />
                                        <span>Purge All Occurrences of "{searchTerm.trim() || 'Term'}"</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Mode 3: Manual Visual Redaction Studio */}
                    {activeMode === 'manual' && (
                        <div className={`rounded-3xl border overflow-hidden shadow-xl flex flex-col ${
                            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`} style={{ minHeight: '80vh' }}>

                            {/* Canvas Toolbar */}
                            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${
                                darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage <= 1}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl disabled:opacity-20"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="font-mono font-bold text-sm">{currentPage} / {pdfDoc?.numPages || 1}</span>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1))}
                                        disabled={!pdfDoc || currentPage >= pdfDoc.numPages}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl disabled:opacity-20"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut size={16} />
                                    </button>
                                    <span className="text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                                    <button
                                        onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                                        title="Zoom In"
                                    >
                                        <ZoomIn size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setRedactions(prev => prev.slice(0, -1))}
                                        disabled={redactions.length === 0}
                                        className="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                                    >
                                        Undo
                                    </button>
                                    <button
                                        onClick={() => setRedactions([])}
                                        disabled={redactions.length === 0}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 disabled:opacity-30"
                                    >
                                        Clear ({redactions.length})
                                    </button>
                                </div>

                                <button
                                    disabled={loading || redactions.length === 0}
                                    onClick={handleApplyManualRedactions}
                                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl shadow-md disabled:opacity-40 transition-all"
                                >
                                    Apply Redactions ({redactions.length})
                                </button>
                            </div>

                            {/* Canvas Viewer */}
                            <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-auto flex items-center justify-center p-8">
                                <div className="relative shadow-2xl" ref={containerRef}>
                                    <canvas ref={canvasRef} className="block bg-white" />

                                    {/* Redaction Overlay Layer */}
                                    <div
                                        className="absolute inset-0 cursor-crosshair touch-none"
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                    >
                                        {redactions.filter(r => r.page === currentPage).map((r, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    left: r.x * scale,
                                                    top: r.y * scale,
                                                    width: r.w * scale,
                                                    height: r.h * scale
                                                }}
                                                className="absolute bg-black/80 border border-red-500"
                                            />
                                        ))}

                                        {isDrawing && currentRect && (
                                            <div
                                                style={{
                                                    left: currentRect.x,
                                                    top: currentRect.y,
                                                    width: currentRect.w,
                                                    height: currentRect.h
                                                }}
                                                className="absolute bg-black/40 border-2 border-dashed border-red-500"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RedactTool;
