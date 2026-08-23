import React from 'react';
import {
  Merge, Scissors, Minimize2, Layout, Hash, RotateCw,
  QrCode, Image as ImageIcon, FileImage, Type, Droplets, FileText,
  FilePlus, Table, Globe, FileStack, Lock, Unlock, PenTool, EyeOff,
  Wrench, Search, Files, Trash2, Scan, GraduationCap, Briefcase, Code,
  Calculator, CheckCircle2, ShieldCheck, Zap, Sparkles, HelpCircle, BookOpen, Layers
} from 'lucide-react';
import {
  ToolMetadata, ToolType, Guide, EncyclopediaArticle,
  Workflow, ComparisonFeature, TestFileItem
} from './types';

// ==========================================
// 1. ALL TOOLS METADATA (25+ Tools)
// ==========================================
export const TOOLS: ToolMetadata[] = [
  {
    id: ToolType.MERGE,
    title: 'Merge PDF',
    seoTitle: 'Merge PDF Online – Free & Secure PDF Combiner',
    canonicalPath: '/merge-pdf',
    path: '/merge',
    seoPath: '/merge-pdf-online',
    description: 'Combine multiple PDF files into one single document in seconds. 100% private in-browser processing.',
    icon: 'Merge',
    category: 'edit',
    quickAnswer: 'To merge PDF files: Upload 2 or more PDFs, drag to arrange pages in your preferred order, click "Merge PDF", and download your combined document instantly without uploading files to any server.',
    longDescription: 'Our professional PDF merger lets you combine reports, contracts, receipts, and study materials into a clean, unified document with zero loss of formatting or clarity. Because processing occurs entirely within your browser using WebAssembly and pdf-lib, your sensitive files never leave your device.',
    features: ['Zero file size limit', 'Maintain 100% vector fidelity', 'Visual drag-and-drop page reordering', '100% Private local processing'],
    howToSteps: [
      { name: 'Upload Files', text: 'Select or drag-and-drop two or more PDF files into the merger workspace.' },
      { name: 'Reorder Documents', text: 'Drag files or use order buttons to arrange pages in the sequence you need.' },
      { name: 'Merge & Download', text: 'Click "Merge PDF" to stitch documents locally and download the combined file.' }
    ],
    useCases: [
      { title: 'Legal Case Bundles', description: 'Combine exhibits, filings, and affidavits into one sequential PDF with exact page preservation.' },
      { title: 'Academic Reports', description: 'Merge research papers, coversheets, and appendices into a unified submission.' }
    ],
    faqs: [
      { q: 'Is there a limit on how many PDFs I can merge?', a: 'No artificial limit. You can merge as many documents as your device memory can accommodate.' },
      { q: 'Are my merged documents stored on your server?', a: 'Never. All PDF merging happens directly in your browser memory via WebAssembly.' },
      { q: 'Will bookmark structures or hyperlinks remain intact?', a: 'Yes, original vector graphics, text layers, and links are fully preserved in the output.' }
    ],
    relatedTools: [ToolType.SPLIT, ToolType.ORGANIZE, ToolType.COMPRESS, ToolType.PAGE_NUMBERS],
    relatedGuides: ['how-to-merge-pdf-files', 'how-to-remove-pages-from-pdf']
  },
  {
    id: ToolType.SPLIT,
    title: 'Split PDF',
    seoTitle: 'Split PDF Pages Online – Extract PDF Pages Free',
    canonicalPath: '/split-pdf',
    path: '/split',
    seoPath: '/split-pdf-pages',
    description: 'Extract specific pages or page ranges from any PDF document into separate files instantly.',
    icon: 'Scissors',
    category: 'edit',
    quickAnswer: 'To split a PDF: Upload your document, specify custom page numbers or ranges (e.g. 1-3, 5), and click "Split PDF" to instantly extract and download selected pages.',
    longDescription: 'Extract essential chapters, invoices, or individual pages from heavy multi-page PDF documents. Define custom ranges, isolate single sheets, or burst an entire document into individual single-page files directly in your browser.',
    features: ['Custom page range extraction', 'Visual page selector', 'Batch page burst support', 'Local client-side execution'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Choose the PDF document you want to extract pages from.' },
      { name: 'Specify Ranges', text: 'Enter page numbers or ranges (e.g., 1-5, 8, 11-14).' },
      { name: 'Extract File', text: 'Click "Split PDF" to generate and download your extracted document.' }
    ],
    useCases: [
      { title: 'Invoice Extraction', description: 'Isolate individual client invoices from massive monthly accounting PDF runs.' },
      { title: 'Book Chapter Sharing', description: 'Extract and share a single chapter without distributing the entire textbook.' }
    ],
    faqs: [
      { q: 'Can I split password-protected PDFs?', a: 'You can unlock password-protected files using our Unlock tool first, then split freely.' },
      { q: 'Can I extract multiple disjoint ranges at once?', a: 'Yes, separate ranges with commas such as "1-3, 7, 10-12".' }
    ],
    relatedTools: [ToolType.MERGE, ToolType.DELETE_PAGES, ToolType.ORGANIZE, ToolType.COMPRESS],
    relatedGuides: ['how-to-split-a-pdf', 'how-to-remove-pages-from-pdf']
  },
  {
    id: ToolType.COMPRESS,
    title: 'Compress PDF',
    seoTitle: 'Compress PDF Online – Reduce PDF Size Without Quality Loss',
    canonicalPath: '/compress-pdf',
    path: '/compress',
    seoPath: '/compress-pdf-online',
    description: 'Reduce PDF file size significantly while retaining crisp typography and clear image resolution.',
    icon: 'Minimize2',
    category: 'edit',
    quickAnswer: 'To compress a PDF: Upload your file, choose your compression level (Lite, Smart, or Max), and click "Compress PDF" to reduce document size by up to 80% for email and portal uploads.',
    longDescription: 'Compress heavy PDFs for easy email attachments and strict portal limits. Our smart engine eliminates duplicate object streams, strips redundant embedded font subsets, and optimizes image assets while preserving text sharpness.',
    features: ['Smart metadata pruning', 'Email-ready size reduction (under 10MB/25MB)', 'No blur on vector text', 'Zero file uploads'],
    howToSteps: [
      { name: 'Upload Document', text: 'Drop your oversized PDF into the compressor.' },
      { name: 'Select Strength', text: 'Choose Smart Recommended for balanced quality or Max for smallest size.' },
      { name: 'Download Compressed', text: 'Save your lightweight PDF ready for immediate sending.' }
    ],
    useCases: [
      { title: 'Email Attachments', description: 'Shrink 50MB presentations down to under 10MB to pass email attachment limits.' },
      { title: 'Government & Job Portals', description: 'Compress resumes and identity documents below strict 2MB portal thresholds.' }
    ],
    faqs: [
      { q: 'How much file size reduction can I expect?', a: 'Typical documents see 40% to 85% size reduction depending on image density and uncompressed metadata.' },
      { q: 'Will compressed text become blurry?', a: 'No. Vector fonts and text layers are preserved digitally without rasterization.' }
    ],
    relatedTools: [ToolType.MERGE, ToolType.PDF_TO_JPG, ToolType.REPAIR],
    relatedGuides: ['how-to-compress-a-pdf']
  },
  {
    id: ToolType.PDF_TO_WORD,
    title: 'PDF to Word',
    seoTitle: 'PDF to Word Converter – Convert PDF to Editable DOCX',
    canonicalPath: '/pdf-to-word',
    path: '/pdf-to-word',
    description: 'Convert PDF documents into fully editable Microsoft Word (.docx) files with layout preservation.',
    icon: 'FileStack',
    category: 'convert-from',
    quickAnswer: 'To convert PDF to Word: Upload your PDF, click "Convert to Word", and download an editable .docx file with formatted paragraphs, tables, and typography.',
    longDescription: 'Turn static PDF contracts, resumes, and reports back into editable Microsoft Word documents. Our converter reconstructs paragraph flows, headings, and table structures directly on your device.',
    features: ['Editable Word .docx export', 'Paragraph flow reconstruction', 'Table recognition', 'OCR fallback for scans'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Select the PDF file you wish to edit in Microsoft Word.' },
      { name: 'Process Conversion', text: 'The engine parses text blocks and font alignments.' },
      { name: 'Download DOCX', text: 'Open your converted file in Word, Google Docs, or LibreOffice.' }
    ],
    useCases: [
      { title: 'Contract & Agreement Editing', description: 'Reconstruct static contract PDFs back into editable Word DOCX files to update clauses and dates.' },
      { title: 'Resume Updating', description: 'Convert locked PDF resumes back into formatted Word documents without losing section alignment.' }
    ],
    faqs: [
      { q: 'Can I edit the converted file in Microsoft Word and Google Docs?', a: 'Yes, the exported .docx is standard OpenXML compatible with Microsoft Word, Google Docs, and Office 365.' },
      { q: 'What if my PDF is a scanned photo or image?', a: 'Our engine applies integrated OCR to convert scanned image text into editable Word characters.' },
      { q: 'Are my converted documents stored on a server?', a: 'Never. All PDF to Word conversion processes 100% locally in your web browser memory.' }
    ],
    relatedTools: [ToolType.WORD_TO_PDF, ToolType.PDF_TO_EXCEL, ToolType.OCR, ToolType.EDIT],
    relatedGuides: ['how-to-convert-pdf-to-word', 'how-to-ocr-a-pdf']
  },
  {
    id: ToolType.PDF_TO_PPT,
    title: 'PDF to PowerPoint',
    seoTitle: 'PDF to PowerPoint Converter – Convert PDF to PPTX Slides',
    canonicalPath: '/pdf-to-ppt',
    path: '/pdf-to-ppt',
    description: 'Transform PDF presentation decks into editable PowerPoint (.pptx) slides with high fidelity.',
    icon: 'FilePlus',
    category: 'convert-from',
    quickAnswer: 'To convert PDF to PowerPoint: Upload your PDF presentation, click "Convert to PPTX", and download a slide deck ready for Microsoft PowerPoint, Keynote, or Google Slides.',
    longDescription: 'Convert PDF slide hand-outs back into presentation decks. Each PDF page is mapped directly to a slide with crisp vector-quality rendering and image background preservation.',
    features: ['High-DPI slide generation', 'Standard 16:9 & 4:3 slide geometry', 'Compatible with Google Slides & Keynote', 'Instant local conversion'],
    howToSteps: [
      { name: 'Upload PDF Slides', text: 'Choose your PDF presentation file.' },
      { name: 'Convert to Slides', text: 'Click Convert to compile slides into a PPTX deck.' },
      { name: 'Present & Edit', text: 'Open in PowerPoint to deliver or customize your presentation.' }
    ],
    useCases: [
      { title: 'Pitch Deck Customization', description: 'Transform exported PDF slide decks into editable PowerPoint PPTX presentations for client meetings.' },
      { title: 'Lecture Handout Editing', description: 'Convert course handouts into presentation slides ready for classroom delivery.' }
    ],
    faqs: [
      { q: 'Can I present the exported file immediately?', a: 'Yes, the generated PPTX is standard presentation format compatible with all major slide software.' },
      { q: 'Will vector graphics remain crisp in PowerPoint?', a: 'Yes, slide graphics and fonts are converted with high resolution for clear projection.' },
      { q: 'Is my slide presentation private?', a: '100% private. All processing occurs in your local browser without transmitting slides anywhere.' }
    ],
    relatedTools: [ToolType.PPT_TO_PDF, ToolType.PDF_TO_WORD, ToolType.PDF_TO_JPG],
    relatedGuides: ['how-to-convert-pdf-to-ppt']
  },
  {
    id: ToolType.PDF_TO_EXCEL,
    title: 'PDF to Excel',
    seoTitle: 'PDF to Excel Converter – Extract PDF Tables to XLSX',
    canonicalPath: '/pdf-to-excel',
    path: '/pdf-to-excel',
    description: 'Extract tables, spreadsheets, and tabular financial data from PDF into clean Microsoft Excel (.xlsx) sheets.',
    icon: 'Table',
    category: 'convert-from',
    quickAnswer: 'To convert PDF to Excel: Upload your PDF invoice or financial report, click "Convert to Excel", and download a cleanly structured spreadsheet with rows and columns mapped accurately.',
    longDescription: 'Stop manual copy-pasting of financial statements and invoices. Our tabular extraction engine identifies row/column grid intersections and exports numbers directly to Excel sheets.',
    features: ['Auto table grid detection', 'Direct XLSX workbook export', 'Formulas ready numbers', '100% Private local parsing'],
    howToSteps: [
      { name: 'Upload PDF Report', text: 'Select the statement or document containing tabular data.' },
      { name: 'Extract Grid', text: 'The engine parses geometric coordinate alignments into cells.' },
      { name: 'Download Spreadsheet', text: 'Open in Excel, Google Sheets, or Numbers.' }
    ],
    useCases: [
      { title: 'Financial & Bank Statement Auditing', description: 'Extract tabular statements into Excel spreadsheets with automatic numeric and currency parsing.' },
      { title: 'Inventory Matrix Migration', description: 'Convert multi-page PDF inventory lists directly into formula-ready XLSX tables.' }
    ],
    faqs: [
      { q: 'Will numbers be formatted as editable cells?', a: 'Yes, table contents are mapped into native rows and columns rather than flat screenshots.' },
      { q: 'Does it support multi-page tables?', a: 'Yes, tables spanning multiple consecutive pages are extracted into continuous sheet rows.' },
      { q: 'Are my financial spreadsheets secure?', a: 'Completely secure. Parsing runs 100% client-side via WebAssembly in your browser memory.' }
    ],
    relatedTools: [ToolType.EXCEL_TO_PDF, ToolType.PDF_TO_WORD, ToolType.OCR],
    relatedGuides: ['how-to-convert-pdf-to-excel']
  },
  {
    id: ToolType.PDF_TO_JPG,
    title: 'PDF to JPG',
    seoTitle: 'PDF to JPG Converter – Extract High-Resolution Images',
    canonicalPath: '/pdf-to-jpg',
    path: '/pdf-to-jpg',
    description: 'Convert PDF pages into high-resolution JPG images or extract embedded photos in seconds.',
    icon: 'ImageIcon',
    category: 'convert-from',
    quickAnswer: 'To convert PDF to JPG: Upload your document, select your preferred render DPI, and download individual high-quality JPG image files or a ZIP bundle.',
    longDescription: 'Turn PDF pages into shareable image files for social media, presentations, and web publishing. Supports multi-page batch extraction with automatic ZIP packaging.',
    features: ['High-DPI rendering (up to 300 DPI)', 'Single page or full document extraction', 'Automatic ZIP packaging', 'Zero compression artifacts'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Select the PDF file you wish to turn into JPG images.' },
      { name: 'Render Pages', text: 'The browser renders pages onto high-resolution canvases.' },
      { name: 'Save Images', text: 'Download single JPGs or all pages bundled into a ZIP.' }
    ],
    useCases: [
      { title: 'Social Media & Web Publishing', description: 'Convert document pages into high-DPI JPG images for Instagram, LinkedIn, or web articles.' },
      { title: 'Graphic Asset Extraction', description: 'Extract photos and visual diagrams from marketing PDFs in full resolution.' }
    ],
    faqs: [
      { q: 'What resolution are the extracted JPGs?', a: 'Pages are rendered at high-DPI (2x retina scale) ensuring crisp text and sharp graphics.' },
      { q: 'Can I download all pages at once?', a: 'Yes, multi-page PDFs can be extracted and downloaded as a single bundled ZIP archive.' },
      { q: 'Are image colors accurately preserved?', a: 'Yes, sRGB and CMYK color profiles are mapped to clean 24-bit TrueColor JPGs.' }
    ],
    relatedTools: [ToolType.JPG_TO_PDF, ToolType.SCAN_TO_PDF, ToolType.COMPRESS],
    relatedGuides: ['how-to-ocr-a-pdf']
  },
  {
    id: ToolType.WORD_TO_PDF,
    title: 'Word to PDF',
    seoTitle: 'Word to PDF Converter – Convert DOCX to PDF Online Free',
    canonicalPath: '/word-to-pdf',
    path: '/word-to-pdf',
    description: 'Convert DOCX Word documents into professional, print-ready PDF files with exact formatting.',
    icon: 'FileText',
    category: 'convert-to',
    features: ['Exact font preservation', 'Preserve tables and margins', 'Fast local conversion', 'Print-ready output'],
    howToSteps: [
      { name: 'Upload DOCX', text: 'Choose your Word document.' },
      { name: 'Convert to PDF', text: 'The engine renders layout and typography.' },
      { name: 'Download PDF', text: 'Save your standardized PDF file.' }
    ],
    quickAnswer: 'To convert Word to PDF: Upload your DOCX or DOC document, click "Convert to PDF", and download a standardized, print-ready PDF file with preserved typography and layouts.',
    longDescription: 'Transform Microsoft Word documents into universal, immutable PDF files. Perfect for submitting resumes, distributing client proposals, and archiving formal reports without font substitution or formatting shifts across devices.',
    useCases: [
      { title: 'Resume Submission', description: 'Lock document formatting to ensure hiring managers and ATS systems see your exact typography.' },
      { title: 'Formal Proposals & Quotes', description: 'Convert editable Word drafts into final non-editable PDF agreements ready for signing.' }
    ],
    faqs: [
      { q: 'Will custom fonts and margins be preserved?', a: 'Yes. Our converter accurately renders standard OpenXML layouts, preserving page breaks, table borders, and spacing.' },
      { q: 'Can I convert .doc as well as .docx files?', a: 'Yes, both classic .doc and modern .docx formats are fully supported.' },
      { q: 'Is my document private?', a: '100% private. Conversion processes in your local browser memory without storing files on any server.' }
    ],
    relatedTools: [ToolType.PDF_TO_WORD, ToolType.MERGE, ToolType.PROTECT],
    relatedGuides: ['how-to-convert-pdf-to-word']
  },
  {
    id: ToolType.EXCEL_TO_PDF,
    title: 'Excel to PDF',
    seoTitle: 'Excel to PDF Converter – Convert XLSX Sheets to PDF',
    canonicalPath: '/excel-to-pdf',
    path: '/excel-to-pdf',
    description: 'Transform Excel spreadsheets (.xlsx) into clean, paginated PDF documents with column auto-fitting.',
    icon: 'Table',
    category: 'convert-to',
    features: ['Multi-page table pagination', 'Auto-fit column layouts', 'Gridline preservation', 'Zero upload privacy'],
    howToSteps: [
      { name: 'Upload Excel Sheet', text: 'Choose your XLSX or XLS workbook.' },
      { name: 'Render Pages', text: 'Tables are converted and paginated across A4 sheets.' },
      { name: 'Download PDF', text: 'Save clean printable PDF reports.' }
    ],
    quickAnswer: 'To convert Excel to PDF: Upload your XLSX or XLS spreadsheet, adjust pagination settings, and download a clean, multi-page PDF document formatted for printing.',
    longDescription: 'Convert complex financial models, balance sheets, and inventory matrices into professional PDF reports. Automatically fits columns to page widths and formats table grids cleanly.',
    useCases: [
      { title: 'Financial Statements', description: 'Export quarterly P&L statements and balance sheets into clean board-ready PDF packages.' },
      { title: 'Invoice & Pricing Sheets', description: 'Distribute pricing matrices and client estimates without exposing proprietary formulas.' }
    ],
    faqs: [
      { q: 'Does the converter handle multi-sheet workbooks?', a: 'Yes, multiple worksheet tabs are sequenced and paginated into a continuous PDF document.' },
      { q: 'Are cell formulas visible in the PDF?', a: 'Only the computed values and numbers are rendered in the PDF, protecting your underlying spreadsheet formulas.' },
      { q: 'Will wide tables be cut off horizontally?', a: 'Our auto-fit algorithm scales tables to fit standard A4/Letter margins neatly.' }
    ],
    relatedTools: [ToolType.PDF_TO_EXCEL, ToolType.MERGE],
    relatedGuides: ['how-to-convert-pdf-to-excel']
  },
  {
    id: ToolType.PPT_TO_PDF,
    title: 'PPT to PDF',
    seoTitle: 'PowerPoint to PDF Converter – Turn Presentations into PDF',
    canonicalPath: '/ppt-to-pdf',
    path: '/ppt-to-pdf',
    description: 'Convert PowerPoint presentations (.pptx) into universal PDF slide handouts.',
    icon: 'FilePlus',
    category: 'convert-to',
    features: ['Slide-to-page 1:1 mapping', 'Preserve presentation graphics', 'Fast conversion', 'Universal viewing format'],
    howToSteps: [
      { name: 'Upload PPTX', text: 'Select your PowerPoint deck.' },
      { name: 'Compile PDF', text: 'Slides are rendered into standard PDF pages.' },
      { name: 'Download File', text: 'Share your PDF slide deck anywhere.' }
    ],
    quickAnswer: 'To convert PowerPoint to PDF: Upload your PPTX or PPT slide deck, click "Convert to PDF", and download a lightweight PDF handout ready for sharing.',
    longDescription: 'Turn presentation slide decks into universal PDF documents. Ideal for sharing conference presentations, student handouts, and webinar slides that can be viewed on any smartphone or tablet.',
    useCases: [
      { title: 'Meeting & Webinar Handouts', description: 'Distribute slides to attendees in a compact format that opens reliably without PowerPoint.' },
      { title: 'Print Handouts', description: 'Print slides with crisp vector graphics and consistent page breaks.' }
    ],
    faqs: [
      { q: 'Can I view the PDF on mobile devices without PowerPoint installed?', a: 'Yes. Converted PDFs open natively in Apple Safari, Google Chrome, and any PDF viewer app.' },
      { q: 'Will slide animations or video embeds play in PDF?', a: 'PDF is a static document format, so slides are rendered at their final visual state.' },
      { q: 'Are high-resolution graphics compressed?', a: 'Slide visuals are rendered at high DPI, maintaining sharp diagrams and photos.' }
    ],
    relatedTools: [ToolType.PDF_TO_PPT, ToolType.MERGE],
    relatedGuides: ['how-to-convert-pdf-to-ppt']
  },
  {
    id: ToolType.JPG_TO_PDF,
    title: 'JPG to PDF',
    seoTitle: 'JPG to PDF Converter – Convert Images to PDF Document',
    canonicalPath: '/jpg-to-pdf',
    path: '/jpg-to-pdf',
    description: 'Combine JPG, PNG, and WebP images into a single polished PDF document with margin controls.',
    icon: 'FileImage',
    category: 'convert-to',
    features: ['Multi-image batch combining', 'Custom page orientation', 'Fit-to-page scaling', 'Instant compilation'],
    howToSteps: [
      { name: 'Select Images', text: 'Upload photos or screenshots (JPG, PNG, WebP).' },
      { name: 'Arrange Order', text: 'Sort your images in the desired page sequence.' },
      { name: 'Create PDF', text: 'Compile and download your image-based PDF document.' }
    ],
    quickAnswer: 'To convert JPG images to PDF: Upload one or more image files (JPG, PNG, WebP), arrange their order, and click "Create PDF" to compile a single document.',
    longDescription: 'Combine photos, scanned receipts, digital drawings, and certificates into a single organized PDF document. Set custom page margins, orientations (portrait/landscape), and page sizing (A4, Letter, or Fit-to-Image).',
    useCases: [
      { title: 'Expense Receipts & Invoices', description: 'Combine smartphone photos of receipts into a single monthly reimbursement PDF report.' },
      { title: 'Portfolio & Design Lookbooks', description: 'Stitch high-resolution design mocks and photography into a clean client PDF presentation.' }
    ],
    faqs: [
      { q: 'How many images can I merge into one PDF?', a: 'There is no limit. You can merge dozens of images in a single batch.' },
      { q: 'Can I mix JPG and PNG files in the same PDF?', a: 'Yes, you can upload a mix of JPG, PNG, and WebP images simultaneously.' },
      { q: 'Can I reorder images before generating the PDF?', a: 'Yes, simply drag and drop the image thumbnails to sequence them in your desired order.' }
    ],
    relatedTools: [ToolType.PDF_TO_JPG, ToolType.MERGE, ToolType.SCAN_TO_PDF],
    relatedGuides: ['how-to-ocr-a-pdf']
  },
  {
    id: ToolType.HTML_TO_PDF,
    title: 'HTML to PDF',
    seoTitle: 'HTML to PDF Converter – Convert Web Pages and HTML Code to PDF',
    canonicalPath: '/html-to-pdf',
    path: '/html-to-pdf',
    description: 'Render web pages, invoices, and raw HTML/CSS code into formatted PDF documents.',
    icon: 'Globe',
    category: 'convert-to',
    features: ['CSS style preservation', 'Multi-page document flow', 'Clean typography rendering', 'Client-side archival'],
    howToSteps: [
      { name: 'Input HTML', text: 'Paste HTML code or content to render.' },
      { name: 'Render Layout', text: 'Styles and DOM structures are transformed to PDF canvas.' },
      { name: 'Download PDF', text: 'Save your digital web document.' }
    ],
    quickAnswer: 'To convert HTML to PDF: Paste HTML/CSS code or web content, click "Render PDF", and save a formatted document with preserved styles and typography.',
    longDescription: 'Render digital receipts, HTML newsletters, reports, and styled markup into PDF format. Accurately preserves CSS typography, table structures, colors, and layout geometry.',
    useCases: [
      { title: 'Invoice & Receipt Archival', description: 'Convert HTML email receipts and billing statements into permanent PDF tax records.' },
      { title: 'Documentation Export', description: 'Export developer documentation and styled web articles for offline reading.' }
    ],
    faqs: [
      { q: 'Does it support custom CSS styling?', a: 'Yes, standard inline CSS and embedded stylesheet styles are rendered directly onto the PDF canvas.' },
      { q: 'Is the converted text searchable?', a: 'Yes, text rendered from HTML is selectable and searchable in all PDF readers.' },
      { q: 'Are external web requests made?', a: 'No. Rendering occurs entirely in your browser memory for maximum security.' }
    ],
    relatedTools: [ToolType.PDF_TO_WORD, ToolType.EDIT],
    relatedGuides: ['how-to-convert-pdf-to-word']
  },
  {
    id: ToolType.EDIT,
    title: 'Edit PDF',
    seoTitle: 'Free Online PDF Editor – Add Text, Draw & Annotate PDFs',
    canonicalPath: '/edit-pdf',
    path: '/edit',
    description: 'Add text, custom annotations, signatures, and freehand drawings directly onto PDF pages.',
    icon: 'Type',
    category: 'edit',
    quickAnswer: 'To edit a PDF: Upload your file, click the Text, Draw, or Image tool to add content onto the page canvas, and click "Save PDF" to export your annotated document with 100% privacy.',
    longDescription: 'A versatile, offline-capable PDF editor. Type text notes, highlight important clauses, place images, and draw annotations with adjustable pen colors and stroke widths.',
    features: ['Add custom text with font sizing', 'Freehand drawing & highlighter', 'Place & resize image overlays', 'Save without flattening text layers'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Open the document in the interactive visual editor.' },
      { name: 'Add Annotations', text: 'Use text, pencil, or image tools to place edits onto pages.' },
      { name: 'Save & Export', text: 'Click "Save PDF" to export your updated document.' }
    ],
    useCases: [
      { title: 'Form Filling & Annotations', description: 'Type text directly into unfillable PDF forms and add dates, notes, and checkmarks.' },
      { title: 'Design Review & Markup', description: 'Draw freehand callouts and highlight text passages during collaborative document reviews.' }
    ],
    faqs: [
      { q: 'Can I add images like stamps or logos?', a: 'Yes, you can upload PNG/JPG stamps or logos and resize them directly on the page.' },
      { q: 'Can I change font sizes and colors?', a: 'Yes, the text tool allows customizable font sizes, line heights, and stroke colors.' },
      { q: 'Does editing flatten or blur the original text?', a: 'No, vector text layers remain sharp and unmodified beneath your annotations.' }
    ],
    relatedTools: [ToolType.SIGN, ToolType.REDACT, ToolType.WATERMARK, ToolType.PAGE_NUMBERS],
    relatedGuides: ['how-to-edit-a-pdf']
  },
  {
    id: ToolType.PROTECT,
    title: 'Protect PDF',
    seoTitle: 'Protect PDF Online – Encrypt PDF Files with Password',
    canonicalPath: '/protect-pdf',
    path: '/protect',
    description: 'Encrypt your confidential PDF files with 128/256-bit AES password protection and permission locks.',
    icon: 'Lock',
    category: 'security',
    quickAnswer: 'To protect a PDF: Upload your document, type your secret password, and click "Protect PDF". The file is encrypted with AES security right in your browser.',
    longDescription: 'Secure sensitive legal contracts, medical charts, and financial records with enterprise-grade encryption. Set user passwords and restrict printing, copying, and unauthorized modifications.',
    features: ['Strong AES encryption', 'Prevent printing and copying', 'Instant local encryption', 'No master password storage'],
    howToSteps: [
      { name: 'Upload File', text: 'Select the PDF document to encrypt.' },
      { name: 'Enter Password', text: 'Type a strong, memorable secret password.' },
      { name: 'Encrypt & Download', text: 'Download your password-protected PDF file.' }
    ],
    useCases: [
      { title: 'Confidential Client Data', description: 'Encrypt tax documents, medical records, and payroll data before emailing clients.' },
      { title: 'Restricting Document Permissions', description: 'Prevent unauthorized printing, copying, or content extraction from proprietary whitepapers.' }
    ],
    faqs: [
      { q: 'Can anyone open the PDF without the password?', a: 'No. The file content is mathematically encrypted and cannot be rendered without the correct password.' },
      { q: 'What encryption standard is used?', a: 'Standard AES-128 and AES-256 bit encryption compatible with Adobe Acrobat and all standard PDF readers.' },
      { q: 'Do you store or log my password?', 'a': 'Never. Encryption keys are generated in browser memory and immediately discarded.' }
    ],
    relatedTools: [ToolType.UNLOCK, ToolType.REDACT, ToolType.SIGN],
    relatedGuides: ['how-to-protect-a-pdf']
  },
  {
    id: ToolType.UNLOCK,
    title: 'Unlock PDF',
    seoTitle: 'Unlock PDF Online – Remove PDF Password Protection',
    canonicalPath: '/unlock-pdf',
    path: '/unlock',
    description: 'Remove password restrictions and security locks from PDF files you have permissions to access.',
    icon: 'Unlock',
    category: 'security',
    quickAnswer: 'To unlock a PDF: Upload your encrypted file, provide the authorized password (or use Turbo recovery for lost simple PINs), and download a permanently unlocked PDF copy.',
    longDescription: 'Strip passwords and permission restrictions from PDFs you own. Decrypt files to allow seamless printing, copying, and editing without entering passwords every time you open them.',
    features: ['Instant password removal', 'High-speed multi-threaded worker recovery', 'Remove copy/print restrictions', 'Zero server access'],
    howToSteps: [
      { name: 'Upload Encrypted PDF', text: 'Choose the locked PDF file.' },
      { name: 'Provide Password', text: 'Enter password or trigger local worker unlock.' },
      { name: 'Download Unlocked PDF', text: 'Save the unrestricted, password-free PDF.' }
    ],
    useCases: [
      { title: 'Remove Personal Passwords', description: 'Strip recurring passwords from bank statements and tax filings you own for seamless archiving.' },
      { title: 'Enable Printing & Copying', description: 'Remove restrictive permission locks from documents you are authorized to edit.' }
    ],
    faqs: [
      { q: 'Does this violate copyright or security?', a: 'This tool is intended for document owners and authorized parties to remove restrictions from files they legitimately possess.' },
      { q: 'How fast is password removal?', a: 'If you know the password, removal is instant. For forgotten PINs, the multi-threaded worker tests thousands of combinations per second.' },
      { q: 'Is the unlocked file identical to the original?', a: 'Yes, exact vector fonts, layout, and visual fidelity are 100% preserved.' }
    ],
    relatedTools: [ToolType.PROTECT, ToolType.REDACT, ToolType.EDIT],
    relatedGuides: ['how-to-protect-a-pdf']
  },
  {
    id: ToolType.SIGN,
    title: 'Sign PDF',
    seoTitle: 'Sign PDF Online – Add Digital & Handwritten Signatures Free',
    canonicalPath: '/sign-pdf',
    path: '/sign',
    description: 'Sign contracts, lease agreements, and documents online with drawn, typed, or uploaded signatures.',
    icon: 'PenTool',
    category: 'security',
    quickAnswer: 'To sign a PDF: Upload your document, draw your signature on the canvas (or upload a signature image), position it onto the signature line, and download your signed PDF.',
    longDescription: 'Execute agreements quickly without printing, pen-signing, and scanning. Create beautiful smooth handwritten signatures on touchscreens or mouse, customize placement, and burn onto contracts.',
    features: ['Smooth vector signature pad', 'Upload transparent PNG signatures', 'Custom position presets', 'Privacy-first signature burning'],
    howToSteps: [
      { name: 'Upload Agreement', text: 'Open the contract or document requiring your signature.' },
      { name: 'Create Signature', text: 'Draw with your mouse/touchscreen or upload a signature image.' },
      { name: 'Position & Save', text: 'Choose placement (e.g. bottom-right) and download the signed PDF.' }
    ],
    useCases: [
      { title: 'Remote Agreement Execution', description: 'Sign NDAs, employment offers, and real estate leases on your phone or laptop in seconds.' },
      { title: 'Invoice Approval', description: 'Stamp approved signatures onto contractor invoices and purchase orders without printing.' }
    ],
    faqs: [
      { q: 'Is my signature stored on your servers?', a: 'No. Signatures are generated and embedded directly in your device memory.' },
      { q: 'Can I upload an existing signature image?', a: 'Yes, you can upload transparent PNG signature stamps or draw with mouse/touchscreen.' },
      { q: 'Is a digitally signed PDF legally binding?', a: 'Electronic signatures are widely recognized under ESIGN and eIDAS acts for standard commercial agreements.' }
    ],
    relatedTools: [ToolType.PROTECT, ToolType.EDIT, ToolType.REDACT],
    relatedGuides: ['how-to-sign-a-pdf']
  },
  {
    id: ToolType.REDACT,
    title: 'Redact PDF',
    seoTitle: 'Redact PDF Online – Permanently Black Out Sensitive Data',
    canonicalPath: '/redact-pdf',
    path: '/redact',
    description: 'Permanently destroy and black out sensitive personal data, SSNs, credit cards, and confidential text from PDFs.',
    icon: 'EyeOff',
    category: 'security',
    quickAnswer: 'To redact a PDF: Upload your file, draw black redaction boxes over confidential information, and click "Apply Redactions & Save". The underlying content is permanently destroyed via raster burning.',
    longDescription: 'Unlike basic PDF tools that merely place visual black rectangles over selectable text, PDFBolt utilizes a true raster-flattening security pipeline. Redacted areas are physically wiped and rasterized, ensuring text cannot be copied, inspected via DevTools, or recovered.',
    features: ['True irreversible redaction', 'Pixel-level raster burning', 'Multi-page redaction selector', 'Protects SSN, financial, and PII data'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Open the sensitive document in the redaction canvas.' },
      { name: 'Draw Redaction Boxes', text: 'Click and drag over private names, account numbers, or text.' },
      { name: 'Burn & Export', text: 'Click Apply Redactions to permanently destroy underlying data.' }
    ],
    useCases: [
      { title: 'Court Evidence & Discovery', description: "Permanently destroy social security numbers, minors' names, and bank details from legal filings." },
      { title: 'FOIA & Public Disclosures', description: 'Sanitize government and corporate public records before online publication.' }
    ],
    faqs: [
      { q: 'Can someone highlight or copy text underneath the black boxes?', a: 'No. Our tool permanently renders the redacted regions to raster image pixels. There is zero underlying text in the output file.' },
      { q: 'How does true raster sanitization work?', a: 'Underlying text, paths, and metadata streams are stripped and replaced with burned pixels.' },
      { q: 'Can I redact multiple pages at once?', a: 'Yes, you can navigate through the entire document and place redaction boxes across all pages before burning.' }
    ],
    relatedTools: [ToolType.PROTECT, ToolType.EDIT, ToolType.DELETE_PAGES],
    relatedGuides: ['how-to-redact-a-pdf']
  },
  {
    id: ToolType.OCR,
    title: 'OCR PDF',
    seoTitle: 'OCR PDF Online – Make Scanned PDFs Searchable & Selectable',
    canonicalPath: '/ocr-pdf',
    path: '/ocr',
    description: 'Extract text from scanned PDFs and photos using high-accuracy Optical Character Recognition.',
    icon: 'Search',
    category: 'utilities',
    quickAnswer: 'To OCR a PDF: Upload your scanned document or image, select language, and click "Run OCR" to extract digitized, searchable text directly in your browser using Tesseract.js.',
    longDescription: 'Transform unselectable scanned paper documents, receipts, and book photos into searchable, editable text. Powered by client-side Tesseract.js and OpenCV image preprocessing filters.',
    features: ['Multi-language OCR engine', 'OpenCV image contrast enhancement', 'Searchable text layer creation', '100% Client-side privacy'],
    howToSteps: [
      { name: 'Upload Scanned PDF', text: 'Select the image-heavy or scanned document.' },
      { name: 'Process OCR', text: 'The neural network recognizes character geometries.' },
      { name: 'Copy or Download', text: 'Export recognized text or save as a searchable document.' }
    ],
    useCases: [
      { title: 'Archival Searchability', description: 'Make massive archives of scanned historical books, receipts, and invoices searchable by keyword.' },
      { title: 'Copying Text from Scans', description: 'Extract quotes and paragraphs from locked image PDFs without manual retyping.' }
    ],
    faqs: [
      { q: 'Does OCR require an internet connection?', a: 'Once loaded, the WebAssembly OCR engine runs entirely offline on your local machine.' },
      { q: 'What languages are supported?', a: 'English, Spanish, French, German, and major European character sets.' },
      { q: 'Does it enhance low-contrast scans?', a: 'Yes, built-in OpenCV filters automatically enhance contrast and remove background noise for higher accuracy.' }
    ],
    relatedTools: [ToolType.SCAN_TO_PDF, ToolType.SCAN_HANDWRITING, ToolType.PDF_TO_WORD],
    relatedGuides: ['how-to-ocr-a-pdf']
  },
  {
    id: ToolType.SCAN_TO_PDF,
    title: 'Scan to PDF',
    seoTitle: 'Scan to PDF – Mobile & Web Document Camera Scanner',
    canonicalPath: '/scan-to-pdf',
    path: '/scan-pdf',
    description: 'Scan physical paper documents using your smartphone or laptop webcam with edge detection.',
    icon: 'Scan',
    category: 'convert-to',
    features: ['Auto document edge detection', 'Perspective correction & deskew', 'B&W and High-Contrast document filters', 'Multi-page batch scanning'],
    howToSteps: [
      { name: 'Open Camera', text: 'Grant camera access and position document in viewfinder.' },
      { name: 'Snap Pages', text: 'Capture pages with automatic perspective cropping.' },
      { name: 'Generate PDF', text: 'Combine all captured scans into a clean PDF document.' }
    ],
    quickAnswer: 'To scan to PDF: Open the camera scanner, capture physical pages with auto-cropping and contrast filtering, and download a clean, multi-page PDF document.',
    longDescription: 'Turn your smartphone camera or laptop webcam into a high-performance document scanner. Features real-time corner edge detection, perspective deskewing, and document contrast filters.',
    useCases: [
      { title: 'Paper Contract Digitization', description: 'Capture signed physical agreements and convert them into crisp black-and-white PDFs.' },
      { title: 'Homework & Assignment Submission', description: 'Snap photos of handwritten assignments, auto-deskew pages, and submit a single unified PDF.' }
    ],
    faqs: [
      { q: 'Does it work directly on mobile browsers?', a: 'Yes, it accesses your smartphone camera directly through mobile Chrome and Safari.' },
      { q: 'Does it automatically straighten tilted photos?', a: 'Yes, our edge detection filter corrects skewed angles and crops out unwanted background tables.' },
      { q: 'Can I apply high-contrast filters to remove shadows?', a: 'Yes, choose between Color, Grayscale, and B&W Document modes to eliminate shadows.' }
    ],
    relatedTools: [ToolType.SCAN_HANDWRITING, ToolType.OCR, ToolType.JPG_TO_PDF],
    relatedGuides: ['how-to-ocr-a-pdf']
  },
  {
    id: ToolType.SCAN_HANDWRITING,
    title: 'Handwriting to PDF',
    seoTitle: 'Handwriting to PDF – Convert Handwritten Notes to Text PDF',
    canonicalPath: '/scan-handwriting-to-pdf',
    path: '/scan-handwriting',
    description: 'Capture handwritten notebook pages and transcribe them into computerized typed PDF text.',
    icon: 'PenTool',
    category: 'convert-to',
    features: ['Handwriting OCR recognition', 'Word-wrapping pagination', 'Editable digitized text', 'Private offline transcription'],
    howToSteps: [
      { name: 'Snap Note', text: 'Take a clear, well-lit photo of your handwriting.' },
      { name: 'Transcribe', text: 'The OCR engine transcribes handwritten words into text.' },
      { name: 'Export Typed PDF', text: 'Generate a clean computerized PDF document.' }
    ],
    quickAnswer: 'To convert handwriting to PDF: Upload a photo of handwritten notes, run the handwriting OCR model, and export editable, digitized PDF text.',
    longDescription: 'Transcribe handwritten lecture notes, meeting journals, and whiteboards into computerized, searchable PDF text. Combines neural OCR with automated word-wrapping and layout formatting.',
    useCases: [
      { title: 'Student Lecture Notes', description: 'Digitize handwritten spiral notebooks into searchable study guides and summaries.' },
      { title: 'Meeting & Whiteboard Capture', description: 'Convert brainstorming notes from whiteboards into structured text documents.' }
    ],
    faqs: [
      { q: 'How accurate is handwriting recognition?', a: 'Accuracy is highest on clear, well-spaced handwriting with good lighting and contrast.' },
      { q: 'Can I edit the recognized text before saving?', a: 'Yes, you can review, edit, and format the transcribed text before generating the final PDF.' },
      { q: 'Is my handwriting processed privately?', a: 'Yes, OCR recognition runs locally in your browser without uploading notes to third-party servers.' }
    ],
    relatedTools: [ToolType.SCAN_TO_PDF, ToolType.OCR, ToolType.PDF_TO_WORD],
    relatedGuides: ['how-to-ocr-a-pdf']
  },
  {
    id: ToolType.ROTATE,
    title: 'Rotate PDF',
    seoTitle: 'Rotate PDF Online – Rotate PDF Pages Permanently',
    canonicalPath: '/rotate-pdf',
    path: '/rotate',
    description: 'Rotate upside-down or sideways PDF pages 90, 180, or 270 degrees permanently.',
    icon: 'RotateCw',
    category: 'edit',
    features: ['Rotate 90°, 180°, 270°', 'Rotate single pages or all pages', 'Permanent orientation saving', 'Zero quality loss'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Choose the file with misaligned pages.' },
      { name: 'Click Rotate', text: 'Turn pages 90 degrees clockwise or counterclockwise.' },
      { name: 'Save PDF', text: 'Download the permanently oriented file.' }
    ],
    quickAnswer: 'To rotate PDF pages: Upload your document, select 90° clockwise or counterclockwise, choose specific pages or all pages, and download your permanently rotated PDF.',
    longDescription: 'Fix upside-down scans and sideways diagrams instantly. Modify internal PDF orientation matrix flags permanently so pages display correctly in every PDF viewer.',
    useCases: [
      { title: 'Upside-Down Scans', description: 'Fix inverted document pages from flatbed scanners with a single 180° rotation click.' },
      { title: 'Landscape Chart Alignment', description: 'Rotate landscape spreadsheets and blueprints 90° to match the orientation of surrounding portrait pages.' }
    ],
    faqs: [
      { q: 'Can I rotate only specific pages rather than the whole document?', a: 'Yes, you can choose individual page thumbnails to rotate or apply rotation to all pages.' },
      { q: 'Will rotating degrade the visual quality or text sharpness?', a: 'No. Rotation only modifies the page view matrix metadata without re-encoding text or images.' },
      { q: 'Is the rotation permanent?', a: 'Yes, the rotation is saved into the PDF header and displays correctly across all devices.' }
    ],
    relatedTools: [ToolType.ORGANIZE, ToolType.DELETE_PAGES, ToolType.SPLIT],
    relatedGuides: ['how-to-remove-pages-from-pdf']
  },
  {
    id: ToolType.ORGANIZE,
    title: 'Organize PDF',
    seoTitle: 'Organize PDF Online – Reorder, Rotate & Delete Pages',
    canonicalPath: '/organize-pdf',
    path: '/organize',
    description: 'Visual drag-and-drop workspace to reorder, duplicate, rotate, or delete PDF pages easily.',
    icon: 'Layout',
    category: 'edit',
    features: ['Thumbnail grid overview', 'Drag-and-drop reordering', 'Single-click page rotation', 'Quick page deletion'],
    howToSteps: [
      { name: 'Upload Document', text: 'View all pages as thumbnail tiles.' },
      { name: 'Rearrange', text: 'Drag thumbnails into the perfect order.' },
      { name: 'Save Organized PDF', text: 'Download your polished file structure.' }
    ],
    quickAnswer: 'To organize PDF pages: Upload your document, drag thumbnail tiles to reorder pages, rotate or delete unwanted pages, and download your newly arranged PDF.',
    longDescription: 'The ultimate visual workspace for PDF page manipulation. View all pages as interactive grid thumbnails. Rearrange sections, delete blanks, duplicate key pages, and re-sequence documents.',
    useCases: [
      { title: 'Proposal Assembly', description: 'Re-sequence cover pages, executive summaries, pricing sections, and appendices seamlessly.' },
      { title: 'Audit Preparation', description: 'Arrange invoices and supporting receipts in exact chronological order.' }
    ],
    faqs: [
      { q: 'How do I rearrange pages?', a: 'Simply click and drag any page thumbnail to its new position in the visual grid.' },
      { q: 'Can I delete pages while organizing?', a: 'Yes, hover over any page thumbnail and click the trash icon to remove it.' },
      { q: 'Are bookmarks and links preserved?', a: 'Yes, intact page structures and contents are preserved during page reorganization.' }
    ],
    relatedTools: [ToolType.MERGE, ToolType.SPLIT, ToolType.ROTATE, ToolType.DELETE_PAGES],
    relatedGuides: ['how-to-remove-pages-from-pdf']
  },
  {
    id: ToolType.PAGE_NUMBERS,
    title: 'Add Page Numbers',
    seoTitle: 'Add Page Numbers to PDF – Number PDF Pages Online',
    canonicalPath: '/add-page-numbers-to-pdf',
    path: '/page-numbers',
    description: 'Insert customizable header or footer page numbers with standard format templates.',
    icon: 'Hash',
    category: 'edit',
    features: ['Page X of Y formatting', 'Custom positioning (top/bottom, left/center/right)', 'Custom starting page index', 'Font size and styling options'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Select the document that needs pagination.' },
      { name: 'Configure Numbering', text: 'Choose position, format style, and margin.' },
      { name: 'Apply Numbers', text: 'Download your professionally numbered PDF.' }
    ],
    quickAnswer: 'To add page numbers: Upload your PDF, select numbering style (Page X of Y, 1,2,3), choose position (top/bottom, left/center/right), and apply numbers instantly.',
    longDescription: 'Add professional pagination to unnumbered reports, court filings, and research papers. Customize font size, margins, format templates, and starting page index.',
    useCases: [
      { title: 'Legal Pleadings & Briefs', description: 'Number court submissions with precise bottom-center or bottom-right Bates/page pagination.' },
      { title: 'Theses & Academic Dissertations', description: 'Paginate multi-chapter academic papers starting after the title page.' }
    ],
    faqs: [
      { q: 'Can I start numbering from a specific page (e.g. skip cover page)?', a: 'Yes, you can set a starting page offset so cover sheets remain unnumbered.' },
      { q: 'Can I customize the numbering format?', a: 'Yes, choose from standard formats like "1, 2, 3", "Page 1 of 10", or "1 / 10".' },
      { q: 'Does adding page numbers alter existing text?', a: 'No, page numbers are placed on a clean overlay layer without displacing existing document text.' }
    ],
    relatedTools: [ToolType.WATERMARK, ToolType.EDIT, ToolType.MERGE],
    relatedGuides: ['how-to-edit-a-pdf']
  },
  {
    id: ToolType.WATERMARK,
    title: 'Watermark PDF',
    seoTitle: 'Watermark PDF Online – Add Text & Stamp Watermarks to PDF',
    canonicalPath: '/watermark-pdf',
    path: '/watermark',
    description: 'Stamp customized text watermarks (CONFIDENTIAL, DRAFT, COPY) across your PDF pages.',
    icon: 'Droplets',
    category: 'edit',
    features: ['Custom text and angle adjustment', 'Opacity and color control', 'Repeat on all pages', 'Protects against unauthorized sharing'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Choose your document.' },
      { name: 'Enter Text', text: 'Type your watermark (e.g., CONFIDENTIAL) and adjust opacity.' },
      { name: 'Download PDF', text: 'Save your watermarked document.' }
    ],
    quickAnswer: 'To watermark a PDF: Upload your file, type your watermark text (e.g. CONFIDENTIAL or DRAFT), adjust opacity and rotation angle, and save your watermarked document.',
    longDescription: 'Protect sensitive drafts, legal contracts, and proprietary IP from unauthorized sharing. Stamp customizable text watermarks across all pages with full opacity and font controls.',
    useCases: [
      { title: 'Confidential M&A Documents', description: 'Stamp "STRICTLY CONFIDENTIAL" diagonally across all financial exhibits.' },
      { title: 'Draft Review Copies', description: 'Mark review documents with "DRAFT" to prevent premature publication.' }
    ],
    faqs: [
      { q: 'Can I adjust the watermark transparency so text remains readable?', a: 'Yes, you can adjust opacity from 10% to 100% so text underneath stays clearly legible.' },
      { q: 'Can I change the watermark angle and size?', a: 'Yes, customize font size, rotation angle (diagonal 45° or horizontal 0°), and colors.' },
      { q: 'Can watermarks be easily stripped by basic readers?', a: 'Watermarks are embedded directly into the PDF content stream for robust visibility.' }
    ],
    relatedTools: [ToolType.PROTECT, ToolType.EDIT, ToolType.PAGE_NUMBERS],
    relatedGuides: ['how-to-edit-a-pdf']
  },
  {
    id: ToolType.DELETE_PAGES,
    title: 'Delete PDF Pages',
    seoTitle: 'Delete Pages from PDF Online – Remove Unwanted PDF Pages',
    canonicalPath: '/delete-pdf-pages',
    path: '/delete-pages',
    description: 'Remove unwanted blank or duplicate pages from any PDF document in two clicks.',
    icon: 'Trash2',
    category: 'edit',
    features: ['Visual thumbnail selection', 'Bulk page removal', 'Instant local processing', 'Maintains original PDF quality'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Open the file to see all page thumbnails.' },
      { name: 'Select Pages to Remove', text: 'Click on the pages you want to delete.' },
      { name: 'Save Clean PDF', text: 'Download your updated document.' }
    ],
    quickAnswer: 'To delete pages from a PDF: Upload your document, click on the thumbnail tiles of the pages you wish to remove, and click "Save Clean PDF".',
    longDescription: 'Quickly strip out blank pages, expired terms, duplicate sheets, and unwanted appendix pages from any PDF document in seconds.',
    useCases: [
      { title: 'Remove Scanner Blank Pages', description: 'Clean up duplex scans by removing trailing blank pages.' },
      { title: 'Redact Outdated Clauses', description: 'Eliminate obsolete contract sections before sending final client agreements.' }
    ],
    faqs: [
      { q: 'Can I delete multiple pages at the same time?', a: 'Yes, click on all pages you want to remove and delete them in one single action.' },
      { q: 'What happens to the remaining pages?', a: 'Remaining pages are automatically re-indexed and preserved with original vector quality.' },
      { q: 'Can I undo if I delete the wrong page?', a: 'Your original file on your computer is untouched. You can re-select pages anytime in the workspace.' }
    ],
    relatedTools: [ToolType.SPLIT, ToolType.ORGANIZE, ToolType.MERGE],
    relatedGuides: ['how-to-remove-pages-from-pdf']
  },
  {
    id: ToolType.COMPARE,
    title: 'Compare PDF',
    seoTitle: 'Compare PDF Files Online – Find Differences Between Two PDFs',
    canonicalPath: '/compare-pdf',
    path: '/compare',
    description: 'Highlight text and visual differences between two PDF document revisions side-by-side.',
    icon: 'Files',
    category: 'utilities',
    features: ['Side-by-side visual diff', 'Text additions/deletions tracking', 'Contract revision checking', 'Completely private'],
    howToSteps: [
      { name: 'Upload Both PDFs', text: 'Select Document A (Original) and Document B (Modified).' },
      { name: 'Run Comparison', text: 'The engine analyzes text and visual differences.' },
      { name: 'Review Diff', text: 'Inspect highlighted changes side-by-side.' }
    ],
    quickAnswer: 'To compare two PDFs: Upload Document A (Original) and Document B (Revision), click "Compare Documents", and inspect side-by-side text and visual diff highlights.',
    longDescription: 'Catch stealthy contract alterations, price changes, and formatting tweaks between two PDF document revisions. Highlights additions, deletions, and visual pixel differences.',
    useCases: [
      { title: 'Contract Negotiation & Redlines', description: 'Verify that counterparty revisions only changed agreed-upon contract clauses.' },
      { title: 'Blueprint & Schematic Revisions', description: 'Spot subtle geometric modifications between architectural CAD drawing versions.' }
    ],
    faqs: [
      { q: 'Does it compare text content or visual pixels?', a: 'Our engine performs both semantic text diffing and side-by-side visual comparison.' },
      { q: 'Are confidential documents safe during comparison?', a: '100% safe. Document comparison runs entirely within your browser memory.' },
      { q: 'Can I compare documents with different page counts?', a: 'Yes, the comparison engine handles inserted or deleted pages gracefully.' }
    ],
    relatedTools: [ToolType.EDIT, ToolType.MERGE],
    relatedGuides: ['how-to-edit-a-pdf']
  },
  {
    id: ToolType.REPAIR,
    title: 'Repair PDF',
    seoTitle: 'Repair PDF Online – Fix Damaged & Corrupted PDF Files',
    canonicalPath: '/repair-pdf',
    path: '/repair',
    description: 'Recover data and fix broken cross-reference tables in damaged or corrupted PDF files.',
    icon: 'Wrench',
    category: 'utilities',
    features: ['Rebuild broken XRef tables', 'Recover unreadable text streams', 'Clean corrupted headers', 'Instant in-browser recovery'],
    howToSteps: [
      { name: 'Upload Damaged PDF', text: 'Select the broken or unreadable PDF file.' },
      { name: 'Rebuild Structure', text: 'The recovery parser re-indexes intact data streams.' },
      { name: 'Download Repaired PDF', text: 'Save your recovered document.' }
    ],
    quickAnswer: 'To repair a PDF: Upload the damaged or unreadable file, let the recovery engine reconstruct damaged cross-reference tables and trailers, and download your recovered PDF.',
    longDescription: 'Recover corrupted, truncated, or unreadable PDF files. Reconstructs damaged XRef tables, locates orphaned object streams, and restores document catalog hierarchies.',
    useCases: [
      { title: 'Corrupted Email Downloads', description: 'Repair PDFs that failed mid-transfer or corrupted during download.' },
      { title: 'Legacy File Restoration', description: 'Restore older PDF documents created with obsolete software that fail in modern viewers.' }
    ],
    faqs: [
      { q: 'What types of PDF corruption can be repaired?', a: 'Damaged cross-reference tables, missing EOF markers, broken object streams, and syntax header errors.' },
      { q: 'Will text and images be restored?', a: 'All intact data streams within the file are salvaged and re-indexed into a valid document.' },
      { q: 'What if the file is completely unreadable?', a: 'Our multi-tier engine utilizes deep structural reconstruction to recover every recoverable page.' }
    ],
    relatedTools: [ToolType.COMPRESS, ToolType.UNLOCK],
    relatedGuides: ['how-to-compress-a-pdf']
  },
  {
    id: ToolType.PDF_TO_QR,
    title: 'PDF to QR Code',
    seoTitle: 'PDF to QR Code Converter – Generate Scannable PDF QR Codes',
    canonicalPath: '/pdf-to-qr-code',
    path: '/pdf-to-qr',
    description: 'Generate high-resolution QR codes for PDF menus, brochures, and flyers with optional PIN security.',
    icon: 'QrCode',
    category: 'extra',
    features: ['High-res vector QR code export', 'Optional PIN protection', 'Configurable expiration timers', 'Scan-to-view mobile landing pages'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Select the menu, catalog, or flyer.' },
      { name: 'Set Security', text: 'Optionally set an access PIN and expiry.' },
      { name: 'Download QR Code', text: 'Print your QR code onto physical signage.' }
    ],
    quickAnswer: 'To create a QR code for a PDF: Upload your PDF document, configure optional PIN protection or expiry, and download a high-resolution QR code image for print or web.',
    longDescription: 'Generate instant, scannable QR codes for restaurant menus, real estate flyers, conference brochures, and product manuals. Users can scan the QR code to view your PDF on mobile instantly.',
    useCases: [
      { title: 'Restaurant Menus', description: 'Place QR codes on dining tables for contactless digital menu viewing on customer phones.' },
      { title: 'Real Estate & Product Flyers', description: 'Print QR codes on property signs and product packaging to provide instant spec sheets.' }
    ],
    faqs: [
      { q: 'Can anyone with a smartphone scan the QR code?', a: 'Yes, it works natively with the standard camera app on iOS and Android.' },
      { q: 'Can I protect the PDF with a PIN?', a: 'Yes, you can set an optional PIN so only authorized scanners can access the file.' },
      { q: 'What image formats can I download the QR code in?', a: 'You can download the QR code as high-resolution PNG or SVG for professional printing.' }
    ],
    relatedTools: [ToolType.COMPRESS, ToolType.PROTECT],
    relatedGuides: ['how-to-protect-a-pdf']
  },
  {
    id: ToolType.ANALYZER,
    title: 'AI PDF Analyzer & Builder',
    seoTitle: 'AI PDF Analyzer & Builder – Document Intelligence & Presentation Generator',
    canonicalPath: '/analyze-pdf',
    path: '/analyze',
    description: 'Extract document structure, word counts, reading times, topics, executive summaries, and transform into 10-slide presentations or reports.',
    icon: 'Sparkles',
    category: 'utilities',
    quickAnswer: 'To analyze a PDF: Upload your file to get instant structural stats, topics, and an executive summary. You can then ask questions or click "10-Slide PPTX Deck" to build a presentation instantly.',
    longDescription: 'Go beyond basic conversion. PDFBolt AI Analyzer & Builder extracts deep semantic metadata, detects tables and images, summarizes key findings, and allows you to ask questions or transform the document into editable PowerPoint decks, Word reports, or Excel spreadsheets with zero data uploads.',
    features: ['Instant word, table & image counters', 'Heuristic & AI topic extraction', 'Interactive Ask-PDF question answering', '1-Click PPTX / DOCX / XLSX multi-output builder'],
    howToSteps: [
      { name: 'Upload PDF', text: 'Select any PDF document for instant local analysis.' },
      { name: 'Review Intelligence', text: 'Inspect topics, word counts, and executive summary.' },
      { name: 'Build Outputs', text: 'Export directly to PowerPoint, Word, Excel, or Notes.' }
    ],
    useCases: [
      { title: 'Executive Document Briefing', description: 'Generate instant executive summaries, word counts, and topic breakdowns from 50+ page PDF reports.' },
      { title: '1-Click Slide Deck Generation', description: 'Automatically convert dense research papers into structured 10-slide PowerPoint presentations.' }
    ],
    faqs: [
      { q: 'Is my document sent to an external server?', a: 'No! All text extraction and presentation generation runs 100% locally in your browser memory.' },
      { q: 'Can I ask questions about the PDF?', a: 'Yes, the interactive Q&A assistant queries the local document text model in real-time.' },
      { q: 'What file formats can it generate?', a: 'Export directly to PowerPoint (.pptx), Word (.docx), Excel (.xlsx), or Markdown notes.' }
    ],
    relatedTools: [ToolType.PDF_TO_PPT, ToolType.PDF_TO_WORD, ToolType.PDF_TO_EXCEL, ToolType.OCR],
    relatedGuides: ['how-to-convert-pdf-to-word', 'how-to-convert-pdf-to-ppt']
  }
];

