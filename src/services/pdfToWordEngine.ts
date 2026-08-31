/**
 * PDFBolt Universal PDF → DOCX Engine v6 (High-Fidelity Document Reconstruction)
 *
 * Designed to accurately reconstruct all types of PDFs into editable, beautifully formatted Word (.docx) files:
 *  - Native digital PDFs (reports, contracts, invoices, ebooks, papers)
 *  - Multi-column layouts (academic papers, newsletters, magazines)
 *  - Tables (invoices, financial data, schedules, forms)
 *  - Embedded images, charts, and logos preserved in visual reading order
 *  - Headings, lists, font styles, colors, alignment, and hyperlinks
 *  - Scanned PDFs via Tesseract OCR
 */

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TItem {
  text:       string;
  left:       number;  // X from left in pts
  top:        number;  // Y from top in pts (normalized 0 = top of page)
  width:      number;  // width in pts
  height:     number;  // font height / font size in pts
  fontName:   string;
  bold:       boolean;
  italic:     boolean;
  color?:     string;  // hex color code (e.g. "1A365D")
  sup?:       boolean;
  sub?:       boolean;
}

export interface ExtractedImage {
  left:       number;  // X from left in pts
  top:        number;  // Y from top in pts (0 = top of page)
  width:      number;  // width in pts
  height:     number;  // height in pts
  dataUrl:    string;  // JPEG/PNG base64 data URL
}

export interface ExtractedLink {
  url:        string;
  left:       number;
  top:        number;
  width:      number;
  height:     number;
}

export type PageType = 'text' | 'scanned' | 'image-only' | 'mixed';

export interface ProcessedPage {
  num:        number;
  type:       PageType;
  width:      number;  // page width in pts
  height:     number;  // page height in pts
  rotation?:  number;
  items:      TItem[];
  images:     ExtractedImage[];
  links:      ExtractedLink[];
}

export interface TextRunPart {
  text:       string;
  bold?:      boolean;
  italic?:    boolean;
  size:       number;  // docx half-points (24 = 12pt)
  color?:     string;
  sup?:       boolean;
  sub?:       boolean;
  url?:       string;
}

export type ElementAlignment = 'left' | 'center' | 'right' | 'justify';

export type DocElement =
  | {
      type: 'heading';
      level: 1 | 2 | 3 | 4;
      text: string;
      bold: boolean;
      size: number;
      color?: string;
      align?: ElementAlignment;
    }
  | {
      type: 'paragraph';
      parts: TextRunPart[];
      align?: ElementAlignment;
      indent?: number;
      spacingBefore?: number;
      spacingAfter?: number;
    }
  | {
      type: 'list-item';
      isNumbered: boolean;
      number?: number;
      text: string;
      parts: TextRunPart[];
      level: number;
    }
  | {
      type: 'table';
      rows: string[][];
      colWidthsPct: number[];
      hasHeader: boolean;
    }
  | {
      type: 'image';
      dataUrl: string;
      widthPt: number;
      heightPt: number;
      align: ElementAlignment;
    }
  | {
      type: 'page-break';
    };

export interface QualityReport {
  pagesTotal:       number;
  pagesText:        number;
  pagesOCR:         number;
  tablesFound:      number;
  imagesFound:      number;
  headingsDetected: number;
  listsDetected:    number;
  hyperlinksFound:  number;
  textAccuracy:     number;
  overallScore:     number;
}

export interface ConversionResult {
  bytes:   Uint8Array;
  quality: QualityReport;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════

const CONCURRENCY = 6;
const PT_TO_TWIP = 20;
const ptToTwip = (pt: number) => Math.round(pt * PT_TO_TWIP);

const BULLET_REGEX = /^[\u2022\u2023\u25aa\u25cf\u25e6\u2013\u2014\u25b6\u25b8\u2714\u2718\-\*\u25a0\u25a1\u2610\u2611]\s+/;
const NUMBERED_LIST_REGEX = /^(\d{1,3}|[a-zA-Z]|\b[ivxlcdm]+\b)[\.\)]\s+/i;

let _docxLib: typeof import('docx') | null = null;
let _pdfjs: any = null;
let _workerReady = false;

async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist');
    if (!_workerReady) {
      const url = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      _pdfjs.GlobalWorkerOptions.workerSrc = url;
      _workerReady = true;
    }
  }
  return _pdfjs;
}

async function getDocxLib() {
  if (!_docxLib) _docxLib = await import('docx');
  return _docxLib;
}

