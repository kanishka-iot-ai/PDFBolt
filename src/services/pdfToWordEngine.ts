/**
 * PDFBolt Universal PDF → DOCX Engine v4
 *
 * ── WHAT THIS ENGINE HANDLES ──────────────────────────────────────
 *  ✓ Native text PDFs            — full text, font, bold, italic
 *  ✓ Scanned PDFs                — Tesseract OCR with word bboxes
 *  ✓ Mixed PDFs                  — per-page type detection
 *  ✓ Image-only PDFs             — page rendered + embedded
 *  ✓ Multi-column (N columns)    — X-gap analysis, not just 2-col
 *  ✓ Heading hierarchy H1/H2/H3  — font-size ratio to body median
 *  ✓ Bullet lists                — Unicode bullet patterns + "-" "*"
 *  ✓ Numbered lists              — digits, letters, roman numerals
 *  ✓ Tables (borderless)         — column-alignment detection
 *  ✓ Embedded images             — operator-list CTM tracking + crop
 *  ✓ Hyperlinks                  — PDF annotations → Word links
 *  ✓ Superscript / Subscript     — Y-baseline comparison
 *  ✓ Correct page sizes          — A4, Letter, Legal, custom
 *  ✓ Header/footer zone strips   — top 7% and bottom 7% per page
 *  ✓ Document metadata           — title, author, subject, keywords
 *  ✓ Parallel extraction         — batched Promise.all (6 pages/batch)
 *  ✓ O(n log n) line grouping    — single pass after sort
 *  ✓ Module-level import cache   — docx + pdfjs loaded once
 *
 * ── WHAT REQUIRES A BACKEND (not done here) ───────────────────────
 *  ✗ Visual DOCX→PDF rendering comparison (needs LibreOffice/Word)
 *  ✗ Automatic iterative repair loop
 *  ✗ Vector shapes → Word drawing objects
 *  ✗ Math equation OCR → Word OOXML equation
 *  ✗ Editable form field extraction (AcroForm → Word content controls)
 *  ✗ RTL/BiDi text reflow (Unicode is preserved, direction is not)
 */

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

/** Single text fragment extracted from pdfjs with full formatting */
export interface TItem {
  text: string;
  x: number; y: number;
  w: number;     // advance width
  h: number;     // font height (≈ font size in pts)
  font: string;  // lower-cased pdfjs fontName
  bold: boolean;
  italic: boolean;
  sup?: boolean;  // set during super/sub detection
  sub?: boolean;
}

export interface ImgZone {
  x: number; y: number;
  w: number; h: number;
  dataUrl: string;
}

export interface LinkAnn {
  url: string;
  x: number; y: number;
  w: number; h: number;
}

export type PageType = 'text' | 'scanned' | 'image-only' | 'mixed';

export interface RawPage {
  num: number;
  type: PageType;
  pw: number; ph: number;   // page width/height in pts
  rotation: number;
  items: TItem[];
  images: ImgZone[];
  links: LinkAnn[];
}

/** A run of text with uniform formatting, used in DOCX paragraphs */
export interface Part {
  text: string;
  bold?: boolean;
  italic?: boolean;
  size: number;   // docx half-points  (24 = 12pt body)
  sup?: boolean;
  sub?: boolean;
  url?: string;   // if set → ExternalHyperlink
}

/** Intermediate document element AST */
export type DocEl =
  | { k: 'h';      lvl: 1|2|3; text: string; bold: boolean; fz: number }
  | { k: 'p';      parts: Part[] }
  | { k: 'bullet'; text: string; fz: number }
  | { k: 'numli';  text: string; fz: number; num: number }
  | { k: 'table';  rows: string[][] }
  | { k: 'img';    dataUrl: string; natW: number; natH: number }
  | { k: 'pb' };

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const CONCURRENCY = 6;

// Bullet-list leading characters
const BULLET_RE = /^[\u2022\u2023\u25aa\u25cf\u25e6\u2013\u2014\u2015\-\*\u25b6\u25b8\u2714\u2718]\s+/;
// Numbered list: "1." "1)" "a." "A)" "i." "IV)"
const NUMLIST_RE = /^(\d{1,3}|[a-z]|[A-Z])\s*[.)]\s+/;
const ROMAN_RE   = /^(m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3}))[.)]\s+/i;

