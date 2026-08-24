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
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center">
      {/* Error Banner */}
      {error && (
        <div className="w-full mb-4 p-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 animate-slideDown flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs">
                {typeof error === 'string' ? error : error.title}
              </h4>
              {typeof error !== 'string' && error.code && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200">
                  {error.code}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {typeof error === 'string' ? 'Please check your file and try again.' : error.description}
            </p>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              aria-label="Dismiss error notification"
              className="text-red-400 hover:text-red-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Hidden File Inputs */}
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

      {/* Clean Drag Area & Primary Select Button */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full p-4 sm:p-6 rounded-3xl transition-all duration-200 flex flex-col items-center justify-center ${
          isDragging ? 'bg-red-500/10 border-2 border-dashed border-red-500 scale-[1.02]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-sm py-5 sm:py-6 px-8 bg-[#e53935] hover:bg-[#d32f2f] text-white font-black text-xl sm:text-2xl uppercase tracking-wider rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Upload size={26} className="shrink-0" />
          <span>Select {formatBadge} {multiple ? 'files' : 'file'}</span>
        </button>

        <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
          or drop {formatBadge} here
        </p>

        {allowFolder && multiple && (
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer flex items-center gap-1"
          >
            <Folder size={13} /> Select entire folder
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
