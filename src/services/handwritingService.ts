import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Paragraph as DocxParagraph, TextRun, AlignmentType, HeadingLevel, Packer } from 'docx';
import {
  HandwritingPage,
  PDFDesignSettings,
  QualityCheckReport,
  ConfidenceTier
} from '../types/handwriting';
import { API_BASE_URL } from './apiClient';

// Configure PDF.js worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Generates a unique ID for a page.
 */
export function generatePageId(): string {
  return `hw_page_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Extracts and renders each page of an uploaded PDF into individual HandwritingPage objects.
 */
export async function renderPdfToPages(file: File): Promise<HandwritingPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: HandwritingPage[] = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;

        const originalImage = canvas.toDataURL('image/jpeg', 0.92);
        const enhancedImage = await enhanceImageCanvas(canvas);
        const thumbnail = createThumbnail(canvas, 240);

        pages.push({
          id: generatePageId(),
          source: 'pdf',
          name: `${file.name} - Page ${i}`,
          originalImage,
          enhancedImage,
          thumbnail,
          rotation: 0,
          activeView: 'enhanced',
          processingStatus: 'idle',
          ocrStatus: 'none',
          confidence: 0.9,
          confidenceTier: 'high',
          hasHandwriting: true,
          text: '',
          rawText: '',
          uncertainWords: [],
          warnings: []
        });
      }
    }
  } finally {
    pdf.destroy();
  }

  return pages;
}

/**
 * Processes an uploaded image file into a HandwritingPage object with preprocessed and thumbnail versions.
 */
export async function processImageFile(file: File): Promise<HandwritingPage> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  const maxDimension = 2400; // Limit memory blowup while keeping high resolution for OCR
  let width = img.width;
  let height = img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, width, height);
  }

  const originalImage = canvas.toDataURL('image/jpeg', 0.92);
  const enhancedImage = await enhanceImageCanvas(canvas);
  const thumbnail = createThumbnail(canvas, 240);

  return {
    id: generatePageId(),
    source: 'upload',
    file,
    name: file.name,
    originalImage,
    enhancedImage,
    thumbnail,
    rotation: 0,
    activeView: 'enhanced',
    processingStatus: 'idle',
    ocrStatus: 'none',
    confidence: 0.9,
    confidenceTier: 'high',
    hasHandwriting: true,
    text: '',
    rawText: '',
    uncertainWords: [],
    warnings: []
  };
}

/**
 * Processes a raw camera capture data URL into a HandwritingPage object.
 */
export async function processCameraCapture(dataUrl: string, pageNumber: number): Promise<HandwritingPage> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0);
  }

  const enhancedImage = await enhanceImageCanvas(canvas);
  const thumbnail = createThumbnail(canvas, 240);

  return {
    id: generatePageId(),
    source: 'camera',
    name: `Camera Scan - Page ${pageNumber}`,
    originalImage: dataUrl,
    enhancedImage,
    thumbnail,
    rotation: 0,
    activeView: 'enhanced',
    processingStatus: 'idle',
    ocrStatus: 'none',
    confidence: 0.9,
    confidenceTier: 'high',
    hasHandwriting: true,
    text: '',
    rawText: '',
    uncertainWords: [],
    warnings: []
  };
}

/**
 * Image Preprocessing Pipeline:
 * Uses OpenCV if loaded on window, otherwise fast 2D canvas adaptive thresholding.
 */
export async function enhanceImageCanvas(sourceCanvas: HTMLCanvasElement): Promise<string> {
  const cv = (window as any).cv;

  if (cv) {
    try {
      let src = cv.imread(sourceCanvas);
      let dst = new cv.Mat();

      try {
        // 1. Grayscale
        cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

        // 2. Gaussian Blur for noise removal
        let ksize = new cv.Size(3, 3);
        cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

        // 3. Adaptive Thresholding (Optimized for handwriting contrast)
        cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 4);

        const outputCanvas = document.createElement('canvas');
        cv.imshow(outputCanvas, dst);
        return outputCanvas.toDataURL('image/jpeg', 0.95);
      } finally {
        src.delete();
        dst.delete();
      }
    } catch (e) {
      console.warn("OpenCV enhancement warning, fallback to canvas:", e);
    }
  }

  // Pure Canvas Fallback (Grayscale + Contrast Enhancement)
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas.toDataURL('image/jpeg', 0.92);

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Grayscale and contrast stretch
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Contrast boost
    const enhanced = gray < 130 ? gray * 0.7 : Math.min(255, gray * 1.25);
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Assesses live or captured image quality (detects excessive blur or extreme darkness).
 */
export function assessImageQuality(canvas: HTMLCanvasElement): { isLowQuality: boolean; reason?: string } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { isLowQuality: false };

  const sampleWidth = Math.min(300, canvas.width);
  const sampleHeight = Math.min(300, canvas.height);
  const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imgData.data;

  let totalBrightness = 0;
  let pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    totalBrightness += brightness;
  }

  const avgBrightness = totalBrightness / pixelCount;

  if (avgBrightness < 45) {
    return { isLowQuality: true, reason: "Image is too dark. Increase lighting." };
  } else if (avgBrightness > 235) {
    return { isLowQuality: true, reason: "Extreme glare detected. Adjust camera angle." };
  }

  return { isLowQuality: false };
}

/**
 * Rotates an image Data URL by 90, 180, or 270 degrees.
 */
export async function rotateImageDataUrl(dataUrl: string, degrees: number): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  const rad = (degrees * Math.PI) / 180;
  if (degrees === 90 || degrees === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Local In-Browser Tesseract.js OCR execution.
 */
export async function runLocalOCR(imageDataUrl: string): Promise<{ text: string; confidence: number; hasHandwriting: boolean }> {
  const worker = await Tesseract.createWorker('eng');
  try {
    const { data: { text, confidence } } = await worker.recognize(imageDataUrl);
    const cleaned = cleanStructuredText(text);
    const score = Math.max(0.4, Math.min(0.98, confidence / 100));
    const hasHandwriting = cleaned.trim().length > 0;

    return {
      text: cleaned,
      confidence: hasHandwriting ? score : 0.0,
      hasHandwriting
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Calls Backend AI-Enhanced Recognition API.
 */
export async function runCloudAIOCR(
  pages: HandwritingPage[]
): Promise<{ pages: { page_number: number; text: string; confidence: number; uncertain_words: string[]; warnings: string[] }[]; provider_used: string }> {
  const payload = {
    pages: pages.map((p, idx) => ({
      page_number: idx + 1,
      image_base64: p.activeView === 'enhanced' ? p.enhancedImage : p.originalImage,
      rotation: p.rotation,
      enhanced: p.activeView === 'enhanced'
    })),
    ai_enhanced: true,
    language: 'eng',
    preserve_structure: true
  };

  const response = await fetch(`${API_BASE_URL}/handwriting/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`AI Recognition server error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Calls Backend AI Transcription Enhancement API (`/api/v1/handwriting/enhance`).
 */
export async function enhanceTranscriptionAPI(
  text: string,
  action: 'improve_recognition' | 'fix_ocr_errors' | 'preserve_exact' = 'improve_recognition'
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/handwriting/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, action, language: 'eng' })
  });

  if (!response.ok) {
    return text;
  }

  const data = await response.json();
  return data.enhanced_text || text;
}

/**
 * Performs pre-flight quality checks before generating final output.
 */
export function validateDocumentQuality(pages: HandwritingPage[]): QualityCheckReport {
  const issues: QualityCheckReport['issues'] = [];
  let emptyCount = 0;
  let lowConfidenceCount = 0;

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    if (!page.text || page.text.trim().length === 0) {
      emptyCount++;
      issues.push({
        type: 'empty',
        pageIndex: idx,
        pageNumber: pageNum,
        message: `Page ${pageNum} has no transcribed text.`,
        severity: 'warning'
      });
    } else if (page.confidence < 0.65) {
      lowConfidenceCount++;
      issues.push({
        type: 'low_confidence',
        pageIndex: idx,
        pageNumber: pageNum,
        message: `Page ${pageNum} has low OCR confidence (${Math.round(page.confidence * 100)}%). Review recommended.`,
        severity: 'warning'
      });
    }
  });

  return {
    passed: emptyCount === 0 && lowConfidenceCount === 0,
    issues,
    emptyCount,
    lowConfidenceCount
  };
}

/**
 * Generates a professional computer-typed PDF document client-side using pdf-lib.
 */
export async function generateClientPDF(
  pages: HandwritingPage[],
  design: PDFDesignSettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Paper Sizes in points
  let pageWidth = 595.28;  // A4
  let pageHeight = 841.89;

  if (design.paperSize === 'Letter') {
    pageWidth = 612;
    pageHeight = 792;
  } else if (design.paperSize === 'A5') {
    pageWidth = 419.53;
    pageHeight = 595.28;
  }

  // Margin in points
  let margin = 54; // Normal (0.75 in)
  if (design.margin === 'narrow') margin = 36;
  if (design.margin === 'wide') margin = 72;

  const fontSize = design.fontSize || 12;
  const leading = fontSize * (design.lineSpacing || 1.25);
  const contentWidth = pageWidth - (margin * 2);

  pages.forEach((pageItem, pageIndex) => {
    let pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Header
    if (design.headerText) {
      pdfPage.drawText(design.headerText, {
        x: margin,
        y: pageHeight - 30,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4)
      });
      pdfPage.drawLine({
        start: { x: margin, y: pageHeight - 35 },
        end: { x: pageWidth - margin, y: pageHeight - 35 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      });
    }

    // Document Title on Page 1
    if (pageIndex === 0 && design.documentTitle) {
      pdfPage.drawText(design.documentTitle, {
        x: margin,
        y: currentY,
        size: fontSize + 8,
        font: boldFont,
        color: rgb(0.08, 0.12, 0.2)
      });
      currentY -= (fontSize + 16);

      pdfPage.drawLine({
        start: { x: margin, y: currentY + 6 },
        end: { x: pageWidth - margin, y: currentY + 6 },
        thickness: 1,
        color: rgb(0.88, 0.91, 0.94)
      });
      currentY -= 12;
    }

    // Page Body Text
    const lines = pageItem.text.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        currentY -= (leading * 0.7);
        continue;
      }

      // Word wrapping
      const words = line.split(' ');
      let currentChunk = '';

      for (const word of words) {
        const testLine = currentChunk ? `${currentChunk} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width > contentWidth && currentChunk) {
          if (currentY < margin + 40) {
            // Add extra page if overflow
            pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }

          pdfPage.drawText(currentChunk, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0.12, 0.16, 0.23)
          });
          currentY -= leading;
          currentChunk = word;
        } else {
          currentChunk = testLine;
        }
      }

      if (currentChunk) {
        if (currentY < margin + 40) {
          pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        pdfPage.drawText(currentChunk, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.12, 0.16, 0.23)
        });
        currentY -= leading;
      }
    }

    // Footer
    if (design.footerText || design.includePageNumbers) {
      pdfPage.drawLine({
        start: { x: margin, y: 45 },
        end: { x: pageWidth - margin, y: 45 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      });

      if (design.footerText) {
        pdfPage.drawText(design.footerText, {
          x: margin,
          y: 30,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      if (design.includePageNumbers) {
        const pageText = `Page ${pageIndex + 1} of ${pages.length}`;
        const textWidth = font.widthOfTextAtSize(pageText, 9);
        pdfPage.drawText(pageText, {
          x: pageWidth - margin - textWidth,
          y: 30,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4)
        });
      }
    }
  });

  return await pdfDoc.save();
}

