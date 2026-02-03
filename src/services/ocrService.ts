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
        // Increase scale for better resolution (300 DPI equivalent roughly 2.0-3.0 scale usually)
        const viewport = page.getViewport({ scale: 2.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;

            // PREPROCESSING: Grayscale + Binarization (Thresholding)
            // This mimics OpenCV's thresholding to improve OCR accuracy
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let j = 0; j < data.length; j += 4) {
                // Grayscale (Luminosity formula)
                const avg = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2];
                // Binarization (Threshold = 128) - enhances contrast
                const val = avg > 128 ? 255 : 0;
                data[j] = val;     // R
                data[j + 1] = val; // G
                data[j + 2] = val; // B
            }
            context.putImageData(imageData, 0, 0);

            // Get image data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 1.0); // Max quality

            // Recognize with improved settings
            const { data: { text } } = await worker.recognize(dataUrl);

            // CLEANUP: Remove noise
            // Keeps alphanumeric, spaces, punctuation. Collapses multiple spaces.
            const cleanedText = text
                .replace(/[^\w\s.,@\-;:()]/g, "") // Keep common punctuation
                .replace(/\s+/g, " ")
                .trim();

            fullText += `\n--- Page ${i} ---\n${cleanedText}\n`;
        }
    }

    await worker.terminate();
    return fullText;
}
