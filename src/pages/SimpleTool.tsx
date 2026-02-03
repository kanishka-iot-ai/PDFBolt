import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import { rotateFile, addPageNumbers, compressPdf, watermarkPdf, deletePages, splitPdf, imagesToPdf } from '../services/pdfService';
import { wordToPdf, excelToPdf, htmlToPdf, pdfToJpg, pdfToWord } from '../services/conversionService';
import { protectPdf, unlockPdf, signPdf } from '../services/securityService';
import { ocrPdf } from '../services/ocrService';
import { pdfToPpt } from '../services/pptService';
import { redactPdf, repairPdf } from '../services/sanitizeService';
import { FileText, Download, CheckCircle2, Settings2, Eye, X, Image as ImageIcon, Lock, Key, PenTool } from 'lucide-react';
import { NotifySystem } from '../types';
import ProgressBar from '../components/ProgressBar';
import { validateFiles, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';

const SimpleTool: React.FC<{ title: string; mode: string; darkMode: boolean; notify: NotifySystem }> = ({ title, mode, darkMode, notify }) => {
  useEffect(() => { console.log("SimpleTool Loaded - Signature Update v5"); }, []);
  const [file, setFile] = useState<File | null>(null);
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | { name: string, url: string }[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState('recommended');
  const [pageInput, setPageInput] = useState('');
  const [password, setPassword] = useState('');
  const [isZip, setIsZip] = useState(false);
  const [isDoc, setIsDoc] = useState(false);
  const [isPpt, setIsPpt] = useState(false);
  const [isText, setIsText] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [resultKey, setResultKey] = useState(0);

  // New States
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  // const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('upload'); // Removed as per request
  const [signaturePosition, setSignaturePosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Canvas Logic
  // Canvas Logic
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling on touch devices strictly while drawing
    if (e.cancelable && 'touches' in e) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Cleanup blob URLs
  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (typeof result === 'string') {
        URL.revokeObjectURL(result);
      } else if (Array.isArray(result)) {
        result.forEach(f => URL.revokeObjectURL(f.url));
      }
    };
  }, [result]);

  const isImageTool = mode === 'jpg2pdf';
  const needsPassword = ['protect', 'unlock'].includes(mode);
  const isSignTool = mode === 'sign';

  const handle = async (f: File[]) => {
    if (f.length === 0) return; // Prevent reset on empty updates

    // Validate files before accepting
    let allowedTypes: string[];

    if (isImageTool) {
      allowedTypes = ALLOWED_MIME_TYPES.IMAGE;
    } else if (mode.includes('word') || mode === 'word2pdf') {
      allowedTypes = ALLOWED_MIME_TYPES.WORD;
    } else if (mode.includes('excel') || mode === 'excel2pdf') {
      allowedTypes = ALLOWED_MIME_TYPES.EXCEL;
    } else if (mode.includes('ppt') && mode.includes('2pdf')) {
      allowedTypes = ALLOWED_MIME_TYPES.POWERPOINT;
    } else if (mode.includes('html') || mode === 'html2pdf') {
      allowedTypes = ALLOWED_MIME_TYPES.HTML;
    } else {
      // Default to PDF for all other tools
      allowedTypes = ALLOWED_MIME_TYPES.PDF;
    }

    const maxSize = isImageTool ? MAX_FILE_SIZE.IMAGE : MAX_FILE_SIZE.PDF;

    const validation = await validateFiles(f, {
      allowedTypes,
      maxSize,
      maxFiles: isImageTool ? 50 : 1,
      checkStructure: allowedTypes === ALLOWED_MIME_TYPES.PDF
    });

    if (!validation.valid) {
      alert(validation.error || 'Invalid file');
      return;
    }

    if (validation.warning) {
      if (!confirm(`${validation.warning}\n\nDo you want to continue?`)) {
        return;
      }
    }

    if (isImageTool) {
      setMultiFiles(prev => [...prev, ...f]);
    } else {
      setFile(f[0]);
    }
    setResult(null);
    setPageInput('');
    setPassword('');
    setSignatureFile(null);
    setIsZip(false);
    setIsDoc(false);
    setIsPpt(false);
    setIsText(false);
    setProgress(0);
    setProcessingStatus('processing');
    notify.upload();
  };

  const handleSignature = (f: File[]) => {
    setSignatureFile(f[0]);
  };

  const process = async () => {
    if (!file && multiFiles.length === 0) return;
    setProcessing(true);
    setProgress(10);
    setProcessingStatus('processing');
    try {
      let b: Uint8Array | Blob | string | { name: string, blob: Blob }[];
      setProgress(25);

      // -- EDIT TOOLS --
      if (mode === 'rotate' && file) b = await rotateFile(file, 90);
      else if (mode === 'numbers' && file) b = await addPageNumbers(file);
      else if (mode === 'compress' && file) b = await compressPdf(file, compressionLevel);
      else if (mode === 'watermark' && file) b = await watermarkPdf(file, watermarkText || 'CONFIDENTIAL');
      else if (mode === 'split' && file) {
        if (!pageInput) throw new Error("Please enter a page range (e.g. 1-2, 4)");
        b = await splitPdf(file, pageInput);
      }
      else if ((mode === 'delete-pages' || mode === 'organize') && file) {
        if (!pageInput) throw new Error("Please enter page numbers (e.g. 2, 4, 10)");
        b = await deletePages(file, pageInput);
      }
      // -- CONVERSION TOOLS --
      else if (isImageTool) {
        if (multiFiles.length === 0) throw new Error("No images selected.");
        b = await imagesToPdf(multiFiles);
      }
      else if (mode === 'word2pdf' && file) b = await wordToPdf(file);
      else if (mode === 'excel2pdf' && file) b = await excelToPdf(file);
      else if (mode === 'html2pdf' && file) b = await htmlToPdf(file);
      else if (mode === 'pdf2jpg' && file) {
        // Now returns array
        b = await pdfToJpg(file);
      }
      else if ((mode === 'pdf2word' || mode === 'pdf2doc') && file) {
        b = await pdfToWord(file);
        setIsDoc(true);
      }
      // -- NEW ADVANCED TOOLS --
      else if ((mode === 'pdf2ppt' || mode === 'ppt2pdf') && file) {
        if (mode.includes('pdf2ppt')) {
          b = await pdfToPpt(file);
          setIsPpt(true);
        } else {
          throw new Error("PPT to PDF requires server conversion. Please use Word to PDF instead.");
        }
      }
      else if (mode === 'ocr' && file) {
        b = await ocrPdf(file);
        setIsText(true);
      }
      else if (mode === 'redact' && file) {
        b = await redactPdf(file);
      }
      else if (mode === 'repair' && file) {
        b = await repairPdf(file);
      }
      // -- SECURITY TOOLS --
      else if (mode === 'protect' && file) {
        if (!password) throw new Error("Please enter a password.");
        b = await protectPdf(file, password);
      }
      else if (mode === 'unlock' && file) {
        if (!password) throw new Error("Please enter the password.");
        b = await unlockPdf(file, password);
      }
      else if (mode === 'sign' && file) {
        let sigBlob: File | Blob | null = null;

        // Always usage draw mode
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Signature canvas not found.");

        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        if (canvas.toDataURL() === blank.toDataURL()) throw new Error("Please draw a signature.");

        sigBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

        if (!sigBlob) throw new Error("Please provide a signature.");
        b = await signPdf(file, sigBlob, signaturePosition);
      }
      else {
        // Fallback
        if (!file) throw new Error("No file selected.");
        b = await file.arrayBuffer().then(ab => new Uint8Array(ab));
      }

      setProgress(60);

      if (Array.isArray(b)) {
        const results = b.map(item => ({
          name: item.name,
          url: URL.createObjectURL(item.blob)
        }));
        setResult(results);
      } else {
        let type = 'application/pdf';
        if (isZip) type = 'application/zip';
        if (isDoc) type = 'application/msword';
        if (isPpt) type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        if (isText) type = 'text/plain';

        setProgress(85);
        const blob = b instanceof Blob ? b : new Blob([b instanceof Uint8Array ? b : b] as BlobPart[], { type });

        if (blob.size === 0) {
          throw new Error("Generated file is empty. Please try again with a different configuration.");
        }

        setProgress(95);
        setResult(URL.createObjectURL(blob));
        setResultKey(prev => prev + 1);
      }

      setProgress(100);
      setProcessingStatus('complete');
      notify.complete();
    } catch (err: any) {
      setProcessingStatus('error');
      notify.error();
      console.error(err);
      alert(err.message || 'Processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  const needsPageInput = ['split', 'delete-pages', 'organize'].includes(mode);

  return (
    <div className="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 className="text-6xl font-black mb-16 leading-tight animate-fadeIn">{title}</h1>

      {!file && multiFiles.length === 0 ? (
        <div className="space-y-12">
          <FileUploader
            multiple={isImageTool}
            accept={isImageTool ? "image/*" : (mode.includes('word') ? ".docx" : mode.includes('excel') ? ".xlsx" : mode.includes('html') ? ".html" : ".pdf")}
            onFilesSelected={handle}
            darkMode={darkMode}
          />
        </div>
      ) : (
        <div className="animate-fadeIn max-w-3xl mx-auto space-y-12">
          {/* File Status Card */}
          <div className={`p-8 rounded-[2.5rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-xl'}`}>
            <div className="flex items-center gap-6 text-left">
              <div className="bg-yellow-500/10 p-4 rounded-2xl">
                {isImageTool ? <ImageIcon className="text-yellow-500 w-10 h-10" /> : <FileText className="text-yellow-500 w-10 h-10" />}
              </div>
              <div className="overflow-hidden">
                <h3 className={`text-xl font-black truncate max-w-[250px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isImageTool ? `${multiFiles.length} Images Selected` : file?.name}
                </h3>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  {result ? 'FILE READY' : 'AWAITING CONFIGURATION'}
                </p>
              </div>
            </div>
            {!processing && (
              <button onClick={() => { setFile(null); setMultiFiles([]); setResult(null); }} className="text-yellow-600 font-black text-xs hover:underline uppercase tracking-tighter">Clear All</button>
            )}
          </div>

          {/* Progress Bar - shown during processing */}
          {processing && (
            <ProgressBar
              progress={progress}
              label={`Processing ${title}...`}
              darkMode={darkMode}
              status={processingStatus}
              fileName={file?.name || `${multiFiles.length} files`}
            />
          )}

          {!result && (
            <div className={`p-10 rounded-[3rem] border shadow-2xl text-left transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-3 mb-8">
                <Settings2 className="text-yellow-600 w-6 h-6" />
                <h4 className={`text-2xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tool Configuration</h4>
              </div>

              {isSignTool && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-500">Draw Signature</p>
                    <div className="border-2 border-slate-300 dark:border-slate-600 rounded-2xl overflow-hidden bg-white touch-none">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={200}
                        style={{ touchAction: 'none' }}
                        className="w-full h-48 cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={endDrawing}
                        onMouseLeave={endDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={endDrawing}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button onClick={clearCanvas} className="text-xs font-bold text-red-500 uppercase hover:text-red-600">Clear Signature</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Position</p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setSignaturePosition('bottom-right')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${signaturePosition === 'bottom-right' ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        Bottom Right
                      </button>
                      <button
                        onClick={() => setSignaturePosition('bottom-left')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${signaturePosition === 'bottom-left' ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        Bottom Left
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'watermark' && (
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Watermark Text</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="CONFIDENTIAL"
                    className={`w-full p-6 rounded-2xl text-xl font-bold border-2 focus:ring-4 transition-all outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              )}

              {mode === 'ocr' && (
                <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl mb-4">
                  <p className="font-bold">Info: OCR processing happens locally and may take some time for large files.</p>
                </div>
              )}

              {mode === 'redact' && (
                <div className="p-4 bg-orange-50 text-orange-800 rounded-2xl mb-4">
                  <p className="font-bold">Warning: This will convert all pages to images to permanently sanitize hidden text. Quality may be slightly reduced.</p>
                </div>
              )}

              {mode === 'compress' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['low', 'recommended', 'extreme'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setCompressionLevel(l)}
                      className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-2 ${compressionLevel === l
                        ? 'bg-red-600 border-red-500 text-white shadow-xl scale-105'
                        : darkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                    >
                      <span className="font-black text-lg uppercase">{l === 'low' ? 'Pro' : l === 'recommended' ? 'Smart' : 'Lite'}</span>
                    </button>
                  ))}
                </div>
              )}

              {needsPageInput && (
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Page Numbers or Range</label>
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    placeholder={mode === 'split' ? "e.g. 1-5, 8, 11-15" : "e.g. 2, 4, 10"}
                    className={`w-full p-6 rounded-2xl text-xl font-bold border-2 focus:ring-4 transition-all outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                  />
                </div>
              )}

              {needsPassword && (
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                    {mode === 'protect' ? 'Set Encryption Password' : 'Enter Password to Unlock'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full p-6 pl-14 rounded-2xl text-xl font-bold border-2 focus:ring-4 transition-all outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                    />
                  </div>
                </div>
              )}

              {isImageTool && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {multiFiles.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="Thumb" />
                        <button onClick={() => setMultiFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-600 text-white p-0.5"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-8">
            {result ? (
              <div key={resultKey} className="flex flex-col items-center gap-8 w-full animate-fadeInUp">
                <div className="flex items-center gap-4 text-green-500 font-black bg-green-50 dark:bg-green-900/20 px-10 py-5 rounded-[2rem] border border-green-100 dark:border-green-800">
                  <CheckCircle2 size={32} />
                  <span className="text-2xl">Processing Complete</span>
                </div>

                {Array.isArray(result) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    {result.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        download={item.name}
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border rounded-xl hover:shadow-lg transition-all"
                      >
                        <span className="truncate font-bold max-w-[200px]">{item.name}</span>
                        <Download size={20} className="text-yellow-600" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 w-full">
                    {/* Standard single file download */}
                    {!isZip && !isDoc && !isPpt && !isText && (
                      <button onClick={() => setShowPreview(true)} className="flex-1 py-5 rounded-2xl font-black border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                        <Eye size={20} /> Preview
                      </button>
                    )}
                    <a
                      href={result}
                      download={`pdfbolt_${mode}_output.${isZip ? 'zip' : isDoc ? 'doc' : isPpt ? 'pptx' : isText ? 'txt' : 'pdf'}`}
                      onClick={() => notify.success()}
                      className="flex-1 flex items-center justify-center gap-4 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-xl shadow-2xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all"
                    >
                      <Download size={24} /> Download {isZip ? 'ZIP' : isDoc ? 'DOC' : isPpt ? 'PPT' : isText ? 'TXT' : 'PDF'}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <button
                disabled={processing || (needsPageInput && !pageInput) || (needsPassword && !password) || (isImageTool && multiFiles.length === 0)}
                onClick={process}
                className="w-full max-w-xl px-10 py-8 bg-red-600 text-white rounded-[2.5rem] font-black text-3xl shadow-2xl hover:bg-red-700 hover:scale-105 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group"
              >
                {processing ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Process {title}</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {showPreview && result && !Array.isArray(result) && !isZip && !isDoc && !isPpt && !isText && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-6xl h-[92vh] bg-white dark:bg-slate-800 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 flex justify-between items-center border-b dark:border-slate-700">
              <h5 className="font-black text-xl">Result Preview</h5>
              <button onClick={() => setShowPreview(false)} className="p-3 bg-yellow-50 text-yellow-600 hover:bg-yellow-600 hover:text-white rounded-2xl transition-all"><X size={28} /></button>
            </div>
            <div className="flex-grow w-full bg-slate-200 dark:bg-slate-900 relative">
              <embed src={`${result}#toolbar=1`} type="application/pdf" className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SimpleTool;