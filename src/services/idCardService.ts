import { PDFDocument } from 'pdf-lib';

/**
 * ISO/IEC 7810 ID-1 Standard Dimensions:
 * 85.60 mm x 53.98 mm (Aspect Ratio: ~1.5858)
 */
export const ID_CARD_ISO = {
  WIDTH_MM: 85.60,
  HEIGHT_MM: 53.98,
  ASPECT_RATIO: 85.60 / 53.98,
};

export const A4_DIMENSIONS = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  // 300 DPI Canvas coordinates for ultra-sharp print & QR readability
  CANVAS_WIDTH_300DPI: 2480,
  CANVAS_HEIGHT_300DPI: 3508,
  // PDF-lib standard points (72 DPI)
  POINTS_WIDTH: 595.28,
  POINTS_HEIGHT: 841.89,
};

export type IDCardLayoutMode = 'actual_1to1' | 'kyc_zoom' | 'side_by_side';

export interface IDCardWatermarkOptions {
  enabled: boolean;
  text: string;
  color?: string; // e.g. 'rgba(220, 38, 38, 0.22)' or 'rgba(30, 41, 59, 0.20)'
  fontSize?: number;
  angleDeg?: number;
}

export interface IDCardCompositeOptions {
  frontImage: File | Blob | string;
  backImage?: File | Blob | string | null;
  layoutMode: IDCardLayoutMode;
  showCuttingGuide?: boolean;
  watermark?: IDCardWatermarkOptions;
  backgroundColor?: string;
}

/**
 * Helper to load an image source into an HTMLImageElement
 */
function loadImage(src: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);

    img.onload = () => {
      if (typeof src !== 'string') {
        URL.revokeObjectURL(url);
      }
      resolve(img);
    };
    img.onerror = (err) => {
      if (typeof src !== 'string') {
        URL.revokeObjectURL(url);
      }
      reject(new Error('Failed to load card image for compositing: ' + String(err)));
    };
    img.src = url;
  });
}

/**
 * Render an anti-theft diagonal security watermark lattice across canvas
 */
export function drawSecurityWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: IDCardWatermarkOptions
) {
  if (!options.enabled || !options.text.trim()) return;

  ctx.save();
  ctx.font = `bold ${options.fontSize || 42}px 'Inter', sans-serif, -apple-system`;
  ctx.fillStyle = options.color || 'rgba(220, 38, 38, 0.22)'; // Security Red with calibrated OCR transparency
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const angleRad = ((options.angleDeg ?? -35) * Math.PI) / 180;
  ctx.rotate(angleRad);

  const text = options.text.toUpperCase();
  const stepX = 520;
  const stepY = 160;

  // Staggered lattice covering the bounding box of rotated A4 canvas
  const diag = Math.sqrt(width * width + height * height) * 1.6;
  const startX = -diag;
  const endX = diag;
  const startY = -diag;
  const endY = diag;

  let row = 0;
  for (let y = startY; y < endY; y += stepY) {
    const shift = (row % 2) * (stepX / 2);
    for (let x = startX + shift; x < endX; x += stepX) {
      ctx.fillText(text, x, y);
    }
    row++;
  }

  ctx.restore();
}

/**
 * Composites front and back ID cards onto a 300 DPI A4 Canvas
 */
