import React from 'react';
import {
  Merge, Scissors, Minimize2, Layout, Hash, RotateCw,
  QrCode, Image as ImageIcon, FileImage, Type, Droplets, FileText,
  FilePlus, Table, Globe, FileStack, Lock, Unlock, PenTool, EyeOff,
  Wrench, Search, Files, Trash2, Scan
} from 'lucide-react';
import { ToolMetadata, ToolType } from './types';

export const TOOLS: ToolMetadata[] = [
  {
    id: ToolType.MERGE,
    title: 'Merge PDF',
    seoTitle: 'Merge PDF Online – Free & Secure PDF Combiner',
    description: 'Combine multiple PDF files into one document online. Fast, secure, and free with no registration required.',
    icon: 'Merge',
    category: 'edit',
    path: '/merge',
    seoPath: '/merge-pdf-online',
    longDescription: 'Merge PDF files into one document in seconds with our professional-grade combiner. Whether you are handling legal documents, school assignments, or business reports, our tool ensures your files are joined with perfect alignment and zero quality loss. Unlike other services, we process everything locally in your browser.',
    features: ['No file size limits', 'Maintain original formatting', 'Drag-and-drop ordering', '100% Privacy'],
    faqs: [
      { q: 'Is there a limit on how many PDFs I can merge?', a: 'No, our tool allows you to merge as many files as your browser memory can handle.' },
      { q: 'Do you keep a copy of my merged files?', a: 'Never. All processing is done locally on your machine.' }
    ]
  },
  {
    id: ToolType.SPLIT,
    title: 'Split PDF',
    seoTitle: 'Split PDF Pages Online – Free Browser Tool',
    description: 'Extract pages from your PDF or save each page as a separate PDF. Instant browser-based splitting.',
    icon: 'Scissors',
    category: 'edit',
    path: '/split',
    seoPath: '/split-pdf-pages',
    longDescription: 'Need to extract a single page from a large report? Our Split PDF tool allows you to define custom ranges or extract every single page into its own individual file. It is the fastest way to break down large documents without any complicated software.',
    features: ['Visual page selection', 'Custom range support', 'Batch extraction', 'Fast local processing'],
    faqs: [
      { q: 'Can I split password-protected PDFs?', a: 'You must unlock the PDF first using our Unlock tool before splitting.' },
      { q: 'Is the splitting process secure?', a: 'Yes, your document never leaves your device.' }
    ]
  },
  {
    id: ToolType.COMPRESS,
    title: 'Compress PDF',
    seoTitle: 'Compress PDF Online – Reduce PDF Size Without Quality Loss',
    description: 'Reduce PDF file size without losing quality. Optimize your documents for email and web sharing.',
    icon: 'Minimize2',
    category: 'edit',
    path: '/compress',
    seoPath: '/compress-pdf-online',
    longDescription: 'Large PDF files can be a nightmare for email attachments. Our intelligent compression engine analyzes your document and reduces file size by optimizing images and removing redundant metadata, all while keeping your text sharp and legible.',
    features: ['Three levels of compression', 'Batch processing', 'Email-ready results', 'No registration'],
    faqs: [
      { q: 'Will my images look blurry?', a: 'Our "Recommended" setting keeps a high DPI while reducing the footprint significantly.' },
      { q: 'How much can I reduce my PDF size?', a: 'Depending on the content, you can see up to an 80% reduction in file size.' }
    ]
  },
  {
    id: ToolType.PDF_TO_QR,
    title: 'PDF to QR',
    seoTitle: 'PDF to QR Code Converter – Share Files Instantly',
    description: 'Generate a QR code for your PDF file. Scan-to-view sharing for physical posters and business cards.',
    icon: 'QrCode',
    category: 'extra',
    path: '/pdf-to-qr',
    seoPath: '/pdf-to-qr-code',
    longDescription: 'Turn any PDF into a scannable QR code. Perfect for restaurants (menus), real estate (listings), or marketing flyers. This allows your audience to view your document instantly on their mobile device without typing a single URL.',
    features: ['Instant QR generation', 'High-res QR downloads', 'Private scan landing pages', 'No hosting required'],
    faqs: [
      { q: 'Does the QR code expire?', a: 'No, the QR code is permanent, but the document must be accessible for others to view it.' },
      { q: 'Is it free to use for business?', a: 'Yes, our QR generator is free for both personal and commercial use.' }
    ]
  },
  { id: ToolType.ORGANIZE, title: 'Organize PDF', description: 'Reorder, rotate, or delete PDF pages easily.', icon: 'Layout', category: 'edit', path: '/organize' },
  { id: ToolType.EDIT, title: 'Edit PDF', description: 'Free online PDF editor. Add text and annotations.', icon: 'Type', category: 'edit', path: '/edit' },
  { id: ToolType.PAGE_NUMBERS, title: 'Page Numbers', description: 'Add page numbers to PDF documents.', icon: 'Hash', category: 'edit', path: '/page-numbers' },
  { id: ToolType.ROTATE, title: 'Rotate PDF', description: 'Rotate PDF pages permanently.', icon: 'RotateCw', category: 'edit', path: '/rotate' },
  { id: ToolType.WATERMARK, title: 'Watermark PDF', description: 'Add text watermarks to your PDF.', icon: 'Droplets', category: 'edit', path: '/watermark' },
  { id: ToolType.DELETE_PAGES, title: 'Delete Pages', description: 'Remove unwanted pages from your PDF file.', icon: 'Trash2', category: 'edit', path: '/delete-pages' },
  { id: ToolType.JPG_TO_PDF, title: 'JPG to PDF', description: 'Convert images to PDF.', icon: 'FileImage', category: 'convert-to', path: '/jpg-to-pdf' },
  { id: ToolType.WORD_TO_PDF, title: 'Word to PDF', description: 'Convert Word to PDF.', icon: 'FileText', category: 'convert-to', path: '/word-to-pdf' },
  { id: ToolType.PPT_TO_PDF, title: 'PPT to PDF', description: 'Turn presentations into PDF.', icon: 'FilePlus', category: 'convert-to', path: '/ppt-to-pdf' },
  { id: ToolType.EXCEL_TO_PDF, title: 'Excel to PDF', description: 'Convert Excel to PDF.', icon: 'Table', category: 'convert-to', path: '/excel-to-pdf' },
  { id: ToolType.HTML_TO_PDF, title: 'HTML to PDF', description: 'Save web pages as PDF files.', icon: 'Globe', category: 'convert-to', path: '/html-to-pdf' },
  { id: ToolType.PDF_TO_JPG, title: 'PDF to JPG', description: 'Extract images from PDF.', icon: 'ImageIcon', category: 'convert-from', path: '/pdf-to-jpg' },
  { id: ToolType.PDF_TO_WORD, title: 'PDF to Word', description: 'Convert PDF to editable Word.', icon: 'FileStack', category: 'convert-from', path: '/pdf-to-word' },
  { id: ToolType.PDF_TO_PPT, title: 'PDF to PPT', description: 'Convert PDF back to PowerPoint.', icon: 'FilePlus', category: 'convert-from', path: '/pdf-to-ppt' },
  { id: ToolType.PDF_TO_EXCEL, title: 'PDF to Excel', description: 'Export PDF tables to Excel.', icon: 'Table', category: 'convert-from', path: '/pdf-to-excel' },
  { id: ToolType.PROTECT, title: 'Protect PDF', description: 'Encrypt PDF files with a password.', icon: 'Lock', category: 'security', path: '/protect' },
  { id: ToolType.UNLOCK, title: 'Unlock PDF', description: 'Remove password protection from PDF.', icon: 'Unlock', category: 'security', path: '/unlock' },
  { id: ToolType.SIGN, title: 'Sign PDF', description: 'Sign PDF documents online.', icon: 'PenTool', category: 'security', path: '/sign' },
  { id: ToolType.REDACT, title: 'Redact PDF', description: 'Hide sensitive text and images.', icon: 'EyeOff', category: 'security', path: '/redact' },
  { id: ToolType.REPAIR, title: 'Repair PDF', description: 'Fix damaged PDF files.', icon: 'Wrench', category: 'utilities', path: '/repair' },
  { id: ToolType.OCR, title: 'OCR PDF', description: 'Make scanned PDFs searchable.', icon: 'Search', category: 'utilities', path: '/ocr' },
  { id: ToolType.SCAN_TO_PDF, title: 'Scan to PDF', description: 'Scan documents with your camera.', icon: 'Scan', category: 'convert-to', path: '/scan-pdf' },
  {
    id: ToolType.SCAN_HANDWRITING,
    title: 'Handwriting to PDF',
    seoTitle: 'Scan Handwriting to Text PDF – Free OCR Tool',
    description: 'Convert handwritten notes or printed images into computerized typed PDF text.',
    icon: 'PenTool',
    category: 'convert-to',
    path: '/scan-handwriting',
    longDescription: 'Our advanced OCR (Optical Character Recognition) engine allows you to capture images of handwriting or printed text and instantly convert them into editable, digitized PDF documents. Perfect for students, researchers, and professionals who need to digitize physical notes quickly.',
    features: ['High-accuracy handwriting OCR', 'Instant text editing', 'Multi-page support', 'Private offline processing'],
    faqs: [
      { q: 'How accurate is the handwriting recognition?', a: 'Accuracy depends on the clarity of the handwriting, but our engine is optimized for common handwriting styles.' },
      { q: 'Is my scanned text private?', a: 'Yes, all OCR processing happens right in your browser. No images or text are sent to any server.' }
    ]
  },
  { id: ToolType.COMPARE, title: 'Compare PDF', description: 'Find differences between PDFs.', icon: 'Files', category: 'utilities', path: '/compare' },
];

