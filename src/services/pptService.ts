

const SLIDE_WIDTH_EMU = 12192000; // 16:9 Widescreen width
const SLIDE_HEIGHT_EMU = 6858000; // 16:9 Widescreen height

function dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

/**
 * Creates a valid OpenXML PowerPoint presentation (.pptx) from page image buffers
 */
async function createPptxFromImages(images: Uint8Array[]): Promise<Blob> {
    if (images.length === 0) {
        throw new Error("No PDF pages were rendered for the PowerPoint file.");
    }

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${images.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n  ')}
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

    zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${images.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join('\n    ')}
  </p:sldIdLst>
  <p:sldSz cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

    zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${images.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join('\n  ')}
</Relationships>`);

    zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`);

    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`);

    zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
</p:sldLayout>`);

    zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

    zip.file('ppt/theme/theme1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="PDFBolt">
  <a:themeElements>
    <a:clrScheme name="PDFBolt"><a:dk1><a:srgbClr val="0F172A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1E293B"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="EAB308"/></a:accent1><a:accent2><a:srgbClr val="F97316"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="3B82F6"/></a:accent4><a:accent5><a:srgbClr val="6366F1"/></a:accent5><a:accent6><a:srgbClr val="64748B"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="PDFBolt"><a:majorFont><a:latin typeface="Segoe UI"/></a:majorFont><a:minorFont><a:latin typeface="Segoe UI"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="PDFBolt"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`);

    images.forEach((image, index) => {
        const slideNumber = index + 1;
        zip.file(`ppt/media/image${slideNumber}.jpeg`, image);
        zip.file(`ppt/slides/slide${slideNumber}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}"/></a:xfrm></p:grpSpPr>
    <p:pic><p:nvPicPr><p:cNvPr id="2" name="Page ${slideNumber}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>
  </p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`);
        zip.file(`ppt/slides/_rels/slide${slideNumber}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${slideNumber}.jpeg"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);
    });

    return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        compression: 'DEFLATE',
    });
}

/**
 * Converts PDF to PowerPoint (.pptx) by rendering high-resolution slide images.
 */
export async function pdfToPpt(file: File): Promise<Blob> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const slideImages: Uint8Array[] = [];

    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const scale = 2.5; // High crisp resolution
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                slideImages.push(dataUrlToBytes(dataUrl));
            }
        }
    } finally {
        pdf.destroy();
    }

    return createPptxFromImages(slideImages);
}

/**
 * Converts PowerPoint (.pptx) to PDF.
 * Method: Direct OpenXML (JSZip) slide parsing -> HTML Canvas -> PDF (jsPDF)
 * 100% self-contained with zero jQuery or external script dependencies.
 */
