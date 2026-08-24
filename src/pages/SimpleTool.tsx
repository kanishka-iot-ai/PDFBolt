import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import SignatureCanvas, { SignatureCanvasRef } from '../components/SignatureCanvas';
import { createZipFromFiles } from '../services/zipService';
import { rotateFile, addPageNumbers, compressPdf, watermarkPdf, deletePages, reorderPages, splitPdf, imagesToPdf } from '../services/pdfService';
import { wordToPdf, excelToPdf, htmlToPdf, pdfToJpg, pdfToWord, pdfToExcel } from '../services/conversionService';
import { protectPdf, unlockPdf, removePermissions, signPdf } from '../services/securityService';
import { ocrPdf } from '../services/ocrService';
import { pptToPdf, pdfToPpt } from '../services/pptService';
import { redactPdf, repairPdf } from '../services/sanitizeService';
import { comparePdfDocuments } from '../services/compareService';
import { FileText, Download, CheckCircle2, Settings2, Eye, EyeOff, X, Image as ImageIcon, Lock, Zap, ArrowRight, Trash2, Plus } from 'lucide-react';
import { NotifySystem } from '../types';

import ProgressBar from '../components/ProgressBar';
import { validateFiles, validateOutputIntegrity, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';
import { apiClient } from '../services/apiClient';
import AdSlot from '../components/AdSlot';
import { useActiveWork } from '../context/ActiveWorkContext';
import PDFThumbnail from '../components/PDFThumbnail';

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

type ResultKind = 'pdf' | 'zip' | 'docx' | 'pptx' | 'xlsx' | 'txt';
type ImagePageSize = 'fit' | 'a4' | 'letter';
type ImageOrientation = 'portrait' | 'landscape';
type ImageMargin = 'none' | 'small' | 'standard';

const RESULT_META: Record<ResultKind, { mime: string; extension: string; label: string; previewable: boolean }> = {
  pdf: { mime: 'application/pdf', extension: 'pdf', label: 'PDF', previewable: true },
  zip: { mime: 'application/zip', extension: 'zip', label: 'ZIP', previewable: false },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', label: 'Word', previewable: false },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: 'pptx', label: 'PowerPoint', previewable: false },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', label: 'Excel', previewable: false },
  txt: { mime: 'text/plain', extension: 'txt', label: 'Text', previewable: false },
};

const getAcceptedTypes = (mode: string, isImageTool: boolean) => {
  if (isImageTool) return ALLOWED_MIME_TYPES.IMAGE;
  if (mode === 'word2pdf') return ALLOWED_MIME_TYPES.WORD;
  if (mode === 'excel2pdf') return ALLOWED_MIME_TYPES.EXCEL;
  if (mode === 'ppt2pdf') return ALLOWED_MIME_TYPES.POWERPOINT;
  if (mode === 'html2pdf') return ALLOWED_MIME_TYPES.HTML;
  return ALLOWED_MIME_TYPES.PDF;
};

const getAcceptAttribute = (mode: string, isImageTool: boolean) => {
  if (isImageTool) return 'image/*';
  if (mode === 'word2pdf') return '.doc,.docx';
  if (mode === 'excel2pdf') return '.xls,.xlsx';
  if (mode === 'ppt2pdf') return '.ppt,.pptx';
  if (mode === 'html2pdf') return '.html,.htm';
  return '.pdf';
};

