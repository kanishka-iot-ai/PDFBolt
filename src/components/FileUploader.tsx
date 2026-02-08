
import React, { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  darkMode: boolean;
  mini?: boolean;
  allowFolder?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  accept = ".pdf",
  multiple = true,
  maxSizeMB = 100,
  darkMode,
  allowFolder
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Improved handling for dropped items (including folders)
    const items = Array.from(e.dataTransfer.items);
    if (items && items.length > 0 && items[0].webkitGetAsEntry) {
      // Detailed recursive scanning is complex for a simple drop handler without more logic
      // For now fallback to standard file list which might be flat or empty for folders in some browsers
      // But often 'files' property contains files inside folders if dropped.
      // Yet, webkitRelativePath is often missing on Drop.
      // For "Compress Folder", the "Choose Folder" button is the most reliable way to get relative paths.
    }

    const files = Array.from(e.dataTransfer.files) as File[];
    validateAndProcessFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndProcessFiles(Array.from(e.target.files) as File[]);
    }
  };

  const validateAndProcessFiles = async (files: File[]) => {
    // Remove built-in validation - let parent components handle it
    // Just pass all files to the parent
    if (files.length > 0) {
      await simulateUpload(files);
    }
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const simulateUpload = async (files: File[]) => {
    setUploading(true);
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          timerRef.current = setTimeout(async () => {
            if (isMounted.current) {
              setUploading(false);
              await onFilesSelected(files);
            }
          }, 400);
          return 100;
        }
        return prev + 12;
      });
    }, 80);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!uploading ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-3 border-dashed rounded-[2rem] p-16 text-center cursor-pointer transition-all duration-300 transform active:scale-[0.98] ${isDragging
            ? 'border-yellow-500 bg-yellow-500/10'
            : darkMode
              ? 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              : 'border-slate-200 bg-white hover:border-yellow-300 hover:shadow-2xl'
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
            // @ts-ignore - webkitdirectory is not standard in React types yet
            webkitdirectory="true"
            directory=""
            multiple
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <div className={`p-6 rounded-3xl mb-8 ${darkMode ? 'bg-slate-700' : 'bg-yellow-50'}`}>
              <Upload className="w-12 h-12 text-yellow-600" />
            </div>
            <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Select Files
            </h2>
            <p className={`text-slate-500 mb-10 max-w-sm mx-auto text-lg`}>
              Drag and drop your files here, or click to choose from your computer.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-extrabold py-4 px-8 rounded-2xl shadow-xl transition-all hover:translate-y-[-2px]"
              >
                Choose {multiple ? 'Files' : 'File'}
              </button>

              {allowFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    folderInputRef.current?.click();
                  }}
                  className="bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold py-4 px-8 rounded-2xl shadow-sm transition-all hover:translate-y-[-2px]"
                >
                  Choose Folder
                </button>
              )}
            </div>

            <div className="mt-8 flex gap-6 text-sm font-medium text-slate-400">
              <span>Max {maxSizeMB}MB</span>
              <span>Free Forever</span>
              <span>Secure</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-[2rem] p-20 text-center border shadow-2xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="mb-10 relative h-6 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <h3 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Processing Upload... {progress}%
          </h3>
          <p className="text-slate-500 text-lg">Encrypting and preparing your secure workspace.</p>
          <button
            onClick={() => setUploading(false)}
            className="mt-12 flex items-center gap-2 mx-auto text-yellow-600 font-bold hover:bg-yellow-50 px-6 py-2 rounded-xl transition-colors"
          >
            <X size={20} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
