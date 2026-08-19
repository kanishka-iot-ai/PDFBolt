import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;const degrees = (angle: number) => ({ type: 'degrees' as const, angle });

function parsePageSelection(input: string, totalCount: number, allowRanges: boolean): number[] {
  const pages = new Set<number>();
  const segments = input.split(',').map(s => s.trim()).filter(Boolean);

  if (segments.length === 0) {
    throw new Error("Enter at least one page number.");
  }

  for (const segment of segments) {
    if (segment.includes('-')) {
      if (!allowRanges) {
        throw new Error(`Ranges are not supported here: "${segment}". Use comma-separated page numbers.`);
      }

      const match = segment.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!match) {
        throw new Error(`Invalid page range: "${segment}". Use a format like 1-3.`);
      }

      const start = Number(match[1]);
      const end = Number(match[2]);
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);

      for (let page = lo; page <= hi; page++) {
        if (page < 1 || page > totalCount) {
          throw new Error(`Page ${page} is outside this PDF. It has ${totalCount} page${totalCount === 1 ? '' : 's'}.`);
        }
        pages.add(page - 1);
      }
    } else {
      if (!/^\d+$/.test(segment)) {
        throw new Error(`Invalid page number: "${segment}".`);
      }

      const page = Number(segment);
      if (page < 1 || page > totalCount) {
        throw new Error(`Page ${page} is outside this PDF. It has ${totalCount} page${totalCount === 1 ? '' : 's'}.`);
      }
      pages.add(page - 1);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Merges multiple PDF files into a single document.
 * Handles different PDF versions and copies pages safely.
 */
export async function mergeFiles(files: File[]): Promise<Uint8Array> {
  if (files.length === 0) throw new Error("No files selected for merging.");
  const merged = await PDFDocument.create();
  for (const f of files) {
    try {
      const pdfBytes = await f.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const indices = pdf.getPageIndices();
      const copiedPages = await merged.copyPages(pdf, indices);
      copiedPages.forEach(p => merged.addPage(p));
    } catch (err) {
      console.error(`Error processing ${f.name}:`, err);
      throw new Error(`Failed to load PDF: ${f.name}`);
    }
  }
  const result = await merged.save();

  if (result.length === 0) {
    throw new Error("Merging resulted in an empty file.");
  }

  return result;
}

/**
 * Rotates all pages by a specific degree amount.
 */
export async function rotateFile(file: File, rotation: number): Promise<Uint8Array> {
  const pdfBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(pdfBytes);
  pdf.getPages().forEach(p => {
    const currentRotation = p.getRotation().angle;
    p.setRotation(degrees(currentRotation + rotation));
  });
  return await pdf.save();
}

/**
 * Adds page numbers to the bottom right.
 */
export async function addPageNumbers(file: File): Promise<Uint8Array> {
  const pdfBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const total = pages.length;

  pages.forEach((p, i) => {
    const { width } = p.getSize();
    p.drawText(`${i + 1} / ${total}`, {
      x: width - 70,
      y: 30,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });
  });
  return await pdf.save();
}

export interface CompressionOptions {
  profile: 'max' | 'high' | 'balanced' | 'high-compression' | 'extreme' | 'custom' | 'target';
  targetSizeMB?: number;
  customDpi?: number; // 72, 96, 150, 200, 300
  customQuality?: number; // 0.1 - 1.0
  stripMetadata?: boolean;
  useObjectStreams?: boolean;
}

export interface PdfCompressionStats {
  fileName: string;
  originalSizeBytes: number;
  pageCount: number;
  imageCount: number;
  fontCount: number;
  detectedType: 'text-heavy' | 'image-heavy' | 'scanned' | 'presentation' | 'mixed';
  recommendedProfile: 'max' | 'high' | 'balanced' | 'high-compression' | 'extreme';
  expectedReductionPercent: string;
  recommendationReason: string;
}

export interface CompressionResult {
  compressedBytes: Uint8Array;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savedBytes: number;
  savedPercent: number;
  previewOriginalDataUrl?: string;
  previewCompressedDataUrl?: string;
}

/**
 * Inspects a PDF's composition immediately upon upload to recommend the ideal profile.
 */
export async function inspectPdfForCompression(file: File): Promise<PdfCompressionStats> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

  let totalImages = 0;
  let totalFonts = 0;
  let totalTextLength = 0;

  try {
    const OPS = (pdfjsLib as any).OPS || { paintImageXObject: 85, paintInlineImageXObject: 86 };

    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const operatorList = await page.getOperatorList();

      const imageOps = operatorList.fnArray.filter(fn => fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject);
      totalImages += imageOps.length;

      const pageText = textContent.items.map((it: any) => it.str).join('');
      totalTextLength += pageText.length;

      const fonts = new Set(textContent.items.map((it: any) => it.fontName).filter(Boolean));
      totalFonts += fonts.size;
    }
  } finally {
    pdf.destroy();
  }

  // Determine document structure
  let detectedType: 'text-heavy' | 'image-heavy' | 'scanned' | 'presentation' | 'mixed' = 'mixed';
  let recommendedProfile: 'max' | 'high' | 'balanced' | 'high-compression' | 'extreme' = 'balanced';
  let expectedReductionPercent = '45%–65%';
  let recommendationReason = 'Balanced compression achieves excellent visual clarity with a high file size reduction.';

  if (totalImages === 0 && totalTextLength > 500) {
    detectedType = 'text-heavy';
    recommendedProfile = 'high';
    expectedReductionPercent = '30%–50%';
    recommendationReason = 'This document is primarily vector text and fonts. High Quality preserves crystal-clear typography.';
  } else if (totalImages >= 5 || (file.size / Math.max(1, pdf.numPages)) > 1.5 * 1024 * 1024) {
    detectedType = 'image-heavy';
    recommendedProfile = 'balanced';
    expectedReductionPercent = '55%–75%';
    recommendationReason = 'This PDF contains high-resolution embedded images. Balanced downsampling will save significant space.';
  } else if (totalTextLength < 50 && totalImages > 0) {
    detectedType = 'scanned';
    recommendedProfile = 'high-compression';
    expectedReductionPercent = '60%–80%';
    recommendationReason = 'This appears to be a scanned paper archive. High Compression optimizes image density for email and portals.';
  }

  return {
    fileName: file.name,
    originalSizeBytes: file.size,
    pageCount: pdf.numPages,
    imageCount: totalImages,
    fontCount: Math.max(1, totalFonts),
    detectedType,
    recommendedProfile,
    expectedReductionPercent,
    recommendationReason
  };
}