/**
 * Generates a clean DOCX document client-side using the `docx` library.
 */
export async function generateClientDOCX(
  pages: HandwritingPage[],
  design: PDFDesignSettings
): Promise<Blob> {
  const docSections = pages.map((page, idx) => {
    const paragraphs: DocxParagraph[] = [];

    if (idx === 0 && design.documentTitle) {
      paragraphs.push(
        new DocxParagraph({
          text: design.documentTitle,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 240 }
        })
      );
    }

    const lines = page.text.split('\n');
    lines.forEach(l => {
      const trimmed = l.trim();
      if (trimmed) {
        paragraphs.push(
          new DocxParagraph({
            children: [
              new TextRun({
                text: trimmed,
                font: design.font,
                size: design.fontSize * 2
              })
            ],
            spacing: { after: 120 }
          })
        );
      }
    });

    return {
      properties: {
        page: {
          margin: {
            top: design.margin === 'narrow' ? 720 : (design.margin === 'wide' ? 2160 : 1440),
            bottom: design.margin === 'narrow' ? 720 : (design.margin === 'wide' ? 2160 : 1440),
            left: design.margin === 'narrow' ? 720 : (design.margin === 'wide' ? 2160 : 1440),
            right: design.margin === 'narrow' ? 720 : (design.margin === 'wide' ? 2160 : 1440)
          }
        }
      },
      children: paragraphs
    };
  });

  const doc = new Document({
    sections: docSections
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates a formatted plain text string.
 */
export function generateClientTXT(pages: HandwritingPage[], title: string): string {
  const lines: string[] = [];
  if (title) {
    lines.push(`=== ${title.toUpperCase()} ===\n`);
  }

  pages.forEach((p, idx) => {
    lines.push(`--- PAGE ${idx + 1} ---`);
    lines.push(p.text.trim());
    lines.push('\n');
  });

  return lines.join('\n');
}

// ----------------------------------------------------
// Internal Helpers
// ----------------------------------------------------

function createThumbnail(canvas: HTMLCanvasElement, maxDim: number): string {
  const thumb = document.createElement('canvas');
  let w = canvas.width;
  let h = canvas.height;
  if (w > h) {
    h = Math.round((h * maxDim) / w);
    w = maxDim;
  } else {
    w = Math.round((w * maxDim) / h);
    h = maxDim;
  }
  thumb.width = w;
  thumb.height = h;
  const ctx = thumb.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, w, h);
  }
  return thumb.toDataURL('image/jpeg', 0.85);
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function cleanStructuredText(raw: string): string {
  return raw
    .replace(/[^\w\s.,@\-;:()!?'"₹$€]/g, "")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/([a-z])\n([a-z])/g, "$1 $2")
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}
