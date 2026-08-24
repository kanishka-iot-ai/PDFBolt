export interface OcrResult {
    pdfBytes: Uint8Array;
    fullText: string;
    pageCount: number;
    wordCount: number;
}

/**
 * Performs true OCR on a PDF file and embeds a searchable text layer.
 * Strategy: Render PDF pages at 2.0x scale -> OpenCV Preprocessing -> Tesseract.js Recognition -> Embed OCR text layer via pdf-lib.
 */
export async function ocrPdfToSearchablePdf(
    file: File,
    onProgress?: (pct: number) => void
): Promise<OcrResult> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const Tesseract = (await import('tesseract.js')).default;

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let fullText = "";
    let totalWords = 0;

    const worker = await Tesseract.createWorker('eng');

    try {
        const numPages = pdf.numPages;
        for (let i = 1; i <= numPages; i++) {
            onProgress?.(Math.round(((i - 1) / numPages) * 75) + 15);
            const page = await pdf.getPage(i);
            
            // ⚡ Core Brain Optimization: Fast Digital Vector Check
            const textContent = await page.getTextContent();
            const hasDigitalText = textContent.items && textContent.items.length >= 10;

            if (hasDigitalText) {
                // Page already has digital text - extract directly at 100x speed
                const rawItems = textContent.items.map((it: any) => (typeof it.str === 'string' ? it.str : '')).filter(Boolean);
                const digitalText = structureText(rawItems.join(' '));
                fullText += `\n--- Page ${i} ---\n${digitalText}\n`;
                totalWords += digitalText.split(/\s+/).filter(Boolean).length;
                continue;
            }

            // Scanned Page: Render at optimized 1.6x scale and run Tesseract OCR
            const viewport = page.getViewport({ scale: 1.6 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;

                // OpenCV enhancement if available
                const processedDataUrl = await enhanceImageWithOpenCV(canvas);

                const { data } = await worker.recognize(processedDataUrl);
                const recognizedText = data.text || '';
                const structured = structureText(recognizedText);
                fullText += `\n--- Page ${i} ---\n${structured}\n`;

                const wordsInPage = structured.split(/\s+/).filter(Boolean).length;
                totalWords += wordsInPage;

                // Embed OCR text layer onto pdf-lib page
                if (i <= pdfDoc.getPageCount()) {
                    const pdfPage = pdfDoc.getPage(i - 1);
                    const { width: pageWidth, height: pageHeight } = pdfPage.getSize();
                    const scaleX = pageWidth / canvas.width;
                    const scaleY = pageHeight / canvas.height;

                    if (data.lines && data.lines.length > 0) {
                        for (const line of data.lines) {
                            if (!line.text || !line.text.trim() || !line.bbox) continue;
                            const cleanLineText = line.text.replace(/[\r\n]+/g, ' ').trim();
                            if (!cleanLineText) continue;

                            const lineX = Math.max(0, line.bbox.x0 * scaleX);
                            const lineH = Math.max(6, (line.bbox.y1 - line.bbox.y0) * scaleY * 0.85);
                            const lineY = Math.max(0, pageHeight - (line.bbox.y1 * scaleY));

                            try {
                                pdfPage.drawText(cleanLineText, {
                                    x: lineX,
                                    y: lineY,
                                    size: lineH,
                                    font: helveticaFont,
                                    color: rgb(0, 0, 0),
                                    opacity: 0.0, // Invisible selectable & searchable text layer
                                });
                            } catch {
                                const asciiSafe = cleanLineText.replace(/[^\x20-\x7E]/g, ' ');
                                if (asciiSafe.trim()) {
                                    try {
                                        pdfPage.drawText(asciiSafe, {
                                            x: lineX,
                                            y: lineY,
                                            size: lineH,
                                            font: helveticaFont,
                                            color: rgb(0, 0, 0),
                                            opacity: 0.0,
                                        });
                                    } catch {
                                        // Ignore line
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        onProgress?.(95);
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
        return {
            pdfBytes,
            fullText: fullText.trim(),
            pageCount: numPages,
            wordCount: totalWords
        };
    } finally {
        await worker.terminate();
        pdf.destroy();
    }
}

/**
 * Performs OCR on a PDF file and returns searchable PDF result.
 */
export async function ocrPdf(
    file: File,
    onProgress?: (pct: number) => void
): Promise<OcrResult> {
    return ocrPdfToSearchablePdf(file, onProgress);
}

/**
 * Performs OCR on a single image (data URL or Blob).
 */
export async function ocrImage(imageSource: string | Blob): Promise<string> {
    const Tesseract = (await import('tesseract.js')).default;
    const worker = await Tesseract.createWorker('eng');

    try {
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