/**
 * Compresses PDF by reconstructing the document and stripping unused data.
 */
export async function compressPdf(file: File, level: string = 'recommended'): Promise<Uint8Array> {
  const res = await compressPdfAdvanced(file, {
    profile: level === 'extreme' ? 'extreme' : level === 'high' ? 'high-compression' : 'balanced'
  });
  return res.compressedBytes;
}

/**
 * Advanced multi-profile, target-size capable, quality-comparing PDF compressor.
 */
export async function compressPdfAdvanced(
  file: File,
  options: CompressionOptions,
  onProgress?: (pct: number) => void
): Promise<CompressionResult> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

  let previewOriginalDataUrl = '';
  let previewCompressedDataUrl = '';

  try {
    const targetPdf = await PDFDocument.create();

    // Strip metadata if requested (default true)
    if (options.stripMetadata !== false) {
      targetPdf.setTitle('');
      targetPdf.setAuthor('');
      targetPdf.setSubject('');
      targetPdf.setKeywords([]);
      targetPdf.setProducer('');
      targetPdf.setCreator('');
    }

    // Determine scale and quality based on profile or target size (Never degrades below 150 DPI non-blur baseline)
    let scale = 1.8; // ~180 DPI
    let quality = 0.82;

    if (options.profile === 'max') {
      scale = 2.8; // ~300 DPI
      quality = 0.94;
    } else if (options.profile === 'high') {
      scale = 2.2; // ~220 DPI
      quality = 0.88;
    } else if (options.profile === 'balanced') {
      scale = 1.8; // ~180 DPI
      quality = 0.82;
    } else if (options.profile === 'high-compression') {
      scale = 1.6; // ~160 DPI
      quality = 0.76;
    } else if (options.profile === 'extreme') {
      scale = 1.5; // ~150 DPI (Crisp anti-aliased text, zero blur)
      quality = 0.72;
    } else if (options.profile === 'custom') {
      scale = (options.customDpi || 150) / 96;
      quality = options.customQuality || 0.80;
    } else if (options.profile === 'target' && options.targetSizeMB) {
      const currentMB = file.size / (1024 * 1024);
      const targetRatio = Math.max(0.1, Math.min(0.95, options.targetSizeMB / currentMB));
      
      if (targetRatio >= 0.75) {
        scale = 2.2;
        quality = 0.88;
      } else if (targetRatio >= 0.5) {
        scale = 1.8;
        quality = 0.82;
      } else if (targetRatio >= 0.3) {
        scale = 1.6;
        quality = 0.76;
      } else {
        scale = 1.5;
        quality = 0.72;
      }
    }


    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(Math.round(15 + (i / pdf.numPages) * 75));
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      // Capture original Page 1 preview
      if (i === 1) {
        const origCanvas = document.createElement('canvas');
        const origCtx = origCanvas.getContext('2d');
        const origViewport = page.getViewport({ scale: 1.0 });
        if (origCtx) {
          origCanvas.width = origViewport.width;
          origCanvas.height = origViewport.height;
          await page.render({ canvasContext: origCtx, viewport: origViewport }).promise;
          previewOriginalDataUrl = origCanvas.toDataURL('image/jpeg', 0.95);
        }
      }

      const imgData = canvas.toDataURL('image/jpeg', quality);

      if (i === 1) {
        previewCompressedDataUrl = imgData;
      }

      const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
      const jpgImage = await targetPdf.embedJpg(imgBytes);
      const pdfPage = targetPdf.addPage([jpgImage.width / scale, jpgImage.height / scale]);
      pdfPage.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgImage.width / scale,
        height: jpgImage.height / scale,
      });
    }

    // Save with Object Streams for minimal file weight
    const base64 = await targetPdf.saveAsBase64({
      useObjectStreams: options.useObjectStreams !== false
    });

    const binary = atob(base64);
    const result = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      result[i] = binary.charCodeAt(i);
    }

    if (result.length === 0) {
      throw new Error("Compression resulted in an empty file.");
    }

    const compressedSizeBytes = result.length;
    const originalSizeBytes = file.size;
    const savedBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);
    const savedPercent = Number(((savedBytes / originalSizeBytes) * 100).toFixed(2));

    onProgress?.(100);

    return {
      compressedBytes: result,
      originalSizeBytes,
      compressedSizeBytes,
      savedBytes,
      savedPercent,
      previewOriginalDataUrl,
      previewCompressedDataUrl
    };
  } finally {
    pdf.destroy();
  }
}