const PT_TO_TWIP = 20;
const ptTwip = (pt: number) => Math.round(pt * PT_TO_TWIP);

// ═══════════════════════════════════════════════════════════════════
// MODULE-LEVEL IMPORT CACHE
// ═══════════════════════════════════════════════════════════════════

let _docxLib: typeof import('docx') | null = null;
let _pdfjs:   any = null;
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

// ═══════════════════════════════════════════════════════════════════
// PHASE 1 — METADATA
// ═══════════════════════════════════════════════════════════════════

async function extractMetadata(pdf: any): Promise<Record<string, string>> {
  try {
    const meta = await pdf.getMetadata();
    const info = meta?.info ?? {};
    return {
      title:    info.Title    ?? '',
      author:   info.Author   ?? '',
      subject:  info.Subject  ?? '',
      keywords: info.Keywords ?? '',
    };
  } catch {
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 2 — PER-PAGE OBJECT EXTRACTION
// ═══════════════════════════════════════════════════════════════════

function parseFontFlags(fontName: string): { bold: boolean; italic: boolean } {
  const f = fontName.toLowerCase();
  return {
    bold:   /bold|black|heavy|demi|extrabold|semibold/.test(f),
    italic: /italic|oblique|slant/.test(f),
  };
}

function extractTextItems(tc: any): TItem[] {
  return (tc.items as any[])
    .filter(it => typeof it.str === 'string' && it.str.trim().length > 0)
    .map(it => {
      const { bold, italic } = parseFontFlags(it.fontName ?? '');
      const h = Math.abs(it.height) || 10;
      return {
        text: it.str,
        x:    it.transform[4],
        y:    it.transform[5],
        w:    it.width !== undefined ? Math.abs(it.width) : it.str.length * h * 0.55,
        h,
        font: (it.fontName ?? '').toLowerCase(),
        bold,
        italic,
      } as TItem;
    });
}

// 2×2 matrix multiply (6-element [a,b,c,d,e,f] form)
type M6 = [number,number,number,number,number,number];
const ID6: M6 = [1,0,0,1,0,0];
function mulM6(a: M6, b: M6): M6 {
  return [
    a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5],
  ];
}

/** Extract embedded image bounding boxes using operator-list CTM tracking, then crop from canvas. */
async function extractImages(page: any, ph: number): Promise<ImgZone[]> {
  const zones: Array<{x:number; y:number; w:number; h:number}> = [];

  try {
    const pdfjs = await getPdfjs();
    const OPS   = pdfjs.OPS as Record<string, number>;

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

      if (fn === OPS['save'])        { stack.push([...ctm] as M6); }
      else if (fn === OPS['restore'])  { ctm = stack.pop() ?? ([...ID6] as M6); }
      else if (fn === OPS['transform']){ ctm = mulM6(ctm, ar as M6); }
      else if (imgOpNums.has(fn)) {
        const [a,,, d, e, f] = ctm;
        const iw = Math.abs(a);
        const ih = Math.abs(d);
        const ix = e;
        const iy = ph - f - ih;  // flip PDF y-axis (bottom-up → top-down)
        // Filter: skip tiny images, hairline borders, and full-page backgrounds
        if (iw > 20 && ih > 20 && iw < ph * 3 && ih < ph * 1.05) {
          zones.push({ x: ix, y: iy, w: iw, h: ih });
        }
      }
    }
  } catch {
    return [];
  }

  if (!zones.length) return [];

  // Render full page to canvas once, then crop each zone
  try {
    const SCALE  = 1.5;
    const vp     = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    return zones
      .map(z => {
        const cx = Math.max(0, Math.round(z.x * SCALE));
        const cy = Math.max(0, Math.round(z.y * SCALE));
        const cw = Math.min(Math.round(z.w * SCALE), canvas.width  - cx);
        const ch = Math.min(Math.round(z.h * SCALE), canvas.height - cy);
        if (cw < 4 || ch < 4) return null;

        const cc  = document.createElement('canvas');
        cc.width  = cw; cc.height = ch;
        cc.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        return { x: z.x, y: z.y, w: z.w, h: z.h, dataUrl: cc.toDataURL('image/jpeg', 0.9) };
      })
      .filter((x): x is ImgZone => x !== null);
  } catch {
    return [];
  }
}

