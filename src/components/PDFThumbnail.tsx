import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PDFThumbnailProps {
  file: File;
  className?: string;
  alt?: string;
}

// In-memory cache for rendered thumbnails to prevent duplicate canvas renders
const thumbnailCache = new Map<string, string>();

const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ file, className = '', alt = 'PDF Preview' }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;

    if (thumbnailCache.has(cacheKey)) {
      setThumbnailUrl(thumbnailCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    // Direct Image Handling
    if (file.type.startsWith('image/')) {
      const objUrl = URL.createObjectURL(file);
      setThumbnailUrl(objUrl);
      thumbnailCache.set(cacheKey, objUrl);
      setLoading(false);
      return () => {
        // Keep object URL in cache
      };
    }

    // PDF First Page Rendering via PDF.js
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      let active = true;

      const renderFirstPage = async () => {
        try {
          setLoading(true);
          const pdfjsLib = await import('pdfjs-dist');
          const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

          const arrayBuffer = await file.arrayBuffer();
          if (!active) return;

          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          if (!active) return;

          const page = await pdf.getPage(1);
          if (!active) return;

          // Render at 1.5x scale for crisp thumbnail clarity
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');

          if (!context) throw new Error('Canvas 2D context unavailable');

          await page.render({ canvasContext: context, viewport }).promise;
          if (!active) return;

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          thumbnailCache.set(cacheKey, dataUrl);

          if (isMounted.current) {
            setThumbnailUrl(dataUrl);
            setLoading(false);
          }
        } catch (err) {
          console.warn('[PDFThumbnail] Thumbnail generation failed, falling back to icon:', err);
          if (isMounted.current) {
            setError(true);
            setLoading(false);
          }
        }
      };

      renderFirstPage();

      return () => {
        active = false;
      };
    } else {
      // Non-PDF / Non-Image files (Docx, Xlsx, PPTX)
      setLoading(false);
      setError(true);
    }

    return () => {
      isMounted.current = false;
    };
  }, [file]);

  if (loading) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 ${className}`}>
        <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
        <span className="text-[10px] text-slate-400 font-bold mt-2">Loading preview...</span>
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-yellow-600 dark:text-yellow-400 ${className}`}>
        <FileText size={48} />
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className={`w-full h-full object-contain bg-white shadow-inner ${className}`}
      loading="lazy"
    />
  );
};

export default React.memo(PDFThumbnail);