// ==========================================
// 2. COMPREHENSIVE HOW-TO GUIDES (12+ Guides)
// ==========================================
export const GUIDES: Guide[] = [
  {
    slug: 'how-to-convert-pdf-to-word',
    title: 'How to Convert PDF to Word (DOCX) Without Losing Formatting',
    metaTitle: 'How to Convert PDF to Word for Free (Step-by-Step Guide)',
    metaDescription: 'Learn how to convert any PDF to an editable Microsoft Word (.docx) file for free in your browser with zero formatting loss or software installation.',
    category: 'convert',
    readTime: '4 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.PDF_TO_WORD,
    summary: 'Converting a PDF into an editable Microsoft Word document allows you to update contracts, tweak resumes, and repurpose document text without retyping.',
    quickAnswer: 'To convert a PDF to Word: 1. Go to PDFBolt PDF to Word. 2. Drag & drop your PDF file into the uploader. 3. Click "Convert to Word". 4. Download your editable .docx file and open in Word or Google Docs.',
    steps: [
      { name: 'Open the PDF to Word Tool', text: 'Navigate to the PDF to Word converter on PDFBolt. No login or email required.' },
      { name: 'Upload Your PDF File', text: 'Select your PDF from your computer or mobile device. Files are processed securely in your browser.' },
      { name: 'Execute Conversion', text: 'The tool reconstructs font families, headings, paragraphs, and tables.' },
      { name: 'Download Your Editable DOCX', text: 'Save your file and edit it freely in Microsoft Word, Google Docs, or Apple Pages.' }
    ],
    detailedContent: [
      {
        heading: 'Why Convert PDF to Word Instead of Copy-Pasting?',
        paragraphs: [
          'Direct copy-pasting from a PDF often results in scrambled line breaks, lost margins, broken tables, and missing formatting. An automated converter parses the underlying PDF content stream and maps text blocks into native OpenXML paragraphs.',
          'If your document contains scanned pages, PDFBolt automatically activates client-side Optical Character Recognition (OCR) to turn image pixels into editable text.'
        ],
        proTips: [
          'Ensure the original PDF text is high resolution for the most accurate OCR font reconstruction.',
          'For financial spreadsheets, consider using the dedicated PDF to Excel converter instead.'
        ]
      }
    ],
    faqs: [
      { q: 'Will my converted Word document look identical to the PDF?', a: 'Yes, paragraph margins, font sizes, headings, and alignments are reconstructed with high precision.' },
      { q: 'Are my private documents uploaded to a cloud server?', a: 'No, PDFBolt processes your document directly in your browser memory.' }
    ],
    relatedGuides: ['how-to-convert-pdf-to-excel', 'how-to-convert-pdf-to-ppt', 'how-to-ocr-a-pdf'],
    relatedTools: [ToolType.PDF_TO_WORD, ToolType.WORD_TO_PDF, ToolType.OCR]
  },
  {
    slug: 'how-to-compress-a-pdf',
    title: 'How to Compress a PDF to Reduce File Size Below 10MB or 2MB',
    metaTitle: 'How to Compress a PDF Online (Fast & Free Size Reduction)',
    metaDescription: 'Step-by-step guide on how to shrink large PDF files for email attachments and portal submissions without making text blurry.',
    category: 'manage',
    readTime: '3 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.COMPRESS,
    summary: 'Email providers and government portals often reject files larger than 10MB or 2MB. Learn how intelligent PDF compression removes redundant metadata while keeping vector text sharp.',
    quickAnswer: 'To compress a PDF: 1. Open PDFBolt PDF Compressor. 2. Upload your file. 3. Select compression mode (Smart or Maximum). 4. Click "Compress PDF" and download your optimized, lightweight file.',
    steps: [
      { name: 'Select Your Heavy PDF', text: 'Drag and drop your document into the compression box.' },
      { name: 'Choose Compression Strength', text: 'Select "Smart Recommended" for standard sharing or "Maximum" for strict size limits.' },
      { name: 'Download Email-Ready File', text: 'Save your compressed document with up to 80% reduced footprint.' }
    ],
    detailedContent: [
      {
        heading: 'How Client-Side PDF Compression Works',
        paragraphs: [
          'PDF documents often accumulate duplicate font subsets, uncompressed XML metadata streams, and excessive unreferenced objects. Our compression engine purges dead objects and applies stream deflate algorithms.',
          'Unlike basic tools that turn your entire document into low-resolution blurry JPEG images, PDFBolt preserves true vector fonts so your text remains crystal-sharp at any zoom level.'
        ],
        proTips: [
          'For scanned documents with enormous page sizes, run the OCR tool first to optimize image layers.'
        ]
      }
    ],
    faqs: [
      { q: 'Can I compress a PDF to under 2MB for job portals?', a: 'Yes! Select the Maximum compression setting to optimize heavy images down to portal limits.' }
    ],
    relatedGuides: ['how-to-merge-pdf-files', 'how-to-split-a-pdf'],
    relatedTools: [ToolType.COMPRESS, ToolType.MERGE, ToolType.PDF_TO_JPG]
  },
  {
    slug: 'how-to-merge-pdf-files',
    title: 'How to Merge Multiple PDF Files into One Document for Free',
    metaTitle: 'How to Combine Multiple PDFs into One File (Free & Private)',
    metaDescription: 'Learn how to combine and arrange multiple PDF documents into a single organized file in seconds directly on your device.',
    category: 'manage',
    readTime: '3 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.MERGE,
    summary: 'Combining various receipts, reports, or contracts into a single unified PDF simplifies distribution and ensures all pages stay in sequential order.',
    quickAnswer: 'To merge PDF files: 1. Go to PDFBolt Merge PDF. 2. Upload 2 or more files. 3. Drag files to reorder pages. 4. Click "Merge PDF" to stitch them together and download.',
    steps: [
      { name: 'Upload PDF Files', text: 'Add two or more PDF files from your computer or phone.' },
      { name: 'Arrange Page Sequence', text: 'Drag document cards to set the exact order you want them merged.' },
      { name: 'Combine & Save', text: 'Click Merge PDF to compile and download your single stitched document.' }
    ],
    detailedContent: [
      {
        heading: 'Best Practices for Merging PDFs',
        paragraphs: [
          'When preparing legal bundles or business portfolios, make sure your page dimensions are consistent. If some pages are sideways, use the Rotate tool prior to merging.',
          'After merging, you can easily use our "Add Page Numbers" tool to apply unified pagination across the entire combined document.'
        ]
      }
    ],
    faqs: [
      { q: 'Can I add more files after starting?', a: 'Yes, use the "Add More Files" button at any time to include additional documents.' }
    ],
    relatedGuides: ['how-to-split-a-pdf', 'how-to-edit-a-pdf', 'how-to-remove-pages-from-pdf'],
    relatedTools: [ToolType.MERGE, ToolType.SPLIT, ToolType.PAGE_NUMBERS, ToolType.ROTATE]
  },
  {
    slug: 'how-to-convert-pdf-to-ppt',
    title: 'How to Convert PDF Presentations to Editable PowerPoint (PPTX)',
    metaTitle: 'Convert PDF to PowerPoint Online – Free PPTX Converter Guide',
    metaDescription: 'Detailed walkthrough on turning PDF slide handouts and presentation exports back into editable PowerPoint (.pptx) decks.',
    category: 'convert',
    readTime: '4 min read',
    difficulty: 'Intermediate',
    updatedAt: '2026-08-16',
    toolId: ToolType.PDF_TO_PPT,
    summary: 'Reclaim editable slides from static PDF presentations with 1:1 page-to-slide mapping.',
    quickAnswer: 'To convert PDF to PPT: 1. Upload your PDF slides to PDFBolt PDF to PPT. 2. Click "Convert to PPTX". 3. Download the presentation and open in PowerPoint or Google Slides.',
    steps: [
      { name: 'Upload Slide PDF', text: 'Select your PDF presentation.' },
      { name: 'Generate Presentation', text: 'The engine constructs 16:9 presentation slides.' },
      { name: 'Download PPTX', text: 'Open in Microsoft PowerPoint or Keynote.' }
    ],
    detailedContent: [
      {
        heading: 'Why Converting Slides via PDFBolt is Superior',
        paragraphs: [
          'Many converters downscale slide images into pixelated 72 DPI graphics. PDFBolt compiles high-DPI canvases to ensure your charts, diagrams, and bullet points remain crisp when projected on large screens.'
        ]
      }
    ],
    faqs: [
      { q: 'Will the exported PPTX work on Keynote and Google Slides?', a: 'Yes, it outputs standardized Office OpenXML (.pptx) supported universally.' }
    ],
    relatedGuides: ['how-to-convert-pdf-to-word', 'how-to-ocr-a-pdf'],
    relatedTools: [ToolType.PDF_TO_PPT, ToolType.PPT_TO_PDF]
  },
  {
    slug: 'how-to-convert-pdf-to-excel',
    title: 'How to Extract Tabular Data from PDF into Microsoft Excel',
    metaTitle: 'How to Convert PDF Tables to Excel (.XLSX) Online',
    metaDescription: 'Extract financial statements, invoices, and data tables from PDF into structured, formula-ready Excel spreadsheets.',
    category: 'convert',
    readTime: '4 min read',
    difficulty: 'Intermediate',
    updatedAt: '2026-08-16',
    toolId: ToolType.PDF_TO_EXCEL,
    summary: 'Convert PDF tables into clean Excel rows and columns without tedious manual data entry.',
    quickAnswer: 'To convert PDF to Excel: 1. Upload your PDF report. 2. Click "Convert to Excel". 3. Download the structured .xlsx spreadsheet.',
    steps: [
      { name: 'Upload PDF Table', text: 'Select your financial report or invoice.' },
      { name: 'Detect Coordinate Grid', text: 'The parser aligns text blocks into rows and columns.' },
      { name: 'Download XLSX', text: 'Open and compute formulas in Excel or Google Sheets.' }
    ],
    detailedContent: [
      {
        heading: 'How Data Extraction Reconstructs Grids',
        paragraphs: [
          'PDF files do not naturally contain "tables"—they store floating text glyphs at absolute X/Y coordinates. Our spatial grouping algorithm determines horizontal line baselines and vertical column boundaries.'
        ]
      }
    ],
    faqs: [
      { q: 'Can I convert multi-page PDF statements?', a: 'Yes, multi-page tables are concatenated cleanly into spreadsheet rows.' }
    ],
    relatedGuides: ['how-to-convert-pdf-to-word', 'how-to-ocr-a-pdf'],
    relatedTools: [ToolType.PDF_TO_EXCEL, ToolType.EXCEL_TO_PDF, ToolType.OCR]
  },
  {
    slug: 'how-to-redact-a-pdf',
    title: 'How to Permanently Redact and Black Out Sensitive Data in PDF',
    metaTitle: 'How to Redact a PDF File Permanently (Protect Confidential Data)',
    metaDescription: 'Learn how true PDF redaction permanently destroys private text, SSNs, and numbers so they can never be recovered.',
    category: 'security',
    readTime: '5 min read',
    difficulty: 'Intermediate',
    updatedAt: '2026-08-16',
    toolId: ToolType.REDACT,
    summary: 'Drawing black boxes over text in a normal PDF editor does NOT remove the underlying text layer. Discover how true raster redaction ensures complete privacy.',
    quickAnswer: 'To redact a PDF: 1. Open PDFBolt Redact Tool. 2. Drag black boxes over sensitive information. 3. Click "Apply Redactions". The file is flattened into a raster PDF with underlying text permanently destroyed.',
    steps: [
      { name: 'Upload Document', text: 'Open the contract or document with private data.' },
      { name: 'Mark Sensitive Areas', text: 'Drag selection boxes over names, SSNs, or financial figures.' },
      { name: 'Burn Redactions', text: 'Click Apply Redactions to physically destroy underlying character data.' }
    ],
    detailedContent: [
      {
        heading: 'The Critical Difference Between Fake & True Redaction',
        paragraphs: [
          'Many famous legal blunders happen because lawyers use basic annotation tools to draw black rectangles over text. The underlying text remains in the PDF stream and can be selected, copied, or extracted with one click.',
          'PDFBolt renders the marked regions onto a physical canvas and re-embeds only the flattened image layer, making data recovery mathematically impossible.'
        ]
      }
    ],
    faqs: [
      { q: 'Can someone inspect the PDF code to see redacted text?', a: 'No. True redaction removes the underlying text glyphs completely.' }
    ],
    relatedGuides: ['how-to-protect-a-pdf', 'how-to-redact-a-pdf'],
    relatedTools: [ToolType.REDACT, ToolType.PROTECT, ToolType.EDIT]
  },
  {
    slug: 'how-to-protect-a-pdf',
    title: 'How to Password Protect and Encrypt PDF Files with AES Security',
    metaTitle: 'How to Password Protect a PDF Online (100% Free & Secure)',
    metaDescription: 'Protect confidential PDF files with 128/256-bit AES encryption and prevent unauthorized copying, printing, or editing.',
    category: 'security',
    readTime: '3 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.PROTECT,
    summary: 'Encrypt confidential agreements, bank records, and medical files with strong passwords before sharing.',
    quickAnswer: 'To password protect a PDF: 1. Upload your file to PDFBolt Protect PDF. 2. Type your secret password. 3. Click "Protect PDF" to encrypt the document with AES encryption.',
    steps: [
      { name: 'Select PDF', text: 'Choose the file you want to secure.' },
      { name: 'Set Password', text: 'Enter a strong alphanumeric password.' },
      { name: 'Download Encrypted PDF', text: 'Save your protected file.' }
    ],
    detailedContent: [
      {
        heading: 'How PDF Encryption Works',
        paragraphs: [
          'PDF encryption locks the document content stream using cryptographic keys derived from your password. Without the password, PDF viewers cannot decrypt the byte stream.'
        ]
      }
    ],
    faqs: [
      { q: 'Can I remove the password later?', a: 'Yes, you can remove passwords using our Unlock PDF tool at any time.' }
    ],
    relatedGuides: ['how-to-protect-a-pdf', 'how-to-redact-a-pdf'],
    relatedTools: [ToolType.PROTECT, ToolType.UNLOCK, ToolType.REDACT]
  },
  {
    slug: 'how-to-split-a-pdf',
    title: 'How to Split PDF Pages and Extract Specific Page Ranges',
    metaTitle: 'How to Split a PDF into Multiple Files Online (Free Guide)',
    metaDescription: 'Learn how to extract individual pages or custom page ranges from large PDF documents in seconds.',
    category: 'manage',
    readTime: '3 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.SPLIT,
    summary: 'Extract specific pages or break a multi-page PDF into separate files easily.',
    quickAnswer: 'To split a PDF: 1. Upload your PDF. 2. Enter target page numbers or ranges (e.g. 1-3, 5). 3. Click "Split PDF" and download your extracted document.',
    steps: [
      { name: 'Upload PDF', text: 'Select the file to split.' },
      { name: 'Specify Ranges', text: 'Type page numbers or ranges.' },
      { name: 'Download', text: 'Save your extracted document.' }
    ],
    detailedContent: [
      {
        heading: 'Custom Range Examples',
        paragraphs: [
          'You can extract sequential chapters like "1-10", single pages like "4, 8, 12", or combination sets like "1-3, 7, 10-15".'
        ]
      }
    ],
    faqs: [
      { q: 'Will splitting reduce visual quality?', a: 'No. Original vector text and embedded images are extracted losslessly.' }
    ],
    relatedGuides: ['how-to-merge-pdf-files', 'how-to-remove-pages-from-pdf'],
    relatedTools: [ToolType.SPLIT, ToolType.MERGE, ToolType.DELETE_PAGES]
  },
  {
    slug: 'how-to-edit-a-pdf',
    title: 'How to Edit a PDF Online for Free: Add Text, Draw & Annotate',
    metaTitle: 'How to Edit a PDF Document Online Free Without Adobe Acrobat',
    metaDescription: 'Add text notes, highlights, custom drawings, and images to any PDF document in your web browser.',
    category: 'edit',
    readTime: '4 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.EDIT,
    summary: 'Annotate, type text, and highlight important clauses directly on your PDF pages.',
    quickAnswer: 'To edit a PDF: 1. Upload your document to PDFBolt PDF Editor. 2. Use Text, Draw, or Image tools to add annotations. 3. Click "Save PDF" to download your updated file.',
    steps: [
      { name: 'Open PDF', text: 'Upload the document to the editor.' },
      { name: 'Add Elements', text: 'Type text, draw freehand lines, or place images.' },
      { name: 'Save File', text: 'Download your updated PDF.' }
    ],
    detailedContent: [
      {
        heading: 'No Installation or Subscriptions Required',
        paragraphs: [
          'Traditional desktop PDF editors charge hefty recurring subscription fees. PDFBolt gives you full annotation and editing capabilities right in your browser for free.'
        ]
      }
    ],
    faqs: [
      { q: 'Can I change font sizes and colors?', a: 'Yes, full font size, color palette, and stroke controls are provided.' }
    ],
    relatedGuides: ['how-to-sign-a-pdf', 'how-to-edit-a-pdf'],
    relatedTools: [ToolType.EDIT, ToolType.SIGN, ToolType.WATERMARK]
  },
  {
    slug: 'how-to-sign-a-pdf',
    title: 'How to Sign a PDF Document Online with Digital Signatures',
    metaTitle: 'How to Sign a PDF for Free (Draw or Upload Signature)',
    metaDescription: 'Sign contracts, lease agreements, and job offers with handwritten or uploaded signatures online.',
    category: 'security',
    readTime: '3 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.SIGN,
    summary: 'Sign any contract or form in seconds using a mouse, stylus, or transparent signature image.',
    quickAnswer: 'To sign a PDF: 1. Upload your agreement. 2. Draw your signature on screen. 3. Position the signature box and download your signed contract.',
    steps: [
      { name: 'Upload PDF', text: 'Open the agreement requiring signature.' },
      { name: 'Create Signature', text: 'Draw your signature with mouse/touch or upload a file.' },
      { name: 'Embed & Save', text: 'Place signature and download the signed PDF.' }
    ],
    detailedContent: [
      {
        heading: 'Legality and Security of Electronic Signatures',
        paragraphs: [
          'Electronic signatures are widely recognized under the ESIGN Act and eIDAS for standard business agreements, purchase orders, and rental contracts.'
        ]
      }
    ],
    faqs: [
      { q: 'Can I save my signature for future use?', a: 'Signatures are kept in your browser local session for convenience.' }
    ],
    relatedGuides: ['how-to-edit-a-pdf', 'how-to-protect-a-pdf'],
    relatedTools: [ToolType.SIGN, ToolType.EDIT, ToolType.PROTECT]
  },
  {
    slug: 'how-to-ocr-a-pdf',
    title: 'How to OCR a PDF to Make Scanned Documents Searchable & Selectable',
    metaTitle: 'How to OCR Scanned PDFs Online (Optical Character Recognition)',
    metaDescription: 'Convert scanned image PDFs and photographed documents into selectable, searchable, and copyable text files.',
    category: 'ocr',
    readTime: '4 min read',
    difficulty: 'Intermediate',
    updatedAt: '2026-08-16',
    toolId: ToolType.OCR,
    summary: 'Turn unselectable scanned papers into digital text that you can search with Ctrl+F and copy into Word.',
    quickAnswer: 'To OCR a PDF: 1. Upload your scanned PDF to PDFBolt OCR. 2. Click "Run OCR". 3. Copy recognized text or download a searchable document.',
    steps: [
      { name: 'Upload Scanned File', text: 'Select your photo or scanned document.' },
      { name: 'Execute OCR Engine', text: 'Neural network reads character shapes.' },
      { name: 'Export Searchable Text', text: 'Copy text directly or export to document.' }
    ],
    detailedContent: [
      {
        heading: 'How Optical Character Recognition Works',
        paragraphs: [
          'OCR breaks page bitmaps into matrix pixels, normalizes baseline orientation via OpenCV, and evaluates letter shapes against machine learning language models.'
        ]
      }
    ],
    faqs: [
      { q: 'What languages are supported?', a: 'English and common Latin script alphabets are supported natively.' }
    ],
    relatedGuides: ['how-to-convert-pdf-to-word', 'how-to-ocr-a-pdf'],
    relatedTools: [ToolType.OCR, ToolType.SCAN_TO_PDF, ToolType.PDF_TO_WORD]
  },
  {
    slug: 'how-to-remove-pages-from-pdf',
    title: 'How to Delete and Remove Unwanted Pages from a PDF File',
    metaTitle: 'How to Delete Pages from a PDF Online for Free',
    metaDescription: 'Quickly remove blank, duplicate, or sensitive pages from your PDF file in two clicks.',
    category: 'manage',
    readTime: '2 min read',
    difficulty: 'Beginner',
    updatedAt: '2026-08-16',
    toolId: ToolType.DELETE_PAGES,
    summary: 'Clean up bloated documents by eliminating unnecessary coversheets and blank pages.',
    quickAnswer: 'To delete pages from a PDF: 1. Upload your PDF. 2. Click on the thumbnail pages you want to remove. 3. Click "Delete Selected Pages" and download.',
    steps: [
      { name: 'Upload PDF', text: 'Open the document in thumbnail mode.' },
      { name: 'Select Pages', text: 'Click on the pages to discard.' },
      { name: 'Save Clean PDF', text: 'Download your trimmed document.' }
    ],
    detailedContent: [
      {
        heading: 'Why Remove Unwanted Pages?',
        paragraphs: [
          'Deleting unnecessary pages shrinks file size and ensures recipients only see relevant content.'
        ]
      }
    ],
    faqs: [
      { q: 'Can I undo a page deletion?', a: 'Yes, simply deselect the thumbnail before downloading the final file.' }
    ],
    relatedGuides: ['how-to-split-a-pdf', 'how-to-remove-pages-from-pdf'],
    relatedTools: [ToolType.DELETE_PAGES, ToolType.SPLIT, ToolType.ORGANIZE]
  }
];

