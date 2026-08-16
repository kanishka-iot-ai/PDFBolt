export type PageProcessingStatus = 'idle' | 'preprocessing' | 'recognizing' | 'completed' | 'failed';
export type OCRMode = 'local' | 'ai';
export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface HandwritingPage {
  id: string;
  source: 'upload' | 'camera' | 'pdf';
  file?: File;
  name: string;
  originalImage: string; // Base64 data URL
  enhancedImage: string; // Base64 data URL
  thumbnail: string;     // Base64 thumbnail data URL
  rotation: number;      // 0, 90, 180, 270
  activeView: 'enhanced' | 'original';
  processingStatus: PageProcessingStatus;
  ocrStatus: 'none' | 'local' | 'ai';
  confidence: number;    // 0.0 to 1.0
  confidenceTier: ConfidenceTier;
  hasHandwriting: boolean;
  text: string;
  rawText: string;
  uncertainWords: string[];
  warnings: string[];
  error?: string;
}

export type PaperSize = 'A4' | 'Letter' | 'A5';
export type MarginType = 'normal' | 'narrow' | 'wide';
export type FontFamily = 'Inter' | 'Arial' | 'Times New Roman' | 'Georgia' | 'Courier';
export type TextAlignment = 'left' | 'center' | 'justify';

export interface PDFDesignSettings {
  paperSize: PaperSize;
  margin: MarginType;
  font: FontFamily;
  fontSize: 10 | 11 | 12 | 14 | 16;
  lineSpacing: 1.0 | 1.15 | 1.5 | 2.0;
  alignment: TextAlignment;
  headerText?: string;
  footerText?: string;
  includePageNumbers: boolean;
  documentTitle: string;
}

export interface QualityCheckIssue {
  type: 'empty' | 'low_confidence' | 'no_handwriting' | 'character_corruption';
  pageIndex: number;
  pageNumber: number;
  message: string;
  severity: 'warning' | 'error';
}

export interface QualityCheckReport {
  passed: boolean;
  issues: QualityCheckIssue[];
  emptyCount: number;
  lowConfidenceCount: number;
}
