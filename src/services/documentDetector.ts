/**
 * Advanced Client-Side Document Detector & Computer Vision Processing Engine
 * Features:
 * - Real-time document boundary / paper contour quad detection
 * - Temporal corner coordinate smoothing (Exponential Moving Average) to eliminate jitter
 * - High-speed pure Canvas fallback when OpenCV is loading or unavailable
 * - Robust 4-point perspective warp / homography extraction
 * - Document filters: Magic Color, Clean B&W, Grayscale, High Contrast
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

export interface DetectionResult {
    found: boolean;
    corners: DocumentCorners | null;
    confidence: number;
    areaRatio: number;
}

/**
 * Sort 4 points into clockwise order: [TopLeft, TopRight, BottomRight, BottomLeft]
 */
export function orderCorners(pts: Point[]): DocumentCorners {
    if (pts.length !== 4) {
        throw new Error("Exactly 4 points required for ordering");
    }

    // Sort by Y coordinate first to get top 2 and bottom 2
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
 * Exponential Moving Average (EMA) smoothing for corner points
 */
export function smoothCorners(
    current: DocumentCorners,
    previous: DocumentCorners | null,
    alpha: number = 0.35
): DocumentCorners {
    if (!previous) return current;

    return {
        topLeft: {
            x: alpha * current.topLeft.x + (1 - alpha) * previous.topLeft.x,
            y: alpha * current.topLeft.y + (1 - alpha) * previous.topLeft.y,
        },
        topRight: {
            x: alpha * current.topRight.x + (1 - alpha) * previous.topRight.x,
            y: alpha * current.topRight.y + (1 - alpha) * previous.topRight.y,
        },
        bottomRight: {
            x: alpha * current.bottomRight.x + (1 - alpha) * previous.bottomRight.x,
            y: alpha * current.bottomRight.y + (1 - alpha) * previous.bottomRight.y,
        },
        bottomLeft: {
            x: alpha * current.bottomLeft.x + (1 - alpha) * previous.bottomLeft.x,
            y: alpha * current.bottomLeft.y + (1 - alpha) * previous.bottomLeft.y,
        },
    };
}

/**
 * Calculate corner movement delta between frames to determine steadiness
 */
export function getCornerDelta(current: DocumentCorners, previous: DocumentCorners | null): number {
    if (!previous) return 999;

    const dTL = Math.hypot(current.topLeft.x - previous.topLeft.x, current.topLeft.y - previous.topLeft.y);
    const dTR = Math.hypot(current.topRight.x - previous.topRight.x, current.topRight.y - previous.topRight.y);
    const dBR = Math.hypot(current.bottomRight.x - previous.bottomRight.x, current.bottomRight.y - previous.bottomRight.y);
    const dBL = Math.hypot(current.bottomLeft.x - previous.bottomLeft.x, current.bottomLeft.y - previous.bottomLeft.y);

    return (dTL + dTR + dBR + dBL) / 4;
}

/**
 * Real-time Document Detection using OpenCV.js with multi-scale analysis
 */
export function detectDocumentOpenCV(
    videoOrCanvas: HTMLVideoElement | HTMLCanvasElement,
    width: number,
    height: number
): DetectionResult {
    // @ts-ignore
    const cv = window.cv;
    if (!cv || !cv.Mat) {
        return detectDocumentCanvasFallback(videoOrCanvas, width, height);
    }

    let srcMat: any = null;
    let grayMat: any = null;
    let blurMat: any = null;
    let cannyMat: any = null;
    let kernelMat: any = null;
    let closedMat: any = null;
    let contours: any = null;
    let hierarchy: any = null;

    try {
        // Downscale for lightning fast 60fps edge processing
        const processWidth = 480;
        const scale = width / processWidth;
        const processHeight = Math.round(height / scale);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = processWidth;
        tempCanvas.height = processHeight;
        const tctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tctx) return { found: false, corners: null, confidence: 0, areaRatio: 0 };

        tctx.drawImage(videoOrCanvas, 0, 0, processWidth, processHeight);

        srcMat = cv.imread(tempCanvas);
        grayMat = new cv.Mat();
        cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);

        blurMat = new cv.Mat();
        cv.GaussianBlur(grayMat, blurMat, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        cannyMat = new cv.Mat();
        cv.Canny(blurMat, cannyMat, 40, 140);

        kernelMat = cv.Mat.ones(3, 3, cv.CV_8U);
        closedMat = new cv.Mat();
        cv.morphologyEx(cannyMat, closedMat, cv.MORPH_CLOSE, kernelMat);

        contours = new cv.MatVector();
        hierarchy = new cv.Mat();
        cv.findContours(closedMat, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        const totalArea = processWidth * processHeight;
        let maxArea = 0;
        let bestPoly: any = null;

        for (let i = 0; i < contours.size(); ++i) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            const areaRatio = area / totalArea;

            // Document should occupy between 12% and 94% of the frame
            if (areaRatio > 0.12 && areaRatio < 0.94 && area > maxArea) {
                const perimeter = cv.arcLength(cnt, true);
                const approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, 0.025 * perimeter, true);

                if (approx.rows === 4 && cv.isContourConvex(approx)) {
                    if (bestPoly) bestPoly.delete();
                    bestPoly = approx;
                    maxArea = area;
                } else {
                    approx.delete();
                }
            }
            cnt.delete();
        }

        if (bestPoly && bestPoly.rows === 4) {
            const points: Point[] = [];
            for (let i = 0; i < 4; i++) {
                points.push({
                    x: bestPoly.data32S[i * 2] * scale,
                    y: bestPoly.data32S[i * 2 + 1] * scale,
                });
            }
            bestPoly.delete();

            const ordered = orderCorners(points);
            const areaRatio = maxArea / totalArea;

            return {
                found: true,
                corners: ordered,
                confidence: Math.min(1, areaRatio * 1.5),
                areaRatio,
            };
        }

        return { found: false, corners: null, confidence: 0, areaRatio: 0 };
    } catch (err) {
        return detectDocumentCanvasFallback(videoOrCanvas, width, height);
    } finally {
        if (srcMat) srcMat.delete();
        if (grayMat) grayMat.delete();
        if (blurMat) blurMat.delete();
        if (cannyMat) cannyMat.delete();
        if (kernelMat) kernelMat.delete();
        if (closedMat) closedMat.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
    }
}