// ==========================================
// 3. PDF FORMAT ENCYCLOPEDIA (6 Topics)
// ==========================================
export const ENCYCLOPEDIA: EncyclopediaArticle[] = [
  {
    slug: 'what-is-pdf',
    title: 'What is a PDF? The Complete Guide to Portable Document Format',
    metaTitle: 'What is a PDF? Definition, History & How PDFs Work',
    metaDescription: 'Everything you need to know about the Portable Document Format (PDF): history, architecture, vector graphics, and font embedding.',
    category: 'standards',
    readTime: '5 min read',
    updatedAt: '2026-08-16',
    summary: 'The Portable Document Format (PDF) was created by Adobe in 1993 and standardized as ISO 32000 to present documents independently of software, hardware, or operating systems.',
    keyTakeaways: [
      'PDF is an open ISO standard (ISO 32000) not owned by any single corporation.',
      'PDFs encapsulate text, vector shapes, raster images, and embedded fonts in a single container.',
      'Unlike HTML, PDFs use fixed geometric coordinate positioning to guarantee identical printing across all devices.'
    ],
    sections: [
      {
        heading: 'The Architecture of a PDF File',
        content: [
          'A PDF file consists of four primary sections: Header (specifying PDF version), Body (containing objects like pages, fonts, and streams), Cross-Reference Table (XRef, indexing byte offsets of every object for fast random access), and Trailer (pointing to the root catalog).',
          'Because of this binary offset structure, PDF readers can instantly jump to page 500 of a document without reading pages 1 through 499.'
        ]
      }
    ],
    relatedArticles: ['pdf-vs-pdfa', 'vector-vs-raster-pdf', 'what-is-ocr'],
    relatedTools: [ToolType.COMPRESS, ToolType.MERGE, ToolType.EDIT]
  },
  {
    slug: 'pdf-vs-pdfa',
    title: 'PDF vs PDF/A: Key Differences for Long-Term Archiving',
    metaTitle: 'PDF vs PDF/A: Differences, Standards (1a, 2b, 3) & Compliance',
    metaDescription: 'Understand the critical differences between standard PDF and PDF/A for legal, historical, and enterprise archiving compliance.',
    category: 'standards',
    readTime: '6 min read',
    updatedAt: '2026-08-16',
    summary: 'PDF/A is an ISO-standardized version of the PDF format specifically designed for digital preservation and long-term archiving of electronic documents.',
    keyTakeaways: [
      'PDF/A prohibits dynamic features like JavaScript, audio/video, and external font dependencies.',
      'All fonts and color profiles (ICC) MUST be 100% embedded inside the PDF/A file.',
      'Guarantees that the document can be opened and viewed identically 50 or 100 years into the future.'
    ],
    sections: [
      {
        heading: 'Comparison Matrix: PDF vs PDF/A',
        content: [
          'Standard PDF allows dynamic scripts and external font links, which can cause rendering failures decades later if those external resources disappear. PDF/A strictly mandates self-containment.'
        ],
        table: {
          headers: ['Feature', 'Standard PDF', 'PDF/A (Archival)'],
          rows: [
            ['Embedded Fonts', 'Optional', 'Mandatory (100% required)'],
            ['JavaScript / Macros', 'Allowed', 'Strictly Prohibited'],
            ['Audio & Video', 'Allowed', 'Strictly Prohibited'],
            ['Color Management', 'Device-dependent', 'Mandatory ICC Profiles'],
            ['Primary Use Case', 'Active distribution', 'Legal & 50-year Archival']
          ]
        }
      }
    ],
    relatedArticles: ['what-is-pdf', 'searchable-pdf-vs-scanned-pdf'],
    relatedTools: [ToolType.PROTECT, ToolType.PDF_TO_WORD, ToolType.COMPRESS]
  },
  {
    slug: 'what-is-ocr',
    title: 'What is OCR? Optical Character Recognition Explained',
    metaTitle: 'What is OCR? How Optical Character Recognition Works for PDFs',
    metaDescription: 'How OCR algorithms convert scanned document images and paper photos into machine-readable, searchable PDF text.',
    category: 'technology',
    readTime: '5 min read',
    updatedAt: '2026-08-16',
    summary: 'Optical Character Recognition (OCR) technology analyzes the patterns of dark and light pixels in document images to recognize letters, numbers, and punctuation marks.',
    keyTakeaways: [
      'OCR turns static bitmap images into editable ASCII/Unicode text streams.',
      'Modern OCR uses deep learning character shape matrices and dictionary language modeling.',
      'Enables Ctrl+F text search across millions of scanned historical pages.'
    ],
    sections: [
      {
        heading: 'The 3 Stages of Modern OCR Processing',
        content: [
          '1. Pre-Processing: The document image is binarized (converted to pure black & white), deskewed, and cleaned of background noise using algorithms like Otsu thresholding.',
          '2. Feature Extraction: Contours and character curves are compared against glyph vector libraries.',
          '3. Post-Processing: Language models correct common optical typos (e.g. distinguishing between uppercase O and number 0).'
        ]
      }
    ],
    relatedArticles: ['searchable-pdf-vs-scanned-pdf', 'what-is-pdf'],
    relatedTools: [ToolType.OCR, ToolType.SCAN_TO_PDF, ToolType.SCAN_HANDWRITING]
  },
  {
    slug: 'searchable-pdf-vs-scanned-pdf',
    title: 'Searchable PDF vs Scanned PDF: Why Text Layers Matter',
    metaTitle: 'Searchable PDF vs Scanned PDF: Text Layers & Searchability',
    metaDescription: 'Learn the difference between flat scanned PDF images and dual-layer searchable PDFs containing hidden text layers.',
    category: 'technology',
    readTime: '4 min read',
    updatedAt: '2026-08-16',
    summary: 'A scanned PDF is merely a container holding a picture of a page, while a searchable PDF contains both the visual image and an invisible, selectable text layer underneath.',
    keyTakeaways: [
      'Scanned PDFs cannot be searched with Ctrl+F, copied, or indexed by search engines.',
      'Searchable PDFs use an invisible text overlay positioned directly over image letters.',
      'Searchable PDFs are essential for document management systems (DMS) and legal e-discovery.'
    ],
    sections: [
      {
        heading: 'How Dual-Layer Searchable PDFs Work',
        content: [
          'When you run OCR on PDFBolt, the tool extracts text coordinates and embeds invisible text glyphs directly behind the visible scanned pixels. When you click and drag to highlight text, your mouse selects the invisible text layer while your eyes view the original image.'
        ]
      }
    ],
    relatedArticles: ['what-is-ocr', 'vector-vs-raster-pdf'],
    relatedTools: [ToolType.OCR, ToolType.PDF_TO_WORD, ToolType.SCAN_TO_PDF]
  },
  {
    slug: 'vector-vs-raster-pdf',
    title: 'Vector PDF vs Raster PDF: Why Some PDFs Pixelate When Zoomed',
    metaTitle: 'Vector PDF vs Raster PDF: Differences, Zoom Quality & File Size',
    metaDescription: 'Understand why vector PDFs maintain infinite sharpness while raster PDFs become blurry when zooming in.',
    category: 'technology',
    readTime: '4 min read',
    updatedAt: '2026-08-16',
    summary: 'Vector PDFs store text and shapes as mathematical coordinate formulas, whereas raster PDFs store fixed grids of colored pixel dots.',
    keyTakeaways: [
      'Vector PDFs scale infinitely with zero pixelation at 1000% zoom.',
      'Raster PDFs are fixed at their scan resolution (DPI) and lose quality when magnified.',
      'Vector PDFs are typically 10x smaller in file size than uncompressed raster image PDFs.'
    ],
    sections: [
      {
        heading: 'How to Tell If Your PDF is Vector or Raster',
        content: [
          'Open your document and zoom in to 400%. If text edges remain perfectly smooth like razor blades, it is a Vector PDF. If text edges appear blocky or pixelated, it is a Raster PDF.'
        ]
      }
    ],
    relatedArticles: ['what-is-pdf', 'pdf-vs-pdfa'],
    relatedTools: [ToolType.COMPRESS, ToolType.OCR, ToolType.PDF_TO_WORD]
  }
];

