import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import SignatureCanvas, { SignatureCanvasRef } from '../components/SignatureCanvas';
import { createZipFromFiles } from '../services/zipService';
import { rotateFile, addPageNumbers, compressPdf, watermarkPdf, deletePages, splitPdf, imagesToPdf } from '../services/pdfService';
import { wordToPdf, excelToPdf, htmlToPdf, pdfToJpg, pdfToWord, pdfToExcel } from '../services/conversionService';
import { protectPdf, unlockPdf, signPdf, bruteForceUnlock, dictionaryUnlock, multiThreadedUnlock } from '../services/securityService';
import { ocrPdf } from '../services/ocrService';
import { pptToPdf, pdfToPpt } from '../services/pptService';
import { redactPdf, repairPdf } from '../services/sanitizeService';
import { GET_WORDLIST } from '../utils/wordlists';
import { FileText, Download, CheckCircle2, Settings2, Eye, X, Image as ImageIcon, Lock, Zap } from 'lucide-react';
import { NotifySystem } from '../types';
import ProgressBar from '../components/ProgressBar';
import { validateFiles, validateOutputIntegrity, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';
import { apiClient } from '../services/apiClient';
import AdSlot from '../components/AdSlot';
import { useActiveWork } from '../context/ActiveWorkContext';

type ResultKind = 'pdf' | 'zip' | 'docx' | 'pptx' | 'xlsx' | 'txt';
type BruteCharset = 'numeric' | 'alpha-lower' | 'alpha-mixed' | 'alphanumeric' | 'all';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Brute Force State
  const [bruteForceMode, setBruteForceMode] = useState(false);
  const [unlockStrategy, setUnlockStrategy] = useState<'sequential' | 'ripper'>('ripper');
  const [turboMode, setTurboMode] = useState(false);
  const [bruteCharset, setBruteCharset] = useState<BruteCharset>('numeric');
  const [bruteMaxLength, setBruteMaxLength] = useState(4);
  const [bruteStatus, setBruteStatus] = useState<string | null>(null);

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
    setBruteStatus(null);
    setIsZip(false);
    setResultKind('pdf');
  };

  const resetRunState = () => {
    setResult(null);
    setShowPreview(false);
    setStatusMessage(null);
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

    const allowedTypes = getAcceptedTypes(mode, isImageTool);
    const maxSize = isImageTool ? MAX_FILE_SIZE.IMAGE : allowedTypes === ALLOWED_MIME_TYPES.PDF ? MAX_FILE_SIZE.PDF : MAX_FILE_SIZE.DOCUMENT;

    const validation = await validateFiles(f, {
      allowedTypes,
      maxSize,
      maxFiles: isImageTool ? 50 : 1,
      checkStructure: allowedTypes === ALLOWED_MIME_TYPES.PDF
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

    if (isImageTool) {
      setMultiFiles(prev => [...prev, ...f]);
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
      else if ((mode === 'delete-pages' || mode === 'organize') && file) {
        if (!pageInput) throw new Error("Please enter page numbers (e.g. 2, 4, 10)");
        b = await deletePages(file, pageInput);
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
        const isBackendUp = await apiClient.checkBackend();
        if (isBackendUp) {
          try {
            const res = await apiClient.submitJob('repair', file);
            const arrayBuf = await res.outputBlob.arrayBuffer();
            b = new Uint8Array(arrayBuf);
          } catch (backendErr) {
            console.warn("Backend repair failed, falling back to local multi-tier engine:", backendErr);
            b = await repairPdf(file);
          }
        } else {
          b = await repairPdf(file);
        }
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
        if (bruteForceMode) {
          // Brute Force Logic
          setProcessingStatus('processing');
          notify.upload();

          // Create AbortController
          const controller = new AbortController();
          abortControllerRef.current = controller;

          try {
            let result;
            if (unlockStrategy === 'ripper') {
              const wordlist = GET_WORDLIST(turboMode ? 'turbo' : 'full');
              if (turboMode) {
                result = await multiThreadedUnlock(file, wordlist, (pass, count) => {
                  setBruteStatus(`Turbo Pro: Testing "${pass}" (${count}/${wordlist.length})`);
                });
              } else {
                result = await dictionaryUnlock(file, wordlist, (pass, count) => {
                  setBruteStatus(`Ripper Mode: Testing "${pass}" (${count} attempts)`);
                });
              }
            } else {
              if (turboMode) {
                // For sequential turbo, we could implement a sequential wordlist generator and feed it to multiThreadedUnlock
                // But for now, let's just use it for ripper which is most common.
                result = await bruteForceUnlock(file, {
                  charset: bruteCharset,
                  maxLength: bruteMaxLength,
                  signal: controller.signal
                }, (pass, count) => {
                  setBruteStatus(`Sequential Mode: Testing "${pass}" (${count} attempts)`);
                });
              } else {
                result = await bruteForceUnlock(file, {
                  charset: bruteCharset,
                  maxLength: bruteMaxLength,
                  signal: controller.signal
                }, (pass, count) => {
                  setBruteStatus(`Sequential Mode: Testing "${pass}" (${count} attempts)`);
                });
              }
            }

            if (result.password && result.decryptedPdf) {
              b = result.decryptedPdf;
              setStatusMessage(`Password found: ${result.password}`);
            } else {
              throw new Error("Password not found. Try a different method or longer length.");
            }
          } catch (err: any) {
            if (err.message === 'Brute force stopped by user.') {
              setProcessing(false);
              setProcessingStatus('error'); // Or 'idle'
              setBruteStatus('stopped');
              return; // Exit without further processing
            }
            throw err;
          } finally {
            abortControllerRef.current = null;
          }
        } else {
          if (!password) throw new Error("Please enter the password.");
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
        <div className="space-y-12">
          <FileUploader
            multiple={isImageTool}
            accept={getAcceptAttribute(mode, isImageTool)}
            onFilesSelected={handle}
            darkMode={darkMode}
            allowFolder={mode === 'compress'}
          />
        </div>
      ) : (
        <div className="animate-fadeIn max-w-3xl mx-auto space-y-12">
          {/* File Status Card */}
          <div className={`p-5 sm:p-8 rounded-[2rem] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-xl'}`}>
            <div className="flex items-center gap-6 text-left">
              <div className="bg-yellow-500/10 p-4 rounded-2xl">
                {isImageTool ? <ImageIcon className="text-yellow-500 w-10 h-10" /> : <FileText className="text-yellow-500 w-10 h-10" />}
              </div>
              <div className="overflow-hidden">
                <h2 className={`text-xl font-black truncate max-w-[250px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isImageTool ? `${multiFiles.length} Images Selected` : isZip ? `${multiFiles.length} Files (Folder)` : file?.name}
                </h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  {result ? 'FILE READY' : 'AWAITING CONFIGURATION'}
                </p>
              </div>
            </div>
            {!processing && (
              <button onClick={clearSelection} className="text-yellow-600 font-black text-xs hover:underline uppercase tracking-tighter">Clear All</button>
            )}
          </div>

          {/* Progress Bar - shown during processing */}
          {processing && (
            <div className="space-y-4">
              <ProgressBar
                progress={progress}
                label={`Processing ${title}...`}
                darkMode={darkMode}
                status={processingStatus}
                fileName={file?.name || `${multiFiles.length} files`}
              />
              {bruteForceMode && processingStatus === 'processing' && (
                <button 
                  onClick={() => abortControllerRef.current?.abort()}
                  className="mx-auto block px-4 py-2 rounded-lg bg-red-100 text-red-600 font-bold uppercase tracking-widest text-xs hover:bg-red-200 transition-colors"
                >
                  Cancel Operation
                </button>
              )}
            </div>
          )}

          {!result && (
            <div className={`p-6 sm:p-10 rounded-[2rem] border shadow-2xl text-left transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-3 mb-8">
                <Settings2 className="text-yellow-600 w-6 h-6" />
                <h2 className={`text-2xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tool Configuration</h2>
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
                      {/* Controls Row 1 */}
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

                      {/* Controls Row 2 */}
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
                <div className="space-y-6">
                  {mode === 'unlock' && (
                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
                      <span className="font-bold text-sm uppercase">Forgot Password? (Brute Force)</span>
                      <button
                        role="switch"
                        aria-checked={bruteForceMode}
                        aria-label="Toggle Brute Force Mode"
                        onClick={() => setBruteForceMode(!bruteForceMode)}
                        className={`w-12 h-6 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 outline-none ${bruteForceMode ? 'bg-red-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${bruteForceMode ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  )}

                  {!bruteForceMode ? (
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
                  ) : (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="p-4 bg-orange-50 text-orange-800 rounded-xl text-sm font-bold border border-orange-200">
                        Browser-based cracking works best for short passwords. "John the Ripper" mode uses a fast dictionary attack.
                      </div>

                      {/* Turbo Toggle */}
                      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-3">
                          <Zap className="text-red-600 fill-red-600" size={20} />
                          <div>
                            <span className="font-black text-sm uppercase block text-red-700">Turbo Pro Mode</span>
                            <span className="text-[10px] text-red-600/70 font-bold uppercase tracking-tighter">Uses all CPU cores (Extreme Speed)</span>
                          </div>
                        </div>
                        <button
                          role="switch"
                          aria-checked={turboMode}
                          aria-label="Toggle Turbo Pro Mode"
                          onClick={() => setTurboMode(!turboMode)}
                          className={`w-12 h-6 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 outline-none ${turboMode ? 'bg-red-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${turboMode ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      {/* Strategy Selector */}
                      <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Unlock Method</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setUnlockStrategy('ripper')}
                            className={`p-4 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-2 ${unlockStrategy === 'ripper' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-200 text-slate-400'}`}
                          >
                            <Zap size={16} /> John The Ripper
                          </button>
                          <button
                            onClick={() => setUnlockStrategy('sequential')}
                            className={`p-4 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-2 ${unlockStrategy === 'sequential' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-200 text-slate-400'}`}
                          >
                            Sequential Brute Force
                          </button>
                        </div>
                      </div>

                      {unlockStrategy === 'sequential' && (
                        <>
                          {/* Charset Selector */}
                          <div className="space-y-2">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Character Set</label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { id: 'numeric', label: 'Numeric (0-9)' },
                                { id: 'alpha-lower', label: 'Letters (a-z)' },
                                { id: 'alpha-mixed', label: 'Mixed Case (a-Z)' },
                                { id: 'alphanumeric', label: 'All (a-Z, 0-9)' }
                              ].map(opt => (
                                <button
                                  key={opt.id}
                              onClick={() => setBruteCharset(opt.id as BruteCharset)}
                                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${bruteCharset === opt.id ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Max Length Slider */}
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Max Length: {bruteMaxLength}</label>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="6"
                              value={bruteMaxLength}
                              onChange={(e) => setBruteMaxLength(parseInt(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                            />
                            <div className="flex justify-between text-xs font-bold text-slate-400">
                              <span>1</span>
                              <span>6 (Very Slow)</span>
                            </div>
                          </div>
                        </>
                      )}

                      {unlockStrategy === 'ripper' && (
                        <div className="p-6 rounded-2xl border-4 border-dashed border-red-200 text-center space-y-3">
                          <Zap className="mx-auto text-red-600 w-12 h-12 animate-pulse" />
                          <p className="text-xs font-black uppercase text-slate-500">Ripper Mode Active</p>
                          <p className="text-[10px] text-slate-400">Testing top 1,000 most common passwords used globally. Found 80% of weak passwords in seconds.</p>
                        </div>
                      )}

                      {/* Status Display */}
                      {bruteStatus && (
                        <div className="p-4 bg-slate-900 text-green-400 font-mono text-sm rounded-xl overflow-hidden truncate">
                          &gt; {bruteStatus}
                        </div>
                      )}
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
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-8">
            {!result && (
              <div className="flex flex-col gap-4 w-full max-w-xl">
                <button
                  disabled={processing || (needsPageInput && !pageInput) || (needsPassword && !password && !bruteForceMode) || (isImageTool && multiFiles.length === 0)}
                  onClick={process}
                  className="w-full px-8 py-6 sm:py-8 bg-red-600 text-white rounded-[2rem] font-black text-2xl sm:text-3xl shadow-2xl hover:bg-red-700 hover:scale-[1.02] disabled:opacity-30 transition-all flex items-center justify-center gap-4 group"
                >
                  {processing ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Process {title}</span>}
                </button>

                {processing && bruteForceMode && (
                  <button
                    onClick={() => abortControllerRef.current?.abort()}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    Stop Operation
                  </button>
                )}
              </div>
            )}

            {result && !processing && (
              <div key={resultKey} className="flex flex-col items-center gap-8 w-full">
                <div className="flex items-center gap-4 text-green-500 font-black bg-green-50 dark:bg-green-900/20 px-10 py-5 rounded-[2rem] border border-green-100 dark:border-green-800">
                  <CheckCircle2 size={32} />
                  <span className="text-2xl">Processing Complete</span>
                </div>

                {Array.isArray(result) ? (
                  <div className="flex flex-col items-center gap-8 w-full">
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

                    {/* Download All as ZIP Button */}
                    <button
                      onClick={async () => {
                        const JSZip = (await import('jszip')).default;
                        const zip = new JSZip();

                        // Fetch all blobs
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
                    {/* Standard single file download */}
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
              </div>
            )}
          </div>

        </div>
      )}

      {isImageTool && !result && multiFiles.length > 0 && (
        <div className="max-w-3xl mx-auto mt-8 p-8 rounded-[2.5rem] border shadow-xl bg-white dark:bg-slate-800 dark:border-slate-700 text-left">
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-yellow-500" /> PDF Layout Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Page Size */}
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

            {/* Orientation (Only if not Fit) */}
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

            {/* Margin */}
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
