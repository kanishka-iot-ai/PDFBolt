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
  ANALYZER = 'analyze',
}

export interface FAQ {
  q: string;
  a: string;
}

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export interface UseCase {
  title: string;
  description: string;
  icon?: string;
}

export interface ToolMetadata {
  id: ToolType;
  title: string;
  seoTitle?: string;
  canonicalPath: string; // e.g. /pdf-to-word, /merge-pdf
  path: string; // clean short path / legacy path
  seoPath?: string;
  description: string;
  icon: string;
  category: 'edit' | 'convert-to' | 'convert-from' | 'security' | 'utilities' | 'extra';
  longDescription?: string;
  quickAnswer?: string; // Instant answer for AI / Google snippet
  features?: string[];
  useCases?: UseCase[];
  howToSteps?: HowToStep[];
  faqs?: FAQ[];
  relatedTools?: string[]; // array of tool IDs for semantic cross-linking
  relatedGuides?: string[]; // array of guide slugs
  targetFileTypes?: string;
}

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  category: 'convert' | 'manage' | 'edit' | 'security' | 'ocr';
  readTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  updatedAt: string;
  summary: string;
  quickAnswer: string;
  toolId?: ToolType;
  steps: HowToStep[];
  detailedContent: {
    heading: string;
    paragraphs: string[];
    proTips?: string[];
  }[];
  faqs: FAQ[];
  relatedGuides: string[];
  relatedTools: string[];
}

export interface EncyclopediaArticle {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  category: 'standards' | 'technology' | 'comparison' | 'security';
  readTime: string;
  updatedAt: string;
  summary: string;
  keyTakeaways: string[];
  sections: {
    heading: string;
    content: string[];
    table?: {
      headers: string[];
      rows: string[][];
    };
  }[];
  relatedArticles: string[];
  relatedTools: string[];
}

export interface WorkflowStep {
  order: number;
  toolId: ToolType;
  title: string;
  description: string;
  actionLabel: string;
}

export interface Workflow {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  audience: 'Students & Educators' | 'Business & Finance' | 'Software Developers';
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  diagram: {
    steps: string[];
  };
  steps: WorkflowStep[];
  benefits: {
    title: string;
    description: string;
  }[];
  faqs: FAQ[];
  relatedTools: string[];
  relatedGuides: string[];
}

export interface ComparisonFeature {
  name: string;
  pdfBolt: string | boolean;
  serverCompetitor: string | boolean;
  desktopAcrobat: string | boolean;
  notes: string;
}

export interface TestFileItem {
  id: string;
  name: string;
  description: string;
  category: string;
  size: string;
  pageCount: number;
  idealFor: string[];
  generatorType: 'text' | 'scanned' | 'table' | 'slides' | 'protected';
}

export interface NotifySystem {
  success: () => void;
  complete: () => void;
  error: () => void;
  upload: () => void;
}
