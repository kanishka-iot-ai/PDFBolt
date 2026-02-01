import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const degrees = (angle: number) => ({ type: 'degrees' as const, angle });

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
  return await merged.save();
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

/**
 * Compresses PDF by reconstructing the document and stripping unused data.
 */
export async function compressPdf(file: File, level: string = 'recommended'): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes);
  const targetPdf = await PDFDocument.create();

  // Prune by reconstruction: Only copy page objects
  const indices = sourcePdf.getPageIndices();
  const copiedPages = await targetPdf.copyPages(sourcePdf, indices);
  copiedPages.forEach(p => targetPdf.addPage(p));

  // Save with Object Streams for smaller file size
  return await targetPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false
  });
}

/**
 * Splits a PDF based on user-provided range string.
 */
export async function splitPdf(file: File, range: string): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes);
  const targetPdf = await PDFDocument.create();
  const totalCount = sourcePdf.getPageCount();

  const pagesToKeep = new Set<number>();
  const segments = range.split(',').map(s => s.trim()).filter(Boolean);

  segments.forEach(seg => {
    if (seg.includes('-')) {
      const [start, end] = seg.split('-').map(val => parseInt(val.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        for (let i = lo; i <= hi; i++) {
          const idx = i - 1;
          if (idx >= 0 && idx < totalCount) pagesToKeep.add(idx);
        }
      }
    } else {
      const idx = parseInt(seg) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < totalCount) {
        pagesToKeep.add(idx);
      }
    }
  });

  const finalIndices = Array.from(pagesToKeep).sort((a, b) => a - b);
  if (finalIndices.length === 0) throw new Error("No valid page numbers found in range.");

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

  const toDelete = indicesStr.split(',')
    .map(s => parseInt(s.trim()) - 1)
    .filter(n => !isNaN(n));

  // Sort descending to avoid index shifting problems
  const uniqueIndices = [...new Set(toDelete)].sort((a, b) => b - a);

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
export async function watermarkPdf(file: File, text: string): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.getPages().forEach(p => {
    const { width, height } = p.getSize();
    p.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: 50,
      font,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.3,
      rotate: degrees(45)
    });
  });
  return await pdf.save();
}

/**
 * Converts multiple image files into one PDF.
 */
export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  for (const f of files) {
    const imgBytes = await f.arrayBuffer();
    let img;
    const type = f.type.toLowerCase();

    try {
      if (type.includes('jpeg') || type.includes('jpg')) {
        img = await pdfDoc.embedJpg(imgBytes);
      } else if (type.includes('png')) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        continue; // Skip unknown
      }

      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    } catch (e) {
      console.warn(`Could not embed image ${f.name}`, e);
    }
  }
  return await pdfDoc.save();
}