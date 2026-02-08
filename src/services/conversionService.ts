import * as mammoth from 'mammoth';
// @ts-ignore
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Configure PDF.js worker (Critical for Vite functionality)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Converts a Word (.docx) file to PDF.
 * Method: Docx -> HTML (mammoth) -> Canvas (html2canvas) -> PDF (jspdf)
 * Preserves layout better than raw text extraction.
 */
export async function wordToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  // Create a Hidden Container for Rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '794px'; // A4 width at 96 DPI approx
  container.style.backgroundColor = 'white';
  container.style.padding = '40px';
  container.style.color = 'black';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Capture the container
    const canvas = await html2canvas(container, { scale: 2 } as any);
    const imgData = canvas.toDataURL('image/png');

    // Generate PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgProps = (pdf as any).getImageProperties(imgData);
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // Handle multi-page if content is long (Basic tiling)
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    return new Uint8Array(pdf.output('arraybuffer'));
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Converts Excel (.xlsx) to PDF.
 * Method: XLSX (SheetJS) -> HTML Table -> Canvas (html2canvas) -> PDF (jspdf)
 */
export async function excelToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = 210;
  const pdfHeight = 297;

  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const worksheet = workbook.Sheets[sheetName];
    const html = XLSX.utils.sheet_to_html(worksheet);

    // Create a Hidden Container for Rendering
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-10000px';
    container.style.left = '-10000px';
    container.style.width = '1000px'; // Wider for excel
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.innerHTML = html;

    // Basic styling for the table to look decent
    const style = document.createElement('style');
    style.innerHTML = `table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ccc; padding: 4px; }`;
    container.appendChild(style);

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2 } as any);
      const imgData = canvas.toDataURL('image/png');

      if (i > 0) pdf.addPage();

      const imgProps = (pdf as any).getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);

      // If image is taller than page, we might cut it off. 
      // For simple Excel sheets, we'll just let it scale. 
      // A robust solution needs tiling like wordToPdf.

    } finally {
      document.body.removeChild(container);
    }
  }

  return new Uint8Array(pdf.output('arraybuffer'));
}

/**
 * Converts PDF to JPG images.
 * Returns a ZIP file containing the images.
 */
export async function pdfToJpg(file: File): Promise<{ name: string, blob: Blob }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: { name: string, blob: Blob }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 3.0; // Higher resolution (User requested)
    const viewport = page.getViewport({ scale });

    // Create an off-screen canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;

      // Convert to blob
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (blob) {
        images.push({ name: `page_${i}.jpg`, blob });
      }
    }
  }

  return images;
}

/**
 * Converts HTML file to PDF
 * Very basic implementation: extracts text content.
 */
/**
 * Converts HTML file to PDF
 * Method: HTML -> jsPDF.html() (Primary, vector text)
 */
export async function htmlToPdf(file: File): Promise<Uint8Array> {
  return new Promise(async (resolve, reject) => {
    try {
      const text = await file.text();

      // Create a hidden container for rendering
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-10000px';
      container.style.left = '0';
      container.style.width = '794px'; // A4 width (approx)
      container.style.backgroundColor = 'white';
      // container.style.visibility = 'hidden'; // html2canvas sometimes needs visibility
      container.innerHTML = text;
      document.body.appendChild(container);

      // Initialize jsPDF
      const pdf = new jsPDF('p', 'pt', 'a4');

      // Use the html() method as requested
      // Note: jsPDF.html relies on html2canvas
      // We need to adjust the width/windowWidth to ensure it fits A4
      const pdfWidth = 595.28; // A4 width in pt
      // const pdfHeight = 841.89; // A4 height in pt

      await (pdf as any).html(container, {
        callback: (doc) => {
          document.body.removeChild(container);
          resolve(new Uint8Array(doc.output('arraybuffer')));
        },
        x: 0,
        y: 0,
        width: pdfWidth,
        windowWidth: 794, // Corresponds to the container width
        autoPaging: 'text', // Try to respect text for paging
        html2canvas: {
          scale: 1, // Default scale
          logging: false
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Converts PDF to Word (.docx)
 * Method: PDF.js (text extraction) + docx.js (DOCX generation)
 * Best for plain text PDFs. Complex layouts may not preserve formatting perfectly.
 */
export async function pdfToWord(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Extract all text from PDF
  let allParagraphs: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Join text items with proper spacing
    const pageText = textContent.items.map((item: any) => item.str).join(' ');

    // Add page text as a paragraph (simple approach)
    if (pageText.trim()) {
      allParagraphs.push(pageText);

      // Add page break marker except for last page
      if (i < pdf.numPages) {
        allParagraphs.push('__PAGE_BREAK__');
      }
    }
  }

  // Dynamically import docx library
  const { Document, Packer, Paragraph, TextRun, PageBreak } = await import('docx');

  // Create DOCX document
  const paragraphs = allParagraphs.map(text => {
    if (text === '__PAGE_BREAK__') {
      return new Paragraph({
        children: [new PageBreak()]
      });
    }
    return new Paragraph({
      children: [new TextRun(text)]
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });

  // Generate DOCX as blob, then convert to Uint8Array
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Converts PDF to Excel (.xlsx)
 * Method: PDF.js (text extraction with positions) + SheetJS (Excel generation)
 * Best for table-based PDFs. Uses Y-coordinate grouping to detect rows.
 * For scanned PDFs, OCR would be needed (not implemented here).
 */
export async function pdfToExcel(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allRows: any[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Extract text items with position data
    const items = textContent.items.map((item: any) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5], // Y coordinate (top to bottom)
      height: item.height
    }));

    // Sort by Y coordinate (descending - top to bottom)
    items.sort((a, b) => b.y - a.y);

    // Group items into rows based on Y position
    let currentY: number | null = null;
    let currentRow: string[] = [];
    const Y_THRESHOLD = 5; // Tolerance for same row (adjust if needed)

    items.forEach((item) => {
      const y = Math.round(item.y);

      if (currentY === null || Math.abs(currentY - y) < Y_THRESHOLD) {
        // Same row
        currentRow.push(item.text);
        currentY = y;
      } else {
        // New row
        if (currentRow.length > 0) {
          allRows.push(currentRow);
        }
        currentRow = [item.text];
        currentY = y;
      }
    });

    // Push last row
    if (currentRow.length > 0) {
      allRows.push(currentRow);
    }

    // Add empty row between pages (optional visual separator)
    if (pageNum < pdf.numPages) {
      allRows.push([]);
    }
  }

  // Create Excel workbook using SheetJS
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');

  // Generate Excel file as array buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}