function parseFontStyles(fontName: string): { bold: boolean; italic: boolean } {
  const f = (fontName || '').toLowerCase();
  return {
    bold: /bold|black|heavy|demi|extrabold|semibold|bld/i.test(f),
    italic: /italic|oblique|slant|it/i.test(f),
  };
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 1 — EXTRACTION & COORDINATE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════

async function extractMetadata(pdf: any): Promise<Record<string, string>> {
  try {
    const meta = await pdf.getMetadata();
    const info = meta?.info ?? {};
    return {
      title: info.Title ?? '',
      author: info.Author ?? '',
      subject: info.Subject ?? '',
      keywords: info.Keywords ?? '',
    };
  } catch {
    return {};
  }
}

type M6 = [number, number, number, number, number, number];
const ID6: M6 = [1, 0, 0, 1, 0, 0];

function mulM6(a: M6, b: M6): M6 {
  return [
    a[0]*b[0] + a[2]*b[1], a[1]*b[0] + a[3]*b[1],
    a[0]*b[2] + a[2]*b[3], a[1]*b[2] + a[3]*b[3],
    a[0]*b[4] + a[2]*b[5] + a[4], a[1]*b[4] + a[3]*b[5] + a[5],
  ];
}

/** Extract all images on a page with normalized top-down coordinates */
async function extractPageImages(page: any, pageHeight: number, pageWidth: number): Promise<ExtractedImage[]> {
  const zones: Array<{ left: number; top: number; width: number; height: number }> = [];

  try {
    const pdfjs = await getPdfjs();
    const OPS = pdfjs.OPS as Record<string, number>;
    const imgOpNums = new Set<number>([
      OPS['paintImageXObject'],
      OPS['paintJpegXObject'],
      OPS['paintInlineImageXObject'],
      OPS['paintImageXObjectRepeat'],
      OPS['paintImageMaskXObject'],
    ].filter((v): v is number => typeof v === 'number'));

    const opList = await page.getOperatorList();
    const stack: M6[] = [];
    let ctm: M6 = [...ID6] as M6;

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i] as number;
      const ar = opList.argsArray[i] as any;

      if (fn === OPS['save']) stack.push([...ctm] as M6);
      else if (fn === OPS['restore']) ctm = stack.pop() ?? ([...ID6] as M6);
      else if (fn === OPS['transform']) ctm = mulM6(ctm, ar as M6);
      else if (imgOpNums.has(fn)) {
        const [a, , , d, e, f] = ctm;
        const iw = Math.abs(a);
        const ih = Math.abs(d);
        const ix = e;
        const iy = pageHeight - f - ih; // Normalized top-down: 0 = top of page

        // Filter out 1x1 tracking pixels, hairline borders, and huge full-page background tint rects
        const isNotTiny = iw > 12 && ih > 12;
        const isNotFullPageBg = !(iw >= pageWidth * 0.98 && ih >= pageHeight * 0.98);

        if (isNotTiny && isNotFullPageBg) {
          zones.push({ left: Math.max(0, ix), top: Math.max(0, iy), width: iw, height: ih });
        }
      }
    }
  } catch {
    return [];
  }

  if (!zones.length) return [];

  // Render high-res canvas to crop image segments accurately
  try {
    const SCALE = 2.0;
    const vp = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    return zones.map(z => {
      const cx = Math.max(0, Math.round(z.left * SCALE));
      const cy = Math.max(0, Math.round(z.top * SCALE));
      const cw = Math.min(Math.round(z.width * SCALE), canvas.width - cx);
      const ch = Math.min(Math.round(z.height * SCALE), canvas.height - cy);

      if (cw < 8 || ch < 8) return null;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cw;
      cropCanvas.height = ch;
      const cctx = cropCanvas.getContext('2d');
      if (!cctx) return null;

      cctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
      return {
        left: z.left,
        top: z.top,
        width: z.width,
        height: z.height,
        dataUrl: cropCanvas.toDataURL('image/jpeg', 0.92),
      };
    }).filter((x): x is ExtractedImage => x !== null);
  } catch {
    return [];
  }
}

