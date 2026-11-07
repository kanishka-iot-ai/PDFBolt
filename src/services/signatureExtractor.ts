/**
 * High-Fidelity Client-Side Signature Extractor
 * Converts pen-on-paper photos into transparent alpha PNGs, removes paper background & shadows,
 * provides ink recoloring, and auto-crops bounding boxes.
 */

export type InkColorMode = 'original' | 'executive_blue' | 'pure_black' | 'navy';

export interface SignatureExtractOptions {
  sourceImage: File | Blob | string;
  inkColorMode?: InkColorMode;
  /** Background knockout sensitivity (0-100, default: 75) */
  sensitivity?: number;
  /** Auto-crop empty paper margins around the signature */
  autoCrop?: boolean;
  paddingPx?: number;
  /** Pre-resize to government exam portal constraints (e.g. 140x60 for SSC/UPSC) */
  targetWidth?: number;
  targetHeight?: number;
}

function loadImage(src: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);

    img.onload = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      reject(new Error('Failed to load signature image: ' + String(err)));
    };
    img.src = url;
  });
}

/**
 * Extract transparent signature from paper photo
 */
export async function extractSignatureFromPhoto(
  options: SignatureExtractOptions
): Promise<{
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}> {
  const img = await loadImage(options.sourceImage);

  // Initial processing canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not acquire 2D canvas context');

  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const len = data.length;

  // Calibrate threshold based on sensitivity (default 75 -> high threshold around 220)
  const sensitivity = options.sensitivity ?? 75;
  const tHigh = Math.round(180 + (sensitivity / 100) * 65); // 180 to 245
  const tLow = Math.round(50 + (sensitivity / 100) * 60);   // 50 to 110

  // Bounding box trackers
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  const inkMode = options.inkColorMode ?? 'executive_blue';

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Standard ITU-R BT.601 luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= tHigh) {
      // Background paper / shadow: completely transparent
      data[i + 3] = 0;
    } else {
      // Ink stroke: calculate smooth anti-aliasing alpha
      let alpha = 255;
      if (lum > tLow) {
        alpha = Math.round(255 * (1 - (lum - tLow) / (tHigh - tLow)));
      }
      data[i + 3] = alpha;

      // Track bounding box of visible ink
      if (alpha > 25) {
        const pixelIdx = i / 4;
        const px = pixelIdx % canvas.width;
        const py = Math.floor(pixelIdx / canvas.width);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }

      // Ink recoloring
      if (inkMode === 'executive_blue') {
        // Rich authoritative dark banking blue (#0F3870)
        data[i] = 15;
        data[i + 1] = 56;
        data[i + 2] = 112;
      } else if (inkMode === 'navy') {
        // Formal navy (#0A2540)
        data[i] = 10;
        data[i + 1] = 37;
        data[i + 2] = 64;
      } else if (inkMode === 'pure_black') {
        // Clean crisp document black (#050505)
        data[i] = 5;
        data[i + 1] = 5;
        data[i + 2] = 5;
      }
      // 'original' leaves r, g, b untouched
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Auto-crop bounding box if requested and ink was found
  let finalCanvas = canvas;
  if ((options.autoCrop ?? true) && maxX > minX && maxY > minY) {
    const pad = options.paddingPx ?? 16;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(canvas.width - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(canvas.height - cropY, maxY - minY + pad * 2);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = options.targetWidth || cropW;
    croppedCanvas.height = options.targetHeight || cropH;

    const croppedCtx = croppedCanvas.getContext('2d');
    if (croppedCtx) {
      croppedCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        croppedCanvas.width,
        croppedCanvas.height
      );
      finalCanvas = croppedCanvas;
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to generate PNG blob'))),
      'image/png'
    );
  });

  const dataUrl = finalCanvas.toDataURL('image/png');

  return {
    canvas: finalCanvas,
    blob,
    dataUrl,
    width: finalCanvas.width,
    height: finalCanvas.height,
  };
}
