import PptxGenJS from 'pptxgenjs';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Converts PDF to PowerPoint (.pptx).
 * Strategy: Each PDF page becomes a slide background image.
 * This preserves layout exactly but is not editable text.
 */
export async function pdfToPpt(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pptx = new PptxGenJS();

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            const slide = pptx.addSlide();
            // Add image to slide, fitting to cover
            slide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
        }
    }

    // Generate Blob
    return await pptx.write({ outputType: 'blob' }) as Blob;
}
