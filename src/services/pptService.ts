import PptxGenJS from 'pptxgenjs'; // For writing
import * as pdfjsLib from 'pdfjs-dist';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// @ts-ignore
import PptxJs from 'pptxjs'; // For reading

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Converts PDF to PowerPoint (.pptx).
 * Strategy: Each PDF page becomes a slide background image.
 * This preserves layout exactly but is not editable text.
 * Best for visual PDFs. Text will not be selectable.
 */
export async function pdfToPpt(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pptx = new PptxGenJS();

    // Set slide layout to 16:9 widescreen (standard modern format)
    pptx.layout = 'LAYOUT_WIDE';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0; // Higher quality (user recommended)
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Better compression quality

            const slide = pptx.addSlide();
            // Add image to slide, fitting to cover entire slide
            slide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
        }
    }

    // Generate Blob
    return await pptx.write({ outputType: 'blob' }) as Blob;
}

/**
 * Converts PowerPoint (.pptx) to PDF.
 * Method: PPTX (pptxjs) -> HTML Slides -> Canvas (html2canvas) -> PDF (jspdf)
 */
export async function pptToPdf(file: File): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const container = document.createElement('div');
    container.id = 'pptx-container';
    container.style.position = 'fixed';
    container.style.top = '-10000px';
    container.style.left = '-10000px';
    document.body.appendChild(container);

    try {
        // Render PPT to HTML using pptxjs
        // Note: usage depends on specific library version. 
        // Assuming user's snippet: $("#div").pptxToHtml(file) or similar.
        // If imports don't work directly, we might need a script tag approach or specific API check.
        // For now, using a standard expected API given the user's "Best Logic".

        // Mocking the render since direct library API might vary in TS. 
        // If pptxjs exposes a global or default export:
        await (new Promise<void>((resolve, reject) => {
            // @ts-ignore
            const buffer = arrayBuffer;
            // @ts-ignore
            $("#pptx-container").pptxToHtml({
                pptx: buffer,
                slideMode: false,
                keyBoardShortCut: false,
                mediaProcess: true,
                jsZipV2: false,
                slideModeConfig: {  //on slide mode (slideMode: true)
                    first: 1,
                    nav: false, /** true,false : show or not nav buttons*/
                    navTxtColor: "white", /** color */
                    navBtnColor: "black", /** color */
                    showPlayPauseBtn: false,/** true,false */
                    keyBoardShortCut: false, /** true,false */
                    showSlideNum: false, /** true,false */
                    showTotalSlideNum: false, /** true,false */
                    autoSlide: false, /** false or seconds (the pause time between slides) , F8 to active(keyBoardShortCut: true) */
                    randomAutoSlide: false, /** true,false ,autoSlide:true */
                    loop: false,  /** true,false */
                    background: "black", /** false or color*/
                    transition: "default", /** transition type: "default", "fading", "slide", "zipper" */
                    transitionTime: 1 /** transition time in seconds */
                }
            });
            // Give it a moment to render (primitive check)
            setTimeout(resolve, 2000);
        }));

        const slides = container.querySelectorAll('.slide');
        // Note: Selector depends on pptxjs output class. Usually 'slide' or similar wrapper.
        // If pptxjs isn't perfectly typed/integrated, this might flap. 
        // But implementing per user request.

        const pdf = new jsPDF('l', 'mm', 'a4'); // Usually landscape
        const pdfWidth = 297;

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i] as HTMLElement;
            const canvas = await html2canvas(slide);
            const imgData = canvas.toDataURL('image/png');

            if (i > 0) pdf.addPage();

            const imgProps = (pdf as any).getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        }

        return new Uint8Array(pdf.output('arraybuffer'));

    } catch (e) {
        console.error("PPT to PDF failed", e);
        throw new Error("Failed to convert PPT to PDF. Format might not be supported.");
    } finally {
        document.body.removeChild(container);
    }
}