export async function compositeIDCardsToCanvas(
  options: IDCardCompositeOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = A4_DIMENSIONS.CANVAS_WIDTH_300DPI;
  canvas.height = A4_DIMENSIONS.CANVAS_HEIGHT_300DPI;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not acquire 2D canvas context');

  // 1. Draw Crisp White A4 Paper Background
  ctx.fillStyle = options.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const frontImg = await loadImage(options.frontImage);
  const backImg = options.backImage ? await loadImage(options.backImage) : null;

  // Compute millimeter to canvas pixel ratio at 300 DPI
  // 210mm = 2480px -> ~11.8095 px/mm
  const pxPerMm = canvas.width / A4_DIMENSIONS.WIDTH_MM;

  let cardW = 0;
  let cardH = 0;
  let frontX = 0;
  let frontY = 0;
  let backX = 0;
  let backY = 0;

  if (options.layoutMode === 'actual_1to1') {
    // 1:1 Physical Credit Card Size: 85.6mm x 53.98mm
    cardW = Math.round(ID_CARD_ISO.WIDTH_MM * pxPerMm); // ~1011 px
    cardH = Math.round(ID_CARD_ISO.HEIGHT_MM * pxPerMm); // ~638 px

    // Centered horizontally
    frontX = Math.round((canvas.width - cardW) / 2);
    backX = frontX;

    // Centered in top half and bottom half of A4 sheet
    frontY = Math.round(55 * pxPerMm); // 55mm from top edge
    backY = Math.round(152 * pxPerMm); // 152mm from top edge (~33mm gap)
  } else if (options.layoutMode === 'kyc_zoom') {
    // KYC Zoom: Scaled to 135mm x 85.1mm (~1.58x) for maximum OCR & bank clerk readability
    const zoomMmW = 135;
    cardW = Math.round(zoomMmW * pxPerMm); // ~1594 px
    cardH = Math.round((zoomMmW / ID_CARD_ISO.ASPECT_RATIO) * pxPerMm); // ~1005 px

    frontX = Math.round((canvas.width - cardW) / 2);
    backX = frontX;

    frontY = Math.round(35 * pxPerMm);
    backY = Math.round(155 * pxPerMm);
  } else {
    // Side by side landscape on upper sheet
    const sbsMmW = 95;
    cardW = Math.round(sbsMmW * pxPerMm);
    cardH = Math.round((sbsMmW / ID_CARD_ISO.ASPECT_RATIO) * pxPerMm);

    const gap = Math.round(15 * pxPerMm);
    const totalW = cardW * 2 + gap;
    frontX = Math.round((canvas.width - totalW) / 2);
    backX = frontX + cardW + gap;

    frontY = Math.round(60 * pxPerMm);
    backY = frontY;
  }

  // Draw Front Card
  drawCardOnCanvas(ctx, frontImg, frontX, frontY, cardW, cardH, options.showCuttingGuide);

  // Draw Back Card (if provided) or Placeholder Box
  if (backImg) {
    drawCardOnCanvas(ctx, backImg, backX, backY, cardW, cardH, options.showCuttingGuide);
  }

  // Draw Central Folding/Divider Guideline if 1:1 mode and requested
  if (options.showCuttingGuide && options.layoutMode === 'actual_1to1') {
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    const dividerY = Math.round(148.5 * pxPerMm); // exact center of A4 (297mm / 2)
    ctx.beginPath();
    ctx.moveTo(Math.round(20 * pxPerMm), dividerY);
    ctx.lineTo(canvas.width - Math.round(20 * pxPerMm), dividerY);
    ctx.stroke();

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('✄ Center Fold / Cut Guide (A4 1:1 Scale)', canvas.width / 2, dividerY - 8);
    ctx.restore();
  }

  // Draw Anti-Theft Diagonal Watermark if enabled
  if (options.watermark && options.watermark.enabled) {
    drawSecurityWatermark(ctx, canvas.width, canvas.height, options.watermark);
  }

  return canvas;
}

/**
 * Draw single card with rounded corners and optional dashed cut guide
 */
function drawCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  showGuide: boolean = true
) {
  ctx.save();

  // Subtle rounded corner clipping matching physical card
  const r = 24; // ~2mm at 300 DPI
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();

  // Fit image inside card rectangle without distortion (center crop / cover)
  const imgAspect = img.width / img.height;
  const targetAspect = w / h;

  let renderW = w;
  let renderH = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > targetAspect) {
    // Image is wider than card -> crop sides
    renderW = h * imgAspect;
    offsetX = (w - renderW) / 2;
  } else {
    // Image is taller than card -> crop top/bottom
    renderH = w / imgAspect;
    offsetY = (h - renderH) / 2;
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
  ctx.restore();

  // Draw card border guide if requested
  if (showGuide) {
    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Generate a 300 DPI print-ready PDF containing the composited A4 card layout
 */
export async function generateIDCardCompositePDF(
  options: IDCardCompositeOptions
): Promise<Uint8Array> {
  const canvas = await compositeIDCardsToCanvas(options);

  // Convert canvas to high-quality JPEG blob (0.92 quality delivers crisp 300 DPI within ~350-600 KB)
  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92
    );
  });

  const jpegBytes = await jpegBlob.arrayBuffer();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_DIMENSIONS.POINTS_WIDTH, A4_DIMENSIONS.POINTS_HEIGHT]);

  const embeddedImage = await pdfDoc.embedJpg(jpegBytes);

  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: A4_DIMENSIONS.POINTS_WIDTH,
    height: A4_DIMENSIONS.POINTS_HEIGHT,
  });

  return await pdfDoc.save({ useObjectStreams: true });
}
