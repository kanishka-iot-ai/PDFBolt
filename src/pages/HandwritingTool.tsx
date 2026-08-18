import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Upload, FileText, Download, Plus, Trash2, Zap,
  CheckCircle2, RefreshCw, Sparkles, ShieldCheck, Lock, Eye,
  ArrowRight, Sliders, AlertTriangle, Layers, ChevronLeft
} from 'lucide-react';
import FileUploader from '../components/FileUploader';
import CameraCaptureModal from '../components/handwriting/CameraCaptureModal';
import PageQueueList from '../components/handwriting/PageQueueList';
import TranscriptionEditor from '../components/handwriting/TranscriptionEditor';
import DesignSettingsPanel from '../components/handwriting/DesignSettingsPanel';
import QualityCheckBanner from '../components/handwriting/QualityCheckBanner';
import {
  HandwritingPage,
  PDFDesignSettings,
  QualityCheckReport
} from '../types/handwriting';
import {
  renderPdfToPages,
  processImageFile,
  processCameraCapture,
  rotateImageDataUrl,
  runLocalOCR,
  runCloudAIOCR,
  validateDocumentQuality,
  generateClientPDF,
  generateClientDOCX,
  generateClientTXT
} from '../services/handwritingService';
import { soundEngine } from '../utils/sounds';

import { useActiveWork } from '../context/ActiveWorkContext';

interface HandwritingToolProps {
  darkMode: boolean;
  notify: any;
}

const DEFAULT_DESIGN: PDFDesignSettings = {
  paperSize: 'A4',
  margin: 'normal',
  font: 'Inter',
  fontSize: 12,
  lineSpacing: 1.15,
  alignment: 'left',
  includePageNumbers: true,
  documentTitle: 'Handwritten Notes'
};

