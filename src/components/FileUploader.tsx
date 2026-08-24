import React, { useRef } from 'react';
import { Upload, X, AlertTriangle, ShieldCheck, Folder } from 'lucide-react';
import { HumanError } from '../utils/fileValidation';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  darkMode: boolean;
  allowFolder?: boolean;
  error?: HumanError | string | null;
  onClearError?: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  accept = ".pdf",
  multiple = true,
  maxSizeMB = 100,
  darkMode,
  allowFolder = true,
  error,
  onClearError
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  /**
   * Recursively read ALL entries from a DirectoryReader.
   * The Web FileSystem API returns at most 100 entries per readEntries() call,
   * so we must loop until the result is empty.
   */
  const readAllEntries = (dirReader: any): Promise<any[]> =>
    new Promise((resolve) => {
      const all: any[] = [];
      const readBatch = () => {
        dirReader.readEntries((batch: any[]) => {
          if (batch.length === 0) {
            resolve(all);
          } else {
            all.push(...batch);
            readBatch(); // keep reading until empty batch
          }
        }, () => resolve(all)); // on error, return what we have
      };
      readBatch();
    });

  const scanEntry = async (entry: any, allFiles: File[]): Promise<void> => {
    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => { allFiles.push(file); resolve(); },
          () => resolve() // error callback — skip unreadable files instead of hanging
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await readAllEntries(dirReader);
      for (const childEntry of entries) {
        await scanEntry(childEntry, allFiles);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onClearError?.();

    const items = Array.from(e.dataTransfer.items);
    if (items.length > 0 && items[0].webkitGetAsEntry) {
      const allFiles: File[] = [];
      for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (entry) await scanEntry(entry, allFiles);
      }
      if (allFiles.length > 0) {
        processFiles(allFiles);
        return;
      }
    }

    const files = Array.from(e.dataTransfer.files) as File[];
    processFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onClearError?.();
      processFiles(Array.from(e.target.files) as File[]);
    }
    // Reset so the same file can be re-selected after removal
    e.target.value = '';
  };

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;
    onFilesSelected(files);
  };

  const handleDropzoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  // Supported format badge
  const formatBadge = accept.includes('pdf') ? 'PDF' : accept.toUpperCase().replace(/\./g, ' ');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 animate-slideDown flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">
                {typeof error === 'string' ? error : error.title}
              </h4>
              {typeof error !== 'string' && error.code && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200">
                  {error.code}
                </span>
              )}
            </div>
            <p className="text-xs mt-1 leading-relaxed opacity-90">
              {typeof error === 'string' ? 'Please check your file and try again.' : error.description}
            </p>
            {typeof error !== 'string' && error.suggestion && (
              <p className="text-xs font-semibold mt-2 text-red-700 dark:text-red-300">
                💡 Tip: {error.suggestion}
              </p>
            )}
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              aria-label="Dismiss error notification"
              className="text-red-400 hover:text-red-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Main Upload Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${formatBadge} file${multiple ? 's' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleDropzoneKeyDown}
        className={`relative border-3 border-dashed rounded-[2.5rem] p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 transform active:scale-[0.99] ${
          isDragging
            ? 'border-yellow-500 bg-yellow-500/10 scale-[1.01]'
            : darkMode
              ? 'border-slate-700 bg-slate-800/40 hover:border-yellow-500/50 hover:bg-slate-800/60'
              : 'border-slate-200 bg-white hover:border-yellow-400 hover:shadow-2xl shadow-sm'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFileInput}
          // @ts-ignore
          webkitdirectory="true"
          directory=""
          multiple
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110 ${
            darkMode ? 'bg-slate-700/60 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
          }`}>
            <Upload className="w-8 h-8" />
          </div>

          <h2 className={`text-2xl sm:text-3xl font-black mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Drop your {formatBadge} here
          </h2>

          <p className={`text-xs sm:text-sm mb-6 max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Drag & drop from your desktop, or click below to browse files.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Select {multiple ? 'Files' : 'File'}
            </button>

            {allowFolder && multiple && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className={`px-6 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Folder size={16} /> Choose Folder
              </button>
            )}
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex flex-wrap justify-center items-center gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-500" /> 100% Client-Side Privacy
            </span>
            <span>•</span>
            <span>Max {maxSizeMB}MB</span>
            <span>•</span>
            <span>Batch Upload Supported</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