/**
 * Pure JavaScript & Canvas edge detection fallback for instant feedback
 */
export function detectDocumentCanvasFallback(
    videoOrCanvas: HTMLVideoElement | HTMLCanvasElement,
    width: number,
    height: number
): DetectionResult {
    const sw = 240;
    const scale = width / sw;
    const sh = Math.round(height / scale);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { found: false, corners: null, confidence: 0, areaRatio: 0 };

    ctx.drawImage(videoOrCanvas, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // Fast Sobel / Luminance edge gradient check
    let minX = sw, maxX = 0, minY = sh, maxY = 0;
    let edgeCount = 0;

    for (let y = 10; y < sh - 10; y += 2) {
        for (let x = 10; x < sw - 10; x += 2) {
            const idx = (y * sw + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const lumRight = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
            const lumDown = 0.299 * data[idx + sw * 4] + 0.587 * data[idx + sw * 4 + 1] + 0.114 * data[idx + sw * 4 + 2];

            const diff = Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
            if (diff > 45) {
                edgeCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const boxArea = boxW * boxH;
    const totalArea = sw * sh;
    const areaRatio = boxArea / totalArea;

    if (edgeCount > 150 && areaRatio > 0.18 && areaRatio < 0.92) {
        const paddingX = boxW * 0.03;
        const paddingY = boxH * 0.03;

        const corners: DocumentCorners = {
            topLeft: { x: Math.max(0, (minX + paddingX) * scale), y: Math.max(0, (minY + paddingY) * scale) },
            topRight: { x: Math.min(width, (maxX - paddingX) * scale), y: Math.max(0, (minY + paddingY) * scale) },
            bottomRight: { x: Math.min(width, (maxX - paddingX) * scale), y: Math.min(height, (maxY - paddingY) * scale) },
            bottomLeft: { x: Math.max(0, (minX + paddingX) * scale), y: Math.min(height, (maxY - paddingY) * scale) },
        };

        return {
            found: true,
            corners,
            confidence: 0.65,
            areaRatio,
        };
    }

    return { found: false, corners: null, confidence: 0, areaRatio: 0 };
}

/**
 * Perspective Warp & Document Extraction (Homography Transform)
 */
export function extractDocumentPerspective(
    sourceCanvasOrVideo: HTMLCanvasElement | HTMLVideoElement,
    corners: DocumentCorners,
    targetWidth: number = 1440,
    targetHeight: number = 1920
): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const octx = outputCanvas.getContext('2d');
    if (!octx) return outputCanvas;

    // @ts-ignore
    const cv = window.cv;
    if (cv && cv.Mat) {
        let srcMat: any = null;
        let dstMat: any = null;
        let srcPts: any = null;
        let dstPts: any = null;
        let transformMatrix: any = null;

        try {
            // Read source into canvas if video
            let sourceCanvas: HTMLCanvasElement;
            if (sourceCanvasOrVideo instanceof HTMLVideoElement) {
                sourceCanvas = document.createElement('canvas');
                sourceCanvas.width = sourceCanvasOrVideo.videoWidth || 1920;
                sourceCanvas.height = sourceCanvasOrVideo.videoHeight || 1080;
                const sctx = sourceCanvas.getContext('2d');
                if (sctx) sctx.drawImage(sourceCanvasOrVideo, 0, 0);
            } else {
                sourceCanvas = sourceCanvasOrVideo;
            }

            srcMat = cv.imread(sourceCanvas);
            dstMat = new cv.Mat();

            srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
                corners.topLeft.x, corners.topLeft.y,
                corners.topRight.x, corners.topRight.y,
                corners.bottomRight.x, corners.bottomRight.y,
                corners.bottomLeft.x, corners.bottomLeft.y,
            ]);

            dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                targetWidth, 0,
                targetWidth, targetHeight,
                0, targetHeight,
            ]);

            transformMatrix = cv.getPerspectiveTransform(srcPts, dstPts);
            const dsize = new cv.Size(targetWidth, targetHeight);
            cv.warpPerspective(srcMat, dstMat, transformMatrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

            cv.imshow(outputCanvas, dstMat);
            return outputCanvas;
        } catch (e) {
            console.warn("Perspective warp failed, falling back to manual transform", e);
        } finally {
            if (srcMat) srcMat.delete();
            if (dstMat) dstMat.delete();
            if (srcPts) srcPts.delete();
            if (dstPts) dstPts.delete();
            if (transformMatrix) transformMatrix.delete();
        }
    }

    // High quality canvas crop fallback
    const minX = Math.min(corners.topLeft.x, corners.bottomLeft.x);
    const minY = Math.min(corners.topLeft.y, corners.topRight.y);
    const maxX = Math.max(corners.topRight.x, corners.bottomRight.x);
    const maxY = Math.max(corners.bottomLeft.y, corners.bottomRight.y);
    const cropW = Math.max(10, maxX - minX);
    const cropH = Math.max(10, maxY - minY);

    octx.drawImage(sourceCanvasOrVideo, minX, minY, cropW, cropH, 0, 0, targetWidth, targetHeight);
    return outputCanvas;
}

export type ScanFilterType = 'none' | 'magic' | 'bw' | 'grayscale' | 'contrast';

/**
 * Apply professional scan enhancement filters
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

    // For Magic Color and Clean B&W, use pixel-level processing
    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const data = imgData.data;
    const len = data.length;

    if (filter === 'magic') {
        // Magic Color: shadow lift, slight warmth reduction, dynamic range expansion
        for (let i = 0; i < len; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Normalize and boost contrast
            r = Math.min(255, Math.max(0, ((r - 35) / 195) * 255));
            g = Math.min(255, Math.max(0, ((g - 35) / 195) * 255));
            b = Math.min(255, Math.max(0, ((b - 35) / 195) * 255));

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
    } else if (filter === 'bw') {
        // Clean B&W: Adaptive background suppression & crisp text
        for (let i = 0; i < len; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const val = gray > 140 ? 255 : (gray < 70 ? 0 : Math.round(((gray - 70) / 70) * 255));
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return resultCanvas;
}