const HandwritingTool: React.FC<HandwritingToolProps> = ({ darkMode, notify }) => {
  const { setHasActiveWork } = useActiveWork();

  // Navigation steps: 'queue' -> 'processing' -> 'review' -> 'export'
  const [step, setStep] = useState<'queue' | 'processing' | 'review' | 'export'>('queue');
  
  // Page Queue State
  const [pages, setPages] = useState<HandwritingPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAiEnhanced, setIsAiEnhanced] = useState(false);

  // Sync active work state with Navbar
  useEffect(() => {
    setHasActiveWork(pages.length > 0 || isCameraModalOpen);
    return () => setHasActiveWork(false);
  }, [pages.length, isCameraModalOpen, setHasActiveWork]);

  // Processing & Progress State
  const [processedCount, setProcessedCount] = useState(0);
  const [currentProcessingPage, setCurrentProcessingPage] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Typography & Layout Design State
  const [designSettings, setDesignSettings] = useState<PDFDesignSettings>(DEFAULT_DESIGN);

  // Hidden file input ref for incremental addition
  const uploadInputRef = useRef<HTMLInputElement>(null);


  // ----------------------------------------------------
  // 1. INPUT HANDLERS (Files & Camera)
  // ----------------------------------------------------

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setErrorNotice(null);

    const newPages: HandwritingPage[] = [];

    for (const file of files) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfPages = await renderPdfToPages(file);
          newPages.push(...pdfPages);
        } catch (err) {
          console.error("PDF decomposition error:", err);
          setErrorNotice(`Failed to parse ${file.name}. Please ensure it is a valid PDF.`);
        }
      } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
        try {
          const imgPage = await processImageFile(file);
          newPages.push(imgPage);
        } catch (err) {
          console.error("Image loading error:", err);
        }
      }
    }

    if (newPages.length > 0) {
      setPages(prev => [...prev, ...newPages]);
      if (notify?.upload) notify.upload();
    }
  };

  const handleCameraCapture = async (dataUrl: string) => {
    const pageNumber = pages.length + 1;
    const cameraPage = await processCameraCapture(dataUrl, pageNumber);
    setPages(prev => [...prev, cameraPage]);
    if (notify?.success) notify.success();
  };

  // ----------------------------------------------------
  // 2. QUEUE MANIPULATION (Reorder, Rotate, Delete)
  // ----------------------------------------------------

  const handleRotatePage = async (id: string) => {
    const pageIndex = pages.findIndex(p => p.id === id);
    if (pageIndex === -1) return;

    const page = pages[pageIndex];
    const newRotation = (page.rotation + 90) % 360;

    const [newOriginal, newEnhanced] = await Promise.all([
      rotateImageDataUrl(page.originalImage, 90),
      rotateImageDataUrl(page.enhancedImage, 90)
    ]);

    setPages(prev => prev.map((p, idx) => {
      if (idx === pageIndex) {
        return {
          ...p,
          rotation: newRotation,
          originalImage: newOriginal,
          enhancedImage: newEnhanced,
          thumbnail: newEnhanced
        };
      }
      return p;
    }));
  };

  const handleDeletePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
    if (currentPageIndex >= pages.length - 1) {
      setCurrentPageIndex(Math.max(0, pages.length - 2));
    }
  };

  const handleToggleView = (id: string) => {
    setPages(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          activeView: p.activeView === 'enhanced' ? 'original' : 'enhanced'
        };
      }
      return p;
    }));
  };

  // ----------------------------------------------------
  // 3. RECOGNITION PIPELINE (Local OCR / Cloud AI)
  // ----------------------------------------------------

  const handleStartConversion = async () => {
    if (pages.length === 0) return;
    setStep('processing');
    setProcessedCount(0);
    setErrorNotice(null);

    const updatedPages = [...pages];

    if (isAiEnhanced) {
      // Cloud AI Enhanced Recognition
      try {
        setCurrentProcessingPage(1);
        const aiResponse = await runCloudAIOCR(pages);

        aiResponse.pages.forEach((res, idx) => {
          if (updatedPages[idx]) {
            updatedPages[idx].text = res.text;
            updatedPages[idx].rawText = res.text;
            updatedPages[idx].confidence = res.confidence;
            updatedPages[idx].confidenceTier = res.confidence >= 0.85 ? 'high' : (res.confidence >= 0.65 ? 'medium' : 'low');
            updatedPages[idx].uncertainWords = res.uncertain_words || [];
            updatedPages[idx].ocrStatus = 'ai';
            updatedPages[idx].processingStatus = 'completed';
          }
        });

        setProcessedCount(pages.length);
        setPages(updatedPages);
        setStep('review');
        if (notify?.complete) notify.complete();
        return;
      } catch (e: any) {
        console.warn("Cloud AI recognition failed or offline, executing local fallback:", e);
      }
    }

    // Local In-Browser OCR Pipeline (Controlled Concurrency: 2 at a time)
    for (let i = 0; i < pages.length; i++) {
      setCurrentProcessingPage(i + 1);
      const targetImage = pages[i].activeView === 'enhanced' ? pages[i].enhancedImage : pages[i].originalImage;

      try {
        const result = await runLocalOCR(targetImage);
        updatedPages[i].text = result.text;
        updatedPages[i].rawText = result.text;
        updatedPages[i].confidence = result.confidence;
        updatedPages[i].confidenceTier = result.confidence >= 0.85 ? 'high' : (result.confidence >= 0.65 ? 'medium' : 'low');
        updatedPages[i].hasHandwriting = result.hasHandwriting;
        updatedPages[i].ocrStatus = 'local';
        updatedPages[i].processingStatus = 'completed';
      } catch (err) {
        console.error(`Local OCR error on page ${i + 1}:`, err);
        updatedPages[i].text = '';
        updatedPages[i].processingStatus = 'failed';
      }

      setProcessedCount(i + 1);
    }

    setPages(updatedPages);
    setStep('review');
    if (notify?.complete) notify.complete();
  };

  const handleReprocessSinglePage = async (index: number) => {
    if (!pages[index]) return;
    const targetImage = pages[index].activeView === 'enhanced' ? pages[index].enhancedImage : pages[index].originalImage;

    try {
      const result = await runLocalOCR(targetImage);
      setPages(prev => prev.map((p, idx) => {
        if (idx === index) {
          return {
            ...p,
            text: result.text,
            rawText: result.text,
            confidence: result.confidence,
            confidenceTier: result.confidence >= 0.85 ? 'high' : (result.confidence >= 0.65 ? 'medium' : 'low'),
            hasHandwriting: result.hasHandwriting,
            ocrStatus: 'local',
            processingStatus: 'completed'
          };
        }
        return p;
      }));
      if (notify?.success) notify.success();
    } catch (e) {
      console.error("Single page reprocess error:", e);
    }
  };

  // ----------------------------------------------------
  // 4. DOCUMENT EXPORT GENERATION
  // ----------------------------------------------------

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const pdfBytes = await generateClientPDF(pages, designSettings);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const filename = `${(designSettings.documentTitle || 'Handwritten_Notes').replace(/\s+/g, '_')}.pdf`;
      downloadBlob(blob, filename);
      if (notify?.complete) notify.complete();
    } catch (err) {
      console.error("PDF generation error:", err);
      if (notify?.error) notify.error();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadDOCX = async () => {
    setIsGenerating(true);
    try {
      const docxBlob = await generateClientDOCX(pages, designSettings);
      const filename = `${(designSettings.documentTitle || 'Handwritten_Notes').replace(/\s+/g, '_')}.docx`;
      downloadBlob(docxBlob, filename);
      if (notify?.complete) notify.complete();
    } catch (err) {
      console.error("DOCX generation error:", err);
      if (notify?.error) notify.error();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadTXT = () => {
    const txtString = generateClientTXT(pages, designSettings.documentTitle);
    const blob = new Blob([txtString], { type: 'text/plain;charset=utf-8' });
    const filename = `${(designSettings.documentTitle || 'Handwritten_Notes').replace(/\s+/g, '_')}.txt`;
    downloadBlob(blob, filename);
    if (notify?.success) notify.success();
  };

  const qualityReport: QualityCheckReport = validateDocumentQuality(pages);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 animate-fadeIn space-y-8">
      {/* Hidden file input for incremental additions */}
      <input
        type="file"
        ref={uploadInputRef}
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
          }
        }}
        accept=".pdf,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
      />

      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase tracking-widest">
          <Sparkles size={14} /> AI-Assisted Document Scanner V2
        </div>
        <h1 className={`text-4xl sm:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Convert Handwriting to <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">
            Computer-Typed PDF
          </span>
        </h1>
        <p className={`text-base sm:text-lg font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Upload handwritten lecture notes, letters, or snap photos with your camera. Transcribe, edit, and export to crisp computer-typed PDF, DOCX, and TXT.
        </p>
      </div>

      {/* Step Progress Navigation Tabs */}
      {pages.length > 0 && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto py-2">
          <button
            onClick={() => setStep('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              step === 'queue'
                ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                : darkMode
                ? 'bg-slate-800 text-slate-400 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} /> 1. Page Queue ({pages.length})
          </button>

          <span className="text-slate-400 font-bold">→</span>

          <button
            onClick={() => step !== 'processing' && setStep('review')}
            disabled={step === 'queue' && pages.every(p => !p.text)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              step === 'review'
                ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                : darkMode
                ? 'bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-40'
            }`}
          >
            <FileText size={14} /> 2. Review & Edit
          </button>

          <span className="text-slate-400 font-bold">→</span>

          <button
            onClick={() => setStep('export')}
            disabled={pages.every(p => !p.text)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              step === 'export'
                ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                : darkMode
                ? 'bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-40'
            }`}
          >
            <Sliders size={14} /> 3. Design & Export
          </button>
        </div>
      )}

      {/* Error Notice */}
      {errorNotice && (
        <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 1: QUEUE & INITIAL WORKSPACE                    */}
      {/* ==================================================== */}
      {step === 'queue' && (
        <div className="space-y-8">
          {pages.length === 0 ? (
            /* Primary Input Selection Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Option A: Upload Files / PDF */}
              <div className={`p-8 rounded-[2.5rem] border text-center flex flex-col justify-between transition-all hover:border-yellow-500/50 ${
                darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md'
              }`}>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
                    <Upload size={32} />
                  </div>
                  <h2 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Upload Files or PDF
                  </h2>
                  <p className={`text-xs sm:text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select multi-page PDFs, scanned notes, JPG, PNG, or WEBP images directly from your device.
                  </p>
                </div>

                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  Browse Files
                </button>
              </div>

              {/* Option B: Use Camera */}
              <div className={`p-8 rounded-[2.5rem] border text-center flex flex-col justify-between transition-all hover:border-yellow-500/50 ${
                darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md'
              }`}>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-6">
                    <Camera size={32} />
                  </div>
                  <h2 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Use Device Camera
                  </h2>
                  <p className={`text-xs sm:text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Snap handwritten workbook or notebook pages one by one with live alignment assistance.
                  </p>
                </div>

                <button
                  onClick={() => setIsCameraModalOpen(true)}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <Camera size={18} /> Open Camera
                </button>
              </div>
            </div>
          ) : (
            /* Multi-Page Queue View */
            <div className="space-y-8">
              <PageQueueList
                pages={pages}
                onReorder={setPages}
                onDeletePage={handleDeletePage}
                onRotatePage={handleRotatePage}
                onToggleView={handleToggleView}
                onOpenUpload={() => uploadInputRef.current?.click()}
                onOpenCamera={() => setIsCameraModalOpen(true)}
                darkMode={darkMode}
              />

              {/* Recognition Engine Selection & Conversion Trigger */}
              <div className={`p-6 md:p-8 rounded-[2.5rem] border flex flex-col md:flex-row items-center justify-between gap-6 ${
                darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-md'
              }`}>
                {/* Privacy & Engine Option */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAiEnhanced}
                        onChange={(e) => setIsAiEnhanced(e.target.checked)}
                        className="rounded accent-yellow-500 w-4 h-4"
                      />
                      <span className="font-bold text-sm">
                        AI-Enhanced Recognition (Cloud Multi-Modal)
                      </span>
                    </label>
                    {isAiEnhanced && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase">
                        High Accuracy
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    {isAiEnhanced
                      ? 'AI Enhanced Recognition temporarily sends selected images to our processing server (15-min auto-deletion policy enforced).'
                      : '100% In-Browser WebAssembly OCR. Zero uploads to any server.'}
                  </p>
                </div>

                {/* Start Conversion Button */}
                <button
                  onClick={handleStartConversion}
                  className="w-full md:w-auto px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                >
                  <Sparkles size={18} /> Convert to Computer Text ({pages.length} Pages)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 2: PROCESSING CONVERTING PROGRESS               */}
      {/* ==================================================== */}
      {step === 'processing' && (
        <div className={`max-w-2xl mx-auto p-10 rounded-[3rem] border text-center space-y-6 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'
        }`}>
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          
          <div>
            <h3 className="text-2xl font-black mb-2">
              Transcribing Handwriting...
            </h3>
            <p className="text-sm text-slate-400">
              Processing Page {currentProcessingPage} of {pages.length}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-yellow-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.round((processedCount / Math.max(1, pages.length)) * 100)}%` }}
            ></div>
          </div>

          <p className="text-xs text-slate-500 font-mono">
            {processedCount} / {pages.length} pages transcribed
          </p>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 3: SIDE-BY-SIDE REVIEW & EDIT                   */}
      {/* ==================================================== */}
      {step === 'review' && (
        <div className="space-y-6">
          <TranscriptionEditor
            pages={pages}
            currentPageIndex={currentPageIndex}
            onSelectPageIndex={setCurrentPageIndex}
            onUpdatePageText={(idx, newText) => {
              setPages(prev => prev.map((p, i) => i === idx ? { ...p, text: newText } : p));
            }}
            onReprocessPage={handleReprocessSinglePage}
            darkMode={darkMode}
          />

          {/* Proceed to Design & Export Bar */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep('queue')}
              className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={16} /> Back to Page Queue
            </button>

            <button
              onClick={() => setStep('export')}
              className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              Proceed to Design & Export <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 4: TYPOGRAPHY DESIGN & MULTI-FORMAT EXPORT      */}
      {/* ==================================================== */}
      {step === 'export' && (
        <div className="space-y-6">
          <QualityCheckBanner
            report={qualityReport}
            onNavigatePage={(idx) => {
              setCurrentPageIndex(idx);
              setStep('review');
            }}
            darkMode={darkMode}
          />

          <DesignSettingsPanel
            settings={designSettings}
            onChange={setDesignSettings}
            onDownloadPDF={handleDownloadPDF}
            onDownloadDOCX={handleDownloadDOCX}
            onDownloadTXT={handleDownloadTXT}
            isGenerating={isGenerating}
            darkMode={darkMode}
          />

          <div className="flex items-center justify-start pt-2">
            <button
              onClick={() => setStep('review')}
              className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={16} /> Back to Review & Edit
            </button>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        pageNumber={pages.length + 1}
        darkMode={darkMode}
      />
    </div>
  );
};

export default HandwritingTool;