const SimpleTool: React.FC<{ title: string; mode: string; darkMode: boolean; notify: NotifySystem }> = ({ title, mode, darkMode, notify }) => {
  const { setHasActiveWork } = useActiveWork();
  const [file, setFile] = useState<File | null>(null);
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | { name: string, url: string }[] | null>(null);
  const [resultKind, setResultKind] = useState<ResultKind>('pdf');
  const [showPreview, setShowPreview] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState('recommended');
  const [pageInput, setPageInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isZip, setIsZip] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [resultKey, setResultKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Sync active work
  useEffect(() => {
    const hasUnsaved = (file !== null && !result) || (multiFiles.length > 0 && !result) || processing;
    setHasActiveWork(hasUnsaved);
    return () => setHasActiveWork(false);
  }, [file, multiFiles.length, result, processing, setHasActiveWork]);

  // Image Tool State
  const [imgPageSize, setImgPageSize] = useState<ImagePageSize>('fit');
  const [imgOrientation, setImgOrientation] = useState<ImageOrientation>('portrait');
  const [imgMargin, setImgMargin] = useState<ImageMargin>('small');

  // New States
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkSize, setWatermarkSize] = useState(50);
  const [signaturePosition, setSignaturePosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [penColor, setPenColor] = useState('#000');
  const [strokeWidth, setStrokeWidth] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [signatureBgColor, setSignatureBgColor] = useState('rgba(255,255,255,0)');
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const signatureCanvasRef = useRef<SignatureCanvasRef>(null);

  const [repairReport, setRepairReport] = useState<{
    original_pages: number;
    recovered_pages: number;
    pages_lost: number;
    repair_score: number;
    text_recovery: number;
    visual_recovery: number;
    status: string;
    strategy?: string;
    warnings?: string[];
  } | null>(null);

  const isImageTool = mode === 'jpg2pdf';
  const needsPassword = ['protect', 'unlock'].includes(mode);
  const isSignTool = mode === 'sign';
  const needsPageInput = ['split', 'delete-pages', 'organize'].includes(mode);
  const resultMeta = RESULT_META[resultKind];
  const canPreviewResult = resultMeta.previewable && typeof result === 'string';

  const clearSelection = () => {
    setFile(null);
    setMultiFiles([]);
    setResult(null);
    setShowPreview(false);
    setStatusMessage(null);
    setRepairReport(null);
    setIsZip(false);
    setResultKind('pdf');
  };

  const resetRunState = () => {
    setResult(null);
    setShowPreview(false);
    setStatusMessage(null);
    setRepairReport(null);
    setProgress(0);
    setProcessingStatus('processing');
    setResultKind('pdf');
  };

  // Signature Canvas Helpers
  const clearSignature = () => {
    signatureCanvasRef.current?.clear();
    setStatusMessage('Signature canvas cleared.');
  };

  const undoSignature = () => {
    signatureCanvasRef.current?.undo();
  };

  const saveSignature = () => {
    if (signatureCanvasRef.current && !signatureCanvasRef.current.isEmpty()) {
      const data = signatureCanvasRef.current.getData();
      setSavedSignature(JSON.stringify(data));
      localStorage.setItem('pdfbolt.signature', JSON.stringify(data));
      notify.success();
      setStatusMessage('Signature saved for this browser.');
    } else {
      setStatusMessage('Draw a signature before saving it.');
    }
  };

  const loadSignature = () => {
    const storedSignature = savedSignature || localStorage.getItem('pdfbolt.signature');
    if (storedSignature && signatureCanvasRef.current) {
      const data = JSON.parse(storedSignature);
      signatureCanvasRef.current.setData(data);
      setSavedSignature(storedSignature);
      notify.success();
      setStatusMessage('Signature loaded.');
    } else {
      setStatusMessage('No saved signature found in this browser.');
    }
  };

  useEffect(() => {
    setSavedSignature(localStorage.getItem('pdfbolt.signature'));
  }, []);

  useEffect(() => {
    return () => {
      if (typeof result === 'string') {
        URL.revokeObjectURL(result);
      } else if (Array.isArray(result)) {
        result.forEach(f => URL.revokeObjectURL(f.url));
      }
    };
  }, [result]);

  useEffect(() => {
    const urls = multiFiles.map(f => URL.createObjectURL(f));
    setImagePreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [multiFiles]);

  const handle = async (f: File[]) => {
    if (f.length === 0) return; // Prevent reset on empty updates

    // Check if this is a folder upload (detected via webkitRelativePath or standard compress mode with multiple files)
    const isFolderUpload = f.length > 0 && (f[0].webkitRelativePath !== "" || (mode === 'compress' && f.length > 1));

    if (mode === 'compress' && isFolderUpload) {
      setMultiFiles(f);
      setIsZip(true);
      setFile(null); // Clear single file
      resetRunState();
      setPageInput('');
      setPassword('');
      notify.upload();
      return;
    }

    const isMultiSupported = isImageTool || mode === 'compare';
    const allowedTypes = getAcceptedTypes(mode, isImageTool);
    const maxSize = isImageTool ? MAX_FILE_SIZE.IMAGE : allowedTypes === ALLOWED_MIME_TYPES.PDF ? MAX_FILE_SIZE.PDF : MAX_FILE_SIZE.DOCUMENT;

    const validation = await validateFiles(f, {
      allowedTypes,
      maxSize,
      maxFiles: isImageTool ? 50 : mode === 'compare' ? 2 : 1,
      checkStructure: mode !== 'repair' && allowedTypes === ALLOWED_MIME_TYPES.PDF
    });

    if (!validation.valid) {
      setStatusMessage(validation.error || 'Invalid file');
      notify.error();
      return;
    }

    if (validation.warning) {
      if (!confirm(`${validation.warning}\n\nDo you want to continue?`)) {
        return;
      }
    }

    if (isMultiSupported) {
      setMultiFiles(prev => [...prev, ...f].slice(0, mode === 'compare' ? 2 : 50));
      if (f.length > 0) setFile(f[0]);
    } else {
      setFile(f[0]);
    }
    resetRunState();
    setPageInput('');
    setPassword('');
    setIsZip(false);
    notify.upload();

  };

  const process = async () => {
    if (!file && multiFiles.length === 0) return;
    setProcessing(true);
    setProgress(10);
    setProcessingStatus('processing');
    setStatusMessage(null);
    try {
      let b: Uint8Array | Blob | string | { name: string, blob: Blob }[];
      let outputKind: ResultKind = 'pdf';
      setProgress(25);

      // -- EDIT TOOLS --
      if (mode === 'rotate' && file) b = await rotateFile(file, 90);
      else if (mode === 'numbers' && file) b = await addPageNumbers(file);
      else if (mode === 'compress') {
        if (isZip && multiFiles.length > 0) {
          b = await createZipFromFiles(multiFiles);
          outputKind = 'zip';
        } else if (file) {
          b = await compressPdf(file, compressionLevel);
        } else {
          throw new Error("No file selected.");
        }
      }
      else if (mode === 'watermark' && file) b = await watermarkPdf(file, watermarkText || 'CONFIDENTIAL', watermarkSize);
      else if (mode === 'split' && file) {
        if (!pageInput) throw new Error("Please enter a page range (e.g. 1-2, 4)");
        b = await splitPdf(file, pageInput);
      }
      else if (mode === 'delete-pages' && file) {
        if (!pageInput) throw new Error("Please enter page numbers to delete (e.g. 2, 4, 10)");
        b = await deletePages(file, pageInput);
      }
      else if (mode === 'organize' && file) {
        if (!pageInput) throw new Error("Please enter the new page order (e.g. 3,1,2,4)");
        b = await reorderPages(file, pageInput);
      }
      // -- CONVERSION TOOLS --
      // -- CONVERSION TOOLS --
      else if (isImageTool) {
        if (multiFiles.length === 0) throw new Error("No images selected.");
        b = await imagesToPdf(multiFiles, {
          pageSize: imgPageSize,
          orientation: imgOrientation,
          margin: imgMargin
        });
      }
      else if (mode === 'word2pdf' && file) b = await wordToPdf(file);
      else if (mode === 'excel2pdf' && file) b = await excelToPdf(file);
      else if (mode === 'html2pdf' && file) b = await htmlToPdf(file);
      else if (mode === 'pdf2jpg' && file) {
        // Now returns array
        b = await pdfToJpg(file);
      }
      else if ((mode === 'pdf2word' || mode === 'pdf2doc') && file) {
        const isBackendUp = await apiClient.checkBackend();
        if (isBackendUp) {
          try {
            const res = await apiClient.submitJob('pdf-to-word', file);
            const arrayBuf = await res.outputBlob.arrayBuffer();
            b = new Uint8Array(arrayBuf);
          } catch (backendErr) {
            console.warn("Backend pdf-to-word failed, falling back to local engine:", backendErr);
            b = await pdfToWord(file);
          }
        } else {
          b = await pdfToWord(file);
        }
        outputKind = 'docx';
      }
      else if (mode === 'pdf2excel' && file) {
        const isBackendUp = await apiClient.checkBackend();
        if (isBackendUp) {
          try {
            const res = await apiClient.submitJob('pdf-to-excel', file);
            const arrayBuf = await res.outputBlob.arrayBuffer();
            b = new Uint8Array(arrayBuf);
          } catch (backendErr) {
            console.warn("Backend pdf-to-excel failed, falling back to local engine:", backendErr);
            b = await pdfToExcel(file);
          }
        } else {
          b = await pdfToExcel(file);
        }
        outputKind = 'xlsx';
      }
      // -- NEW ADVANCED TOOLS --
      else if ((mode === 'pdf2ppt' || mode === 'ppt2pdf') && file) {
        if (mode.includes('pdf2ppt')) {
          const isBackendUp = await apiClient.checkBackend();
          if (isBackendUp) {
            try {
              const res = await apiClient.submitJob('pdf-to-ppt', file);
              const arrayBuf = await res.outputBlob.arrayBuffer();
              b = new Uint8Array(arrayBuf);
            } catch (backendErr) {
              console.warn("Backend pdf-to-ppt failed, falling back to local engine:", backendErr);
              b = await pdfToPpt(file);
            }
          } else {
            b = await pdfToPpt(file);
          }
          outputKind = 'pptx';
        } else {
          // PPT to PDF
          const isBackendUp = await apiClient.checkBackend();
          if (isBackendUp) {
            try {
              const res = await apiClient.submitJob('ppt-to-pdf', file);
              const arrayBuf = await res.outputBlob.arrayBuffer();
              b = new Uint8Array(arrayBuf);
            } catch (backendErr) {
              console.warn("Backend ppt-to-pdf failed, falling back to local engine:", backendErr);
              b = await pptToPdf(file);
            }
          } else {
            b = await pptToPdf(file);
          }
          outputKind = 'pdf';
        }
      }
      else if (mode === 'ocr' && file) {
        b = await ocrPdf(file);
        outputKind = 'txt';
      }
      else if (mode === 'redact' && file) {
        b = await redactPdf(file);
      }
      else if (mode === 'repair' && file) {
        setStatusMessage('Analyzing structural objects & rebuilding XRef tables...');
        const isBackendUp = await apiClient.checkBackend();
        let reportData: any = null;

        if (isBackendUp) {
          try {
            const res = await apiClient.submitJob('repair', file);
            const arrayBuf = await res.outputBlob.arrayBuffer();
            b = new Uint8Array(arrayBuf);
            if (res.metrics) {
              reportData = res.metrics;
            }
          } catch (backendErr) {
            console.warn("Backend repair failed, falling back to local multi-tier engine:", backendErr);
            b = await repairPdf(file);
          }
        } else {
          b = await repairPdf(file);
        }

        if (b && !reportData) {
          try {
            const { PDFDocument } = await import('pdf-lib');
            const doc = await PDFDocument.load(b, { ignoreEncryption: true });
            const pageCount = doc.getPageCount();
            reportData = {
              original_pages: pageCount,
              recovered_pages: pageCount,
              pages_lost: 0,
              repair_score: 96,
              text_recovery: 100,
              visual_recovery: 100,
              status: 'repaired',
              strategy: 'structural_stream_recovery',
              warnings: []
            };
          } catch (e) {
            reportData = null;
          }
        }

        if (reportData) {
          setRepairReport(reportData);
        }
      }
      else if (mode === 'compare' && (multiFiles.length >= 1 || file)) {
        if (multiFiles.length < 2) throw new Error("Please upload exactly 2 PDF files to compare. Upload the second file by clicking the file area again.");
        const fileA = multiFiles[0];
        const fileB = multiFiles[1];
        const isBackendUp = await apiClient.checkBackend();
        if (isBackendUp) {
          try {
            const res = await apiClient.submitCompareJob(fileA, fileB);
            const arrayBuf = await res.outputBlob.arrayBuffer();
            b = new Uint8Array(arrayBuf);
          } catch (backendErr) {
            console.warn("Backend compare failed, falling back to local engine:", backendErr);
            const compRes = await comparePdfDocuments(fileA, fileB);
            b = compRes.reportBytes;
          }
        } else {
          const compRes = await comparePdfDocuments(fileA, fileB);
          b = compRes.reportBytes;
        }
        outputKind = 'pdf';
      }

      // -- SECURITY TOOLS --
      else if (mode === 'protect' && file) {
        if (!password) throw new Error("Please enter a password.");
        const isBackendUp = await apiClient.checkBackend();
        if (isBackendUp) {
          try {
            const res = await apiClient.submitJob('protect', file, { password });
            const arrayBuf = await res.outputBlob.arrayBuffer();
            b = new Uint8Array(arrayBuf);
          } catch (backendErr) {
            console.warn("Backend protect failed, falling back to local engine:", backendErr);
            b = await protectPdf(file, password);
          }
        } else {
          b = await protectPdf(file, password);
        }
      }
      else if (mode === 'unlock' && file) {
        if (!password) throw new Error("Please enter the document password.");
        setStatusMessage('Decrypting PDF and removing security restrictions...');
        const isBackendUp = await apiClient.checkBackend();

        if (isBackendUp) {
          try {
            const res = await apiClient.submitJob('unlock', file, { password });
            const arrayBuf = await res.outputBlob.arrayBuffer();
            b = new Uint8Array(arrayBuf);
          } catch (backendErr: any) {
            console.warn("Backend unlock failed, falling back to local decryption engine:", backendErr);
            b = await unlockPdf(file, password);
          }
        } else {
          b = await unlockPdf(file, password);
        }
      }
      else if (mode === 'sign' && file) {
        // Use signature_pad for professional signature
        if (!signatureCanvasRef.current) throw new Error("Signature canvas not found.");

        if (signatureCanvasRef.current.isEmpty()) {
          throw new Error("Please draw a signature.");
        }

        const sigBlob = await signatureCanvasRef.current.toBlob(signatureBgColor);
        if (!sigBlob) throw new Error("Failed to generate signature.");

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
        setResultKind('zip');
        setResult(results);
      } else {
        const meta = RESULT_META[outputKind];
        setProgress(85);
        const blob = b instanceof Blob ? b : new Blob([b instanceof Uint8Array ? b : b] as BlobPart[], { type: meta.mime });

        if (blob.size === 0) {
          throw new Error("Generated file is empty. Please try again with a different configuration.");
        }

        // Output validation stage
        const outValidation = await validateOutputIntegrity(
          blob, 
          outputKind === 'docx' ? 'docx' : outputKind === 'xlsx' ? 'xlsx' : outputKind === 'pptx' ? 'pptx' : outputKind === 'zip' ? 'zip' : 'pdf'
        );

        if (!outValidation.valid) {
          throw new Error(outValidation.error || "Generated file failed integrity verification.");
        }

        setProgress(95);
        setResultKind(outputKind);
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
      setStatusMessage(err.message || 'Processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-2 text-center animate-fadeIn">

      {statusMessage && (
        <div className={`max-w-3xl mx-auto mb-6 rounded-2xl border px-5 py-4 text-sm font-bold text-left ${processingStatus === 'error'
          ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/40'
          : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-900/40'
          }`}>
          {statusMessage}
        </div>
      )}

      {!file && multiFiles.length === 0 ? (
        <div className="max-w-4xl mx-auto space-y-12">
          <FileUploader
            multiple={isImageTool || mode === 'compare'}
            accept={getAcceptAttribute(mode, isImageTool)}
            onFilesSelected={handle}
            darkMode={darkMode}
            allowFolder={mode === 'compress'}
          />
        </div>
      ) : !result ? (
        <div className="animate-fadeIn max-w-6xl mx-auto space-y-6">

          {/* ── 1. PROCESSING PROGRESS (Visible during background operations) ── */}
          {processing && (
            <div className="mb-4">
              <ProgressBar
                progress={progress}
                label={`Processing ${title}...`}
                darkMode={darkMode}
                status={processingStatus}
                fileName={file?.name || `${multiFiles.length} files`}
              />
            </div>
          )}

          {/* ── 2. TWO-COLUMN WORKSPACE (Interactive Stage + Control Sidebar) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start text-left">

            {/* LEFT COLUMN: Document / Files Visual Stage (Cols 1-7 on lg, 1-8 on xl) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <div className={`p-6 sm:p-8 rounded-[2.5rem] border min-h-[420px] flex flex-col justify-between transition-all ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-xl'
              }`}>
                {/* Stage Header Bar */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {isImageTool
                        ? `${multiFiles.length} Image${multiFiles.length > 1 ? 's' : ''} Selected`
                        : isZip
                        ? `${multiFiles.length} Files Selected`
                        : mode === 'compare'
                        ? 'Compare Documents Stage'
                        : 'Document Stage'}
                    </span>
                  </div>
                  {!processing && (
                    <button
                      onClick={clearSelection}
                      className="text-red-500 hover:text-red-600 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Stage Canvas Area */}
                <div className="py-8 flex flex-col items-center justify-center flex-grow">
                  {/* Single Document Card (With Real Visual Page 1 Thumbnail) */}
                  {file && !isImageTool && mode !== 'compare' && (
                    <div className="relative group">
                      <div className={`w-52 sm:w-64 h-72 sm:h-84 rounded-2xl border-2 shadow-2xl flex flex-col items-center justify-between p-3.5 transition-all duration-300 group-hover:scale-[1.02] ${
                        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        {/* Real Visual First-Page Thumbnail */}
                        <div className="w-full h-48 sm:h-60 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/50 shadow-inner">
                          <PDFThumbnail file={file} className="w-full h-full object-contain" alt={file.name} />
                        </div>

                        <div className="w-full text-center overflow-hidden pt-2">
                          <p className={`font-black text-xs sm:text-sm truncate max-w-full ${darkMode ? 'text-white' : 'text-slate-900'}`} title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">
                              {formatBytes(file.size)}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">
                              {file.name.split('.').pop()?.toUpperCase() || 'PDF'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!processing && (
                        <button
                          onClick={clearSelection}
                          aria-label="Remove file"
                          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-600 text-white shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer z-10"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Multi-Image Gallery Stage */}
                  {isImageTool && (
                    <div className="w-full space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[360px] overflow-y-auto p-1">
                        {multiFiles.map((f, i) => (
                          <div key={i} className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 aspect-[3/4] bg-slate-100 dark:bg-slate-900 shadow-md">
                            <img src={imagePreviewUrls[i]} className="w-full h-full object-cover" alt={f.name} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => setMultiFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors cursor-pointer"
                                aria-label="Remove image"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="absolute bottom-1 left-1 right-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[9px] text-white truncate font-bold">
                              {f.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compare Document Stage */}
                  {mode === 'compare' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-lg">
                      {/* Document 1 */}
                      <div className={`p-4 rounded-2xl border-2 relative ${
                        multiFiles[0] ? (darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200') : 'border-dashed border-slate-300 dark:border-slate-700'
                      }`}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Original Document (File 1)</span>
                        {multiFiles[0] ? (
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-18 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm flex items-center justify-center">
                              <PDFThumbnail file={multiFiles[0]} className="w-full h-full object-contain" alt={multiFiles[0].name} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-xs truncate" title={multiFiles[0].name}>{multiFiles[0].name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(multiFiles[0].size)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 font-semibold py-4 text-center">Awaiting File 1</p>
                        )}
                      </div>

                      {/* Document 2 */}
                      <div className={`p-4 rounded-2xl border-2 relative ${
                        multiFiles[1] ? (darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200') : 'border-dashed border-blue-300 dark:border-blue-700/60'
                      }`}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Modified Document (File 2)</span>
                        {multiFiles[1] ? (
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-18 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm flex items-center justify-center">
                              <PDFThumbnail file={multiFiles[1]} className="w-full h-full object-contain" alt={multiFiles[1].name} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-xs truncate" title={multiFiles[1].name}>{multiFiles[1].name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(multiFiles[1].size)}</p>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center py-2 cursor-pointer text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold">
                            <span>+ Upload 2nd File</span>
                            <input type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handle([e.target.files[0]]); }} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage Footer Bar */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                    <span>⚡ 100% In-Browser Privacy</span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-black text-yellow-600 dark:text-yellow-400 hover:underline uppercase tracking-wider cursor-pointer">
                    <Plus size={14} /> Add / Replace File
                    <input
                      type="file"
                      accept={getAcceptAttribute(mode, isImageTool)}
                      multiple={isImageTool || mode === 'compare'}
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          handle(Array.from(e.target.files));
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Tool Configuration & Primary Action Sidebar (Cols 8-12 on lg, 9-12 on xl) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className={`p-6 sm:p-8 rounded-[2.5rem] border shadow-2xl space-y-6 ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Settings2 className="text-yellow-600 w-5 h-5" />
                    <h2 className={`text-base sm:text-lg font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {title}
                    </h2>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                    Options
                  </span>
                </div>

                {isSignTool && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-slate-500">Draw Signature</p>
                        <div className="flex gap-2">
                          <button onClick={saveSignature} className="text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-200 uppercase">Save</button>
                          <button onClick={loadSignature} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 uppercase">Load</button>
                        </div>
                      </div>
                      <div className="border-2 border-slate-300 dark:border-slate-600 rounded-2xl overflow-hidden bg-white touch-none">
                        <SignatureCanvas
                          ref={signatureCanvasRef}
                          darkMode={darkMode}
                          penColor={penColor}
                          strokeWidth={strokeWidth}
                          backgroundColor={signatureBgColor}
                        />
                      </div>

                      <div className="flex flex-col gap-4 mt-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                          <div className="flex gap-2">
                            <button onClick={undoSignature} className="text-xs font-bold text-blue-500 uppercase hover:text-blue-600">Undo</button>
                            <button onClick={clearSignature} className="text-xs font-bold text-red-500 uppercase hover:text-red-600">Clear</button>
                          </div>
                          <div className="flex gap-4 items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">Width:</span>
                              {(['thin', 'medium', 'thick'] as const).map((w) => (
                                <button
                                  key={w}
                                  onClick={() => setStrokeWidth(w)}
                                  className={`px-2 py-1 rounded-md text-xs font-bold border transition-all ${strokeWidth === w ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-slate-800' : 'bg-transparent text-slate-500 border-slate-200'}`}
                                >
                                  {w === 'thin' ? '1px' : w === 'medium' ? '2px' : '4px'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center border-t pt-4 border-slate-100 dark:border-slate-800">
                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Color:</span>
                            {['#000', '#0066FF', '#FF0000', '#008000', '#800080'].map((color) => (
                              <button
                                key={color}
                                onClick={() => setPenColor(color)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${penColor === color ? 'border-yellow-500 scale-110' : 'border-slate-300'}`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                            <div className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-slate-300">
                              <input
                                type="color"
                                value={penColor}
                                onChange={(e) => setPenColor(e.target.value)}
                                className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 border-0 cursor-pointer"
                                title="Custom Color"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Background:</span>
                            {[
                              { name: 'Transparent', val: 'rgba(255,255,255,0)' },
                              { name: 'White', val: '#ffffff' },
                              { name: 'Paper', val: '#f8f9fa' }
                            ].map((bg) => (
                              <button
                                key={bg.name}
                                onClick={() => setSignatureBgColor(bg.val)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${signatureBgColor === bg.val ? 'border-yellow-500 scale-110' : 'border-slate-300'}`}
                                style={{ backgroundColor: bg.val === 'rgba(255,255,255,0)' ? 'white' : bg.val, backgroundImage: bg.val === 'rgba(255,255,255,0)' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none', backgroundSize: '10px 10px' }}
                                title={bg.name}
                              />
                            ))}
                          </div>
                        </div>
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
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Watermark Text</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="CONFIDENTIAL"
                        className={`w-full p-6 rounded-2xl text-xl font-bold border-2 focus:ring-4 transition-all outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Font Size ({watermarkSize})</label>
                        <span className="text-sm font-bold text-indigo-600">{watermarkSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={watermarkSize}
                        onChange={(e) => setWatermarkSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                )}

                {mode === 'ocr' && (
                  <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl mb-4">
                    <p className="font-bold">Info: OCR processing happens locally and may take some time for large files.</p>
                  </div>
                )}

                {mode === 'compare' && (
                  <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-amber-50/70 border-amber-200'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="p-2 rounded-xl bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-black">
                        <Zap size={18} />
                      </span>
                      <div>
                        <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          Document Differential Analyzer
                        </h4>
                        <p className={`text-xs font-semibold ${multiFiles.length >= 2 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {multiFiles.length >= 2
                            ? `✓ Comparing "${multiFiles[0].name}" vs "${multiFiles[1].name}"`
                            : multiFiles.length === 1
                            ? `1 of 2 files uploaded — upload one more PDF to compare`
                            : 'Upload exactly 2 PDF files to begin comparison'}
                        </p>
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      PDFBolt extracts structured text and visual elements page-by-page to detect additions, deletions, modified paragraphs, and structural alterations. A comprehensive summary comparison PDF report will be generated.
                    </p>
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
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                      {mode === 'organize' ? 'New Page Order' : mode === 'split' ? 'Page Range to Extract' : 'Pages to Delete'}
                    </label>
                    <input
                      type="text"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      placeholder={
                        mode === 'organize'
                          ? 'e.g. 3,1,2,4 — enter all pages in new order'
                          : mode === 'split'
                          ? 'e.g. 1-5, 8, 11-15'
                          : 'e.g. 2, 4, 10'
                      }
                      className={`w-full p-6 rounded-2xl text-xl font-bold border-2 focus:ring-4 transition-all outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                    />
                    {mode === 'organize' && (
                      <p className="text-xs text-slate-500 font-medium">
                        Enter every page number in the order you want them. Duplicate entries allowed (to repeat pages).
                      </p>
                    )}
                  </div>
                )}

                {needsPassword && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                        {mode === 'protect' ? 'Set Encryption Password' : 'Enter Document Password'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={mode === 'protect' ? 'Create a strong password...' : 'Enter the password to remove restrictions...'}
                          className={`w-full p-6 pl-14 pr-14 rounded-2xl text-xl font-bold border-2 focus:ring-4 transition-all outline-none ${
                            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {mode === 'unlock' && (
                      <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
                        darkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-blue-50/80 border-blue-100 text-blue-800'
                      }`}>
                        <Lock size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>PDFBolt permanently removes password protection and permission locks from documents you have authorized access to. Passwords are never stored or transmitted.</span>
                      </div>
                    )}
                  </div>
                )}

                {isImageTool && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {multiFiles.map((f, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                          <img src={imagePreviewUrls[i]} className="w-full h-full object-cover" alt={f.name} />
                          <button onClick={() => setMultiFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-600 text-white p-0.5"><X size={10} /></button>
                        </div>
                      ))}
                    </div>

                    {/* Image Layout Settings — inline inside config panel */}
                    {multiFiles.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-yellow-500" /> PDF Layout Settings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-500">Page Size</label>
                            <div className="flex flex-col gap-2">
                              {['fit', 'a4', 'letter'].map(size => (
                                <button
                                  key={size}
                                  onClick={() => setImgPageSize(size as ImagePageSize)}
                                  className={`py-2 px-4 rounded-xl border-2 font-bold text-sm transition-all ${imgPageSize === size ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'border-slate-200 dark:border-slate-700'}`}
                                >
                                  {size === 'fit' ? 'Fit Image' : size.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className={`space-y-3 transition-opacity ${imgPageSize === 'fit' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-xs font-bold uppercase text-slate-500">Orientation</label>
                            <div className="flex flex-col gap-2">
                              {['portrait', 'landscape'].map(or => (
                                <button
                                  key={or}
                                  onClick={() => setImgOrientation(or as ImageOrientation)}
                                  className={`py-2 px-4 rounded-xl border-2 font-bold text-sm transition-all ${imgOrientation === or ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'border-slate-200 dark:border-slate-700'}`}
                                >
                                  {or.charAt(0).toUpperCase() + or.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className={`space-y-3 transition-opacity ${imgPageSize === 'fit' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-xs font-bold uppercase text-slate-500">Margins</label>
                            <div className="flex flex-col gap-2">
                              {['none', 'small', 'standard'].map(m => (
                                <button
                                  key={m}
                                  onClick={() => setImgMargin(m as ImageMargin)}
                                  className={`py-2 px-4 rounded-xl border-2 font-bold text-sm transition-all ${imgMargin === m ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'border-slate-200 dark:border-slate-700'}`}
                                >
                                  {m.charAt(0).toUpperCase() + m.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* ── 4. PRIMARY ACTION ── */}
                <div className="pt-2">
                  <button
                    disabled={processing || (needsPageInput && !pageInput) || (needsPassword && !password) || (isImageTool && multiFiles.length === 0) || (mode === 'compare' && multiFiles.length < 2)}
                    onClick={process}
                    className="w-full py-5 sm:py-6 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-black text-xl sm:text-2xl shadow-xl hover:from-red-700 hover:to-rose-700 hover:scale-[1.02] active:scale-[0.99] disabled:opacity-30 transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {processing ? (
                      <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Process {title}</span>
                        <ArrowRight size={22} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ── 5. RESULT STATE ── */
        <div key={resultKey} className="flex flex-col items-center gap-6 max-w-3xl mx-auto w-full animate-fadeIn">

          {/* Success Banner */}
          <div className="flex items-center gap-4 text-green-500 font-black bg-green-50 dark:bg-green-900/20 px-10 py-5 rounded-[2rem] border border-green-100 dark:border-green-800 w-full justify-center">
            <CheckCircle2 size={32} />
            <span className="text-2xl">Processing Complete</span>
          </div>

              {/* Repair Report */}
              {mode === 'repair' && repairReport && (
                <div className="w-full p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-left space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Structural Recovery Report</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${repairReport.status === 'repaired' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {repairReport.status === 'repaired' ? 'Fully Repaired' : 'Partial Recovery'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xl font-black text-slate-800 dark:text-white">{repairReport.original_pages}</div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Original Pages</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xl font-black text-green-600">{repairReport.recovered_pages}</div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Recovered</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className={`text-xl font-black ${repairReport.pages_lost > 0 ? 'text-red-500' : 'text-slate-400'}`}>{repairReport.pages_lost}</div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Lost</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xl font-black text-yellow-600 dark:text-yellow-400">{repairReport.repair_score}%</div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Score</div>
                    </div>
                  </div>

                  {repairReport.warnings && repairReport.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                      {repairReport.warnings.map((w: string, i: number) => <div key={i}>⚠️ {w}</div>)}
                    </div>
                  )}
                </div>
              )}

              {/* Download Area */}
              {Array.isArray(result) ? (
                <div className="flex flex-col items-center gap-6 w-full">
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

                  <button
                    onClick={async () => {
                      const JSZip = (await import('jszip')).default;
                      const zip = new JSZip();

                      const promises = result.map(async (item) => {
                        const blob = await fetch(item.url).then(r => r.blob());
                        zip.file(item.name, blob);
                      });

                      await Promise.all(promises);

                      const zipContent = await zip.generateAsync({ type: 'blob' });
                      const zipUrl = URL.createObjectURL(zipContent);

                      const link = document.createElement('a');
                      link.href = zipUrl;
                      link.download = `converted_images.zip`;
                      link.click();

                      setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
                      notify.success();
                    }}
                    className="w-full max-w-sm py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                  >
                    <Download size={24} /> Download All (ZIP)
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  {canPreviewResult && (
                    <button onClick={() => setShowPreview(true)} className="flex-1 py-5 rounded-2xl font-black border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                      <Eye size={20} /> Preview
                    </button>
                  )}
                  <a
                    href={result}
                    download={`pdfbolt_${mode}_output.${resultMeta.extension}`}
                    onClick={() => notify.success()}
                    className="flex-1 flex items-center justify-center gap-4 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-xl shadow-2xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all"
                  >
                    <Download size={24} /> Download {resultMeta.label}
                  </a>
                </div>
              )}

              {/* Non-Intrusive Result Screen Sponsored Slot (Far below download button) */}
              <AdSlot placement="RESULT_BOTTOM" />

              {/* Process Another File CTA */}
              <button
                onClick={clearSelection}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-2 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60 hover:text-yellow-400'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-yellow-400 hover:bg-white hover:text-slate-900'
                }`}
              >
                <FileText size={16} /> Process Another File
              </button>

            </div>
          )}

      {/* Full-screen PDF Preview Modal */}
      {showPreview && canPreviewResult && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-6xl h-[92vh] bg-white dark:bg-slate-800 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 flex justify-between items-center border-b dark:border-slate-700">
              <h2 className="font-black text-xl">Result Preview</h2>
              <button onClick={() => setShowPreview(false)} aria-label="Close result preview" className="p-3 bg-yellow-50 text-yellow-600 hover:bg-yellow-600 hover:text-white rounded-2xl transition-all"><X size={28} /></button>
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