// ==========================================
// 4. PERSONA WORKFLOWS (3 Hubs)
// ==========================================
export const WORKFLOWS: Workflow[] = [
  {
    slug: 'student-pdf-tools',
    title: 'Student & Academic PDF Workflow',
    metaTitle: 'Student PDF Toolkit – Merge Notes, OCR Lectures & Convert to PPT',
    metaDescription: 'All-in-one PDF study ecosystem for students: OCR handwritten notes, extract lecture slides, compress assignments, and merge study guides.',
    audience: 'Students & Educators',
    heroBadge: 'Academic Study Hub',
    heroHeadline: 'Master Your Coursework with Zero-Upload PDF Tools',
    heroSubheadline: 'Digitize handwritten lecture notes, extract slide decks into editable Word documents, and merge study guides with 100% privacy on any campus device.',
    diagram: {
      steps: ['Lecture PDF / Scan', 'OCR Handwritten Notes', 'Convert to Word/PPT', 'Compress for Submission']
    },
    steps: [
      {
        order: 1,
        toolId: ToolType.SCAN_HANDWRITING,
        title: 'Digitize Handwritten Notes',
        description: 'Snap photos of your class notebook and transcribe them into clean digital text pages.',
        actionLabel: 'Scan Handwritten Notes'
      },
      {
        order: 2,
        toolId: ToolType.PDF_TO_PPT,
        title: 'Extract Slides to PowerPoint',
        description: 'Turn professor PDF lecture handouts into editable PPTX slide decks for revision.',
        actionLabel: 'Convert PDF to PPT'
      },
      {
        order: 3,
        toolId: ToolType.MERGE,
        title: 'Combine Research & Assignments',
        description: 'Stitch your title page, essays, and cited references into one final assignment PDF.',
        actionLabel: 'Merge Coursework'
      },
      {
        order: 4,
        toolId: ToolType.COMPRESS,
        title: 'Shrink for Portal Upload',
        description: 'Compress heavy PDF submissions to fit below Canvas, Blackboard, or Moodle size limits.',
        actionLabel: 'Compress PDF'
      }
    ],
    benefits: [
      { title: '100% Free for Students', description: 'No subscriptions, watermarks, or credit card barriers.' },
      { title: 'Works on Chromebooks & Tablets', description: 'Runs in any modern browser without needing software installation.' },
      { title: 'Zero Data Harvesting', description: 'Your essays and assignments never leave your device.' }
    ],
    faqs: [
      { q: 'Can I use this on university lab computers?', a: 'Yes! PDFBolt works entirely inside the web browser without requiring admin permissions to install software.' }
    ],
    relatedTools: [ToolType.SCAN_HANDWRITING, ToolType.PDF_TO_PPT, ToolType.MERGE, ToolType.COMPRESS],
    relatedGuides: ['how-to-merge-pdf-files', 'how-to-compress-a-pdf', 'how-to-convert-pdf-to-word']
  },
  {
    slug: 'business-pdf-tools',
    title: 'Business & Enterprise PDF Workflow',
    metaTitle: 'Business PDF Solutions – Redact Contracts, Sign & Extract Excel',
    metaDescription: 'Enterprise-grade PDF workflow: Redact sensitive financial data, sign contracts, extract tabular invoices to Excel, and encrypt files securely.',
    audience: 'Business & Finance',
    heroBadge: 'Business & Legal Hub',
    heroHeadline: 'Secure Document Operations Without Cloud Leaks',
    heroSubheadline: 'Permanently redact PII, execute vendor agreements, extract invoice tables directly to Excel, and protect confidential IP locally.',
    diagram: {
      steps: ['Invoices & Contracts', 'Permanent Redaction', 'Sign & Watermark', 'Encrypt & Distribute']
    },
    steps: [
      {
        order: 1,
        toolId: ToolType.REDACT,
        title: 'Permanent PII & Financial Redaction',
        description: 'Black out social security numbers, bank details, and customer PII with true raster destruction.',
        actionLabel: 'Redact Document'
      },
      {
        order: 2,
        toolId: ToolType.PDF_TO_EXCEL,
        title: 'Extract Financial Tables',
        description: 'Convert PDF balance sheets and invoices into structured Excel workbooks for analysis.',
        actionLabel: 'Extract to Excel'
      },
      {
        order: 3,
        toolId: ToolType.SIGN,
        title: 'Execute Vendor Contracts',
        description: 'Add electronic signatures directly onto agreements without printing and scanning.',
        actionLabel: 'Sign Agreement'
      },
      {
        order: 4,
        toolId: ToolType.PROTECT,
        title: 'AES Password Encryption',
        description: 'Lock proprietary decks and statements with 256-bit password protection before emailing.',
        actionLabel: 'Encrypt PDF'
      }
    ],
    benefits: [
      { title: 'GDPR & HIPAA Compliance Alignment', description: 'Zero cloud file transfers means zero third-party data processor exposure.' },
      { title: 'Instant Executive Turnaround', description: 'Process heavy contracts in seconds without waiting for cloud queues.' }
    ],
    faqs: [
      { q: 'Is it safe to process confidential NDAs here?', a: 'Yes. Since PDFBolt executes all algorithms inside your client browser, our servers never receive or store your document bytes.' }
    ],
    relatedTools: [ToolType.REDACT, ToolType.PDF_TO_EXCEL, ToolType.SIGN, ToolType.PROTECT],
    relatedGuides: ['how-to-redact-a-pdf', 'how-to-protect-a-pdf', 'how-to-convert-pdf-to-excel']
  },
  {
    slug: 'developer-pdf-tools',
    title: 'Developer PDF Tools & Client-Side Architecture',
    metaTitle: 'Developer PDF Tools – Client-Side WASM, PDF-Lib & OCR API Architecture',
    metaDescription: 'Explore PDFBolt client-side architecture: WebAssembly, PDF-Lib, Tesseract OCR, and how to build zero-upload browser document processing.',
    audience: 'Software Developers',
    heroBadge: 'Developer & Architecture Hub',
    heroHeadline: 'Client-Side PDF Processing Architecture',
    heroSubheadline: 'Learn how modern WebAssembly, Web Workers, PDF.js, and PDF-Lib enable powerful zero-server document manipulation directly in the browser.',
    diagram: {
      steps: ['Client Browser', 'WebAssembly / Workers', 'PDF-Lib & PDF.js', 'Direct Blob Export']
    },
    steps: [
      {
        order: 1,
        toolId: ToolType.COMPARE,
        title: 'PDF Comparison & Diffing Engine',
        description: 'Inspect structural and visual differences between document streams.',
        actionLabel: 'Compare PDFs'
      },
      {
        order: 2,
        toolId: ToolType.OCR,
        title: 'WebAssembly OCR Pipeline',
        description: 'Experience client-side Tesseract.js and OpenCV WebAssembly OCR execution.',
        actionLabel: 'Test WebAssembly OCR'
      },
      {
        order: 3,
        toolId: ToolType.REPAIR,
        title: 'Binary XRef Repair',
        description: 'Rebuild corrupted cross-reference tables and recover orphan PDF objects.',
        actionLabel: 'Repair PDF Objects'
      }
    ],
    benefits: [
      { title: 'Zero Cloud Hosting Costs for Compute', description: 'Shift heavy PDF rendering and OCR compute workloads from servers to client hardware.' },
      { title: 'Instant Latency & Offline Support', description: 'Eliminates roundtrip upload latency and enables full offline client-side capabilities.' }
    ],
    faqs: [
      { q: 'What libraries power PDFBolt under the hood?', a: 'We leverage pdf-lib, pdfjs-dist, Tesseract.js, ExcelJS, mammoth, and html2canvas with Web Worker concurrency.' }
    ],
    relatedTools: [ToolType.COMPARE, ToolType.OCR, ToolType.REPAIR],
    relatedGuides: []
  }
];

