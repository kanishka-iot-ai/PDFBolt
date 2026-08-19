/**
 * "Redacts" a PDF by flattening it to images.
 * This ensures no hidden text or interactive elements remain.
 */
export async function redactPdf(file: File): Promise<Uint8Array> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    const { PDFDocument } = await import('pdf-lib');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    try {
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
    } finally {
        pdf.destroy();
    }
}

/**
 * Multi-tier client-side PDF repair engine:
 * 1. PDF-Lib re-serialization
 * 2. Binary header/trailer alignment & repair
 * 3. PDF.js fault-tolerant stream recovery & page reconstruction
 */
export async function repairPdf(file: File): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const rawBytes = new Uint8Array(arrayBuffer);

    // Tier 1: Direct PDF-Lib re-serialization
    try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        if (pdfDoc.getPageCount() > 0) {
            return await pdfDoc.save();
        }
    } catch (e) {
        // Continue to Tier 2
    }

    // Tier 2: Binary Alignment (Strip leading garbage, fix %%EOF)
    try {
        let startIdx = 0;
        for (let i = 0; i < Math.min(rawBytes.length - 4, 1024); i++) {
            if (rawBytes[i] === 0x25 && rawBytes[i+1] === 0x50 && rawBytes[i+2] === 0x44 && rawBytes[i+3] === 0x46) {
                startIdx = i;
                break;
            }
        }

        let cleaned = rawBytes.slice(startIdx);
        // Ensure %%EOF marker exists
        const eofStr = "\n%%EOF\n";
        const eofBytes = new TextEncoder().encode(eofStr);
        const combined = new Uint8Array(cleaned.length + eofBytes.length);
        combined.set(cleaned);
        combined.set(eofBytes, cleaned.length);

        const pdfDoc = await PDFDocument.load(combined, { ignoreEncryption: true });
        if (pdfDoc.getPageCount() > 0) {
            return await pdfDoc.save();
        }
    } catch (e) {
        // Continue to Tier 3
    }

    // Tier 3: PDF.js Fault-Tolerant Page Reconstruction Engine
    try {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            stopAtErrors: false,
            isEvalSupported: false
        });

        const pdf = await loadingTask.promise;
        const newPdf = await PDFDocument.create();

        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport }).promise;

                const imgData = canvas.toDataURL('image/jpeg', 0.92);
                const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
                const jpgImage = await newPdf.embedJpg(imgBytes);

                const pdfPage = newPdf.addPage([jpgImage.width / 2, jpgImage.height / 2]);
                pdfPage.drawImage(jpgImage, {
                    x: 0,
                    y: 0,
                    width: jpgImage.width / 2,
                    height: jpgImage.height / 2,
                });
            } catch (pageErr) {
                console.warn(`Skipping unrecoverable page ${i}:`, pageErr);
            }
        }

        if (newPdf.getPageCount() > 0) {
            return await newPdf.save();
        }
    } catch (e) {
        // Complete failure
    }

    throw new Error("Unable to recover damaged PDF. The document data is critically unreadable.");
}