/**
 * Splits a PDF based on user-provided range string.
 */
export async function splitPdf(file: File, range: string): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes);
  const targetPdf = await PDFDocument.create();
  const totalCount = sourcePdf.getPageCount();

  const finalIndices = parsePageSelection(range, totalCount, true);

  const copiedPages = await targetPdf.copyPages(sourcePdf, finalIndices);
  copiedPages.forEach(p => targetPdf.addPage(p));

  return await targetPdf.save();
}

/**
 * Removes specific pages from a document.
 */
export async function deletePages(file: File, indicesStr: string): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const totalCount = pdf.getPageCount();

  // Sort descending to avoid index shifting problems
  const uniqueIndices = parsePageSelection(indicesStr, totalCount, false).sort((a, b) => b - a);

  uniqueIndices.forEach(idx => {
    if (idx >= 0 && idx < totalCount) {
      pdf.removePage(idx);
    }
  });

  if (pdf.getPageCount() === 0) throw new Error("Cannot delete all pages from a PDF.");
  return await pdf.save();
}

/**
 * Watermarks PDF.
 */
export async function watermarkPdf(file: File, text: string, fontSize: number = 50): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.getPages().forEach(p => {
    const { width, height } = p.getSize();
    p.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.3,
      rotate: degrees(45)
    });
  });
  return await pdf.save();
}


interface ImageFitOptions {
  pageSize: 'fit' | 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  margin: 'none' | 'small' | 'standard'; // standard=50pt, small=20pt, none=0
}

async function convertImageToPngBytes(file: File): Promise<ArrayBuffer> {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Could not read image "${file.name}".`));
      image.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error("This browser could not prepare the image canvas.");
    }

    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error(`Could not convert "${file.name}" to a PDF-ready image.`);
    }

    return await blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Converts multiple image files into one PDF.
 */
export async function imagesToPdf(files: File[], options: ImageFitOptions = { pageSize: 'fit', orientation: 'portrait', margin: 'small' }): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Define sizes in points (1 pt = 1/72 inch)
  const sizes = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612, height: 792 }
  };

  const margins = {
    none: 0,
    small: 20,
    standard: 50
  };

  for (const f of files) {
    let imgBytes = await f.arrayBuffer();
    let img;
    const type = f.type.toLowerCase();

    try {
      if (type.includes('jpeg') || type.includes('jpg')) {
        img = await pdfDoc.embedJpg(imgBytes);
      } else if (type.includes('png')) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        imgBytes = await convertImageToPngBytes(f);
        img = await pdfDoc.embedPng(imgBytes);
      }

      let pageWidth, pageHeight, drawX, drawY, drawWidth, drawHeight;

      if (options.pageSize === 'fit') {
        pageWidth = img.width;
        pageHeight = img.height;
        drawX = 0;
        drawY = 0;
        drawWidth = img.width;
        drawHeight = img.height;
      } else {
        // Standard Size (A4/Letter)
        const size = sizes[options.pageSize];
        const isLandscape = options.orientation === 'landscape';
        pageWidth = isLandscape ? size.height : size.width;
        pageHeight = isLandscape ? size.width : size.height;

        const margin = margins[options.margin];
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);

        // Scale Logic (Fit within available area)
        const scale = Math.min(availableWidth / img.width, availableHeight / img.height);
        drawWidth = img.width * scale;
        drawHeight = img.height * scale;

        // Center Image
        drawX = margin + (availableWidth - drawWidth) / 2;
        drawY = margin + (availableHeight - drawHeight) / 2;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(img, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });

    } catch (error) {
      throw new Error(`Could not add image '${f.name}': ${(error as Error).message}`);
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    throw new Error("No supported images were added. Use JPG or PNG files.");
  }

  return await pdfDoc.save();
}
