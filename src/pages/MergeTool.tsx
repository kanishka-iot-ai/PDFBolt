import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import { mergeFiles } from '../services/pdfService';
import { FileText, Download, Trash2, ArrowUp, ArrowDown, CheckCircle2, Plus, ArrowRight } from 'lucide-react';
import { NotifySystem } from '../types';
import ProgressBar from '../components/ProgressBar';
import { validateFiles, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';
import { useActiveWork } from '../context/ActiveWorkContext';
import PDFThumbnail from '../components/PDFThumbnail';

const MergeTool: React.FC<{ darkMode: boolean; notify: NotifySystem }> = ({ darkMode, notify }) => {
  const { setHasActiveWork } = useActiveWork();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [resultKey, setResultKey] = useState(0);

  // Sync active work state
  useEffect(() => {
    setHasActiveWork((files.length > 0 && !result) || processing);
    return () => setHasActiveWork(false);
  }, [files.length, result, processing, setHasActiveWork]);

  // Cleanup blob URLs only on component unmount
  // Cleanup blob URLs only when result changes or component unmounts
  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result);
      }
    };
  }, [result]);

  const handleFiles = async (nf: File[]) => {
    if (nf.length === 0) return; // Prevent reset on empty updates

    // Validate PDF files
    const validation = await validateFiles(nf, {
      allowedTypes: ALLOWED_MIME_TYPES.PDF,
      maxSize: MAX_FILE_SIZE.PDF,
      maxFiles: 50,
      checkStructure: true
    });

    if (!validation.valid) {
      alert(validation.error || 'Invalid PDF files');
      return;
    }

    if (validation.warning) {
      if (!confirm(`${validation.warning}\n\nDo you want to continue?`)) {
        return;
      }
    }

    setFiles(p => [...p, ...nf]);
    notify.upload();
    setResult(null);
    setProgress(0);
    setProcessingStatus('processing');
  };

  const move = (idx: number, dir: 'up' | 'down') => {
    const nf = [...files];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < nf.length) {
      [nf[idx], nf[targetIdx]] = [nf[targetIdx], nf[idx]];
      setFiles(nf);
      setResult(null);
    }
  };

  const process = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setResult(null);
    setProgress(10);
    setProcessingStatus('processing');
    try {
      setProgress(30);
      const b = await mergeFiles(files);

      if (b.length === 0) {
        throw new Error("Merge produced an empty file.");
      }

      setProgress(80);
      const blob = new Blob([b] as BlobPart[], { type: 'application/pdf' });

      // Revoke old URL before creating new one to prevent memory leaks
      if (result) {
        URL.revokeObjectURL(result);
      }

      const url = URL.createObjectURL(blob);
      setResult(url);
      setResultKey(prev => prev + 1);
      setProgress(100);
      setProcessingStatus('complete');
      notify.complete();
    } catch (err: any) {
      console.error(err);
      setProcessingStatus('error');
      notify.error();
      alert(err.message || 'Merge failed. Please ensure all files are valid PDFs.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-2 animate-fadeIn">
      {files.length === 0 ? (
        <div className="max-w-4xl mx-auto">
          <FileUploader onFilesSelected={handleFiles} darkMode={darkMode} />
        </div>
      ) : !result ? (
        <div className="space-y-6">
          {/* Progress Bar */}
          {processing && (
            <div className="mb-4">
              <ProgressBar
                progress={progress}
                label="Merging PDFs..."
                darkMode={darkMode}
                status={processingStatus}
                fileName={`${files.length} files`}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start text-left">
            {/* Left Column: PDF Parts List */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <div className={`p-6 sm:p-8 rounded-[2.5rem] border transition-all ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-xl'
              }`}>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {files.length} PDF Files Loaded
                    </span>
                  </div>
                  {!processing && (
                    <button
                      onClick={() => { setFiles([]); setResult(null); }}
                      className="text-red-500 hover:text-red-600 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      darkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm flex items-center justify-center">
                          <PDFThumbnail file={f} className="w-full h-full object-contain" alt={f.name} />
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-xs sm:text-sm block truncate" title={f.name}>{f.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Part {i + 1}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => move(i, 'up')}
                          disabled={i === 0 || processing}
                          aria-label="Move file up"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors cursor-pointer"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => move(i, 'down')}
                          disabled={i === files.length - 1 || processing}
                          aria-label="Move file down"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors cursor-pointer"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => { setFiles(files.filter((_, idx) => idx !== i)); setResult(null); }}
                          disabled={processing}
                          aria-label="Remove file"
                          className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="w-full py-3.5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-yellow-600 hover:border-yellow-500 transition-all flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest cursor-pointer"
                  >
                    <Plus size={16} /> Add More Files
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Options & Action */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className={`p-6 sm:p-8 rounded-[2.5rem] border shadow-2xl space-y-6 ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                  <h2 className={`text-base sm:text-lg font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Merge PDF Settings
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                    Order
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
                  <p>
                    Documents will be merged in the exact sequence shown in the parts list on the left.
                  </p>
                  <div className={`p-4 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-50 text-slate-700 border border-slate-100'
                  }`}>
                    📄 {files.length} document{files.length > 1 ? 's' : ''} queued for merge
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    disabled={processing || files.length < 2}
                    onClick={process}
                    className="w-full py-5 sm:py-6 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-black text-xl sm:text-2xl shadow-xl hover:from-red-700 hover:to-rose-700 hover:scale-[1.02] active:scale-[0.99] disabled:opacity-30 transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {processing ? (
                      <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Merge {files.length} Files</span>
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
        /* Result State */
        <div key={resultKey} className="flex flex-col items-center gap-6 max-w-xl mx-auto w-full animate-fadeIn text-center">
          <div className="flex items-center gap-4 text-green-500 font-black bg-green-50 dark:bg-green-900/20 px-10 py-5 rounded-[2rem] border border-green-100 dark:border-green-800 w-full justify-center">
            <CheckCircle2 size={32} />
            <span className="text-2xl">Merge Ready</span>
          </div>
          <a
            href={result}
            download="merged_pdfbolt.pdf"
            onClick={() => notify.success()}
            className="w-full flex items-center justify-center gap-4 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-xl shadow-2xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all"
          >
            <Download size={24} /> Download Merged PDF
          </a>
          <button
            onClick={() => { setFiles([]); setResult(null); }}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-2 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60 hover:text-yellow-400'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-yellow-400 hover:bg-white hover:text-slate-900'
            }`}
          >
            <FileText size={16} /> Process Another Merge
          </button>
        </div>
      )}

      {/* Hidden uploader for 'Add More' button */}
      <input
        type="file"
        multiple
        accept=".pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
    </div>
  );
};
export default MergeTool;