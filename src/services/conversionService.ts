import { sanitizeFileName } from '../utils/fileValidation';

/**
 * Converts a Word (.docx) file to PDF.
 * Method: Docx -> HTML (mammoth) -> Canvas (html2canvas) -> PDF (jspdf)
 * Preserves layout better than raw text extraction.
 */
export async function wordToPdf(file: File): Promise<Uint8Array> {
  const mammoth = await import('mammoth');
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;

  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  // Create a Hidden Container for Rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.visibility = 'hidden';
  container.style.zIndex = '-9999';
  container.style.width = '794px'; // A4 width at 96 DPI approx
  container.style.backgroundColor = 'white';
  container.style.padding = '40px';
  container.style.color = 'black';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2 } as any);
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgProps = (pdf as any).getImageProperties(imgData);
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

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
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Converts Excel (.xlsx) to PDF.
 * Method: ExcelJS -> HTML Table -> Canvas (html2canvas) -> PDF (jspdf)
 */
export async function excelToPdf(file: File): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = 210;
  const pdfHeight = 297;
  const worksheets = workbook.worksheets.filter(sheet => sheet.actualRowCount > 0);

  if (worksheets.length === 0) {
    throw new Error("No readable worksheets found in this Excel file.");
  }

  for (let i = 0; i < worksheets.length; i++) {
    const worksheet = worksheets[i];
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.visibility = 'hidden';
    container.style.zIndex = '-9999';
    container.style.width = '1000px';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.color = 'black';

    const heading = document.createElement('h2');
    heading.textContent = worksheet.name;
    heading.style.font = '700 18px Arial, sans-serif';
    heading.style.margin = '0 0 12px 0';
    container.appendChild(heading);

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.font = '12px Arial, sans-serif';

    worksheet.eachRow({ includeEmpty: false }, row => {
      const tr = document.createElement('tr');
      row.eachCell({ includeEmpty: true }, cell => {
        const td = document.createElement('td');
        td.textContent = String(cell.text || cell.value || '');
        td.style.border = '1px solid #d1d5db';
        td.style.padding = '6px 8px';
        td.style.verticalAlign = 'top';
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    container.appendChild(table);

    const style = document.createElement('style');
    style.innerHTML = `td { min-width: 80px; } tr:nth-child(even) { background: #f8fafc; }`;
    container.appendChild(style);

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2 } as any);
      const imgData = canvas.toDataURL('image/png');

      if (i > 0) pdf.addPage();

      const imgProps = (pdf as any).getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

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
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  return new Uint8Array(pdf.output('arraybuffer'));
}

/**
 * Converts PDF to JPG images with crisp rendering and individual page blobs.
 */
export async function pdfToJpg(file: File): Promise<{ name: string, blob: Blob }[]> {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: { name: string, blob: Blob }[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 2.5; // High crisp resolution
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (blob) {
          images.push({ name: `page_${i}.jpg`, blob });
        }
      }
    }
  } finally {
    pdf.destroy();
  }

  return images;
}

/**
 * Converts HTML file to PDF with vector layout.
 */
export async function htmlToPdf(file: File): Promise<Uint8Array> {
  const jsPDF = (await import('jspdf')).default;
  return new Promise(async (resolve, reject) => {
    let container: HTMLDivElement | null = null;
    try {
      const text = await file.text();
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.visibility = 'hidden';
      container.style.zIndex = '-9999';
      container.style.width = '794px';
      container.style.backgroundColor = 'white';
      container.innerHTML = text;
      document.body.appendChild(container);

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = 595.28;

      await (pdf as any).html(container, {
        callback: (doc: any) => {
          resolve(new Uint8Array(doc.output('arraybuffer')));
        },
        x: 0,
        y: 0,
        width: pdfWidth,
        windowWidth: 794,
        autoPaging: 'text',
        html2canvas: { scale: 1, logging: false }
      });
    } catch (error) {
      reject(error);
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  });
}

/**
 * OCR Fallback for Scanned PDFs
 */
async function runOCR(page: any): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const val = avg > 128 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);

  const result = await Tesseract.recognize(canvas, "eng");
  return result.data.text;
}


/**
 * PDF → Word (.docx) — Universal Engine v4
 *
 * Delegates to pdfToWordEngine.ts which handles:
 *  • Native text / Scanned (OCR) / Mixed / Image-only PDFs
 *  • Multi-column layouts (N columns)   • Tables (borderless detection)
 *  • Heading H1/H2/H3                  • Bullet + numbered lists
 *  • Embedded images                   • Hyperlinks
 *  • Superscript / Subscript           • Correct page sizes
 *  • Header/footer zone stripping      • Document metadata
 */