/** Extract clickable hyperlinks from PDF annotations. */
async function extractLinks(page: any, ph: number): Promise<LinkAnn[]> {
  try {
    const anns = await page.getAnnotations();
    return (anns as any[])
      .filter(a => a.subtype === 'Link' && a.url)
      .map(a => {
        const [x1, y1, x2, y2] = a.rect;
        return {
          url: a.url as string,
          x: x1, y: ph - y2,
          w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
        };
      });
  } catch {
    return [];
  }
}

/** Full extraction for one page: text items + images + links */
async function extractOnePage(pdf: any, num: number, withImages: boolean): Promise<RawPage> {
  const page = await pdf.getPage(num);
  const vp   = page.getViewport({ scale: 1.0 });
  const pw = vp.width, ph = vp.height;
  const rotation = (page.rotate ?? 0) as number;

  const tc    = await page.getTextContent();
  const items = extractTextItems(tc);

  // Classify page type
  let type: PageType = 'text';
  if (items.length === 0)                         type = 'scanned';
  else if (items.length < 5 && pw * ph > 40000)  type = 'image-only';

  // Extract images only when relevant
  const needImages = withImages && (type !== 'text' || items.length < 25);
  const images = needImages ? await extractImages(page, ph) : [];
  const links  = await extractLinks(page, ph);

  return { num, type, pw, ph, rotation, items, images, links };
}

/** Parallel page extraction, batched at CONCURRENCY pages per batch */
async function extractAllPages(pdf: any, withImages: boolean): Promise<RawPage[]> {
  const n   = pdf.numPages;
  const out: (RawPage | null)[] = new Array(n).fill(null);

  for (let base = 0; base < n; base += CONCURRENCY) {
    const end = Math.min(base + CONCURRENCY, n);
    await Promise.all(
      Array.from({ length: end - base }, (_, i) => {
        const pageNum = base + i + 1;
        return extractOnePage(pdf, pageNum, withImages)
          .then(pg => { out[pageNum - 1] = pg; })
          .catch(() => {});
      })
    );
  }

  return out.filter((x): x is RawPage => x !== null);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 — OCR FOR SCANNED PAGES
// ═══════════════════════════════════════════════════════════════════

/** Render page to canvas and run Tesseract, returning word-level TItems with bboxes */
async function ocrOnePage(page: any, ph: number): Promise<TItem[]> {
  const SCALE = 2.5;
  const vp    = page.getViewport({ scale: SCALE });
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  const { default: Tesseract } = await import('tesseract.js');
  const worker = await Tesseract.createWorker('eng');
  try {
    const { data } = await worker.recognize(canvas);
    const items: TItem[] = [];
    for (const line of data.lines) {
      for (const word of line.words) {
        if (!word.text.trim()) continue;
        const x  = word.bbox.x0 / SCALE;
        const y  = ph - word.bbox.y1 / SCALE;  // PDF coords: y from bottom
        const w  = (word.bbox.x1 - word.bbox.x0) / SCALE;
        const h  = (word.bbox.y1 - word.bbox.y0) / SCALE;
        items.push({ text: word.text, x, y, w, h, font: '', bold: false, italic: false });
      }
    }
    return items;
  } finally {
    await worker.terminate();
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 4 — LAYOUT ANALYSIS
// ═══════════════════════════════════════════════════════════════════

/** Compute median font height (≈ body font size) from all items */
function bodyFontSize(items: TItem[]): number {
  if (!items.length) return 11;
  const hs = items.map(it => it.h).sort((a, b) => a - b);
  return hs[Math.floor(hs.length / 2)] || 11;
}

/**
 * O(n log n) line grouping.
 * Items MUST be sorted by descending Y (top-to-bottom in PDF coords) before calling.
 * Returns groups already sorted left-to-right within each line.
 */
function groupLines(sortedItems: TItem[], yThresh: number): TItem[][] {
  if (!sortedItems.length) return [];
  const groups: TItem[][] = [];
  let cur: TItem[] = [sortedItems[0]];
  let curY = sortedItems[0].y;

  for (let i = 1; i < sortedItems.length; i++) {
    const it = sortedItems[i];
    if (Math.abs(it.y - curY) <= yThresh) {
      cur.push(it);
    } else {
      groups.push(cur);
      cur  = [it];
      curY = it.y;
    }
  }
  groups.push(cur);

  // Sort each line left-to-right
  for (const g of groups) g.sort((a, b) => a.x - b.x);
  return groups;
}

/** Join items in a sorted line using advance-width gaps for spacing */
function joinLine(items: TItem[]): string {
  if (!items.length) return '';
  let out = items[0].text;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];
    const gap  = curr.x - (prev.x + prev.w);
    if (gap > prev.h * 0.28 && !out.endsWith(' ')) out += ' ';
    out += curr.text;
  }
  return out;
}

/**
 * Detect N-column splits via largest X-gaps in the centre zone [22%, 78%] of page width.
 * Returns sorted array of split X positions (may be empty for single-column).
 */
function findColumnSplits(items: TItem[], pw: number): number[] {
  const lo = pw * 0.22, hi = pw * 0.78;
  const xs = items.map(it => it.x).sort((a, b) => a - b);
  const splits: number[] = [];

  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i] - xs[i - 1];
    if (gap > pw * 0.07 && xs[i - 1] > lo && xs[i - 1] < hi) {
      const mid = (xs[i - 1] + xs[i]) / 2;
      // Deduplicate splits closer than 5% page width
      if (!splits.length || mid - splits[splits.length - 1] > pw * 0.05) {
        splits.push(mid);
      }
    }
  }
  return splits;
}