export const getIcon = (name: string) => {
  const icons: Record<string, React.ReactNode> = {
    Merge: <Merge className="w-8 h-8" />, Scissors: <Scissors className="w-8 h-8" />,
    Minimize2: <Minimize2 className="w-8 h-8" />, Layout: <Layout className="w-8 h-8" />,
    Hash: <Hash className="w-8 h-8" />, RotateCw: <RotateCw className="w-8 h-8" />,
    QrCode: <QrCode className="w-8 h-8" />, ImageIcon: <ImageIcon className="w-8 h-8" />,
    FileImage: <FileImage className="w-8 h-8" />, Type: <Type className="w-8 h-8" />,
    Droplets: <Droplets className="w-8 h-8" />, FileText: <FileText className="w-8 h-8" />,
    FilePlus: <FilePlus className="w-8 h-8" />, Table: <Table className="w-8 h-8" />,
    Globe: <Globe className="w-8 h-8" />, FileStack: <FileStack className="w-8 h-8" />,
    Lock: <Lock className="w-8 h-8" />, Unlock: <Unlock className="w-8 h-8" />,
    PenTool: <PenTool className="w-8 h-8" />, EyeOff: <EyeOff className="w-8 h-8" />,
    Wrench: <Wrench className="w-8 h-8" />,
    Search: <Search className="w-8 h-8" />, Files: <Files className="w-8 h-8" />,
    Trash2: <Trash2 className="w-8 h-8" />, Scan: <Scan className="w-8 h-8" />,
  };
  return icons[name] || <FileText className="w-8 h-8" />;
};