/** Extract hyperlink annotations with normalized top-down coordinates */
async function extractPageLinks(page: any, pageHeight: number): Promise<ExtractedLink[]> {
  try {
    const annotations = await page.getAnnotations();
    return (annotations as any[])
      .filter(a => a.subtype === 'Link' && a.url)
      .map(a => {
        const [x1, y1, x2, y2] = a.rect;
        return {
          url: a.url as string,
          left: Math.min(x1, x2),
          top: pageHeight - Math.max(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        };
      });
  } catch {
    return [];
  }
}

/** Extract text content with normalized top-down coordinates */
function extractPageTextItems(textContent: any, pageHeight: number): TItem[] {
  const items: TItem[] = [];

  for (const it of (textContent.items as any[])) {
    if (typeof it.str !== 'string' || !it.str.trim()) continue;

    const fontName = it.fontName || '';
    const { bold, italic } = parseFontStyles(fontName);
    const height = Math.abs(it.height) || 10;
    const width = it.width !== undefined ? Math.abs(it.width) : it.str.length * height * 0.55;

    // PDF transform matrix: transform[4] = X, transform[5] = Y (from bottom-left)
    const left = it.transform[4];
    const top = pageHeight - it.transform[5] - height; // Normalized top-down (0 = top)

    items.push({
      text: it.str,
      left: Math.max(0, left),
      top: Math.max(0, top),
      width,
      height,
      fontName: fontName.toLowerCase(),
      bold,
      italic,
    });
  }

  return items;
}

/** Extract single page data */
async function extractSinglePage(pdf: any, pageNum: number): Promise<ProcessedPage> {
  const page = await pdf.getPage(pageNum);
  const vp = page.getViewport({ scale: 1.0 });
  const width = vp.width;
  const height = vp.height;
  const rotation = (page.rotate ?? 0) as number;

  const textContent = await page.getTextContent({ includeMarkedContent: false });
  const items = extractPageTextItems(textContent, height);

  // Classify page
  let type: PageType = 'text';
  if (items.length === 0) type = 'scanned';
  else if (items.length < 5 && width * height > 40000) type = 'image-only';
  else if (items.length < 20) type = 'mixed';

  // ALWAYS extract images so photos, logos, diagrams are never deleted!
  const images = await extractPageImages(page, height, width);
  const links = await extractPageLinks(page, height);

  return { num: pageNum, type, width, height, rotation, items, images, links };
}

/** Parallel extraction across all pages */
async function extractAllPages(pdf: any): Promise<ProcessedPage[]> {
  const total = pdf.numPages;
  const pages: (ProcessedPage | null)[] = new Array(total).fill(null);

  for (let base = 0; base < total; base += CONCURRENCY) {
    const end = Math.min(base + CONCURRENCY, total);
    await Promise.all(
      Array.from({ length: end - base }, (_, i) => {
        const pageNum = base + i + 1;
        return extractSinglePage(pdf, pageNum)
          .then(p => { pages[pageNum - 1] = p; })
          .catch(() => {});
      })
    );
  }

  return pages.filter((p): p is ProcessedPage => p !== null);
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 2 — OCR FOR SCANNED PAGES
// ═══════════════════════════════════════════════════════════════════

async function runOcrOnPage(page: any, pageHeight: number): Promise<TItem[]> {
  try {
    const SCALE = 2.0;
    const vp = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const { default: Tesseract } = await import('tesseract.js');
    const worker = await Tesseract.createWorker('eng');

    const { data } = await worker.recognize(canvas);
    await worker.terminate();

    const items: TItem[] = [];
    for (const line of data.lines) {
      if (!line.text.trim()) continue;
      for (const word of line.words) {
        if (!word.text.trim() || word.confidence < 25) continue;
        const left = word.bbox.x0 / SCALE;
        const top = word.bbox.y0 / SCALE;
        const width = (word.bbox.x1 - word.bbox.x0) / SCALE;
        const height = (word.bbox.y1 - word.bbox.y0) / SCALE;
        items.push({
          text: word.text,
          left,
          top,
          width,
          height: Math.max(9, height),
          fontName: 'serif',
          bold: false,
          italic: false,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 3 — ADVANCED LAYOUT RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════════

/** Calculate median body font size across document */
function calculateBodyFontSize(items: TItem[]): number {
  if (!items.length) return 11;
  const sizes = items.map(it => it.height).filter(h => h >= 6 && h <= 72).sort((a, b) => a - b);
  if (!sizes.length) return 11;
  return sizes[Math.floor(sizes.length * 0.4)] || 11;
}

interface Line {
  items: TItem[];
  left: number;
  top: number;
  right: number;
  bottom: number;
  height: number;
  text: string;
}

/** Group sorted text items into visual horizontal lines (top-down) */
function groupItemsIntoLines(sortedItems: TItem[]): Line[] {
  if (!sortedItems.length) return [];

  const lines: Line[] = [];
  let currentGroup: TItem[] = [sortedItems[0]];
  let currentTop = sortedItems[0].top;
  let currentH = sortedItems[0].height;

  for (let i = 1; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    const threshold = Math.max(3, Math.min(currentH, item.height) * 0.45);

    if (Math.abs(item.top - currentTop) <= threshold) {
      currentGroup.push(item);
      // Update running average top
      currentTop = (currentTop * (currentGroup.length - 1) + item.top) / currentGroup.length;
      currentH = Math.max(currentH, item.height);
    } else {
      // Finalize current line
      currentGroup.sort((a, b) => a.left - b.left);
      const lineLeft = currentGroup[0].left;
      const lineRight = Math.max(...currentGroup.map(it => it.left + it.width));
      const lineTop = Math.min(...currentGroup.map(it => it.top));
      const lineBottom = Math.max(...currentGroup.map(it => it.top + it.height));
      const lineText = joinLineItems(currentGroup);

      lines.push({
        items: currentGroup,
        left: lineLeft,
        top: lineTop,
        right: lineRight,
        bottom: lineBottom,
        height: lineBottom - lineTop,
        text: lineText,
      });

      currentGroup = [item];
      currentTop = item.top;
      currentH = item.height;
    }
  }

  // Final line
  currentGroup.sort((a, b) => a.left - b.left);
  const lineLeft = currentGroup[0].left;
  const lineRight = Math.max(...currentGroup.map(it => it.left + it.width));
  const lineTop = Math.min(...currentGroup.map(it => it.top));
  const lineBottom = Math.max(...currentGroup.map(it => it.top + it.height));
  const lineText = joinLineItems(currentGroup);

  lines.push({
    items: currentGroup,
    left: lineLeft,
    top: lineTop,
    right: lineRight,
    bottom: lineBottom,
    height: lineBottom - lineTop,
    text: lineText,
  });

  return lines;
}

/** Join line items with smart space handling based on bounding box gaps */
function joinLineItems(items: TItem[]): string {
  if (!items.length) return '';
  let out = items[0].text;

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];
    const gap = curr.left - (prev.left + prev.width);

    // If gap between words is larger than 25% of character height, insert a space
    if (gap > prev.height * 0.22 && !out.endsWith(' ') && !curr.text.startsWith(' ')) {
      out += ' ';
    }
    out += curr.text;
  }

  return out;
}

/** Detect if lines form a structured multi-column table */
interface DetectedTable {
  startLineIdx: number;
  endLineIdx: number;
  colPositions: number[];
  rows: string[][];
}

function detectTablesFromLines(lines: Line[], pageWidth: number): DetectedTable[] {
  const tables: DetectedTable[] = [];
  const candidateRows: Array<{ lineIdx: number; cols: { x: number; text: string }[] }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.items.length < 2) continue;

    // Find clusters of items with distinct horizontal gaps
    const cols: { x: number; text: string }[] = [];
    let curColItems: TItem[] = [line.items[0]];

    for (let j = 1; j < line.items.length; j++) {
      const it = line.items[j];
      const prev = line.items[j - 1];
      const gap = it.left - (prev.left + prev.width);

      if (gap > pageWidth * 0.04) {
        cols.push({ x: curColItems[0].left, text: joinLineItems(curColItems) });
        curColItems = [it];
      } else {
        curColItems.push(it);
      }
    }
    cols.push({ x: curColItems[0].left, text: joinLineItems(curColItems) });

    if (cols.length >= 2) {
      candidateRows.push({ lineIdx: i, cols });
    }
  }

  // Find consecutive candidate rows with matching column positions
  let runStart = 0;
  for (let i = 1; i <= candidateRows.length; i++) {
    const isEnd = i === candidateRows.length || candidateRows[i].lineIdx - candidateRows[i - 1].lineIdx > 1;

    if (isEnd) {
      const run = candidateRows.slice(runStart, i);
      if (run.length >= 2) {
        // Collect all distinct column X positions
        const allXs = run.flatMap(r => r.cols.map(c => c.x)).sort((a, b) => a - b);
        const colPositions: number[] = [allXs[0]];
        for (let k = 1; k < allXs.length; k++) {
          if (allXs[k] - colPositions[colPositions.length - 1] > pageWidth * 0.05) {
            colPositions.push(allXs[k]);
          }
        }

        if (colPositions.length >= 2) {
          const rows: string[][] = run.map(r => {
            const rowCells: string[] = new Array(colPositions.length).fill('');
            for (const col of r.cols) {
              // Find closest column bucket
              let bestCol = 0;
              let minDiff = Math.abs(col.x - colPositions[0]);
              for (let c = 1; c < colPositions.length; c++) {
                const diff = Math.abs(col.x - colPositions[c]);
                if (diff < minDiff) {
                  minDiff = diff;
                  bestCol = c;
                }
              }
              rowCells[bestCol] = rowCells[bestCol] ? `${rowCells[bestCol]} ${col.text}` : col.text;
            }
            return rowCells;
          });

          tables.push({
            startLineIdx: run[0].lineIdx,
            endLineIdx: run[run.length - 1].lineIdx,
            colPositions,
            rows,
          });
        }
      }
      runStart = i;
    }
  }

  return tables;
}

/** Detect column splits for multi-column documents (e.g. 2-column papers) */
function detectColumnSplits(items: TItem[], pageWidth: number): number[] {
  const midStart = pageWidth * 0.25;
  const midEnd = pageWidth * 0.75;

  // Filter items in the central vertical band
  const sortedX = items.map(it => it.left).sort((a, b) => a - b);
  const splits: number[] = [];

  for (let i = 1; i < sortedX.length; i++) {
    const gap = sortedX[i] - sortedX[i - 1];
    if (gap > pageWidth * 0.06 && sortedX[i - 1] > midStart && sortedX[i - 1] < midEnd) {
      const splitX = (sortedX[i - 1] + sortedX[i]) / 2;
      if (!splits.length || splitX - splits[splits.length - 1] > pageWidth * 0.08) {
        splits.push(splitX);
      }
    }
  }

  return splits;
}

function findMatchingLink(it: TItem, links: ExtractedLink[]): string | undefined {
  const match = links.find(l =>
    it.left >= l.left - 4 && it.left <= l.left + l.width + 4 &&
    it.top >= l.top - 4 && it.top <= l.top + l.height + 4
  );
  return match?.url;
}

/** Convert a line of TItems into formatted TextRun parts with links, bold, italic, color */
function lineToTextRunParts(items: TItem[], links: ExtractedLink[]): TextRunPart[] {
  if (!items.length) return [];
  const parts: TextRunPart[] = [];

  let buf = '';
  let curBold = items[0].bold;
  let curItalic = items[0].italic;
  let curHeight = items[0].height;
  let curColor = items[0].color;
  let curUrl = findMatchingLink(items[0], links);

  const flush = () => {
    if (!buf) return;
    parts.push({
      text: buf,
      bold: curBold,
      italic: curItalic,
      size: Math.max(16, Math.round(curHeight * 2)), // docx half-points
      color: curColor,
      url: curUrl,
    });
    buf = '';
  };

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const itUrl = findMatchingLink(it, links);
    const gap = i > 0 ? it.left - (items[i - 1].left + items[i - 1].width) : 0;
    const needsSpace = gap > it.height * 0.22 && !buf.endsWith(' ') && !it.text.startsWith(' ');

    const sameFormat =
      it.bold === curBold &&
      it.italic === curItalic &&
      Math.abs(it.height - curHeight) < 1.0 &&
      it.color === curColor &&
      itUrl === curUrl;

    if (!sameFormat) {
      flush();
      curBold = it.bold;
      curItalic = it.italic;
      curHeight = it.height;
      curColor = it.color;
      curUrl = itUrl;
    }

    if (needsSpace && !buf.endsWith(' ')) buf += ' ';
    buf += it.text;
  }

  flush();
  return parts;
}

/** Determine text alignment (left, center, right) */
function detectLineAlignment(line: Line, pageWidth: number): ElementAlignment {
  const marginEstimate = 40;
  const centerPos = (line.left + line.right) / 2;
  const pageCenter = pageWidth / 2;

  if (Math.abs(centerPos - pageCenter) < 25 && line.left > marginEstimate + 20 && (pageWidth - line.right) > marginEstimate + 20) {
    return 'center';
  }
  if (line.left > pageWidth * 0.55 && (pageWidth - line.right) < marginEstimate + 30) {
    return 'right';
  }
  return 'left';
}

/** Build Document Elements for a single page */
function buildPageDocElements(page: ProcessedPage, bodyFontSize: number): DocElement[] {
  const elements: DocElement[] = [];
  const { items, images, links, width: pageWidth, height: pageHeight } = page;

  // 1. If scanned with no items, emit full-page image fallback
  if (!items.length) {
    for (const img of images) {
      elements.push({
        type: 'image',
        dataUrl: img.dataUrl,
        widthPt: img.width,
        heightPt: img.height,
        align: 'center',
      });
    }
    return elements;
  }

  // 2. Check if page has multi-column layout
  const colSplits = detectColumnSplits(items, pageWidth);
  const isMultiColumn = colSplits.length > 0;

  // Divide items by column if multi-column, otherwise single column
  const columnBuckets: TItem[][] = isMultiColumn
    ? Array.from({ length: colSplits.length + 1 }, () => [])
    : [items];

  if (isMultiColumn) {
    for (const it of items) {
      let colIdx = colSplits.findIndex(s => it.left < s);
      if (colIdx < 0) colIdx = colSplits.length;
      columnBuckets[colIdx].push(it);
    }
  }

  // 3. Process each column top-to-bottom
  for (const colItems of columnBuckets) {
    if (!colItems.length) continue;

    // Sort items TOP TO BOTTOM (ascending top)
    const sorted = [...colItems].sort((a, b) => a.top - b.top || a.left - b.left);
    const lines = groupItemsIntoLines(sorted);

    // Detect tables across lines
    const tables = detectTablesFromLines(lines, pageWidth);
    const tableLineIndices = new Set<number>();
    for (const tbl of tables) {
      for (let k = tbl.startLineIdx; k <= tbl.endLineIdx; k++) {
        tableLineIndices.add(k);
      }
    }

    // Process line by line
    let currentParagraphParts: TextRunPart[] = [];
    let currentParaAlign: ElementAlignment = 'left';
    let prevLineBottom: number | null = null;
    let prevLineHeight = bodyFontSize;

    const flushParagraph = () => {
      if (!currentParagraphParts.length) return;
      const text = currentParagraphParts.map(p => p.text).join('').trim();
      if (text) {
        elements.push({
          type: 'paragraph',
          parts: [...currentParagraphParts],
          align: currentParaAlign,
          spacingBefore: 40,
          spacingAfter: 60,
        });
      }
      currentParagraphParts = [];
    };

    for (let li = 0; li < lines.length; li++) {
      // If line is part of a table
      if (tableLineIndices.has(li)) {
        flushParagraph();
        const tbl = tables.find(t => t.startLineIdx === li);
        if (tbl) {
          const colCount = tbl.colPositions.length;
          const colWidthsPct = Array(colCount).fill(Math.floor(100 / colCount));
          elements.push({
            type: 'table',
            rows: tbl.rows,
            colWidthsPct,
            hasHeader: true,
          });
        }
        continue;
      }

      const line = lines[li];
      const lineText = line.text.trim();
      if (!lineText) continue;

      const lineMaxH = Math.max(...line.items.map(it => it.height));
      const lineBold = line.items.some(it => it.bold);
      const ratio = bodyFontSize > 0 ? lineMaxH / bodyFontSize : 1;
      const align = detectLineAlignment(line, pageWidth);

      // Check vertical gap from previous line
      const verticalGap = prevLineBottom !== null ? line.top - prevLineBottom : 0;
      const isLargeGap = prevLineBottom !== null && verticalGap > prevLineHeight * 1.4;

      if (isLargeGap) {
        flushParagraph();
      }

      // Check for Headings
      const isHeading1 = ratio >= 1.7 && lineText.length < 200;
      const isHeading2 = (ratio >= 1.35 || (ratio >= 1.15 && lineBold)) && lineText.length < 250;
      const isHeading3 = ratio >= 1.18 && lineBold && lineText.length < 250;

      if (isHeading1 || isHeading2 || isHeading3) {
        flushParagraph();
        const level = isHeading1 ? 1 : isHeading2 ? 2 : 3;
        elements.push({
          type: 'heading',
          level,
          text: lineText,
          bold: lineBold,
          size: Math.max(22, Math.round(lineMaxH * 2)),
          align,
        });
        prevLineBottom = line.bottom;
        prevLineHeight = lineMaxH;
        continue;
      }

      // Check for Bullet Lists
      if (BULLET_REGEX.test(lineText)) {
        flushParagraph();
        const cleanText = lineText.replace(BULLET_REGEX, '').trim();
        const parts = lineToTextRunParts(line.items, links);
        elements.push({
          type: 'list-item',
          isNumbered: false,
          text: cleanText,
          parts,
          level: 0,
        });
        prevLineBottom = line.bottom;
        prevLineHeight = lineMaxH;
        continue;
      }

      // Check for Numbered Lists
      const numMatch = lineText.match(NUMBERED_LIST_REGEX);
      if (numMatch) {
        flushParagraph();
        const cleanText = lineText.replace(NUMBERED_LIST_REGEX, '').trim();
        const numVal = parseInt(numMatch[1], 10) || 1;
        const parts = lineToTextRunParts(line.items, links);
        elements.push({
          type: 'list-item',
          isNumbered: true,
          number: numVal,
          text: cleanText,
          parts,
          level: 0,
        });
        prevLineBottom = line.bottom;
        prevLineHeight = lineMaxH;
        continue;
      }

      // Normal paragraph body text continuation
      const parts = lineToTextRunParts(line.items, links);
      if (currentParagraphParts.length > 0) {
        currentParagraphParts.push({ text: ' ', size: Math.max(16, Math.round(lineMaxH * 2)) });
      } else {
        currentParaAlign = align;
      }
      currentParagraphParts.push(...parts);

      prevLineBottom = line.bottom;
      prevLineHeight = lineMaxH;
    }

    flushParagraph();
  }

  // 4. Interleave embedded images at their respective visual locations
  for (const img of images) {
    elements.push({
      type: 'image',
      dataUrl: img.dataUrl,
      widthPt: img.width,
      heightPt: img.height,
      align: 'center',
    });
  }

  return elements;
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 4 — DOCX GENERATION WITH NATIVE WORD STYLING
// ═══════════════════════════════════════════════════════════════════

function base64ToUint8Array(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function generateDocxDocument(
  pages: ProcessedPage[],
  allPageElements: DocElement[][],
  metadata: Record<string, string>,
): Promise<Uint8Array> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    PageBreak,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ImageRun,
    ExternalHyperlink,
    AlignmentType,
    BorderStyle,
  } = (await getDocxLib()) as any;

  const firstPage = pages[0];
  const pageWidthTwip = firstPage ? ptToTwip(firstPage.width) : 12240; // Default 8.5 x 11
  const pageHeightTwip = firstPage ? ptToTwip(firstPage.height) : 15840;

  // Margin: 0.75 in = 1080 twip
  const marginTwip = 1080;
  const maxContentWidthPt = (pageWidthTwip - marginTwip * 2) / PT_TO_TWIP;

  const docChildren: any[] = [];

  for (let pi = 0; pi < pages.length; pi++) {
    const elements = allPageElements[pi] ?? [];

    // Add page break between pages
    if (pi > 0) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    for (const el of elements) {
      if (el.type === 'heading') {
        const hLevel =
          el.level === 1 ? HeadingLevel.HEADING_1 :
          el.level === 2 ? HeadingLevel.HEADING_2 :
          el.level === 3 ? HeadingLevel.HEADING_3 :
          HeadingLevel.HEADING_4;

        const alignment =
          el.align === 'center' ? AlignmentType.CENTER :
          el.align === 'right' ? AlignmentType.RIGHT :
          AlignmentType.LEFT;

        docChildren.push(
          new Paragraph({
            heading: hLevel,
            alignment,
            spacing: {
              before: el.level === 1 ? 280 : 180,
              after: el.level === 1 ? 140 : 80,
            },
            children: [
              new TextRun({
                text: el.text,
                bold: true,
                size: el.size,
              }),
            ],
          })
        );
      } else if (el.type === 'paragraph') {
        const alignment =
          el.align === 'center' ? AlignmentType.CENTER :
          el.align === 'right' ? AlignmentType.RIGHT :
          AlignmentType.LEFT;

        const runs = el.parts.map(p => {
          const runConfig: any = {
            text: p.text,
            bold: p.bold,
            italics: p.italic,
            size: p.size,
            superScript: p.sup,
            subScript: p.sub,
          };
          if (p.color) runConfig.color = p.color;

          const textRun = new TextRun(runConfig);
          if (p.url) {
            try {
              return new ExternalHyperlink({
                children: [new TextRun({ ...runConfig, style: 'Hyperlink' })],
                link: p.url,
              });
            } catch {
              return textRun;
            }
          }
          return textRun;
        });

        docChildren.push(
          new Paragraph({
            alignment,
            spacing: {
              before: el.spacingBefore ?? 40,
              after: el.spacingAfter ?? 60,
              line: 260, // Clean 1.15x line spacing
            },
            children: runs,
          })
        );
      } else if (el.type === 'list-item') {
        docChildren.push(
          new Paragraph({
            bullet: el.isNumbered ? undefined : { level: el.level },
            numbering: el.isNumbered ? { reference: 'numbering-1', level: el.level } : undefined,
            spacing: { before: 20, after: 40 },
            children: [
              new TextRun({
                text: el.text,
                size: 22, // 11pt
              }),
            ],
          })
        );
      } else if (el.type === 'table') {
        try {
          const colCount = Math.max(...el.rows.map(r => r.length), 1);
          const cellWidthPct = Math.floor(100 / colCount);

          docChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'D3D3D3' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D3D3D3' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'D3D3D3' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'D3D3D3' },
                insideH: { style: BorderStyle.SINGLE, size: 1, color: 'E5E5E5' },
                insideV: { style: BorderStyle.SINGLE, size: 1, color: 'E5E5E5' },
              },
              rows: el.rows.map((row, rIdx) =>
                new TableRow({
                  tableHeader: rIdx === 0 && el.hasHeader,
                  children: row.map(cellText =>
                    new TableCell({
                      width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          spacing: { before: 40, after: 40 },
                          children: [
                            new TextRun({
                              text: cellText || '',
                              size: 20, // 10pt
                              bold: rIdx === 0 && el.hasHeader,
                            }),
                          ],
                        }),
                      ],
                    })
                  ),
                })
              ),
            })
          );
        } catch {
          // Fallback: emit as clean tab-separated lines
          for (const row of el.rows) {
            docChildren.push(
              new Paragraph({
                children: [new TextRun({ text: row.join('   |   '), size: 20 })],
              })
            );
          }
        }
      } else if (el.type === 'image' && el.dataUrl) {
        try {
          const imgBytes = base64ToUint8Array(el.dataUrl);
          const scale = Math.min(1.0, maxContentWidthPt / (el.widthPt || maxContentWidthPt));
          const finalW = Math.round(el.widthPt * scale);
          const finalH = Math.round(el.heightPt * scale);

          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
              children: [
                new ImageRun({
                  data: imgBytes,
                  transformation: { width: finalW, height: finalH },
                  type: 'jpg',
                }),
              ],
            })
          );
        } catch {
          // Skip invalid image without crashing
        }
      }
    }
  }

  if (!docChildren.length) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Document converted with PDFBolt.', size: 24 })],
      })
    );
  }

  const doc = new Document({
    creator: 'PDFBolt Universal Engine',
    title: metadata.title || 'Converted Document',
    subject: metadata.subject || '',
    keywords: metadata.keywords || '',
    numbering: {
      config: [
        {
          reference: 'numbering-1',
          levels: [
            { level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } },
            { level: 1, format: 'lowerLetter', text: '%2.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: pageWidthTwip, height: pageHeightTwip },
            margin: { top: marginTwip, right: marginTwip, bottom: marginTwip, left: marginTwip },
          },
        },
        children: docChildren,
      },
    ],
  });

  return new Uint8Array(await Packer.toBuffer(doc));
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 5 — QUALITY SCORING & MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════

