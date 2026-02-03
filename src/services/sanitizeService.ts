import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * "Redacts" a PDF by flattening it to images.
 * This ensures no hidden text or interactive elements remain.
 */
export async function redactPdf(file: File): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Create new PDF
    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());

            const jpgImage = await newPdf.embedJpg(imgBytes);
            const pdfPage = newPdf.addPage([jpgImage.width / 2, jpgImage.height / 2]); // Adjust scale back
            pdfPage.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: jpgImage.width / 2,
                height: jpgImage.height / 2,
            });
        }
    }

    return await newPdf.save();
}

/**
 * Attempts to repair a PDF by loading and re-saving it.
 * PDF-lib's 'load' is often robust enough to fix malformed XRef tables.
 */
export async function repairPdf(file: File): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    try {
        // Just loading and saving standardizes the structure
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        return await pdfDoc.save();
    } catch (e) {
        throw new Error("PDF is too damaged to repair client-side.");
    }
}