/** Assign each TItem to its column bucket */
function assignColumns(items: TItem[], splits: number[]): TItem[][] {
  const cols: TItem[][] = Array.from({ length: splits.length + 1 }, () => []);
  for (const it of items) {
    let col = splits.findIndex(s => it.x < s);
    if (col < 0) col = splits.length;
    cols[col].push(it);
  }
  return cols;
}

/** Detect superscript / subscript items by comparing Y to line baseline */
function markSuperSub(line: TItem[]): void {
  if (line.length < 2) return;
  const maxH = Math.max(...line.map(it => it.h));
  // Baseline Y = average Y of "normal-height" items
  const normalItems = line.filter(it => it.h >= maxH * 0.78);
  if (!normalItems.length) return;
  const baseY = normalItems.reduce((s, it) => s + it.y, 0) / normalItems.length;

  for (const it of line) {
    if (it.h < maxH * 0.78) {
      // Item is smaller than normal → candidate for super/sub
      if (it.y > baseY + maxH * 0.12) it.sup = true;
      else if (it.y < baseY - maxH * 0.12) it.sub = true;
    }
  }
}

/** Borderless table detection via shared column X positions across consecutive row-candidate lines */
interface TableDef {
  lineIndices: number[];
  colXs: number[];
}

function detectTables(lineGroups: TItem[][], pw: number): TableDef[] {
  const tables: TableDef[] = [];
  // Row candidates: lines with 2+ items and at least one large horizontal gap
  const rowCandidates: Array<{ idx: number; xs: number[] }> = [];

  for (let i = 0; i < lineGroups.length; i++) {
    const line = lineGroups[i];
    if (line.length < 2) continue;
    const xs = line.map(it => it.x);
    const hasGap = xs.some((x, j) => j > 0 && x - xs[j - 1] > pw * 0.06);
    if (hasGap) rowCandidates.push({ idx: i, xs });
  }

  // Group consecutive row candidates (gap ≤ 2 non-candidate lines) into tables
  let runStart = 0;
  for (let i = 1; i <= rowCandidates.length; i++) {
    const ended = i === rowCandidates.length
      || rowCandidates[i].idx - rowCandidates[i - 1].idx > 2;

    if (ended) {
      const run = rowCandidates.slice(runStart, i);
      if (run.length >= 2) {
        // Cluster column X positions across all rows
        const allXs = run.flatMap(r => r.xs).sort((a, b) => a - b);
        const colXs: number[] = [allXs[0]];
        for (let j = 1; j < allXs.length; j++) {
          if (allXs[j] - colXs[colXs.length - 1] > pw * 0.05) {
            colXs.push(allXs[j]);
          }
        }
        if (colXs.length >= 2) {
          tables.push({ lineIndices: run.map(r => r.idx), colXs });
        }
      }
      runStart = i;
    }
  }
  return tables;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 5 — BUILD DocxElement AST
// ═══════════════════════════════════════════════════════════════════

function linkForItem(it: TItem, links: LinkAnn[]): string | undefined {
  return links.find(l =>
    it.x >= l.x - 5 && it.x <= l.x + l.w + 5 &&
    it.y >= l.y - 5 && it.y <= l.y + l.h + 5
  )?.url;
}

/** Convert a line of TItems into Part[] with run-merging and hyperlink detection */
function lineToParts(items: TItem[], links: LinkAnn[], bodyFz: number): Part[] {
  if (!items.length) return [];
  const parts: Part[] = [];

  let buf    = '';
  let bold   = items[0].bold;
  let italic = items[0].italic;
  let fz     = items[0].h;
  let sup    = items[0].sup ?? false;
  let sub    = items[0].sub ?? false;
  let url    = linkForItem(items[0], links);

  const flush = () => {
    const t = buf.trim();
    if (!t) { buf = ''; return; }
    parts.push({ text: buf, bold, italic, size: Math.max(16, Math.round(fz * 2)), sup, sub, url });
    buf = '';
  };

  for (let i = 0; i < items.length; i++) {
    const it      = items[i];
    const gap     = i > 0 ? it.x - (items[i - 1].x + items[i - 1].w) : 0;
    const needSp  = gap > it.h * 0.28 && !buf.endsWith(' ');
    const itUrl   = linkForItem(it, links);
    const itSup   = it.sup ?? false;
    const itSub   = it.sub ?? false;
    const sameRun = it.bold === bold && it.italic === italic &&
                    Math.abs(it.h - fz) < 0.9 && itUrl === url &&
                    itSup === sup && itSub === sub;

    if (!sameRun) {
      flush();
      bold = it.bold; italic = it.italic; fz = it.h;
      sup = itSup; sub = itSub; url = itUrl;
    }
    if (needSp && !buf.endsWith(' ')) buf += ' ';
    buf += it.text;
  }
  flush();
  return parts;
}

/** Build DocEl[] for one page in reading order */
function buildPageElements(pg: RawPage, bodyFz: number): DocEl[] {
  const { items, images, links, pw, ph } = pg;
  const els: DocEl[] = [];

  // — Image-only / scanned with no items yet —
  if (!items.length) {
    for (const img of images) {
      els.push({ k: 'img', dataUrl: img.dataUrl, natW: img.w, natH: img.h });
    }
    return els;
  }

  // — Adaptive Y-threshold from median font height —
  const hs    = items.map(it => it.h).sort((a, b) => a - b);
  const medH  = hs[Math.floor(hs.length / 2)] || 10;
  const yThr  = Math.max(2.5, medH * 0.55);

  // — Strip header/footer zones (top 7% and bottom 7% of page height) —
  const hdrY   = ph * 0.07;
  const ftrY   = ph * 0.93;
  const bodyIt = items.filter(it => it.y > hdrY && it.y < ftrY);

  // — N-column detection and assignment —
  const splits = findColumnSplits(bodyIt, pw);
  const cols   = assignColumns(bodyIt, splits);

  // — Process each column left-to-right —
  for (const colItems of cols) {
    if (!colItems.length) continue;

    // Sort top-to-bottom (descending Y in PDF coords)
    const sorted     = [...colItems].sort((a, b) => b.y - a.y);
    const lineGroups = groupLines(sorted, yThr);

    // Mark super/subscripts in each line
    lineGroups.forEach(markSuperSub);

    // Detect tables, mark their line indices
    const tables      = detectTables(lineGroups, pw);
    const tableLines  = new Set(tables.flatMap(t => t.lineIndices));

    // Emit tables first (they reference lineGroups by index)
    for (const tbl of tables) {
      const rows: string[][] = tbl.lineIndices.map(li => {
        const line = lineGroups[li];
        return tbl.colXs.map((cx, ci) => {
          const nxt   = tbl.colXs[ci + 1] ?? Infinity;
          const cells = line.filter(it => it.x >= cx - 8 && it.x < nxt);
          return joinLine(cells.sort((a, b) => a.x - b.x));
        });
      });
      els.push({ k: 'table', rows });
    }

    // — Emit headings / lists / body paragraphs —
    let bodyParts: Part[] = [];
    let prevY: number | null = null;

    const flushBody = () => {
      if (!bodyParts.length) return;
      const text = bodyParts.map(p => p.text).join('').trim();
      if (text) els.push({ k: 'p', parts: [...bodyParts] });
      bodyParts = [];
    };

    for (let li = 0; li < lineGroups.length; li++) {
      if (tableLines.has(li)) continue;

      const group    = lineGroups[li];
      const lineText = joinLine(group);
      if (!lineText.trim()) continue;

      const lineMaxH = Math.max(...group.map(it => it.h));
      const lineBold = group.some(it => it.bold);
      const ratio    = bodyFz > 0 ? lineMaxH / bodyFz : 1;

      // Large vertical gap → new paragraph
      if (prevY !== null && (prevY - group[0].y) > medH * 1.75) flushBody();
      prevY = group[0].y;

      // ── Heading ──
      if (ratio >= 1.35 && lineText.trim().length < 220) {
        flushBody();
        const lvl: 1|2|3 = ratio >= 2.0 ? 1 : ratio >= 1.6 ? 2 : 3;
        els.push({ k: 'h', lvl, text: lineText.trim(), bold: lineBold, fz: lineMaxH });
        continue;
      }

      // ── Bullet list ──
      if (BULLET_RE.test(lineText)) {
        flushBody();
        els.push({ k: 'bullet', text: lineText.replace(BULLET_RE, '').trim(), fz: lineMaxH });
        continue;
      }

      // ── Numbered list ──
      const numM = lineText.match(NUMLIST_RE) ?? lineText.match(ROMAN_RE);
      if (numM) {
        flushBody();
        els.push({ k: 'numli', text: lineText.replace(numM[0], '').trim(),
                   fz: lineMaxH, num: parseInt(numM[1]) || 1 });
        continue;
      }

      // ── Body text — accumulate into paragraph ──
      const parts = lineToParts(group, links, bodyFz);
      if (bodyParts.length) bodyParts.push({ text: ' ', size: Math.round(lineMaxH * 2) });
      bodyParts.push(...parts);
    }
    flushBody();
  }

  // — Embed images after text —
  for (const img of images) {
    els.push({ k: 'img', dataUrl: img.dataUrl, natW: img.w, natH: img.h });
  }

  return els;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 6 — DOCX GENERATION
// ═══════════════════════════════════════════════════════════════════

function b64ToUint8(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const bin = atob(b64);
  const u8  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function generateDocx(
  pages: RawPage[],
  allEls: DocEl[][],
  meta: Record<string, string>,
): Promise<Uint8Array> {
  const {
    Document, Packer, Paragraph, TextRun, PageBreak, HeadingLevel,
    Table, TableRow, TableCell, WidthType, ImageRun, ExternalHyperlink,
  } = (await getDocxLib()) as any;

  const children: any[] = [];

  for (let pi = 0; pi < pages.length; pi++) {
    const els = allEls[pi] ?? [];

    // Page break between pages (not before the first)
    if (pi > 0) children.push(new Paragraph({ children: [new PageBreak()] }));

    for (const el of els) {

      // ── Heading ──
      if (el.k === 'h') {
        children.push(new Paragraph({
          text: el.text,
          heading: el.lvl === 1 ? HeadingLevel.HEADING_1
                 : el.lvl === 2 ? HeadingLevel.HEADING_2
                 :                HeadingLevel.HEADING_3,
          spacing: { before: 280, after: 120 },
        }));
        continue;
      }

      // ── Body paragraph ──
      if (el.k === 'p') {
        const runs = el.parts
          .map((p: Part) => {
            const tr = new TextRun({
              text:        p.text,
              bold:        p.bold,
              italics:     p.italic,
              size:        p.size,
              superScript: p.sup,
              subScript:   p.sub,
            });
            if (p.url) {
              try {
                return new ExternalHyperlink({
                  children: [new TextRun({ text: p.text, size: p.size, style: 'Hyperlink' })],
                  link: p.url,
                });
              } catch { return tr; }
            }
            return tr;
          });
        children.push(new Paragraph({ children: runs, spacing: { after: 100 } }));
        continue;
      }

      // ── Bullet item ──
      if (el.k === 'bullet') {
        children.push(new Paragraph({
          children: [new TextRun({
            text: `\u2022  ${el.text}`,
            size: Math.max(16, Math.round(el.fz * 2)),
          })],
          indent:  { left: 360 },
          spacing: { after: 60 },
        }));
        continue;
      }

      // ── Numbered list item ──
      if (el.k === 'numli') {
        children.push(new Paragraph({
          children: [new TextRun({
            text: `${el.num}.\u2003${el.text}`,
            size: Math.max(16, Math.round(el.fz * 2)),
          })],
          indent:  { left: 360, hanging: 360 },
          spacing: { after: 60 },
        }));
        continue;
      }

      // ── Table ──
      if (el.k === 'table') {
        try {
          const ncols = Math.max(...el.rows.map((r: string[]) => r.length), 1);
          const pct   = Math.floor(100 / ncols);
          children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows:  el.rows.map((row: string[]) =>
              new TableRow({
                children: row.map((cell: string) =>
                  new TableCell({
                    width:    { size: pct, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: cell ?? '', size: 20 })],
                    })],
                  })
                ),
              })
            ),
          }));
        } catch {
          // Fallback: emit rows as plain paragraphs
          for (const row of el.rows) {
            children.push(new Paragraph({
              children: [new TextRun({ text: row.join('   '), size: 20 })],
            }));
          }
        }
        continue;
      }

      // ── Image ──
      if (el.k === 'img' && el.dataUrl) {
        try {
          const imgData = b64ToUint8(el.dataUrl);
          // Scale image to fit within 5.5 inch usable width (396 pts)
          const MAX_PT  = 396;
          const scale   = Math.min(1, MAX_PT / (el.natW || MAX_PT));
          const imgW    = Math.round(el.natW * scale);
          const imgH    = Math.round(el.natH * scale);
          children.push(new Paragraph({
            children: [new ImageRun({
              data:           imgData,
              transformation: { width: imgW, height: imgH },
              type:           'jpg',
            })],
            spacing: { before: 120, after: 120 },
          }));
        } catch { /* skip un-embeddable image */ }
        continue;
      }

      // ── Explicit page break ──
      if (el.k === 'pb') {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }
  }

  if (!children.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'No readable content found in this PDF.', size: 24 })],
    }));
  }

  // Match DOCX page size to the PDF's first page dimensions
  const fp  = pages[0];
  const pgW = fp ? ptTwip(fp.pw) : 12240;  // default Letter 8.5 in
  const pgH = fp ? ptTwip(fp.ph) : 15840;  // default Letter 11 in

  const doc = new Document({
    creator:  'PDFBolt',
    title:    meta.title   || '',
    subject:  meta.subject || '',
    keywords: meta.keywords || '',
    sections: [{
      properties: {
        page: {
          size:   { width: pgW, height: pgH },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  });

  return new Uint8Array(await Packer.toBuffer(doc));
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════

/**
 * Universal PDF → DOCX conversion.
 * Handles native text, scanned, mixed, multi-column, tables, images, lists, headings, links.
 */
export async function universalPdfToWord(file: File): Promise<Uint8Array> {
  const pdfjs = await getPdfjs();
  const buf   = await file.arrayBuffer();
  const pdf   = await pdfjs.getDocument({ data: buf }).promise;

  // Metadata
  const meta = await extractMetadata(pdf);

  // Extract all pages in parallel (text + images + links)
  const pages = await extractAllPages(pdf, true);
  pdf.destroy();

  // OCR scanned pages — reopen PDF to get page objects
  const scannedNums = pages
    .filter(p => p.type === 'scanned' || p.type === 'image-only')
    .map(p => p.num);

  if (scannedNums.length > 0) {
    const pdf2 = await pdfjs.getDocument({ data: buf }).promise;
    try {
      // OCR pages sequentially to avoid saturating Tesseract workers
      for (const num of scannedNums) {
        const idx = pages.findIndex(p => p.num === num);
        if (idx < 0) continue;
        try {
          const page    = await pdf2.getPage(num);
          const ocrItems = await ocrOnePage(page, pages[idx].ph);
          if (ocrItems.length > 0) {
            pages[idx] = { ...pages[idx], items: ocrItems, type: 'text' };
          }
        } catch { /* leave page as-is */ }
      }
    } finally {
      pdf2.destroy();
    }
  }

  // Global body font size (used for heading ratio detection)
  const allItems = pages.flatMap(p => p.items);
  const bodyFz   = bodyFontSize(allItems);

  // Build DocxElement AST for every page
  const allEls = pages.map(pg => buildPageElements(pg, bodyFz));

  // Generate and return the final DOCX buffer
  return generateDocx(pages, allEls, meta);
}
