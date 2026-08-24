import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PDFThumbnailProps {
  file: File;
  className?: string;
  alt?: string;
  onPageCount?: (pages: number) => void;
}

// Deduplicated data-URL and page-count cache
const thumbnailCache = new Map<string, string>();
const pageCountCache = new Map<string, number>();

// Worker URL set once at module level — not on every render
let _workerSet = false;

const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ file, className = '', alt = 'PDF Preview', onPageCount }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let active = true; // local cancellation flag for this effect run

    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;

    if (thumbnailCache.has(cacheKey)) {
      setThumbnailUrl(thumbnailCache.get(cacheKey)!);
      if (pageCountCache.has(cacheKey) && onPageCount) {
        onPageCount(pageCountCache.get(cacheKey)!);
      }
      setLoading(false);
      return () => {
        active = false;
        isMounted.current = false;
      };
    }

    // Direct image handling — use data URL (not object URL) to allow caching safely
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!active) return;
        const dataUrl = e.target?.result as string;
        thumbnailCache.set(cacheKey, dataUrl);
        pageCountCache.set(cacheKey, 1);
        if (onPageCount) onPageCount(1);
        if (isMounted.current) {
          setThumbnailUrl(dataUrl);
          setLoading(false);
        }
      };
      reader.onerror = () => {
        if (!active) return;
        if (isMounted.current) { setError(true); setLoading(false); }
      };
      reader.readAsDataURL(file);
      return () => {
        active = false;
        isMounted.current = false;
      };
    }

    // PDF: render first page via pdfjs
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const renderFirstPage = async () => {
        try {
          setLoading(true);
          const pdfjsLib = await import('pdfjs-dist');

          if (!_workerSet) {
            const url = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
            pdfjsLib.GlobalWorkerOptions.workerSrc = url;
            _workerSet = true;
          }

          if (!active) return;

          const arrayBuffer = await file.arrayBuffer();
          if (!active) return;

          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          if (!active) { pdf.destroy(); return; }

          const numPages = pdf.numPages;
          pageCountCache.set(cacheKey, numPages);
          if (onPageCount) onPageCount(numPages);

          const page = await pdf.getPage(1);
          if (!active) { pdf.destroy(); return; }

          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');

          if (!context) throw new Error('Canvas 2D context unavailable');

          await page.render({ canvasContext: context, viewport }).promise;
          pdf.destroy();

          if (!active) return;

          // Store as data URL — safe to cache without memory leak
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          thumbnailCache.set(cacheKey, dataUrl);

          if (isMounted.current) {
            setThumbnailUrl(dataUrl);
            setLoading(false);
          }
        } catch (err) {
          console.warn('[PDFThumbnail] Error rendering first page thumbnail:', err);
          if (isMounted.current && active) {
            setError(true);
            setLoading(false);
          }
        }
      };

      renderFirstPage();
    } else {
      // Non-PDF / Non-Image
      setLoading(false);
      setError(true);
    }

    return () => {
      active = false;
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