// ==========================================
// 5. COMPARISONS DATA
// ==========================================
export const COMPARISON_FEATURES: ComparisonFeature[] = [
  { name: 'Processing Location', pdfBolt: '100% Client Browser (Private)', serverCompetitor: 'Uploaded to Remote Servers', desktopAcrobat: 'Local Device', notes: 'PDFBolt processes everything locally in browser memory.' },
  { name: 'Privacy & Security', pdfBolt: 'Absolute (Zero Cloud Uploads)', serverCompetitor: 'Third-party Server Risk', desktopAcrobat: 'Local Disk Only', notes: 'Files never leave your machine.' },
  { name: 'File Size Limits', pdfBolt: 'Unlimited (Browser RAM)', serverCompetitor: 'Strict 50MB - 100MB Caps', desktopAcrobat: 'Unlimited', notes: 'No arbitrary file size blocks.' },
  { name: 'Subscription / Cost', pdfBolt: '100% Free Forever', serverCompetitor: '$12 - $20 / Month', desktopAcrobat: '$239 / Year', notes: 'No paywalls or premium lockouts.' },
  { name: 'Queue Wait Times', pdfBolt: 'Zero (Instant CPU execution)', serverCompetitor: 'Server Queues / Throttles', desktopAcrobat: 'Instant', notes: 'Instant processing without waiting for server uploads.' },
  { name: 'Software Installation', pdfBolt: 'None (Instant Web Tools)', serverCompetitor: 'None (Web App)', desktopAcrobat: '2GB+ Heavy Desktop Software', notes: 'Runs in any modern browser on mobile, tablet, or desktop.' },
  { name: 'True Permanent Redaction', pdfBolt: 'Yes (Raster Flattening)', serverCompetitor: 'Varies / Basic Overlay', desktopAcrobat: 'Yes (Sanitization)', notes: 'Permanently burns pixels to destroy underlying text layers.' }
];

