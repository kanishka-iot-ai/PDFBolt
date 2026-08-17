/**
 * Performs OCR on a PDF file.
 * Strategy: Render PDF pages as images -> OpenCV Preprocessing -> Run Tesseract.
 */
export async function ocrPdf(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    const Tesseract = (await import('tesseract.js')).default;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    const worker = await Tesseract.createWorker('eng');

    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.5 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;

                // PRODUCTION-LEVEL PREPROCESSING (OpenCV.js)
                const processedDataUrl = await enhanceImageWithOpenCV(canvas);

                const { data: { text } } = await worker.recognize(processedDataUrl);

                // Structure & Clean
                const structured = structureText(text);
                fullText += `\n--- Page ${i} ---\n${structured}\n`;
            }
        }
    } finally {
        await worker.terminate();
        pdf.destroy();
    }

    return fullText;
}

/**
 * Performs OCR on a single image (data URL or Blob).
 */
export async function ocrImage(imageSource: string | Blob): Promise<string> {
    const Tesseract = (await import('tesseract.js')).default;
    const worker = await Tesseract.createWorker('eng');

    try {
        // If it's an image, we still want to enhance it if possible
        // For now, Tesseract is good, but OCR improves 2-3x with thresholding
        const { data: { text } } = await worker.recognize(imageSource);

        const structured = structureText(text);
        return structured;
    } finally {
        await worker.terminate();
    }
}

/**
 * Professional Image Enhancement using OpenCV.js
 * Mimics high-end Android implementation: Grayscale -> Blur -> Adaptive Threshold
 */
export async function enhanceImageWithOpenCV(sourceCanvas: HTMLCanvasElement): Promise<string> {
    const cv = (window as any).cv;
    if (!cv) return sourceCanvas.toDataURL('image/jpeg', 0.9);

    try {
        let src = cv.imread(sourceCanvas);
        let dst = new cv.Mat();

        try {
            // 1. Convert to Grayscale
            cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

            // 2. Reduce noise with Gaussian Blur
            let ksize = new cv.Size(5, 5);
            cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

            // 3. Adaptive Thresholding (The magic part for handwriting/shadows)
            cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

            // 4. Output back to a temporary canvas
            const outputCanvas = document.createElement('canvas');
            cv.imshow(outputCanvas, dst);

            const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.95);
            return dataUrl;
        } finally {
            // Cleanup
            src.delete();
            dst.delete();
        }
    } catch (e) {
        console.warn("OpenCV enhancement failed, falling back to raw", e);
        return sourceCanvas.toDataURL('image/jpeg', 0.9);
    }
}

/**
 * AI-Style Text Structuring
 * Cleans noise and restores logical line/block structure
 */
function structureText(raw: string): string {
    return raw
        .replace(/[^\w\s.,@\-;:()!?'"₹$€]/g, "") // Maintain symbols for financial/pro notes
        .replace(/\n\s*\n/g, "\n\n") // Keep paragraph structure
        .replace(/([a-z])\n([a-z])/g, "$1 $2") // Join lines wrapped mid-sentence
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .trim();
}