export async function pdfToWord(file: File): Promise<Uint8Array> {
  const { universalPdfToWord } = await import('./pdfToWordEngine');
  return universalPdfToWord(file);
}



/**
 * Coerces cell values to numbers, dates, or clean strings for Excel arithmetic
 */
function parseExcelCellValue(text: string): { value: any, type: 'number' | 'string' } {
  const clean = text.trim();
  if (!clean) return { value: '', type: 'string' };

  // Check currency or percentage: e.g. "$1,250.50" or "45.8%"
  const currencyMatch = clean.match(/^[\$€£₹]\s?([\d,]+(\.\d+)?)$/);
  if (currencyMatch) {
    const num = parseFloat(currencyMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) return { value: num, type: 'number' };
  }

  const percentMatch = clean.match(/^([\d,]+(\.\d+)?)\s?\%$/);
  if (percentMatch) {
    const num = parseFloat(percentMatch[1].replace(/,/g, '')) / 100;
    if (!isNaN(num)) return { value: num, type: 'number' };
  }

  // Pure numbers with commas
  const numMatch = clean.match(/^-?[\d,]+(\.\d+)?$/);
  if (numMatch) {
    const num = parseFloat(clean.replace(/,/g, ''));
    if (!isNaN(num)) return { value: num, type: 'number' };
  }

  return { value: clean, type: 'string' };
}

/**
 * Converts PDF to Excel (.xlsx) with 2D coordinate grid alignment and numeric coercion.
 */
export async function pdfToExcel(file: File): Promise<Uint8Array> {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  const ExcelJS = (await import('exceljs')).default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PDFBolt Pro';
  workbook.created = new Date();

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items = (textContent.items as any[]).map(item => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        height: Math.round(item.height || 12)
      })).filter(it => it.text.length > 0);

      if (items.length === 0) continue;

      // Group into rows by Y coordinate
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const heights = items.map(i => i.height);
      const medianHeight = heights[Math.floor(heights.length / 2)] || 12;
      const Y_THRESHOLD = Math.max(4, medianHeight * 0.6);

      const rows: typeof items[] = [];
      let currentRow: typeof items = [];
      let currentY: number | null = null;

      items.forEach(item => {
        if (currentY === null || Math.abs(currentY - item.y) < Y_THRESHOLD) {
          currentRow.push(item);
          currentY = item.y;
        } else {
          rows.push(currentRow.sort((a, b) => a.x - b.x));
          currentRow = [item];
          currentY = item.y;
        }
      });
      if (currentRow.length > 0) {
        rows.push(currentRow.sort((a, b) => a.x - b.x));
      }

      // Detect distinct column X coordinates across all rows
      const xCoords = Array.from(new Set(items.map(it => it.x))).sort((a, b) => a - b);
      const colBuckets: number[] = [];
      const X_COL_GAP = 25; // minimum column gap in points

      xCoords.forEach(x => {
        const lastCol = colBuckets[colBuckets.length - 1];
        if (lastCol === undefined || Math.abs(x - lastCol) > X_COL_GAP) {
          colBuckets.push(x);
        }
      });

      const worksheet = workbook.addWorksheet(pdf.numPages > 1 ? `Page ${pageNum}` : 'Sheet 1');

      rows.forEach(rowItems => {
        const rowData: any[] = new Array(colBuckets.length).fill('');
        
        rowItems.forEach(item => {
          // Find closest column bucket
          let closestColIdx = 0;
          let minDiff = Infinity;
          colBuckets.forEach((colX, idx) => {
            const diff = Math.abs(item.x - colX);
            if (diff < minDiff) {
              minDiff = diff;
              closestColIdx = idx;
            }
          });

          const parsed = parseExcelCellValue(item.text);
          if (rowData[closestColIdx]) {
            rowData[closestColIdx] = `${rowData[closestColIdx]} ${parsed.value}`;
          } else {
            rowData[closestColIdx] = parsed.value;
          }
        });

        const excelRow = worksheet.addRow(rowData);

        // Bold headers if top row
        if (worksheet.rowCount === 1) {
          excelRow.font = { bold: true };
          excelRow.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });

      // Format column widths dynamically
      worksheet.columns.forEach(column => {
        let maxLength = 12;
        column.eachCell?.({ includeEmpty: false }, cell => {
          maxLength = Math.max(maxLength, String(cell.value || '').length);
        });
        column.width = Math.min(maxLength + 3, 40);
      });
    }

    if (workbook.worksheets.length === 0) {
      workbook.addWorksheet('Sheet 1').addRow(['No extractable text or tables found in PDF']);
    }
  } finally {
    pdf.destroy();
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
