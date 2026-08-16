import { describe, it, expect } from 'vitest';
import {
  generatePageId,
  validateDocumentQuality,
  generateClientTXT,
  generateClientPDF,
  generateClientDOCX
} from '../services/handwritingService';
import { HandwritingPage, PDFDesignSettings } from '../types/handwriting';

describe('Handwriting V2 Service & Utilities', () => {
  it('generates unique page IDs', () => {
    const id1 = generatePageId();
    const id2 = generatePageId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('hw_page_')).toBe(true);
  });

  it('validates document quality detecting empty and low confidence pages', () => {
    const pages: HandwritingPage[] = [
      {
        id: 'p1',
        source: 'camera',
        name: 'Page 1',
        originalImage: 'data:image/jpeg;base64,123',
        enhancedImage: 'data:image/jpeg;base64,123',
        thumbnail: 'data:image/jpeg;base64,123',
        rotation: 0,
        activeView: 'enhanced',
        processingStatus: 'completed',
        ocrStatus: 'local',
        confidence: 0.95,
        confidenceTier: 'high',
        hasHandwriting: true,
        text: 'Clean transcribed notes',
        rawText: 'Clean transcribed notes',
        uncertainWords: [],
        warnings: []
      },
      {
        id: 'p2',
        source: 'upload',
        name: 'Page 2',
        originalImage: 'data:image/jpeg;base64,456',
        enhancedImage: 'data:image/jpeg;base64,456',
        thumbnail: 'data:image/jpeg;base64,456',
        rotation: 0,
        activeView: 'enhanced',
        processingStatus: 'completed',
        ocrStatus: 'local',
        confidence: 0.50,
        confidenceTier: 'low',
        hasHandwriting: true,
        text: 'Uncertain blurred words',
        rawText: 'Uncertain blurred words',
        uncertainWords: ['blurred'],
        warnings: []
      },
      {
        id: 'p3',
        source: 'upload',
        name: 'Page 3',
        originalImage: 'data:image/jpeg;base64,789',
        enhancedImage: 'data:image/jpeg;base64,789',
        thumbnail: 'data:image/jpeg;base64,789',
        rotation: 0,
        activeView: 'enhanced',
        processingStatus: 'idle',
        ocrStatus: 'none',
        confidence: 0.0,
        confidenceTier: 'low',
        hasHandwriting: false,
        text: '',
        rawText: '',
        uncertainWords: [],
        warnings: []
      }
    ];

    const report = validateDocumentQuality(pages);
    expect(report.passed).toBe(false);
    expect(report.emptyCount).toBe(1); // p3
    expect(report.lowConfidenceCount).toBe(1); // p2
    expect(report.issues.length).toBe(2);
  });

  it('generates structured plain text output across pages', () => {
    const pages: HandwritingPage[] = [
      {
        id: 'p1',
        source: 'camera',
        name: 'Page 1',
        originalImage: '',
        enhancedImage: '',
        thumbnail: '',
        rotation: 0,
        activeView: 'enhanced',
        processingStatus: 'completed',
        ocrStatus: 'local',
        confidence: 0.9,
        confidenceTier: 'high',
        hasHandwriting: true,
        text: 'First page notes',
        rawText: 'First page notes',
        uncertainWords: [],
        warnings: []
      },
      {
        id: 'p2',
        source: 'camera',
        name: 'Page 2',
        originalImage: '',
        enhancedImage: '',
        thumbnail: '',
        rotation: 0,
        activeView: 'enhanced',
        processingStatus: 'completed',
        ocrStatus: 'local',
        confidence: 0.9,
        confidenceTier: 'high',
        hasHandwriting: true,
        text: 'Second page notes',
        rawText: 'Second page notes',
        uncertainWords: [],
        warnings: []
      }
    ];

    const txt = generateClientTXT(pages, 'Project Meeting');
    expect(txt).toContain('=== PROJECT MEETING ===');
    expect(txt).toContain('--- PAGE 1 ---');
    expect(txt).toContain('First page notes');
    expect(txt).toContain('--- PAGE 2 ---');
    expect(txt).toContain('Second page notes');
  });

  it('generates valid client-side PDF document bytes', async () => {
    const pages: HandwritingPage[] = [
      {
        id: 'p1',
        source: 'upload',
        name: 'Page 1',
        originalImage: '',
        enhancedImage: '',
        thumbnail: '',
        rotation: 0,
        activeView: 'enhanced',
        processingStatus: 'completed',
        ocrStatus: 'local',
        confidence: 0.9,
        confidenceTier: 'high',
        hasHandwriting: true,
        text: 'Executive Summary\nAll deliverables completed on schedule.',
        rawText: 'Executive Summary\nAll deliverables completed on schedule.',
        uncertainWords: [],
        warnings: []
      }
    ];

    const design: PDFDesignSettings = {
      paperSize: 'A4',
      margin: 'normal',
      font: 'Inter',
      fontSize: 12,
      lineSpacing: 1.15,
      alignment: 'left',
      headerText: 'INTERNAL REPORT',
      footerText: 'Confidential',
      includePageNumbers: true,
      documentTitle: 'Quarterly Review'
    };

    const pdfBytes = await generateClientPDF(pages, design);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500);

    // Verify PDF header magic bytes '%PDF'
    const header = String.fromCharCode(...pdfBytes.slice(0, 4));
    expect(header).toBe('%PDF');
  });

  it('generates valid client-side DOCX document Blob', async () => {
    const pages: HandwritingPage[] = [
      {
        id: 'p1',
        source: 'upload',
        name: 'Page 1',
        originalImage: '',
        enhancedImage: '',
        thumbnail: '',
        rotation: 0,
        activeView: 'enhanced',
        processingStatus: 'completed',
        ocrStatus: 'local',
        confidence: 0.9,
        confidenceTier: 'high',
        hasHandwriting: true,
        text: 'Word document export test paragraph.',
        rawText: 'Word document export test paragraph.',
        uncertainWords: [],
        warnings: []
      }
    ];

    const design: PDFDesignSettings = {
      paperSize: 'Letter',
      margin: 'normal',
      font: 'Arial',
      fontSize: 12,
      lineSpacing: 1.15,
      alignment: 'left',
      includePageNumbers: true,
      documentTitle: 'Exported Notes'
    };

    const docxBlob = await generateClientDOCX(pages, design);
    expect(docxBlob).toBeInstanceOf(Blob);
    expect(docxBlob.size).toBeGreaterThan(200);
  });
});