// ==========================================
// 6. SAMPLE TEST FILES
// ==========================================
export const SAMPLE_TEST_FILES: TestFileItem[] = [
  { id: 'sample-multipage', name: 'Multi-Page Research Report.pdf', description: '5-page document with headings, vector diagrams, and formatted body paragraphs.', category: 'General', size: '240 KB', pageCount: 5, idealFor: ['Merge PDF', 'Split PDF', 'Organize PDF', 'Page Numbers'], generatorType: 'text' },
  { id: 'sample-scanned', name: 'Scanned Archive Document.pdf', description: 'Realistic scanned paper image containing unselectable historical text.', category: 'OCR & Vision', size: '850 KB', pageCount: 2, idealFor: ['OCR PDF', 'PDF to Word', 'Scan to PDF'], generatorType: 'scanned' },
  { id: 'sample-table', name: 'Quarterly Financial Statement.pdf', description: 'Multi-column financial statement with balance tables, gridlines, and figures.', category: 'Financial', size: '310 KB', pageCount: 3, idealFor: ['PDF to Excel', 'PDF to Word', 'Redact PDF'], generatorType: 'table' },
  { id: 'sample-slides', name: 'Pitch Deck Presentation.pdf', description: 'Landscape 16:9 presentation deck with title slides, bullet cards, and callouts.', category: 'Presentation', size: '520 KB', pageCount: 6, idealFor: ['PDF to PPT', 'PDF to JPG', 'Compress PDF'], generatorType: 'slides' }
];

// ==========================================
// 7. ICON HELPER
// ==========================================
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
    Wrench: <Wrench className="w-8 h-8" />, Search: <Search className="w-8 h-8" />,
    Files: <Files className="w-8 h-8" />, Trash2: <Trash2 className="w-8 h-8" />,
    Scan: <Scan className="w-8 h-8" />, GraduationCap: <GraduationCap className="w-8 h-8" />,
    Briefcase: <Briefcase className="w-8 h-8" />, Code: <Code className="w-8 h-8" />,
    Calculator: <Calculator className="w-8 h-8" />, CheckCircle2: <CheckCircle2 className="w-8 h-8" />,
    ShieldCheck: <ShieldCheck className="w-8 h-8" />, Zap: <Zap className="w-8 h-8" />,
    Sparkles: <Sparkles className="w-8 h-8" />, HelpCircle: <HelpCircle className="w-8 h-8" />,
    BookOpen: <BookOpen className="w-8 h-8" />, Layers: <Layers className="w-8 h-8" />
  };
  return icons[name] || <FileText className="w-8 h-8" />;
};