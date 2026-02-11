import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import SignatureCanvas, { SignatureCanvasRef } from '../components/SignatureCanvas';
import { createZipFromFiles } from '../services/zipService';

// ... (existing imports)

// Inside SimpleTool component
// ...

import { rotateFile, addPageNumbers, compressPdf, watermarkPdf, deletePages, splitPdf, imagesToPdf } from '../services/pdfService';
import { wordToPdf, excelToPdf, htmlToPdf, pdfToJpg, pdfToWord, pdfToExcel } from '../services/conversionService';
import { protectPdf, unlockPdf, signPdf, bruteForceUnlock, dictionaryUnlock } from '../services/securityService';
import { ocrPdf } from '../services/ocrService';
import { pptToPdf, pdfToPpt } from '../services/pptService';
import { redactPdf, repairPdf } from '../services/sanitizeService';
import { GET_WORDLIST } from '../utils/wordlists';
import { FileText, Download, CheckCircle2, Settings2, Eye, X, Image as ImageIcon, Lock, Key, PenTool, Zap } from 'lucide-react';
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

  // Image Tool State
  const [imgPageSize, setImgPageSize] = useState<'fit' | 'a4' | 'letter'>('fit');
  const [imgOrientation, setImgOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [imgMargin, setImgMargin] = useState<'none' | 'small' | 'standard'>('small');

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
  const [bruteCharset, setBruteCharset] = useState<'numeric' | 'alpha-lower' | 'alpha-mixed' | 'alphanumeric' | 'all'>('numeric');
  const [bruteMaxLength, setBruteMaxLength] = useState(4);
  const [bruteStatus, setBruteStatus] = useState<string | null>(null);


  // Signature Canvas Helpers
  const clearSignature = () => {
    signatureCanvasRef.current?.clear();
  };

  const undoSignature = () => {
    signatureCanvasRef.current?.undo();
  };

  const saveSignature = () => {
    if (signatureCanvasRef.current && !signatureCanvasRef.current.isEmpty()) {
      const data = signatureCanvasRef.current.getData();
      setSavedSignature(JSON.stringify(data));
      notify.success();
      alert('Signature saved! You can load it later.');
    } else {
      alert('Please draw a signature first.');
    }
  };

  const loadSignature = () => {
    if (savedSignature && signatureCanvasRef.current) {
      const data = JSON.parse(savedSignature);
      signatureCanvasRef.current.setData(data);
      notify.success();
    } else {
      alert('No saved signature found.');
    }
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

    // Check if this is a folder upload (detected via webkitRelativePath or standard compress mode with multiple files)
    const isFolderUpload = f.length > 0 && (f[0].webkitRelativePath !== "" || (mode === 'compress' && f.length > 1));

    if (mode === 'compress' && isFolderUpload) {
      setMultiFiles(f);
      setIsZip(true);
      setFile(null); // Clear single file
      setResult(null);
      setPageInput('');
      setPassword('');
      setProcessingStatus('processing');
      notify.upload();
      return;
    }

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
      else if (mode === 'compress') {
        if (isZip && multiFiles.length > 0) {
          b = await createZipFromFiles(multiFiles);
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
        b = await pdfToWord(file);
        setIsDoc(true);
      }
      else if (mode === 'pdf2excel' && file) {
        b = await pdfToExcel(file);
        setIsZip(true); // Reuse zip download logic for Excel
      }
      // -- NEW ADVANCED TOOLS --
      else if ((mode === 'pdf2ppt' || mode === 'ppt2pdf') && file) {
        if (mode.includes('pdf2ppt')) {
          b = await pdfToPpt(file);
          setIsPpt(true);
        } else {
          // PPT to PDF
          b = await pptToPdf(file);
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
              const wordlist = GET_WORDLIST('full');
              result = await dictionaryUnlock(file, wordlist, (pass, count) => {
                setBruteStatus(`Ripper Mode: Testing "${pass}" (${count} attempts)`);
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

            if (result.password && result.decryptedPdf) {
              b = result.decryptedPdf;
              alert(`Password Found! [${result.password}]`);
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
            allowFolder={mode === 'compress'}
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
                  {isImageTool ? `${multiFiles.length} Images Selected` : isZip ? `${multiFiles.length} Files (Folder)` : file?.name}
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
                      <div className="flex justify-between items-center">
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
                      <div className="flex justify-between items-center border-t pt-4 border-slate-100 dark:border-slate-800">
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
                        onClick={() => setBruteForceMode(!bruteForceMode)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${bruteForceMode ? 'bg-red-600' : 'bg-slate-300'}`}
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
                                  onClick={() => setBruteCharset(opt.id as any)}
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
            {!result && (
              <div className="flex flex-col gap-4 w-full max-w-xl">
                <button
                  disabled={processing || (needsPageInput && !pageInput) || (needsPassword && !password && !bruteForceMode) || (isImageTool && multiFiles.length === 0)}
                  onClick={process}
                  className="w-full px-10 py-8 bg-red-600 text-white rounded-[2.5rem] font-black text-3xl shadow-2xl hover:bg-red-700 hover:scale-105 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group"
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
            )}
          </div>

        </div>
      )}

      {isImageTool && !result && multiFiles.length > 0 && (
        <div className="max-w-3xl mx-auto mt-8 p-8 rounded-[2.5rem] border shadow-xl bg-white dark:bg-slate-800 dark:border-slate-700 text-left">
          <h4 className="text-xl font-black uppercase mb-6 flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-yellow-500" /> PDF Layout Settings
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Page Size */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-slate-500">Page Size</label>
              <div className="flex flex-col gap-2">
                {['fit', 'a4', 'letter'].map(size => (
                  <button
                    key={size}
                    onClick={() => setImgPageSize(size as any)}
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
                    onClick={() => setImgOrientation(or as any)}
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
                    onClick={() => setImgMargin(m as any)}
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