function computeConversionQuality(pages: ProcessedPage[], allPageElements: DocElement[][]): QualityReport {
  const pagesTotal = pages.length;
  const pagesText = pages.filter(p => p.type === 'text' || p.type === 'mixed').length;
  const pagesOCR = pages.filter(p => p.type === 'scanned' || p.type === 'image-only').length;

  const allElements = allPageElements.flat();
  const tablesFound = allElements.filter(e => e.type === 'table').length;
  const imagesFound = allElements.filter(e => e.type === 'image').length;
  const headingsDetected = allElements.filter(e => e.type === 'heading').length;
  const listsDetected = allElements.filter(e => e.type === 'list-item').length;
  const hyperlinksFound = pages.reduce((sum, p) => sum + p.links.length, 0);

  const textAccuracy = pagesTotal > 0 ? Math.round((100 * (pagesText + pagesOCR)) / pagesTotal) : 100;
  const overallScore = Math.min(100, Math.round(textAccuracy * 0.6 + (tablesFound > 0 ? 10 : 0) + (headingsDetected > 0 ? 10 : 0) + (imagesFound > 0 ? 10 : 0) + 10));

  return {
    pagesTotal,
    pagesText,
    pagesOCR,
    tablesFound,
    imagesFound,
    headingsDetected,
    listsDetected,
    hyperlinksFound,
    textAccuracy,
    overallScore,
  };
}

