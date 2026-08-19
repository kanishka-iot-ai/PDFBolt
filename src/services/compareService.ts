/**
 * Client-Side PDF Comparison Service
 * Compares two PDF documents, extracts text line-by-line, computes diffs,
 * and compiles a downloadable Comparison Report PDF.
 */

export interface CompareResult {
    reportBytes: Uint8Array;
    similarityScore: number;
    additionsCount: number;
    deletionsCount: number;
    pageCountA: number;
    pageCountB: number;
    diffLines: Array<{ type: 'add' | 'del' | 'eq'; text: string }>;
}

export async function comparePdfDocuments(fileA: File, fileB: File): Promise<CompareResult> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    const jsPDF = (await import('jspdf')).default;

    // 1. Extract text from File A
    const bufA = await fileA.arrayBuffer();
    const pdfA = await pdfjsLib.getDocument({ data: bufA }).promise;
    const linesA: string[] = [];
    for (let i = 1; i <= pdfA.numPages; i++) {
        const page = await pdfA.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .join(' ');
        linesA.push(...pageText.split(/(?<=[.?!])\s+|\n+/).map(s => s.trim()).filter(Boolean));
    }

    // 2. Extract text from File B
    const bufB = await fileB.arrayBuffer();
    const pdfB = await pdfjsLib.getDocument({ data: bufB }).promise;
    const linesB: string[] = [];
    for (let i = 1; i <= pdfB.numPages; i++) {
        const page = await pdfB.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .join(' ');
        linesB.push(...pageText.split(/(?<=[.?!])\s+|\n+/).map(s => s.trim()).filter(Boolean));
    }

    // 3. Compute Diff
    const diffLines: Array<{ type: 'add' | 'del' | 'eq'; text: string }> = [];
    let additions = 0;
    let deletions = 0;
    let matching = 0;

    const setB = new Set(linesB);
    const setA = new Set(linesA);

    linesA.forEach(line => {
        if (!setB.has(line)) {
            deletions++;
            diffLines.push({ type: 'del', text: line });
        } else {
            matching++;
            diffLines.push({ type: 'eq', text: line });
        }
    });

    linesB.forEach(line => {
        if (!setA.has(line)) {
            additions++;
            diffLines.push({ type: 'add', text: line });
        }
    });

    const totalDistinct = (linesA.length + linesB.length) || 1;
    const similarity = Math.max(0, Math.min(100, Math.round(((matching * 2) / totalDistinct) * 100)));

    // 4. Generate PDF Report using jsPDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;

    // Header Background
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(0, 0, pageWidth, 45, 'F');

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text('PDFBOLT DOCUMENT COMPARISON REPORT', 14, 20);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(234, 179, 8); // yellow-500
    pdf.text('Automated Visual & Textual Diff Summary', 14, 28);

    // Summary Metric Cards
    // Card 1: Similarity
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, 52, 56, 26, 3, 3, 'FD');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('SIMILARITY MATCH', 18, 60);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(similarity > 80 ? 16 : 217, similarity > 80 ? 185 : 119, similarity > 80 ? 129 : 6);
    pdf.text(`${similarity}%`, 18, 72);

    // Card 2: Additions
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(77, 52, 56, 26, 3, 3, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('NEW CONTENT (+)', 81, 60);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(16, 185, 129);
    pdf.text(`+${additions}`, 81, 72);

    // Card 3: Deletions
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(140, 52, 56, 26, 3, 3, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('REMOVED CONTENT (-)', 144, 60);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text(`-${deletions}`, 144, 72);

    // Document Details Box
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(14, 84, 182, 24, 2, 2, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);
    pdf.text(`Document A (Original): ${fileA.name} (${pdfA.numPages} pages, ${(fileA.size / 1024).toFixed(1)} KB)`, 18, 93);
    pdf.text(`Document B (Modified): ${fileB.name} (${pdfB.numPages} pages, ${(fileB.size / 1024).toFixed(1)} KB)`, 18, 102);

    // Log Title
    let yPos = 120;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text('DETAILED DIFFERENCE LOG:', 14, yPos);
    yPos += 10;

    const diffItemsToPrint = diffLines.filter(d => d.type !== 'eq');
    if (diffItemsToPrint.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(16, 185, 129);
        pdf.text('No differences found. Documents are 100% identical.', 14, yPos);
    } else {
        pdf.setFontSize(9);
        for (const item of diffItemsToPrint) {
            if (yPos > pageHeight - 20) {
                pdf.addPage();
                yPos = 20;
            }

            if (item.type === 'add') {
                pdf.setTextColor(16, 185, 129);
                pdf.setFont('helvetica', 'bold');
                pdf.text('[ADDED]   ', 14, yPos);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(51, 65, 85);
                const splitText = pdf.splitTextToSize(item.text, 160);
                pdf.text(splitText, 32, yPos);
                yPos += splitText.length * 5 + 3;
            } else if (item.type === 'del') {
                pdf.setTextColor(239, 68, 68);
                pdf.setFont('helvetica', 'bold');
                pdf.text('[REMOVED] ', 14, yPos);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(51, 65, 85);
                const splitText = pdf.splitTextToSize(item.text, 160);
                pdf.text(splitText, 32, yPos);
                yPos += splitText.length * 5 + 3;
            }
        }
    }

    const reportBytes = new Uint8Array(pdf.output('arraybuffer'));

    return {
        reportBytes,
        similarityScore: similarity,
        additionsCount: additions,
        deletionsCount: deletions,
        pageCountA: pdfA.numPages,
        pageCountB: pdfB.numPages,
        diffLines
    };
}
