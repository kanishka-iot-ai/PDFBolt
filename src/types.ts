
export interface PDFFile {
  id: string;
  file: File;
  previewUrl?: string;
  totalPages?: number;
}

export enum ToolType {
  MERGE = 'merge',
  SPLIT = 'split',
  COMPRESS = 'compress',
  ORGANIZE = 'organize',
  EDIT = 'edit',
  PAGE_NUMBERS = 'page-numbers',
  ROTATE = 'rotate',
  WATERMARK = 'watermark',
  DELETE_PAGES = 'delete-pages',
  JPG_TO_PDF = 'jpg-to-pdf',
  WORD_TO_PDF = 'word-to-pdf',
  PPT_TO_PDF = 'ppt-to-pdf',
  EXCEL_TO_PDF = 'excel-to-pdf',
  HTML_TO_PDF = 'html-to-pdf',
  PDF_TO_JPG = 'pdf-to-jpg',
  PDF_TO_WORD = 'pdf-to-word',
  PDF_TO_PPT = 'pdf-to-ppt',
  PDF_TO_EXCEL = 'pdf-to-excel',
  PROTECT = 'protect',
  UNLOCK = 'unlock',
  SIGN = 'sign',
  REDACT = 'redact',
  REPAIR = 'repair',
  SCAN_TO_PDF = 'scan-to-pdf',
  OCR = 'ocr',
  COMPARE = 'compare',
  PDF_TO_QR = 'pdf-to-qr',
  SCAN_HANDWRITING = 'scan-handwriting',
}

export interface FAQ {
  q: string;
  a: string;
}

export interface ToolMetadata {
  id: ToolType;
  title: string;
  seoTitle?: string;
  description: string;
  icon: string;
  category: 'edit' | 'convert-to' | 'convert-from' | 'security' | 'utilities' | 'extra';
  path: string;
  seoPath?: string;
  longDescription?: string;
  features?: string[];
  faqs?: FAQ[];
}

export interface NotifySystem {
  success: () => void;
  complete: () => void;
  error: () => void;
  upload: () => void;
}
