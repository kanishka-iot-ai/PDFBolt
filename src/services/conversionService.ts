
import * as mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Configure PDF.js worker (Critical for Vite functionality)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Converts a Word (.docx) file to PDF.
 * Method: Docx -> HTML (mammoth) -> PDF (basic text/html render)
 * Note: Rich formatting preservation is limited client-side.
 */
export async function wordToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  // Create a PDF with the extracted text
  const { value: text } = await mammoth.extractRawText({ arrayBuffer });

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const lines = text.split('\n');
  let y = height - 50;

  for (const line of lines) {
    if (y < 50) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    // Basic text wrapping would typically go here
    const cleanLine = line.replace(/[^\x00-\x7F]/g, ""); // Remove non-ascii for simple font support
    if (cleanLine.trim().length > 0) {
      page.drawText(cleanLine.substring(0, 90), { x: 50, y, size: fontSize, font });
      y -= 15;
    }
  }

  return await pdfDoc.save();
}

/**
 * Converts Excel (.xlsx) to PDF.
 * Method: XLSX -> CSV/Text -> PDF Table
 */
export async function excelToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];

  // Convert worksheet to array of arrays
  const json: any[][] = [];
  worksheet.eachRow((row) => {
    const rowValues = row.values as any[];
    json.push(rowValues.slice(1)); // slice(1) removes the empty first element
  });

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  let y = height - 50;

  for (const row of json) {
    if (y < 50) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    const line = row.join(' | ');
    page.drawText(line.substring(0, 80), { x: 50, y, size: 10, font });
    y -= 15;
  }

  return await pdfDoc.save();
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
    const scale = 2.0; // High resolution
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
export async function htmlToPdf(file: File): Promise<Uint8Array> {
  const text = await file.text();
  // Use a DOM parser to strip tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const plainText = doc.body.textContent || "";

  // Create PDF from text
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(plainText.substring(0, 1000), { x: 50, y: 700, size: 10, font });

  return await pdfDoc.save();
}

/**
 * Converts PDF to Word (.doc)
 * Strategy: Extract text and wrap in HTML for Word to open.
 */
export async function pdfToWord(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `
            <div style="page-break-after: always; font-family: Arial, sans-serif; line-height: 1.5;">
                ${pageText}
            </div>
        `;
  }

  const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Export</title></head>
        <body>${fullText}</body>
        </html>
    `;

  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  return encoder.encode(htmlContent);
}
