import React, { useState, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import { mergeFiles } from '../services/pdfService';
import { FileText, Download, Trash2, ArrowUp, ArrowDown, CheckCircle2, Plus } from 'lucide-react';
import { NotifySystem } from '../types';
import ProgressBar from '../components/ProgressBar';
import { validateFiles, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';

const MergeTool: React.FC<{ darkMode: boolean; notify: NotifySystem }> = ({ darkMode, notify }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [resultKey, setResultKey] = useState(0);

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
    <div className="max-w-5xl mx-auto px-6 py-20 animate-fadeIn">
      <h1 className="text-6xl font-black text-center mb-16 leading-tight">Merge PDFs</h1>

      <div className="space-y-8">
        {files.length > 0 && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="bg-yellow-500/10 p-3 rounded-xl shrink-0">
                    <FileText className="text-yellow-500 w-6 h-6" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-sm block truncate">{f.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Part {i + 1}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => move(i, 'up')} disabled={i === 0} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors"><ArrowUp size={16} /></button>
                  <button onClick={() => move(i, 'down')} disabled={i === files.length - 1} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors"><ArrowDown size={16} /></button>
                  <button onClick={() => { setFiles(files.filter((_, idx) => idx !== i)); setResult(null); }} className="p-2 text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-xl hover:bg-orange-100 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}

            <button
              onClick={() => document.querySelector('input')?.click()}
              className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem] text-slate-400 hover:text-yellow-500 hover:border-yellow-500 transition-all flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest"
            >
              <Plus size={16} /> Add More Files
            </button>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {files.length === 0 ? (
            <FileUploader onFilesSelected={handleFiles} darkMode={darkMode} />
          ) : (
            <div className="flex flex-col items-center gap-8 mt-12">
              {/* Progress Bar */}
              {processing && (
                <ProgressBar
                  progress={progress}
                  label="Merging PDFs..."
                  darkMode={darkMode}
                  status={processingStatus}
                  fileName={`${files.length} files`}
                />
              )}

              {result ? (
                <div key={resultKey} className="flex flex-col items-center gap-8 w-full max-w-xl">
                  <div className="flex items-center gap-4 text-green-500 font-black bg-green-50 dark:bg-green-900/20 px-10 py-5 rounded-[2rem] border border-green-100 dark:border-green-800">
                    <CheckCircle2 size={32} />
                    <span className="text-2xl">Merge Ready</span>
                  </div>
                  <a href={result} download="merged_pdfbolt.pdf" onClick={() => notify.success()} className="w-full flex items-center justify-center gap-4 py-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all">
                    <Download size={28} /> Download PDF
                  </a>
                  <button onClick={() => { setFiles([]); setResult(null); }} className="text-slate-500 font-bold uppercase text-xs hover:underline">Start New Merge</button>
                </div>
              ) : (
                <button
                  disabled={processing || files.length < 2}
                  onClick={process}
                  className="w-full max-w-xl px-10 py-8 bg-red-600 text-white rounded-[2.5rem] font-black text-3xl shadow-2xl hover:bg-red-700 hover:scale-105 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group"
                >
                  {processing ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Merge {files.length} Files</span>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden uploader for 'Add More' button */}
      <div className="hidden">
        <FileUploader onFilesSelected={handleFiles} darkMode={darkMode} />
      </div>
    </div>
  );
};
export default MergeTool;