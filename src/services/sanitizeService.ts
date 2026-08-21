export interface SensitiveItem {
    id: string;
    type: string;
    label: string;
    value: string;
    masked: string;
    page: number;
    selected: boolean;
}

export const SENSITIVE_PATTERNS: Record<string, { regex: RegExp; label: string }> = {
    PAN: {
        regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b|[A-Za-z]\s*[A-Za-z]\s*[A-Za-z]\s*[A-Za-z]\s*[A-Za-z]\s*\d\s*\d\s*\d\s*\d\s*[A-Za-z]/gi,
        label: 'PAN Card'
    },
    AADHAAR: {
        regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b|\b[2-9]\d{11}\b/g,
        label: 'Aadhaar Number'
    },
    PHONE_IN: {
        regex: /(?:\+91[\s-]?)?[6-9]\d{9}\b|(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|(?:\+91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g,
        label: 'Mobile Number'
    },
    IFSC: {
        regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi,
        label: 'Bank IFSC'
    },
    UPI: {
        regex: /[a-zA-Z0-9.\-_]{2,}@(okhdfcbank|okaxis|okicici|oksbi|paytm|ybl|apl|upi|axl|ibl|barodampay|federal|postbank|idfcbank|kotak|sbi|hdfc|icici|axis|indus|airtel|gpay)\b/gi,
        label: 'UPI ID'
    },
    EMAIL: {
        regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
        label: 'Email Address'
    },
    CREDIT_CARD: {
        regex: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
        label: 'Card Number'
    },
    BANK_ACCOUNT: {
        regex: /(?:A\/C|Account|Acc|AC|A\/c|Acct|Acc No|Account No|Account Number)[\s:#.-]*([0-9]{9,18})/gi,
        label: 'Bank Account'
    },
    DOB: {
        regex: /(?:DOB|Date of Birth|D\.O\.B|Birth Date)[\s:#.-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/gi,
        label: 'Date of Birth'
    },
    NAME: {
        regex: /(?:Name|Patient|Customer|Account Holder|Cardholder)[\s:#.-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g,
        label: 'Name / Person'
    }
};

export function maskSensitiveValue(val: string): string {
    const clean = val.trim().replace(/\s+/g, ' ');
    if (clean.length <= 4) return '***';
    return clean.slice(0, 2) + '*'.repeat(Math.max(2, clean.length - 4)) + clean.slice(-2);
}

/**
 * Intelligent geometry-aware text reconstruction from raw PDF glyph coordinates.
 */
function assemblePageText(textContent: any): { fullText: string; denseText: string } {
    if (!textContent || !textContent.items || textContent.items.length === 0) {
        return { fullText: '', denseText: '' };
    }

    const items = textContent.items as any[];
    const lines: Record<number, any[]> = {};

    for (const item of items) {
        const str = item.str || '';
        if (!str) continue;
        const tx = item.transform || [1, 0, 0, 1, 0, 0];
        const y = Math.round((tx[5] || 0) / 3.5) * 3.5;
        const x = tx[4] || 0;
        const width = item.width || (str.length * 6);
        const height = item.height || 12;

        if (!lines[y]) lines[y] = [];
        lines[y].push({ str, x, y: tx[5] || 0, width, height });
    }

    const lineKeys = Object.keys(lines).map(Number).sort((a, b) => b - a);
    const formattedLines: string[] = [];
    const denseTokens: string[] = [];

    for (const yKey of lineKeys) {
        const lineItems = lines[yKey].sort((a, b) => a.x - b.x);
        let lineStr = '';
        let lastRight: number | null = null;

        for (const it of lineItems) {
            if (lastRight !== null) {
                const gap = it.x - lastRight;
                if (gap >= 2.0) {
                    lineStr += ' ';
                }
            }
            lineStr += it.str;
            denseTokens.push(it.str);
            lastRight = it.x + it.width;
        }
        formattedLines.push(lineStr);
    }

    return {
        fullText: formattedLines.join('\n'),
        denseText: denseTokens.join('')
    };
}

/**
 * Scans PDF text page-by-page client-side with multi-pass geometry-aware analysis & OCR fallback.
 */
export async function detectSensitiveDataClient(file: File, customTerms: string[] = []): Promise<SensitiveItem[]> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const findings: SensitiveItem[] = [];
    const seenValues = new Set<string>();

    const addFinding = (pType: string, label: string, rawVal: string, pageNum: number) => {
        const cleanVal = rawVal.trim().replace(/\s+/g, ' ');
        const dedupKey = `${pType}_p${pageNum}_${cleanVal.toLowerCase()}`;
        if (seenValues.has(dedupKey)) return;
        seenValues.add(dedupKey);

        findings.push({
            id: `${pType}_p${pageNum}_${Math.random().toString(36).substr(2, 6)}`,
            type: pType,
            label,
            value: cleanVal,
            masked: maskSensitiveValue(cleanVal),
            page: pageNum,
            selected: true
        });
    };

    try {
        let totalTextLen = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const { fullText, denseText } = assemblePageText(textContent);
            totalTextLen += fullText.length;

            const textSources = [fullText, denseText];

            // 1. Scan built-in regex patterns on reconstructed text
            for (const textSample of textSources) {
                if (!textSample) continue;

                for (const [pType, { regex, label }] of Object.entries(SENSITIVE_PATTERNS)) {
                    regex.lastIndex = 0;
                    let match;
                    while ((match = regex.exec(textSample)) !== null) {
                        const val = match[1] || match[0];
                        if (val && val.trim().length >= 3) {
                            addFinding(pType, label, val, i);
                        }
                    }
                }
            }

            // 2. Scan custom query terms
            for (const term of customTerms) {
                const tClean = term.trim();
                if (!tClean) continue;
                const termRegex = new RegExp(tClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                let match;
                while ((match = termRegex.exec(fullText)) !== null) {
                    const val = match[0];
                    addFinding('CUSTOM_QUERY', `Custom: "${tClean}"`, val, i);
                }
            }
        }

        // 3. Fallback: If document is scanned / image-based (< 30 text characters), perform Tesseract OCR on Page 1
        if (totalTextLen < 30 && pdf.numPages > 0) {
            try {
                const page1 = await pdf.getPage(1);
                const viewport = page1.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                if (ctx) {
                    await page1.render({ canvasContext: ctx, viewport }).promise;
                    const TesseractMod: any = await import('tesseract.js');
                    const recognizeFn = TesseractMod.recognize || TesseractMod.default?.recognize;
                    if (recognizeFn) {
                        const ocrRes = await recognizeFn(canvas, 'eng');
                        const ocrText = ocrRes?.data?.text || '';

                        for (const [pType, { regex, label }] of Object.entries(SENSITIVE_PATTERNS)) {
                            regex.lastIndex = 0;
                            let match;
                            while ((match = regex.exec(ocrText)) !== null) {
                                const val = match[1] || match[0];
                                if (val && val.trim().length >= 3) {
                                    addFinding(pType, label, val, 1);
                                }
                            }
                        }
                    }
                }
            } catch (ocrErr) {
                console.warn('OCR fallback scanner notice:', ocrErr);
            }
        }
    } finally {
        pdf.destroy();
    }

    return findings;
}

/**
 * Irreversibly redacts target regions and text occurrences by burning solid black boxes onto visual
 * layers and stripping all metadata packets from the PDF container.
 */
export async function redactPdf(
    file: File,
    regions: { page: number; x: number; y: number; w: number; h: number }[] = [],
    termsToRedact: string[] = []
): Promise<Uint8Array> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    const { PDFDocument } = await import('pdf-lib');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    try {
        const newPdf = await PDFDocument.create();

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;

                // Burn manual drag redaction regions for this page
                const pageRegions = regions.filter(r => r.page === i);
                context.fillStyle = '#000000';
                for (const r of pageRegions) {
                    context.fillRect(r.x * 2.0, r.y * 2.0, r.w * 2.0, r.h * 2.0);
                }

                // If term-based redactions specified, locate and burn on canvas
                if (termsToRedact.length > 0) {
                    const textContent = await page.getTextContent();
                    for (const item of textContent.items as any[]) {
                        const itemStr = item.str || '';
                        for (const term of termsToRedact) {
                            if (term && itemStr.toLowerCase().includes(term.toLowerCase())) {
                                const tx = item.transform;
                                if (tx && tx.length >= 6) {
                                    const x = tx[4] * 2.0;
                                    const y = (page.view[3] - tx[5] - (item.height || 12)) * 2.0;
                                    const w = (item.width || term.length * 8) * 2.0;
                                    const h = (item.height || 14) * 2.0;
                                    context.fillRect(x - 2, y - 2, w + 4, h + 4);
                                }
                            }
                        }
                    }
                }

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
            }
        }

        // Complete Metadata Sanitization
        newPdf.setTitle('');
        newPdf.setAuthor('');
        newPdf.setSubject('');
        newPdf.setKeywords([]);
        newPdf.setProducer('PDFBolt True Redactor');
        newPdf.setCreator('PDFBolt');

        return await newPdf.save();
    } finally {
        pdf.destroy();
    }
}

/**
 * Multi-tier fault-tolerant client-side PDF repair engine:
 * Tier 1: Direct PDF-Lib re-serialization
 * Tier 2: Binary header/trailer alignment, Catalog discovery & XRef healing
 * Tier 3: PDF.js resilient page rasterization & visual reconstruction
 * Tier 4: Raw text-stream extraction and document reconstruction
 * Tier 5: Direct container stabilization fallback
 */
export async function repairPdf(file: File): Promise<Uint8Array> {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
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

    // Tier 2: Binary Header Alignment, Object Offset Mapping & Complete XRef Table Synthesizer
    let cleaned: Uint8Array = rawBytes;
    try {
        let startIdx = 0;
        for (let i = 0; i < Math.min(rawBytes.length - 4, 4096); i++) {
            if (rawBytes[i] === 0x25 && rawBytes[i+1] === 0x50 && rawBytes[i+2] === 0x44 && rawBytes[i+3] === 0x46) {
                startIdx = i;
                break;
            }
        }

        if (startIdx > 0) {
            cleaned = rawBytes.slice(startIdx);
        } else if (rawBytes[0] !== 0x25) {
            const header = new TextEncoder().encode('%PDF-1.4\n');
            const withHeader = new Uint8Array(header.length + rawBytes.length);
            withHeader.set(header);
            withHeader.set(rawBytes, header.length);
            cleaned = withHeader;
        }

        const textDecoder = new TextDecoder('latin1');
        const cleanedStr = textDecoder.decode(cleaned);

        // Find all indirect object byte offsets in cleaned stream
        const objRegex = /(\d+)\s+(\d+)\s+obj\b/g;
        const objects: { id: number; offset: number }[] = [];
        let match;
        while ((match = objRegex.exec(cleanedStr)) !== null) {
            objects.push({ id: parseInt(match[1], 10), offset: match.index });
        }

        if (objects.length > 0) {
            const pageObjs = [...cleanedStr.matchAll(/(\d+)\s+\d+\s+obj[\s\S]*?(?:\/Type\s*\/Page\b|\/MediaBox)/gi)];
            const maxObjId = Math.max(...objects.map(o => o.id), 0);
            
            let extraObjStr = "";
            let rootId = "1";
            const catalogMatch = cleanedStr.match(/(\d+)\s+\d+\s+obj[\s\S]*?(?:\/Type\s*\/Catalog|\/Catalog)/i);
            
            if (catalogMatch) {
                rootId = catalogMatch[1];
            } else if (pageObjs.length > 0) {
                const pagesId = maxObjId + 1;
                const catalogId = maxObjId + 2;
                rootId = catalogId.toString();
                const kids = pageObjs.map(m => `${m[1]} 0 R`).join(' ');
                extraObjStr = `\n${pagesId} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageObjs.length} >>\nendobj\n\n${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`;
            }

            const baseWithExtra = cleanedStr + extraObjStr;
            const xrefOffset = baseWithExtra.length + 1;

            const totalObjs = maxObjId + (extraObjStr ? 2 : 0);
            let xrefTable = `\nxref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
            
            const offsetMap = new Map<number, number>();
            for (const obj of objects) {
                offsetMap.set(obj.id, obj.offset);
            }
            if (extraObjStr) {
                offsetMap.set(maxObjId + 1, cleanedStr.length + 1);
                offsetMap.set(maxObjId + 2, cleanedStr.length + 1 + extraObjStr.indexOf(`${maxObjId + 2} 0 obj`));
            }

            for (let i = 1; i <= totalObjs; i++) {
                const off = offsetMap.get(i) || 0;
                const offStr = off.toString().padStart(10, '0');
                if (off > 0) {
                    xrefTable += `${offStr} 00000 n \n`;
                } else {
                    xrefTable += `0000000000 65535 f \n`;
                }
            }

            const fullTrailer = `${baseWithExtra}${xrefTable}trailer\n<< /Size ${totalObjs + 1} /Root ${rootId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
            const healedBytes = new TextEncoder().encode(fullTrailer);

            const pdfDoc = await PDFDocument.load(healedBytes, { ignoreEncryption: true });
            if (pdfDoc.getPageCount() > 0) {
                return await pdfDoc.save();
            }
        }
    } catch (e) {
        // Continue to Tier 3
    }

    // Tier 3: PDF.js Fault-Tolerant Visual Reconstruction Engine
    try {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

        const loadingTask = pdfjsLib.getDocument({
            data: cleaned,
            stopAtErrors: false,
            isEvalSupported: false,
            disableFontFace: true
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

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
        // Continue to Tier 4
    }

    // Tier 4: Raw Text-Stream Extraction & Document Recovery
    try {
        const textDecoder = new TextDecoder('latin1');
        const rawStr = textDecoder.decode(rawBytes);

        // Extract readable text chunks from stream objects
        const textChunks: string[] = [];
        const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi;
        let match;
        while ((match = streamRegex.exec(rawStr)) !== null) {
            const content = match[1];
            // Extract text operators: Tj, TJ, or readable strings
            const tjMatches = content.match(/\(([^)]+)\)\s*Tj/g);
            if (tjMatches) {
                const text = tjMatches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
                if (text.trim().length > 0) {
                    textChunks.push(text);
                }
            }
        }

        if (textChunks.length > 0) {
            const recoveryDoc = await PDFDocument.create();
            const font = await recoveryDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await recoveryDoc.embedFont(StandardFonts.HelveticaBold);

            let page = recoveryDoc.addPage([595.28, 841.89]);
            page.drawText('PDFBolt Structural Recovery Report', { x: 50, y: 790, size: 16, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
            page.drawText('Extracted readable content from damaged document streams:', { x: 50, y: 765, size: 10, font, color: rgb(0.4, 0.4, 0.4) });

            let y = 730;
            for (const chunk of textChunks) {
                const cleanChunk = chunk.replace(/[^\x20-\x7E\n]/g, ' ');
                const words = cleanChunk.split(' ');
                let line = '';
                for (const word of words) {
                    if ((line + word).length > 80) {
                        page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
                        y -= 16;
                        line = word + ' ';
                        if (y < 60) {
                            page = recoveryDoc.addPage([595.28, 841.89]);
                            y = 780;
                        }
                    } else {
                        line += word + ' ';
                    }
                }
                if (line.trim().length > 0) {
                    page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
                    y -= 22;
                    if (y < 60) {
                        page = recoveryDoc.addPage([595.28, 841.89]);
                        y = 780;
                    }
                }
            }

            return await recoveryDoc.save();
        }
    } catch (e) {
        // Fallback to truthful unrecoverable error
    }

    // Never fabricate recovered content or generate fake placeholder pages
    throw new Error("We could not recover the original document structure from this PDF.");
}



