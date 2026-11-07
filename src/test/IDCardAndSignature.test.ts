import { describe, it, expect } from 'vitest';
import { ID_CARD_ISO, A4_DIMENSIONS } from '../services/idCardService';
import { watermarkPdf } from '../services/pdfService';
import { PDFDocument } from 'pdf-lib';

describe('ID Card & Security Engine Tests', () => {
  it('adheres to ISO/IEC 7810 ID-1 standard dimensions and aspect ratio', () => {
    expect(ID_CARD_ISO.WIDTH_MM).toBe(85.60);
    expect(ID_CARD_ISO.HEIGHT_MM).toBe(53.98);
    expect(ID_CARD_ISO.ASPECT_RATIO).toBeCloseTo(1.58577, 3);
  });

  it('defines 300 DPI print-ready A4 dimensions', () => {
    expect(A4_DIMENSIONS.CANVAS_WIDTH_300DPI).toBe(2480);
    expect(A4_DIMENSIONS.CANVAS_HEIGHT_300DPI).toBe(3508);
    expect(A4_DIMENSIONS.POINTS_WIDTH).toBeCloseTo(595.28, 1);
    expect(A4_DIMENSIONS.POINTS_HEIGHT).toBeCloseTo(841.89, 1);
  });

  it('generates anti-theft repeating grid watermark onto PDF bytes', async () => {
    // Create minimal blank PDF for testing
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const pdfBytes = await doc.save();
    const file = new File([pdfBytes], 'test.pdf', { type: 'application/pdf' });
    file.arrayBuffer = async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

    const watermarkedBytes = await watermarkPdf(file, {
      text: 'ONLY FOR KYC VERIFICATION',
      isRepeatingGrid: true,
      colorType: 'red'
    });

    expect(watermarkedBytes).toBeInstanceOf(Uint8Array);
    expect(watermarkedBytes.length).toBeGreaterThan(pdfBytes.length);

    // Verify it loads as a valid PDF
    const loaded = await PDFDocument.load(watermarkedBytes);
    expect(loaded.getPageCount()).toBe(1);
  });
});