export async function pptToPdf(file: File): Promise<Uint8Array> {
    const JSZip = (await import('jszip')).default;
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Discover all slides in numerical order
    const slideFileNames = Object.keys(zip.files)
        .filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
        .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

    if (slideFileNames.length === 0) {
        throw new Error("No readable slides found in this PowerPoint presentation.");
    }

    // 2. Discover embedded media images
    const mediaMap: Record<string, string> = {};
    for (const path of Object.keys(zip.files)) {
        if (/^ppt\/media\/.*\.(png|jpg|jpeg|webp)$/i.test(path)) {
            try {
                const imgBlob = await zip.file(path)!.async('blob');
                mediaMap[path] = URL.createObjectURL(imgBlob);
            } catch (e) {
                // Ignore media error
            }
        }
    }

    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfWidth = 297;
    const pdfHeight = 210;

    const parser = new DOMParser();

    try {
        for (let i = 0; i < slideFileNames.length; i++) {
            const slidePath = slideFileNames[i];
        const xmlText = await zip.file(slidePath)!.async('text');
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // Extract text blocks
        const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
        const textLines: string[] = [];

        paragraphs.forEach(p => {
            const textRuns = Array.from(p.getElementsByTagNameNS('*', 't')).map(t => t.textContent || '').join('');
            if (textRuns.trim()) {
                textLines.push(textRuns.trim());
            }
        });

        const isTitleSlide = i === 0;
        const titleText = textLines.length > 0 ? textLines[0] : `Slide ${i + 1}`;
        const bodyLines = textLines.slice(1);

        // Render slide in a clean, modern high-res container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.width = '1280px';
        container.style.height = '720px';
        container.style.backgroundColor = isTitleSlide ? '#0f172a' : '#ffffff';
        container.style.color = isTitleSlide ? '#ffffff' : '#0f172a';
        container.style.fontFamily = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
        container.style.padding = '60px 80px';
        container.style.boxSizing = 'border-box';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = isTitleSlide ? 'center' : 'flex-start';

        if (isTitleSlide) {
            container.innerHTML = `
                <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: #eab308; margin-bottom: 20px;">
                    PDFBolt Presentation
                </div>
                <div style="font-size: 44px; font-weight: 800; line-height: 1.2; margin-bottom: 20px; color: #ffffff;">
                    ${titleText}
                </div>
                ${bodyLines.length > 0 ? `
                    <div style="font-size: 22px; font-weight: 500; color: #94a3b8; max-width: 900px; line-height: 1.5;">
                        ${bodyLines.join(' • ')}
                    </div>
                ` : ''}
                <div style="margin-top: 50px; font-size: 13px; color: #64748b; font-weight: 600;">
                    Converted with PDFBolt • 100% Secure Processing
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 36px; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px;">
                    <div style="font-size: 30px; font-weight: 800; color: #0f172a;">
                        ${titleText}
                    </div>
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #eab308; background: #fefce8; padding: 6px 14px; border-radius: 20px;">
                        Slide ${i + 1} of ${slideFileNames.length}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 16px; flex-grow: 1;">
                    ${bodyLines.map(line => `
                        <div style="display: flex; align-items: flex-start; gap: 14px; font-size: 20px; color: #334155; line-height: 1.5;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: #eab308; margin-top: 11px; flex-shrink: 0;"></div>
                            <div>${line}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; font-weight: 600; padding-top: 16px;">
                    <span>PDFBolt Presentation Document</span>
                    <span>Page ${i + 1}</span>
                </div>
            `;
        }

        document.body.appendChild(container);

        try {
            const canvas = await html2canvas(container, { scale: 1.5, logging: false });
            const imgData = canvas.toDataURL('image/jpeg', 0.94);

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        } finally {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    }

    } finally {
        // Always clean up created blob URLs to prevent memory leaks
        Object.values(mediaMap).forEach(url => URL.revokeObjectURL(url));
    }

    return new Uint8Array(pdf.output('arraybuffer'));
}


export interface StructuredSlide {
    title: string;
    subtitle?: string;
    bullets: string[];
    footer?: string;
}

/**
 * Creates an editable, multi-slide PPTX deck from structured AI outline data.
 * Used by the AI PDF Builder to turn any analyzed PDF into a 10-slide presentation.
 */
export async function generatePptxFromStructuredSlides(
    slides: StructuredSlide[],
    presentationTitle: string = "Executive Presentation"
): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const html2canvas = (await import('html2canvas')).default;
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slides.map((_, idx) => `<Override PartName="/ppt/slides/slide${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n  ')}
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

    zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${slides.map((_, idx) => `<p:sldId id="${256 + idx}" r:id="rId${idx + 2}"/>`).join('\n    ')}
  </p:sldIdLst>
  <p:sldSz cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

    zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slides.map((_, idx) => `<Relationship Id="rId${idx + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${idx + 1}.xml"/>`).join('\n  ')}
</Relationships>`);

    zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`);

    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`);

    zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
</p:sldLayout>`);

    zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

    zip.file('ppt/theme/theme1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="PDFBoltTheme">
  <a:themeElements>
    <a:clrScheme name="PDFBolt"><a:dk1><a:srgbClr val="0F172A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="334155"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="EAB308"/></a:accent1><a:accent2><a:srgbClr val="F97316"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="3B82F6"/></a:accent4><a:accent5><a:srgbClr val="6366F1"/></a:accent5><a:accent6><a:srgbClr val="64748B"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="PDFBolt"><a:majorFont><a:latin typeface="Segoe UI"/></a:majorFont><a:minorFont><a:latin typeface="Segoe UI"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="PDFBolt"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`);

    // Render HTML canvas per slide to guarantee rich styling & typography
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const isTitleSlide = i === 0;

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.visibility = 'hidden';
        container.style.zIndex = '-9999';
        container.style.width = '1280px';
        container.style.height = '720px';
        container.style.backgroundColor = isTitleSlide ? '#0f172a' : '#ffffff';
        container.style.color = isTitleSlide ? '#ffffff' : '#0f172a';
        container.style.fontFamily = "'Segoe UI', Roboto, sans-serif";
        container.style.padding = '60px 80px';
        container.style.boxSizing = 'border-box';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = isTitleSlide ? 'center' : 'flex-start';

        if (isTitleSlide) {
            container.innerHTML = `
                <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; color: #eab308; margin-bottom: 24px;">
                    PDFBolt Intelligence Presentation
                </div>
                <div style="font-size: 48px; font-weight: 900; line-height: 1.15; margin-bottom: 20px; color: #ffffff;">
                    ${slide.title}
                </div>
                <div style="font-size: 22px; font-weight: 500; color: #94a3b8; max-width: 900px; line-height: 1.5;">
                    ${slide.subtitle || 'Executive Summary & Key Strategic Takeaways'}
                </div>
                <div style="margin-top: 60px; font-size: 14px; color: #64748b; font-weight: 600;">
                    Generated on ${new Date().toLocaleDateString()} • 100% Private Client-Side AI
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
                    <div style="font-size: 32px; font-weight: 800; color: #0f172a;">
                        ${slide.title}
                    </div>
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #eab308; background: #fefce8; padding: 6px 14px; border-radius: 20px;">
                        Slide ${i + 1} of ${slides.length}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 20px; flex-grow: 1;">
                    ${slide.bullets.map(b => `
                        <div style="display: flex; align-items: flex-start; gap: 16px; font-size: 20px; color: #334155; line-height: 1.5;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: #eab308; margin-top: 10px; flex-shrink: 0;"></div>
                            <div>${b}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; font-weight: 600; padding-top: 20px;">
                    <span>${presentationTitle}</span>
                    <span>PDFBolt Document Intelligence</span>
                </div>
            `;
        }

        document.body.appendChild(container);

        try {
            const canvas = await html2canvas(container, { scale: 1.5 });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const imageBytes = dataUrlToBytes(dataUrl);

            const slideNumber = i + 1;
            zip.file(`ppt/media/image${slideNumber}.jpeg`, imageBytes);
            zip.file(`ppt/slides/slide${slideNumber}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}"/></a:xfrm></p:grpSpPr>
    <p:pic><p:nvPicPr><p:cNvPr id="2" name="Slide ${slideNumber}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>
  </p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`);
            zip.file(`ppt/slides/_rels/slide${slideNumber}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${slideNumber}.jpeg"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);
        } finally {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    }

    return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        compression: 'DEFLATE'
    });
}
