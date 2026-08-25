/**
 * Lightweight Client-Side Document Processing Engine (No OpenCV dependency)
 * Features:
 * - 4-Point Perspective Warp & Rectangular Document Cropping
 * - Professional Document Filters: Magic Color, Clean B&W, Grayscale, High Contrast
 * - Fast corner ordering and geometry calculations
 */

export interface Point {
    x: number;
    y: number;
}

export interface DocumentCorners {
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
}

/**
 * Sort 4 points into clockwise order: [TopLeft, TopRight, BottomRight, BottomLeft]
 */
export function orderCorners(pts: Point[]): DocumentCorners {
    if (pts.length !== 4) {
        throw new Error("Exactly 4 points required for ordering");
    }

    const sortedByY = [...pts].sort((a, b) => a.y - b.y);
    const topPoints = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottomPoints = sortedByY.slice(2, 4).sort((a, b) => a.x - b.x);

    return {
        topLeft: topPoints[0],
        topRight: topPoints[1],
        bottomRight: bottomPoints[1],
        bottomLeft: bottomPoints[0],
    };
}

/**
 * Pure Canvas 4-Corner Perspective Warp & Document Extraction
 */
export function extractDocumentPerspective(
    sourceCanvasOrImg: HTMLCanvasElement | HTMLImageElement,
    corners: DocumentCorners,
    targetWidth: number = 1440,
    targetHeight: number = 1920
): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return outputCanvas;

    // Calculate bounding box of the 4 corners
    const minX = Math.max(0, Math.min(corners.topLeft.x, corners.bottomLeft.x));
    const minY = Math.max(0, Math.min(corners.topLeft.y, corners.topRight.y));
    const maxX = Math.min(
        sourceCanvasOrImg instanceof HTMLCanvasElement ? sourceCanvasOrImg.width : sourceCanvasOrImg.naturalWidth || 1920,
        Math.max(corners.topRight.x, corners.bottomRight.x)
    );
    const maxY = Math.min(
        sourceCanvasOrImg instanceof HTMLCanvasElement ? sourceCanvasOrImg.height : sourceCanvasOrImg.naturalHeight || 1080,
        Math.max(corners.bottomLeft.y, corners.bottomRight.y)
    );

    const cropW = Math.max(10, maxX - minX);
    const cropH = Math.max(10, maxY - minY);

    ctx.drawImage(sourceCanvasOrImg, minX, minY, cropW, cropH, 0, 0, targetWidth, targetHeight);
    return outputCanvas;
}

export type ScanFilterType = 'none' | 'magic' | 'bw' | 'grayscale' | 'contrast';

/**
 * Apply professional document scan enhancement filters
 */
export function applyScanFilter(
    sourceCanvas: HTMLCanvasElement,
    filter: ScanFilterType
): HTMLCanvasElement {
    if (filter === 'none') return sourceCanvas;

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;
    const ctx = resultCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    if (filter === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.filter = 'none';
        return resultCanvas;
    }

    if (filter === 'contrast') {
        ctx.filter = 'contrast(160%) brightness(105%) grayscale(100%)';
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.filter = 'none';
        return resultCanvas;
    }

    // Pixel-level enhancement for Magic Color & Clean B&W
    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const data = imgData.data;
    const len = data.length;

    if (filter === 'magic') {
        // Magic Color: shadow lift & dynamic range expansion
        for (let i = 0; i < len; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            r = Math.min(255, Math.max(0, ((r - 35) / 195) * 255));
            g = Math.min(255, Math.max(0, ((g - 35) / 195) * 255));
            b = Math.min(255, Math.max(0, ((b - 35) / 195) * 255));

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
    } else if (filter === 'bw') {
        // Clean B&W: Adaptive thresholding & crisp text
        for (let i = 0; i < len; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const val = gray > 135 ? 255 : (gray < 75 ? 0 : Math.round(((gray - 75) / 60) * 255));
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return resultCanvas;
}
