import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Performs OCR on a PDF file.
 * Strategy: Render PDF pages as images -> Run Tesseract on each image -> Combine text.
 */
export async function ocrPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    // Create a worker
    const worker = await Tesseract.createWorker('eng');

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;

            // Get image data URL
            const dataUrl = canvas.toDataURL('image/jpeg');

            // Recognize
            const { data: { text } } = await worker.recognize(dataUrl);
            fullText += `\n--- Page ${i} ---\n${text}\n`;
        }
    }

    await worker.terminate();
    return fullText;
}