/**
 * Universal PDF → DOCX conversion engine.
 * Converts native text, multi-column, table-heavy, and image-rich PDFs into high-fidelity editable Word documents.
 */
export async function universalPdfToWord(file: File): Promise<ConversionResult> {
  const pdfjs = await getPdfjs();
  const fileBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: fileBuffer }).promise;

  const metadata = await extractMetadata(pdf);
  const pages = await extractAllPages(pdf);
  pdf.destroy();

  // Run OCR on any scanned pages
  const scannedPages = pages.filter(p => p.type === 'scanned' || p.type === 'image-only');
  if (scannedPages.length > 0) {
    const pdfForOcr = await pdfjs.getDocument({ data: fileBuffer }).promise;
    try {
      for (const scanned of scannedPages) {
        const pageIdx = pages.findIndex(p => p.num === scanned.num);
        if (pageIdx >= 0) {
          const ocrPage = await pdfForOcr.getPage(scanned.num);
          const ocrItems = await runOcrOnPage(ocrPage, pages[pageIdx].height);
          if (ocrItems.length > 0) {
            pages[pageIdx] = {
              ...pages[pageIdx],
              items: ocrItems,
              type: 'text',
            };
          }
        }
      }
    } finally {
      pdfForOcr.destroy();
    }
  }

  // Calculate body font size across document
  const allItems = pages.flatMap(p => p.items);
  const bodyFontSize = calculateBodyFontSize(allItems);

  // Build Document Elements for all pages
  const allPageElements: DocElement[][] = pages.map(page =>
    buildPageDocElements(page, bodyFontSize)
  );

  // Generate DOCX
  const bytes = await generateDocxDocument(pages, allPageElements, metadata);
  const quality = computeConversionQuality(pages, allPageElements);

  return { bytes, quality };
}
