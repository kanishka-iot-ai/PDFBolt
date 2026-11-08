import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, 
  FileText, Table, Image as ImageIcon, Sparkles, CheckCircle2, RotateCw, Loader2, ArrowRight, Monitor
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';

// Initialize PDF.js worker statically with reliable CDN fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
  }
}

export interface OutputPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'jpg' | 'png' | 'zip' | 'txt';
  downloadUrl?: string;
  originalSizeBytes?: number;
  outputSizeBytes?: number;
  darkMode?: boolean;
}

export const OutputPreviewModal: React.FC<OutputPreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  downloadUrl,
  originalSizeBytes,
  outputSizeBytes,
  darkMode = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF Viewer State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomScale, setZoomScale] = useState(1.25);
  const [rotation, setRotation] = useState(0);
  const [useNativePdfFallback, setUseNativePdfFallback] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // DOCX HTML State
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // XLSX Spreadsheet State
  const [sheets, setSheets] = useState<{ name: string; rows: (string | number)[][] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // ZIP / Multi-Image State
  const [zipFiles, setZipFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  const [activeZipFileIdx, setActiveZipFileIdx] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Load preview data when fileUrl or fileType changes
  useEffect(() => {
    if (!isOpen || !fileUrl) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setPdfDoc(null);
    setDocxHtml(null);
    setSheets([]);
    setZipFiles([]);
    setUseNativePdfFallback(false);

    const loadPreview = async () => {
      try {
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        if (fileType === 'pdf') {
          try {
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
            }

            const copyBuffer = arrayBuffer.slice(0);
            const loadedPdf = await pdfjsLib.getDocument({
              data: new Uint8Array(copyBuffer),
              cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
              cMapPacked: true,
            }).promise;

            if (isCancelled) return;
            setPdfDoc(loadedPdf);
            setTotalPages(loadedPdf.numPages);
            setLoading(false);
          } catch (pdfErr) {
            console.warn('[OutputPreviewModal] PDF.js canvas notice, switching to native PDF viewer:', pdfErr);
            if (!isCancelled) {
              setUseNativePdfFallback(true);
              setLoading(false);
            }
          }
        } else if (fileType === 'docx') {
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (isCancelled) return;
          setDocxHtml(result.value);
          setLoading(false);
        } else if (fileType === 'xlsx') {
          const ExcelJS = (await import('exceljs')).default;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);
          if (isCancelled) return;

          const extractedSheets: { name: string; rows: (string | number)[][] }[] = [];
          workbook.eachSheet((sheet) => {
            const rows: (string | number)[][] = [];
            sheet.eachRow({ includeEmpty: false }, (row) => {
              const rowValues = Array.isArray(row.values) 
                ? row.values.slice(1).map(val => (val !== null && val !== undefined ? String(val) : ''))
                : [];
              rows.push(rowValues);
            });
            extractedSheets.push({ name: sheet.name, rows });
          });

          setSheets(extractedSheets);
          setLoading(false);
        } else if (fileType === 'zip') {
          // Unpack ZIP to preview extracted images/PDFs
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            const filesList: { name: string; url: string; type: string }[] = [];
            
            const entries = Object.keys(zip.files);
            for (const filename of entries) {
              const entry = zip.files[filename];
              if (!entry.dir) {
                const blob = await entry.async('blob');
                const lower = filename.toLowerCase();
                const type = lower.endsWith('.pdf') ? 'pdf' : lower.endsWith('.png') ? 'png' : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'jpg' : 'other';
                filesList.push({
                  name: filename,
                  url: URL.createObjectURL(blob),
                  type
                });
              }
            }

            if (!isCancelled) {
              setZipFiles(filesList);
              setLoading(false);
            }
          } catch (zipErr: any) {
            console.warn('[OutputPreviewModal] ZIP preview notice:', zipErr);
            setLoading(false);
          }
        } else {
          // Images, TXT, etc.
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[OutputPreviewModal] Load error:', err);
          setError(err?.message || 'Could not load preview. Please use direct download.');
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, fileUrl, fileType]);

  // Clean up object URLs created for ZIP entries
  useEffect(() => {
    return () => {
      zipFiles.forEach(f => URL.revokeObjectURL(f.url));
    };
  }, [zipFiles]);

  // Render PDF page to canvas
  useEffect(() => {
    if (!pdfDoc || fileType !== 'pdf' || !canvasRef.current) return;

    let isCurrent = true;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Task cancellation is safe to ignore
          }
        }

        const page = await pdfDoc.getPage(currentPage);
        if (!isCurrent || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: zoomScale, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[OutputPreviewModal] PDF render page error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCurrent = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, zoomScale, rotation, fileType]);

  if (!isOpen) return null;

  // Formatting helpers
  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const deltaPct = originalSizeBytes && outputSizeBytes && originalSizeBytes > 0
    ? Math.round(((originalSizeBytes - outputSizeBytes) / originalSizeBytes) * 100)
    : null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className={`relative w-full max-w-6xl h-[92vh] flex flex-col rounded-3xl overflow-hidden border shadow-2xl transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
      }`}>
        
        {/* ── HEADER TOOLBAR ── */}
        <header className={`px-4 sm:px-6 py-3.5 border-b shrink-0 flex items-center justify-between gap-3 ${
          darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
        }`}>
          {/* File Information & Size Delta Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
              {fileType === 'pdf' ? <FileText size={20} /> : fileType === 'xlsx' ? <Table size={20} /> : <FileText size={20} />}
            </div>
            <div className="min-w-0">
              <h2 id="preview-modal-title" className="text-sm sm:text-base font-black truncate max-w-xs sm:max-w-md">
                {fileName || 'Output Document Preview'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {fileType.toUpperCase()}
                </span>
                
                {/* Size Delta Badge */}
                {outputSizeBytes ? (
                  <span className="flex items-center gap-1 font-medium">
                    {originalSizeBytes && originalSizeBytes !== outputSizeBytes && (
                      <span className="line-through text-slate-400">{formatBytes(originalSizeBytes)}</span>
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatBytes(outputSizeBytes)}</span>
                    {deltaPct && deltaPct > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        <svg className="w-3 h-3 -rotate-90 transform" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="12" className="stroke-emerald-200 dark:stroke-emerald-900/60 fill-none" strokeWidth="3.5" />
                          <circle
                            cx="16" cy="16" r="12"
                            className="stroke-emerald-600 dark:stroke-emerald-400 fill-none"
                            strokeWidth="3.5"
                            strokeDasharray={75.4}
                            strokeDashoffset={75.4 - (Math.min(100, deltaPct) / 100) * 75.4}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>{deltaPct}% Smaller</span>
                      </span>
                    ) : deltaPct && deltaPct < 0 ? (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                        +{Math.abs(deltaPct)}% Rich Format
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 size={11} /> 100% Fidelity
                      </span>
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Interactive Controls (Zoom / Page Navigation / Rotation) */}
          <div className="flex items-center gap-2 shrink-0">
            {fileType === 'pdf' && totalPages > 1 && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30 transition-colors"
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-1.5 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30 transition-colors"
                  aria-label="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {fileType === 'pdf' && (
              <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                {!useNativePdfFallback && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoomScale(s => Math.max(0.6, s - 0.2))}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      aria-label="Zoom out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="text-[11px] font-bold px-1 tabular-nums">{Math.round(zoomScale * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomScale(s => Math.min(2.5, s + 0.2))}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      aria-label="Zoom in"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ml-1 border-l border-slate-200 dark:border-slate-700 pl-1.5"
                      aria-label="Rotate View"
                    >
                      <RotateCw size={15} />
                    </button>
                  </>
                )}
                {fileUrl && (
                  <button
                    type="button"
                    onClick={() => setUseNativePdfFallback(v => !v)}
                    className="p-1 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-1 ml-1"
                    title={useNativePdfFallback ? "Switch to Canvas View" : "Switch to Native Browser PDF Viewer"}
                  >
                    <Monitor size={14} />
                    <span>{useNativePdfFallback ? "Canvas View" : "Native View"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Direct Instant Download CTA */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={fileName}
                className="px-3.5 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl transition-colors"
              aria-label="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* ── PREVIEW CANVAS / CONTENT CANVAS ── */}
        <div className={`flex-grow w-full overflow-auto flex items-center justify-center p-4 sm:p-6 md:p-8 relative ${
          darkMode ? 'bg-slate-950/90' : 'bg-slate-100/90'
        }`}>
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="w-10 h-10 text-yellow-600 dark:text-yellow-400 animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Rendering High-Fidelity Output Preview...
              </p>
            </div>
          )}

          {error && (
            <div className="max-w-md p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center text-red-900 dark:text-red-200 space-y-2">
              <h3 className="font-bold text-sm">Preview Unavailable in Browser</h3>
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Download size={14} /> Download File Directly
                </a>
              )}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* 1. PDF PREVIEW (High-Fidelity Canvas or Native Embed Fallback) */}
              {fileType === 'pdf' && (
                useNativePdfFallback && fileUrl ? (
                  <div className="w-full h-[75vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white">
                    <embed
                      src={`${fileUrl}#toolbar=1&navpanes=0`}
                      type="application/pdf"
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white transition-all">
                    <canvas ref={canvasRef} className="block mx-auto max-w-full" />
                  </div>
                )
              )}

              {/* 2. WORD (DOCX) AUTHENTIC DOCUMENT VIEW */}
              {fileType === 'docx' && docxHtml && (
                <div className="w-full max-w-4xl bg-white text-slate-900 p-8 sm:p-12 md:p-16 rounded-2xl shadow-2xl border border-slate-200 overflow-y-auto max-h-[75vh] select-text">
                  <div 
                    className="prose prose-slate max-w-none prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl prose-p:text-sm prose-p:leading-relaxed prose-table:border prose-table:text-xs"
                    dangerouslySetInnerHTML={{ __html: docxHtml }} 
                  />
                </div>
              )}

              {/* 3. EXCEL (XLSX) SPREADSHEET TABLE VIEW */}
              {fileType === 'xlsx' && sheets.length > 0 && (
                <div className="w-full max-w-5xl h-[75vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden select-text">
                  {/* Sheet Tabs */}
                  {sheets.length > 1 && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-xs font-bold">
                      {sheets.map((sh, idx) => (
                        <button
                          key={sh.name}
                          type="button"
                          onClick={() => setActiveSheetIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg border transition-all ${
                            activeSheetIndex === idx
                              ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-yellow-400'
                          }`}
                        >
                          {sh.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Spreadsheet Grid */}
                  <div className="flex-grow overflow-auto p-4">
                    <table className="w-full border-collapse text-xs font-mono">
                      <tbody>
                        {sheets[activeSheetIndex]?.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 dark:bg-slate-800 font-bold' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800'}>
                            <td className="px-2.5 py-1.5 text-center text-[10px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 w-10">
                              {rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 whitespace-nowrap text-slate-800 dark:text-slate-200">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. IMAGE PREVIEW */}
              {(fileType === 'jpg' || fileType === 'png') && fileUrl && (
                <div className="max-w-4xl max-h-[75vh] flex items-center justify-center p-2">
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* 5. ZIP ARCHIVE PREVIEW */}
              {fileType === 'zip' && zipFiles.length > 0 && (
                <div className="w-full max-w-5xl h-[75vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-xs font-bold">
                    {zipFiles.map((zf, idx) => (
                      <button
                        key={zf.name}
                        type="button"
                        onClick={() => setActiveZipFileIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg border transition-all ${
                          activeZipFileIdx === idx
                            ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-yellow-400'
                        }`}
                      >
                        {zf.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex-grow overflow-auto p-4 flex items-center justify-center">
                    {zipFiles[activeZipFileIdx]?.type === 'pdf' ? (
                      <embed
                        src={`${zipFiles[activeZipFileIdx].url}#toolbar=1`}
                        type="application/pdf"
                        className="w-full h-full border-0 rounded-xl"
                      />
                    ) : zipFiles[activeZipFileIdx]?.type === 'jpg' || zipFiles[activeZipFileIdx]?.type === 'png' ? (
                      <img
                        src={zipFiles[activeZipFileIdx].url}
                        alt={zipFiles[activeZipFileIdx].name}
                        className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md"
                      />
                    ) : (
                      <div className="text-center p-8 text-slate-500">
                        <FileText size={48} className="mx-auto mb-2 text-slate-400" />
                        <p className="font-bold">{zipFiles[activeZipFileIdx]?.name}</p>
                        <p className="text-xs">Archive content ready for download.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER STATUS / MOBILE CONTROLS ── */}
        <footer className={`px-4 sm:px-6 py-2.5 border-t shrink-0 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 ${
          darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-yellow-600 dark:text-yellow-400" />
            <span className="font-semibold">Interactive Output Fidelity Preview • 100% Private Local Memory</span>
          </div>

          {fileType === 'pdf' && totalPages > 1 && (
            <div className="flex sm:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold"
              >
                Prev
              </button>
              <span className="font-bold">{currentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold"
              >
                Next
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default OutputPreviewModal;
