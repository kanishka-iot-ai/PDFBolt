import os
import re
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(REPO_ROOT, "dist")
INDEX_HTML = os.path.join(DIST_DIR, "index.html")

CANONICAL_DOMAIN = "https://pdfbolt.in"

# 1. Complete Canonical Tools
CANONICAL_TOOLS = [
    {
        "path": "merge-pdf",
        "title": "Merge PDF Online Free – Combine Multiple PDF Files | PDFBolt",
        "description": "Combine multiple PDF files into one single document in seconds. 100% private in-browser processing with zero server uploads.",
        "h1": "Merge PDF Files Online",
        "features": ["100% Private local processing", "Zero file size limits", "Maintain vector quality & fonts", "Drag-and-drop page reordering"],
        "how_to": ["Upload two or more PDF files", "Arrange pages in your preferred order", "Click Merge PDF and download instantly"],
        "related": [("compress-pdf", "Compress PDF"), ("split-pdf", "Split PDF"), ("organize-pdf", "Organize PDF Pages"), ("add-page-numbers-to-pdf", "Add Page Numbers")]
    },
    {
        "path": "split-pdf",
        "title": "Split PDF Pages Online Free – Extract Pages | PDFBolt",
        "description": "Extract specific pages or page ranges from any PDF document into separate files instantly in your browser with zero data exposure.",
        "h1": "Split PDF Document Pages",
        "features": ["Custom page range extraction", "Visual page picker", "Batch page burst support", "Client-side WebAssembly execution"],
        "how_to": ["Upload the PDF document to split", "Enter page ranges (e.g. 1-3, 5)", "Click Split PDF to download extracted pages"],
        "related": [("merge-pdf", "Merge PDF"), ("delete-pdf-pages", "Delete PDF Pages"), ("organize-pdf", "Organize PDF"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "compress-pdf",
        "title": "Compress PDF Online Free – Reduce PDF Size | PDFBolt",
        "description": "Compress and reduce PDF file size without losing readability. 3 compression profiles for maximum size reduction with local privacy.",
        "h1": "Compress PDF File Size Online",
        "features": ["Multiple compression profiles", "Image downsampling & flate recompression", "Preserve font clarity", "Instant local processing"],
        "how_to": ["Select your PDF document", "Choose your compression profile (Recommended, Extreme, or Low)", "Click Compress PDF and download smaller file"],
        "related": [("merge-pdf", "Merge PDF"), ("pdf-to-jpg", "PDF to JPG"), ("split-pdf", "Split PDF"), ("repair-pdf", "Repair Damaged PDF")]
    },
    {
        "path": "pdf-to-word",
        "title": "Convert PDF to Word Online Free (.docx) | PDFBolt",
        "description": "Convert PDF documents to editable Microsoft Word (.docx) files. Preserves layouts, tables, fonts, and bold styles.",
        "h1": "Convert PDF to Word Document (.docx)",
        "features": ["Preserve fonts and formatting", "Table structure recognition", "OCR fallback for scanned PDFs", "Zero server upload privacy"],
        "how_to": ["Upload your PDF file", "Click Convert to Word", "Download the editable .docx file"],
        "related": [("word-to-pdf", "Word to PDF"), ("pdf-to-excel", "PDF to Excel"), ("pdf-to-ppt", "PDF to PowerPoint"), ("ocr-pdf", "OCR PDF")]
    },
    {
        "path": "pdf-to-excel",
        "title": "Convert PDF to Excel Online Free (.xlsx) | PDFBolt",
        "description": "Extract tables and spreadsheet data from PDF into editable Microsoft Excel (.xlsx) workbooks with automatic numeric coercion.",
        "h1": "Convert PDF Tables to Microsoft Excel (.xlsx)",
        "features": ["Spatial table detection", "Numeric & currency coercion", "Multi-page sheet generation", "100% Client-side privacy"],
        "how_to": ["Select your PDF containing tabular data", "Click Convert to Excel", "Download your structured .xlsx workbook"],
        "related": [("excel-to-pdf", "Excel to PDF"), ("pdf-to-word", "PDF to Word"), ("ocr-pdf", "OCR PDF"), ("split-pdf", "Split PDF")]
    },
    {
        "path": "pdf-to-ppt",
        "title": "Convert PDF to PowerPoint Online Free (.pptx) | PDFBolt",
        "description": "Convert PDF documents into editable Microsoft PowerPoint presentation slides (.pptx) with crisp high-resolution layouts.",
        "h1": "Convert PDF to PowerPoint Presentation (.pptx)",
        "features": ["High-DPI slide generation", "Vector presentation packaging", "Zero upload latency", "100% In-browser execution"],
        "how_to": ["Select the PDF document to convert", "Click Convert to PPT", "Download the generated .pptx slide deck"],
        "related": [("ppt-to-pdf", "PowerPoint to PDF"), ("pdf-to-word", "PDF to Word"), ("pdf-to-jpg", "PDF to JPG"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "pdf-to-jpg",
        "title": "Convert PDF to JPG Images Online Free | PDFBolt",
        "description": "Extract PDF pages into high-resolution JPG images. Download single images or batch download all pages as a ZIP file.",
        "h1": "Convert PDF Pages to JPG Images",
        "features": ["High-DPI rendering", "Batch ZIP download", "Color fidelity preservation", "No file size limit"],
        "how_to": ["Upload your PDF document", "Choose image quality", "Download individual JPGs or ZIP archive"],
        "related": [("jpg-to-pdf", "JPG to PDF"), ("compress-pdf", "Compress PDF"), ("edit-pdf", "Edit PDF"), ("scan-to-pdf", "Scan to PDF")]
    },
    {
        "path": "word-to-pdf",
        "title": "Convert Word to PDF Online Free (.docx to .pdf) | PDFBolt",
        "description": "Convert Microsoft Word (.docx) documents to standard PDF files with vector layout fidelity in your web browser.",
        "h1": "Convert Word Document (.docx) to PDF",
        "features": ["Vector layout fidelity", "Preserve images & formatting", "Fast in-browser rendering", "Zero data retention"],
        "how_to": ["Select your Word (.docx) document", "Click Convert to PDF", "Download your standardized PDF document"],
        "related": [("pdf-to-word", "PDF to Word"), ("excel-to-pdf", "Excel to PDF"), ("ppt-to-pdf", "PowerPoint to PDF"), ("merge-pdf", "Merge PDF")]
    },
    {
        "path": "excel-to-pdf",
        "title": "Convert Excel to PDF Online Free (.xlsx to .pdf) | PDFBolt",
        "description": "Convert Microsoft Excel spreadsheets (.xlsx) into clean, printable PDF documents with custom table styling.",
        "h1": "Convert Excel Spreadsheet (.xlsx) to PDF",
        "features": ["Auto-scaled table layout", "Multi-sheet workbook support", "Clean borders & typography", "Local processing"],
        "how_to": ["Select your Excel (.xlsx) file", "Click Convert to PDF", "Download the rendered PDF document"],
        "related": [("pdf-to-excel", "PDF to Excel"), ("word-to-pdf", "Word to PDF"), ("compress-pdf", "Compress PDF"), ("protect-pdf", "Protect PDF")]
    },
    {
        "path": "ppt-to-pdf",
        "title": "Convert PowerPoint to PDF Online Free (.pptx to .pdf) | PDFBolt",
        "description": "Convert PowerPoint presentations (.pptx) to PDF format with slide-by-slide layout preservation.",
        "h1": "Convert PowerPoint Slides (.pptx) to PDF",
        "features": ["Slide geometry preservation", "Crisp vector text", "Print-ready PDF output", "Zero server exposure"],
        "how_to": ["Upload your PowerPoint (.pptx) file", "Click Convert to PDF", "Download your PDF presentation"],
        "related": [("pdf-to-ppt", "PDF to PowerPoint"), ("word-to-pdf", "Word to PDF"), ("compress-pdf", "Compress PDF"), ("watermark-pdf", "Watermark PDF")]
    },
    {
        "path": "jpg-to-pdf",
        "title": "Convert JPG Images to PDF Online Free | PDFBolt",
        "description": "Convert JPG, PNG, and WebP images into a clean, multi-page PDF document. Arrange images and set page orientation.",
        "h1": "Convert JPG & Images to PDF Document",
        "features": ["Multi-image batch combination", "Custom page orientation", "Zero quality compression loss", "100% Private"],
        "how_to": ["Upload one or more images", "Drag to arrange page order", "Click Create PDF and download"],
        "related": [("pdf-to-jpg", "PDF to JPG"), ("scan-to-pdf", "Scan to PDF"), ("merge-pdf", "Merge PDF"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "html-to-pdf",
        "title": "Convert HTML to PDF Online Free | PDFBolt",
        "description": "Convert HTML code or web page files directly into printable PDF documents with CSS layout fidelity.",
        "h1": "Convert HTML & Web Code to PDF",
        "features": ["CSS stylesheet support", "Vector text rendering", "Auto-pagination", "Local browser processing"],
        "how_to": ["Upload an HTML file or paste code", "Click Convert to PDF", "Download your formatted PDF document"],
        "related": [("word-to-pdf", "Word to PDF"), ("edit-pdf", "Edit PDF"), ("watermark-pdf", "Watermark PDF"), ("add-page-numbers-to-pdf", "Add Page Numbers")]
    },
    {
        "path": "edit-pdf",
        "title": "Edit PDF Online Free – Add Text, Draw & Annotate | PDFBolt",
        "description": "Edit PDF documents directly in your browser. Add text, freehand drawing, annotations, shapes, and whiteout redactions.",
        "h1": "Free Online PDF Editor",
        "features": ["Add text & annotations", "Freehand drawing tool", "Shape insertion & whiteout", "Client-side export"],
        "how_to": ["Upload your PDF document", "Use toolbar to add text or draw", "Click Save & Export PDF"],
        "related": [("sign-pdf", "Sign PDF"), ("redact-pdf", "Redact PDF"), ("watermark-pdf", "Watermark PDF"), ("organize-pdf", "Organize PDF")]
    },
    {
        "path": "protect-pdf",
        "title": "Protect PDF Online Free – Add Password & Encryption | PDFBolt",
        "description": "Encrypt and password-protect your PDF files using AES-128 and AES-256 standard encryption algorithms locally.",
        "h1": "Password Protect & Encrypt PDF Files",
        "features": ["AES encryption standard", "Custom permissions configuration", "Zero server upload", "100% Privacy"],
        "how_to": ["Select your PDF file", "Enter your secure password", "Click Protect PDF and download encrypted file"],
        "related": [("unlock-pdf", "Unlock PDF"), ("redact-pdf", "Redact PDF"), ("sign-pdf", "Sign PDF"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "unlock-pdf",
        "title": "Unlock PDF Online Free – Remove Password & Permissions | PDFBolt",
        "description": "Remove password protection and printing/copying restrictions from encrypted PDF files in your browser.",
        "h1": "Unlock Password Protected PDF Files",
        "features": ["Remove owner & user restrictions", "Instant client-side decryption", "No file size limit", "Safe & private"],
        "how_to": ["Upload your encrypted PDF", "Enter password when prompted", "Download unprotected PDF"],
        "related": [("protect-pdf", "Protect PDF"), ("edit-pdf", "Edit PDF"), ("merge-pdf", "Merge PDF"), ("split-pdf", "Split PDF")]
    },
    {
        "path": "sign-pdf",
        "title": "Sign PDF Online Free – Add Digital Signatures | PDFBolt",
        "description": "Draw, type, or upload your electronic signature and place it onto any PDF document. Legal, fast, and 100% private.",
        "h1": "Sign PDF Documents Online Free",
        "features": ["Draw, type, or upload signature", "Resize & position on any page", "Multiple signature support", "100% Local processing"],
        "how_to": ["Upload the PDF document to sign", "Draw or create your signature", "Place on page and click Download Signed PDF"],
        "related": [("protect-pdf", "Protect PDF"), ("edit-pdf", "Edit PDF"), ("redact-pdf", "Redact PDF"), ("watermark-pdf", "Watermark PDF")]
    },
    {
        "path": "redact-pdf",
        "title": "Redact PDF Online Free – Permanently Remove Sensitive Text | PDFBolt",
        "description": "Permanently blackout and rasterize sensitive text, SSNs, and confidential information from PDF documents.",
        "h1": "Permanently Redact Sensitive Data from PDF",
        "features": ["True rasterized redaction", "Irreversible privacy protection", "Zero server upload", "Free & unlimited"],
        "how_to": ["Select your PDF document", "Draw black redaction boxes over sensitive text", "Click Redact & Flatten PDF to download"],
        "related": [("protect-pdf", "Protect PDF"), ("edit-pdf", "Edit PDF"), ("delete-pdf-pages", "Delete PDF Pages"), ("repair-pdf", "Repair PDF")]
    },
    {
        "path": "ocr-pdf",
        "title": "OCR PDF Online Free – Extract Text from Scanned PDFs | PDFBolt",
        "description": "Convert scanned PDF documents and images into selectable, searchable, and editable text using neural network OCR in your browser.",
        "h1": "Optical Character Recognition (OCR) for PDF",
        "features": ["Tesseract neural network OCR", "OpenCV adaptive thresholding", "Multi-language recognition", "Client-side execution"],
        "how_to": ["Upload scanned PDF or document photo", "Click Run OCR", "Copy extracted text or export to searchable PDF"],
        "related": [("pdf-to-word", "PDF to Word"), ("scan-to-pdf", "Scan to PDF"), ("scan-handwriting-to-pdf", "Scan Handwriting to PDF"), ("pdf-to-excel", "PDF to Excel")]
    },
    {
        "path": "scan-to-pdf",
        "title": "Scan to PDF Online Free – Camera Document Scanner | PDFBolt",
        "description": "Use your phone or laptop camera to scan physical paper documents into crisp, high-contrast, multi-page PDF files.",
        "h1": "Online Camera Document Scanner to PDF",
        "features": ["Perspective correction", "Contrast & sharpness enhancement", "Multi-page scan batching", "Direct PDF creation"],
        "how_to": ["Allow camera access or upload photo", "Snap document pages", "Click Generate PDF and download"],
        "related": [("ocr-pdf", "OCR PDF"), ("scan-handwriting-to-pdf", "Scan Handwriting"), ("jpg-to-pdf", "JPG to PDF"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "scan-handwriting-to-pdf",
        "title": "Scan Handwriting to PDF & Word Online Free | PDFBolt",
        "description": "Convert handwritten study notes, meeting minutes, and journal pages into formatted digital PDFs and Microsoft Word files.",
        "h1": "Scan Handwritten Notes to PDF & Word",
        "features": ["Handwriting neural OCR", "AI text cleanup & enhancement", "Export to PDF and DOCX", "100% Private local processing"],
        "how_to": ["Upload photos of handwritten pages", "Review digitized transcription", "Download styled PDF or Word (.docx) document"],
        "related": [("scan-to-pdf", "Scan to PDF"), ("ocr-pdf", "OCR PDF"), ("pdf-to-word", "PDF to Word"), ("edit-pdf", "Edit PDF")]
    },
    {
        "path": "rotate-pdf",
        "title": "Rotate PDF Pages Online Free – Permanent Orientation Fix | PDFBolt",
        "description": "Rotate upside-down or sideways PDF pages by 90, 180, or 270 degrees. Save orientation changes permanently.",
        "h1": "Rotate PDF Pages Permanently Online",
        "features": ["Rotate individual pages or all pages", "90°, 180°, 270° orientation", "Instant client-side save", "Zero quality degradation"],
        "how_to": ["Select your PDF file", "Click rotate buttons on pages needing orientation fix", "Download corrected PDF file"],
        "related": [("organize-pdf", "Organize PDF"), ("delete-pdf-pages", "Delete PDF Pages"), ("split-pdf", "Split PDF"), ("merge-pdf", "Merge PDF")]
    },
    {
        "path": "organize-pdf",
        "title": "Organize PDF Pages Online Free – Reorder & Rearrange | PDFBolt",
        "description": "Rearrange, reorder, delete, and organize pages inside any multi-page PDF document with visual drag-and-drop.",
        "h1": "Organize & Reorder PDF Pages Online",
        "features": ["Visual drag-and-drop grid", "Reorder, duplicate & delete pages", "Batch processing", "100% Browser-based privacy"],
        "how_to": ["Upload your PDF document", "Drag page thumbnails to desired order", "Click Save PDF to download organized file"],
        "related": [("rotate-pdf", "Rotate PDF"), ("delete-pdf-pages", "Delete PDF Pages"), ("merge-pdf", "Merge PDF"), ("split-pdf", "Split PDF")]
    },
    {
        "path": "add-page-numbers-to-pdf",
        "title": "Add Page Numbers to PDF Online Free | PDFBolt",
        "description": "Insert sequential page numbers, headers, and footers onto PDF documents with custom positioning, font size, and numbering formats.",
        "h1": "Add Page Numbers & Headers to PDF",
        "features": ["Custom position (Top/Bottom, Left/Center/Right)", "Format options (Page X of Y, 1, 2...)", "Font size and color customization", "Local execution"],
        "how_to": ["Select your PDF document", "Choose number position and format", "Click Add Page Numbers and download"],
        "related": [("watermark-pdf", "Watermark PDF"), ("organize-pdf", "Organize PDF"), ("edit-pdf", "Edit PDF"), ("merge-pdf", "Merge PDF")]
    },
    {
        "path": "watermark-pdf",
        "title": "Watermark PDF Online Free – Add Text or Image Stamp | PDFBolt",
        "description": "Add custom text watermarks or company logo image stamps to all pages of your PDF document. Control opacity, angle, and position.",
        "h1": "Add Text & Image Watermark to PDF",
        "features": ["Text or image watermark support", "Custom opacity, rotation & scale", "Layer under or over page content", "100% In-browser"],
        "how_to": ["Select your PDF document", "Enter watermark text or upload image logo", "Adjust opacity and position, then click Apply Watermark"],
        "related": [("add-page-numbers-to-pdf", "Add Page Numbers"), ("protect-pdf", "Protect PDF"), ("edit-pdf", "Edit PDF"), ("sign-pdf", "Sign PDF")]
    },
    {
        "path": "delete-pdf-pages",
        "title": "Delete PDF Pages Online Free – Remove Unwanted Pages | PDFBolt",
        "description": "Remove unwanted, blank, or duplicate pages from any PDF file and download a clean document immediately.",
        "h1": "Delete & Remove Pages from PDF Online",
        "features": ["Visual page selector", "Batch page deletion", "Preserve remaining page quality", "Zero server upload"],
        "how_to": ["Upload your PDF document", "Select page numbers to delete", "Click Delete Pages and download clean PDF"],
        "related": [("split-pdf", "Split PDF"), ("organize-pdf", "Organize PDF"), ("rotate-pdf", "Rotate PDF"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "compare-pdf",
        "title": "Compare PDF Files Online Free – Side-by-Side Diff | PDFBolt",
        "description": "Compare two PDF documents side-by-side to highlight differences, text modifications, and formatting changes in your browser.",
        "h1": "Compare PDF Documents Side-by-Side",
        "features": ["Side-by-side visual diff", "Synchronized scroll preview", "Text change highlights", "100% Local privacy"],
        "how_to": ["Upload Document A (original) and Document B (modified)", "Click Compare PDF", "Review differences side-by-side"],
        "related": [("edit-pdf", "Edit PDF"), ("merge-pdf", "Merge PDF"), ("ocr-pdf", "OCR PDF"), ("analyze-pdf", "Analyze PDF")]
    },
    {
        "path": "repair-pdf",
        "title": "Repair PDF Online Free – Fix Damaged or Corrupted PDFs | PDFBolt",
        "description": "Recover and repair corrupt, damaged, or unreadable PDF files by standardizing cross-reference tables and font descriptors.",
        "h1": "Repair Damaged & Corrupted PDF Files",
        "features": ["Rebuild corrupted XRef tables", "Recover unreadable pages", "Standardize PDF syntax", "Zero server upload"],
        "how_to": ["Upload damaged PDF document", "Click Repair PDF", "Download standardized recovered PDF file"],
        "related": [("compress-pdf", "Compress PDF"), ("split-pdf", "Split PDF"), ("ocr-pdf", "OCR PDF"), ("merge-pdf", "Merge PDF")]
    },
    {
        "path": "pdf-to-qr-code",
        "title": "Convert PDF to QR Code Online Free | PDFBolt",
        "description": "Generate high-resolution QR codes for instant mobile PDF access. Set auto-expiration timers, one-time scan limits, and PIN codes.",
        "h1": "Convert PDF Document to QR Code",
        "features": ["Instant camera scan access", "Optional PIN protection", "Auto-expiration timers (15m, 1h, 24h)", "High-res QR vector export"],
        "how_to": ["Upload your PDF document", "Set expiration duration or PIN (optional)", "Generate and download printable QR code"],
        "related": [("scan-to-pdf", "Scan to PDF"), ("merge-pdf", "Merge PDF"), ("protect-pdf", "Protect PDF"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "analyze-pdf",
        "title": "AI PDF Analyzer & Document Intelligence | PDFBolt",
        "description": "Extract executive summaries, key findings, topics, and auto-generate 10-slide PowerPoint presentations from any PDF document.",
        "h1": "AI PDF Analyzer & Document Intelligence",
        "features": ["Executive summary extraction", "Auto-generate 10-slide PPT deck", "Topic & keyword extraction", "100% Client-side AI"],
        "how_to": ["Select any PDF document", "Review instant structural analysis", "Export to PowerPoint, Word, or Excel"],
        "related": [("pdf-to-ppt", "PDF to PowerPoint"), ("pdf-to-word", "PDF to Word"), ("ocr-pdf", "OCR PDF"), ("compare-pdf", "Compare PDF")]
    },
    {
        "path": "pdf-builder",
        "title": "AI PDF Builder & Slide Presentation Generator | PDFBolt",
        "description": "Build executive slide presentations, structured documents, and clean PDF exports using client-side AI analysis.",
        "h1": "AI PDF Builder & Slide Deck Generator",
        "features": ["Instant presentation generation", "Structured slide layouts", "Client-side AI extraction", "Export to PDF & PPTX"],
        "how_to": ["Select your source PDF", "Review generated presentation slides", "Export to PPTX or PDF"],
        "related": [("analyze-pdf", "Analyze PDF"), ("pdf-to-ppt", "PDF to PowerPoint"), ("pdf-to-word", "PDF to Word"), ("compress-pdf", "Compress PDF")]
    }
]

# 2. Hubs and Workflows
HUBS_AND_WORKFLOWS = [
    {
        "path": "tools",
        "title": "All 25+ Online PDF Tools (Free & Unlimited) | PDFBolt Directory",
        "description": "Browse our full suite of 25+ browser-based PDF tools. Fast, free, and private conversion, editing, and compression tools with zero server uploads.",
        "h1": "All Online PDF Tools",
        "features": ["25+ Browser-based utilities", "100% Free & Unlimited", "Zero server upload privacy", "Mobile and desktop compatible"],
        "how_to": ["Browse the tool catalog", "Select the tool matching your document task", "Process your file instantly in your browser"],
        "related": [("merge-pdf", "Merge PDF"), ("compress-pdf", "Compress PDF"), ("pdf-to-word", "PDF to Word"), ("edit-pdf", "Edit PDF")]
    },
    {
        "path": "guides",
        "title": "Free PDF Guides, Tutorials & Knowledge Base | PDFBolt",
        "description": "Comprehensive step-by-step guides on converting, compressing, merging, redacting, signing, and editing PDF files online with 100% privacy.",
        "h1": "PDF How-To Guides & Document Tutorials",
        "features": ["12+ Step-by-step guides", "Technical explanations", "Best practice workflows", "Zero fluff tutorials"],
        "how_to": ["Select a guide from the catalog", "Follow the step-by-step instructions", "Use the embedded tools to accomplish your task"],
        "related": [("tools", "Browse All Tools"), ("encyclopedia", "PDF Encyclopedia"), ("merge-pdf", "Merge PDF"), ("compress-pdf", "Compress PDF")]
    },
    {
        "path": "encyclopedia",
        "title": "PDF Format Encyclopedia & Technical Standards | PDFBolt",
        "description": "Technical explainers on PDF specifications (ISO 32000), PDF/A digital preservation standards, OCR neural networks, and vector graphics.",
        "h1": "PDF Format Encyclopedia & Technical Architecture",
        "features": ["ISO 32000 specifications", "PDF/A archival standards", "Compression algorithm deep dives", "Security & encryption architecture"],
        "how_to": ["Choose a technical topic", "Read in-depth specifications and standards", "Apply learnings to your document workflows"],
        "related": [("guides", "PDF Guides"), ("tools", "Online Tools"), ("compress-pdf", "Compress PDF"), ("protect-pdf", "Protect PDF")]
    },
    {
        "path": "student-pdf-tools",
        "title": "Free PDF Tools for Students & Researchers | PDFBolt",
        "description": "Curated PDF utilities for students: combine research papers, scan handwritten lecture notes to Word, compress heavy textbooks, and extract chapters.",
        "h1": "Free PDF Toolkit for Students & Academics",
        "features": ["Handwriting note scanner", "Heavy textbook compression", "Research paper merger", "100% Free with no limits"],
        "how_to": ["Select a student workflow tool", "Upload your notes or textbook PDF", "Download formatted output instantly"],
        "related": [("scan-handwriting-to-pdf", "Scan Handwriting"), ("merge-pdf", "Merge PDF"), ("compress-pdf", "Compress PDF"), ("ocr-pdf", "OCR PDF")]
    },
    {
        "path": "business-pdf-tools",
        "title": "Enterprise & Business PDF Tools – 100% Confidential | PDFBolt",
        "description": "Confidential PDF utilities for business: sign contracts, permanently redact financial data, encrypt invoices, and convert spreadsheets.",
        "h1": "Confidential PDF Toolkit for Business & Legal",
        "features": ["Zero server upload compliance", "Irreversible redaction", "AES-256 password protection", "Digital signature tools"],
        "how_to": ["Select a business tool", "Process contracts or financial records securely", "Export finalized compliant PDF"],
        "related": [("protect-pdf", "Protect PDF"), ("sign-pdf", "Sign PDF"), ("redact-pdf", "Redact PDF"), ("pdf-to-excel", "PDF to Excel")]
    },
    {
        "path": "developer-pdf-tools",
        "title": "Developer PDF Utilities & Technical Tools | PDFBolt",
        "description": "PDF tools built for engineers: analyze document object models, repair corrupted XRef tables, convert code to PDF, and compare side-by-side.",
        "h1": "Developer & Technical PDF Utilities",
        "features": ["XRef table repair", "Side-by-side diffing", "Document structure analyzer", "Local WebAssembly execution"],
        "how_to": ["Upload target file or code", "Inspect structure and run transformations", "Export optimized output"],
        "related": [("repair-pdf", "Repair PDF"), ("compare-pdf", "Compare PDF"), ("html-to-pdf", "HTML to PDF"), ("analyze-pdf", "Analyze PDF")]
    },
    {
        "path": "compare/online-pdf-tools",
        "title": "Online PDF Tools Comparison (2026) – Client-Side Privacy vs Cloud | PDFBolt",
        "description": "Compare client-side WebAssembly document processing vs cloud server upload converters and desktop Adobe Acrobat.",
        "h1": "Online PDF Tools Comparison (2026)",
        "features": ["Client-side WebAssembly vs Cloud", "Zero upload latency benchmarks", "Permanent redaction analysis", "Feature breakdown table"],
        "how_to": ["Review the comparison matrix", "Compare security models", "Choose the fastest private tool for your task"],
        "related": [("tools", "All Tools"), ("compress-pdf", "Compress PDF"), ("protect-pdf", "Protect PDF"), ("merge-pdf", "Merge PDF")]
    },
    {
        "path": "tools/pdf-size-calculator",
        "title": "Interactive PDF Size & Compression Calculator | PDFBolt",
        "description": "Calculate and estimate how much file size you can save when compressing PDF documents based on page count, image DPI, and content type.",
        "h1": "Interactive PDF File Size & Compression Calculator",
        "features": ["Instant size estimation", "DPI & color depth modeling", "Preset document profiles", "Compression optimization tips"],
        "how_to": ["Enter document page count and image density", "View estimated compressed size", "Compress your file using PDFBolt"],
        "related": [("compress-pdf", "Compress PDF"), ("pdf-to-jpg", "PDF to JPG"), ("tools", "All Tools"), ("guides", "PDF Guides")]
    },
    {
        "path": "test-files",
        "title": "Download Free Sample PDF Test Files | PDFBolt Playground",
        "description": "Download free sample PDF files for testing: multi-page documents, tables, scanned receipts, and slides ready for testing PDF conversion and editing tools.",
        "h1": "Sample PDF Test Files & Playground",
        "features": ["Multi-page documents", "Complex tabular reports", "Scanned handwritten samples", "100% Free public domain test files"],
        "how_to": ["Choose a sample test file", "Download or open directly in a PDFBolt tool", "Test compression, conversion, or OCR"],
        "related": [("merge-pdf", "Merge PDF"), ("compress-pdf", "Compress PDF"), ("pdf-to-word", "PDF to Word"), ("pdf-to-excel", "PDF to Excel")]
    },
    {
        "path": "privacy",
        "title": "Privacy Policy – 100% Client-Side PDF Processing | PDFBolt",
        "description": "Read PDFBolt's privacy policy. All PDF conversions, merges, compression, and edits execute locally inside your browser with zero server data retention.",
        "h1": "PDFBolt Privacy Policy",
        "features": ["Zero server upload architecture", "No cookies or trackers for PDF data", "GDPR and CCPA compliant", "Local RAM memory execution"],
        "how_to": ["Read privacy policy terms", "Verify local browser execution", "Process confidential documents with confidence"],
        "related": [("terms", "Terms of Service"), ("about", "About PDFBolt"), ("contact", "Contact Us"), ("tools", "All Tools")]
    },
    {
        "path": "terms",
        "title": "Terms of Service – Free Online PDF Tools | PDFBolt",
        "description": "PDFBolt terms of service and acceptable usage guidelines for our browser-based PDF utilities.",
        "h1": "PDFBolt Terms of Service",
        "features": ["Free and unlimited usage", "No registration required", "Client-side execution rights", "Clear acceptable usage"],
        "how_to": ["Review terms and conditions", "Use tools freely for personal and commercial tasks"],
        "related": [("privacy", "Privacy Policy"), ("about", "About Us"), ("contact", "Contact"), ("tools", "All Tools")]
    },
    {
        "path": "about",
        "title": "About PDFBolt – Privacy-First Document Intelligence | PDFBolt",
        "description": "Learn about PDFBolt's mission to provide lightning-fast, 100% private, browser-based PDF utilities with zero cloud uploads.",
        "h1": "About PDFBolt",
        "features": ["WebAssembly document engine", "100% Private & secure", "Zero file limits", "Fast global CDN"],
        "how_to": ["Learn about our technology", "Explore client-side PDF processing", "Experience fast, private PDF tools"],
        "related": [("tools", "All Tools"), ("privacy", "Privacy Policy"), ("guides", "Guides"), ("contact", "Contact Us")]
    },
    {
        "path": "contact",
        "title": "Contact Customer Support & Feedback | PDFBolt",
        "description": "Get in touch with the PDFBolt team for technical support, feature requests, enterprise inquiries, and bug reports.",
        "h1": "Contact PDFBolt Support",
        "features": ["Fast response time", "Technical support", "Feature request channel", "Bug report submissions"],
        "how_to": ["Fill out the contact form", "Submit your message", "Our team will respond within 24-48 hours"],
        "related": [("about", "About Us"), ("tools", "All Tools"), ("guides", "Guides"), ("privacy", "Privacy Policy")]
    },
    {
        "path": "tutorials",
        "title": "PDF Video Tutorials & Step-by-Step Walkthroughs | PDFBolt",
        "description": "Watch video tutorials and read walkthroughs on mastering PDF tools, compressing large documents, and converting formats.",
        "h1": "PDF Video Tutorials & Step-by-Step Guides",
        "features": ["Video walkthroughs", "Visual tool guides", "Pro document tips", "Free resources"],
        "how_to": ["Select a tutorial", "Follow along with the video or text steps", "Master PDF workflows"],
        "related": [("guides", "Guides Hub"), ("tools", "All Tools"), ("merge-pdf", "Merge PDF"), ("compress-pdf", "Compress PDF")]
    }
]

# 3. Exact Guides from constants.tsx
EXACT_GUIDES = [
    ("how-to-convert-pdf-to-word", "How to Convert PDF to Word (DOCX) Without Losing Formatting", "Learn how to convert PDF documents into editable Microsoft Word (.docx) files while preserving tables, fonts, bold headings, and layout structure."),
    ("how-to-compress-a-pdf", "How to Compress a PDF to Reduce File Size Below 10MB or 2MB", "Step-by-step tutorial on compressing heavy PDF files for email attachments, government portals, and online submissions with zero quality loss."),
    ("how-to-merge-pdf-files", "How to Merge Multiple PDF Files into One Document for Free", "Learn how to combine invoices, receipts, book chapters, and research papers into one unified PDF document in your browser."),
    ("how-to-convert-pdf-to-ppt", "How to Convert PDF Presentations to Editable PowerPoint (PPTX)", "Tutorial on transforming PDF slide decks into editable Microsoft PowerPoint presentations (.pptx) with crisp high-resolution graphics."),
    ("how-to-convert-pdf-to-excel", "How to Extract Tabular Data from PDF into Microsoft Excel", "Learn how spatial table recognition automatically converts PDF balance sheets, invoices, and expense reports into structured Excel (.xlsx) spreadsheets."),
    ("how-to-redact-a-pdf", "How to Permanently Redact and Black Out Sensitive Data in PDF", "Learn why black box rasterization is essential to irreversibly remove social security numbers, medical records, and confidential text from PDF files."),
    ("how-to-protect-a-pdf", "How to Password Protect and Encrypt PDF Files with AES Security", "Comprehensive guide on applying strong 128-bit and 256-bit AES encryption to confidential PDF files with customizable printing and copying permissions."),
    ("how-to-split-a-pdf", "How to Split PDF Pages and Extract Specific Page Ranges", "Learn how to extract individual pages, page ranges, or burst multi-page PDF documents into single-page files with zero upload latency."),
    ("how-to-edit-a-pdf", "How to Edit a PDF Online for Free: Add Text, Draw & Annotate", "Complete walkthrough on adding custom text blocks, signatures, freehand drawings, and geometric annotations to any PDF document for free."),
    ("how-to-sign-a-pdf", "How to Sign a PDF Document Online with Digital Signatures", "Step-by-step instructions on creating, resizing, and stamping electronic signatures onto contracts, agreements, and tax forms."),
    ("how-to-ocr-a-pdf", "How to OCR a PDF to Make Scanned Documents Searchable & Selectable", "Tutorial on running optical character recognition on scanned paper documents and receipts to extract searchable text layers."),
    ("how-to-remove-pages-from-pdf", "How to Delete and Remove Unwanted Pages from a PDF File", "Step-by-step guide on removing blank pages, cover sheets, or confidential sections from multi-page PDF documents.")
]

# 4. Exact Encyclopedia Articles from constants.tsx
EXACT_ENCYCLOPEDIA = [
    ("what-is-pdf", "What is a PDF? The Complete Guide to Portable Document Format", "Explore the history of PostScript, Camelot, and how Adobe transformed PDF into the global ISO 32000 open standard."),
    ("pdf-vs-pdfa", "PDF vs PDF/A: Key Differences for Long-Term Archiving", "Learn about PDF/A-1, PDF/A-2, PDF/A-3, and PDF/A-4 compliance requirements for long-term document archiving."),
    ("what-is-ocr", "What is OCR? Optical Character Recognition Explained", "A technical deep dive into lossy vs lossless stream filters and optical character recognition used within PDF object streams."),
    ("searchable-pdf-vs-scanned-pdf", "Searchable PDF vs Scanned PDF: Why Text Layers Matter", "Understanding vector bezier curves, font glyph outlines, and bitmap rasterization in modern PDF engines."),
    ("vector-vs-raster-pdf", "Vector PDF vs Raster PDF: Why Some PDFs Pixelate When Zoomed", "How neural network OCR engines convert bitmap image layers into hidden searchable text layers in PDF files.")
]

def generate_prerendered_pages():
    if not os.path.exists(INDEX_HTML):
        print(f"Error: {INDEX_HTML} not found. Run 'vite build' first.")
        return

    with open(INDEX_HTML, "r", encoding="utf-8") as f:
        base_template = f.read()

    all_pages = []

    # Add tools
    for t in CANONICAL_TOOLS:
        all_pages.append(t)

    # Add hubs and workflows
    for h in HUBS_AND_WORKFLOWS:
        all_pages.append(h)

    # Add guides
    for slug, title, desc in EXACT_GUIDES:
        all_pages.append({
            "path": f"guides/{slug}",
            "title": f"{title} | PDFBolt Guide",
            "description": desc,
            "h1": title,
            "features": ["Step-by-step instructions", "100% Private local tools", "No software install required", "Free & unlimited"],
            "how_to": ["Read the guide instructions", "Use the corresponding PDFBolt tool", "Complete your task in seconds"],
            "related": [("guides", "All Guides"), ("tools", "All Tools"), ("merge-pdf", "Merge PDF"), ("compress-pdf", "Compress PDF")]
        })

    # Add encyclopedia
    for slug, title, desc in EXACT_ENCYCLOPEDIA:
        all_pages.append({
            "path": f"encyclopedia/{slug}",
            "title": f"{title} | PDFBolt Encyclopedia",
            "description": desc,
            "h1": title,
            "features": ["ISO standard references", "Technical architecture diagrams", "PDF specification explainers", "In-depth research"],
            "how_to": ["Read the technical article", "Understand PDF specifications", "Apply best practices to document workflows"],
            "related": [("encyclopedia", "Encyclopedia Hub"), ("guides", "How-To Guides"), ("tools", "All Tools"), ("compare-pdf", "Compare PDF")]
        })

    print(f"Generating physical index.html files for {len(all_pages)} canonical routes...")

    for page in all_pages:
        path = page["path"]
        title = page["title"]
        description = page["description"]
        h1 = page["h1"]
        canonical_url = f"{CANONICAL_DOMAIN}/{path}"

        target_dir = os.path.join(DIST_DIR, path)
        os.makedirs(target_dir, exist_ok=True)
        target_file = os.path.join(target_dir, "index.html")

        # Build custom noscript content with semantic HTML & internal links
        features_html = "".join([f"<li>{f}</li>" for f in page.get("features", [])])
        steps_html = "".join([f"<li>{s}</li>" for s in page.get("how_to", [])])
        related_html = "".join([
            f'<li><a href="/{rel_path}" style="color: #eab308; text-decoration: underline;">{rel_name}</a></li>'
            for rel_path, rel_name in page.get("related", [])
        ])

        custom_noscript = f"""
    <noscript>
      <div style="padding: 40px; max-width: 900px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6;">
        <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 1rem; color: #0f172a;">{h1}</h1>
        <p style="font-size: 1.1rem; color: #334155; margin-bottom: 1.5rem;">{description}</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; margin-top: 0; color: #0f172a;">Key Capabilities & Privacy Features</h2>
          <ul style="color: #475569; padding-left: 20px;">
            {features_html}
          </ul>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; margin-top: 0; color: #92400e;">How to Use This Tool</h2>
          <ol style="color: #78350f; padding-left: 20px;">
            {steps_html}
          </ol>
        </div>

        <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">Contextual PDF Tools & Resources</h2>
        <ul style="padding-left: 20px; margin-bottom: 2rem;">
          {related_html}
        </ul>

        <div style="border-top: 2px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 16px;">PDFBolt Full Platform Directory</h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #334155; margin-bottom: 8px;">Core PDF Tools</h3>
              <ul style="padding-left: 16px; margin: 0; font-size: 0.85rem; line-height: 1.8;">
                <li><a href="/merge-pdf" style="color: #b45309; text-decoration: underline;">Merge PDF</a></li>
                <li><a href="/split-pdf" style="color: #b45309; text-decoration: underline;">Split PDF</a></li>
                <li><a href="/compress-pdf" style="color: #b45309; text-decoration: underline;">Compress PDF</a></li>
                <li><a href="/pdf-to-word" style="color: #b45309; text-decoration: underline;">PDF to Word</a></li>
                <li><a href="/pdf-to-excel" style="color: #b45309; text-decoration: underline;">PDF to Excel</a></li>
                <li><a href="/pdf-to-ppt" style="color: #b45309; text-decoration: underline;">PDF to PowerPoint</a></li>
                <li><a href="/pdf-to-jpg" style="color: #b45309; text-decoration: underline;">PDF to JPG</a></li>
                <li><a href="/word-to-pdf" style="color: #b45309; text-decoration: underline;">Word to PDF</a></li>
                <li><a href="/excel-to-pdf" style="color: #b45309; text-decoration: underline;">Excel to PDF</a></li>
                <li><a href="/ppt-to-pdf" style="color: #b45309; text-decoration: underline;">PPT to PDF</a></li>
                <li><a href="/jpg-to-pdf" style="color: #b45309; text-decoration: underline;">JPG to PDF</a></li>
                <li><a href="/html-to-pdf" style="color: #b45309; text-decoration: underline;">HTML to PDF</a></li>
                <li><a href="/edit-pdf" style="color: #b45309; text-decoration: underline;">Edit PDF</a></li>
                <li><a href="/protect-pdf" style="color: #b45309; text-decoration: underline;">Protect PDF</a></li>
                <li><a href="/unlock-pdf" style="color: #b45309; text-decoration: underline;">Unlock PDF</a></li>
                <li><a href="/sign-pdf" style="color: #b45309; text-decoration: underline;">Sign PDF</a></li>
                <li><a href="/redact-pdf" style="color: #b45309; text-decoration: underline;">Redact PDF</a></li>
                <li><a href="/ocr-pdf" style="color: #b45309; text-decoration: underline;">OCR PDF</a></li>
                <li><a href="/scan-to-pdf" style="color: #b45309; text-decoration: underline;">Scan to PDF</a></li>
                <li><a href="/scan-handwriting-to-pdf" style="color: #b45309; text-decoration: underline;">Scan Handwriting</a></li>
                <li><a href="/rotate-pdf" style="color: #b45309; text-decoration: underline;">Rotate PDF</a></li>
                <li><a href="/organize-pdf" style="color: #b45309; text-decoration: underline;">Organize PDF</a></li>
                <li><a href="/add-page-numbers-to-pdf" style="color: #b45309; text-decoration: underline;">Add Page Numbers</a></li>
                <li><a href="/watermark-pdf" style="color: #b45309; text-decoration: underline;">Watermark PDF</a></li>
                <li><a href="/delete-pdf-pages" style="color: #b45309; text-decoration: underline;">Delete PDF Pages</a></li>
                <li><a href="/compare-pdf" style="color: #b45309; text-decoration: underline;">Compare PDF</a></li>
                <li><a href="/repair-pdf" style="color: #b45309; text-decoration: underline;">Repair PDF</a></li>
                <li><a href="/pdf-to-qr-code" style="color: #b45309; text-decoration: underline;">PDF to QR Code</a></li>
                <li><a href="/analyze-pdf" style="color: #b45309; text-decoration: underline;">AI PDF Analyzer</a></li>
                <li><a href="/pdf-builder" style="color: #b45309; text-decoration: underline;">Interactive PDF Builder</a></li>
              </ul>
            </div>

            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #334155; margin-bottom: 8px;">How-To Guides</h3>
              <ul style="padding-left: 16px; margin: 0; font-size: 0.85rem; line-height: 1.8;">
                <li><a href="/guides" style="color: #b45309; text-decoration: underline;">All Guides Hub</a></li>
                <li><a href="/guides/how-to-convert-pdf-to-word" style="color: #b45309; text-decoration: underline;">Convert PDF to Word</a></li>
                <li><a href="/guides/how-to-convert-pdf-to-excel" style="color: #b45309; text-decoration: underline;">Convert PDF to Excel</a></li>
                <li><a href="/guides/how-to-convert-pdf-to-ppt" style="color: #b45309; text-decoration: underline;">Convert PDF to PowerPoint</a></li>
                <li><a href="/guides/how-to-compress-a-pdf" style="color: #b45309; text-decoration: underline;">Compress Below 2MB</a></li>
                <li><a href="/guides/how-to-merge-pdf-files" style="color: #b45309; text-decoration: underline;">Merge Multiple PDFs</a></li>
                <li><a href="/guides/how-to-split-a-pdf" style="color: #b45309; text-decoration: underline;">Split PDF Pages</a></li>
                <li><a href="/guides/how-to-edit-a-pdf" style="color: #b45309; text-decoration: underline;">Edit PDF Online</a></li>
                <li><a href="/guides/how-to-protect-a-pdf" style="color: #b45309; text-decoration: underline;">Password Protect PDF</a></li>
                <li><a href="/guides/how-to-sign-a-pdf" style="color: #b45309; text-decoration: underline;">Electronically Sign PDF</a></li>
                <li><a href="/guides/how-to-redact-a-pdf" style="color: #b45309; text-decoration: underline;">Permanently Redact PDF</a></li>
                <li><a href="/guides/how-to-ocr-a-pdf" style="color: #b45309; text-decoration: underline;">OCR Scanned PDFs</a></li>
                <li><a href="/guides/how-to-remove-pages-from-pdf" style="color: #b45309; text-decoration: underline;">Remove Unwanted Pages</a></li>
              </ul>
            </div>

            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #334155; margin-bottom: 8px;">Encyclopedia & Hubs</h3>
              <ul style="padding-left: 16px; margin: 0; font-size: 0.85rem; line-height: 1.8;">
                <li><a href="/encyclopedia" style="color: #b45309; text-decoration: underline;">Encyclopedia Hub</a></li>
                <li><a href="/encyclopedia/what-is-pdf" style="color: #b45309; text-decoration: underline;">What is a PDF (ISO 32000)</a></li>
                <li><a href="/encyclopedia/pdf-vs-pdfa" style="color: #b45309; text-decoration: underline;">PDF vs PDF/A Archival</a></li>
                <li><a href="/encyclopedia/what-is-ocr" style="color: #b45309; text-decoration: underline;">How OCR Technology Works</a></li>
                <li><a href="/encyclopedia/vector-vs-raster-pdf" style="color: #b45309; text-decoration: underline;">Vector vs Raster PDFs</a></li>
                <li><a href="/encyclopedia/pdf-security-and-encryption" style="color: #b45309; text-decoration: underline;">PDF Security & Encryption</a></li>
                <li><a href="/encyclopedia/searchable-pdf-vs-scanned-pdf" style="color: #b45309; text-decoration: underline;">Searchable vs Scanned PDF</a></li>
                <li><a href="/student-pdf-tools" style="color: #b45309; text-decoration: underline;">Student PDF Hub</a></li>
                <li><a href="/business-pdf-tools" style="color: #b45309; text-decoration: underline;">Business & Legal Hub</a></li>
                <li><a href="/developer-pdf-tools" style="color: #b45309; text-decoration: underline;">Developer Architecture</a></li>
                <li><a href="/compare/online-pdf-tools" style="color: #b45309; text-decoration: underline;">PDF Tools Comparison</a></li>
                <li><a href="/tools/pdf-size-calculator" style="color: #b45309; text-decoration: underline;">PDF Size Calculator</a></li>
                <li><a href="/test-files" style="color: #b45309; text-decoration: underline;">Sample PDF Test Files</a></li>
                <li><a href="/tutorials" style="color: #b45309; text-decoration: underline;">Video Tutorials</a></li>
                <li><a href="/about" style="color: #b45309; text-decoration: underline;">About PDFBolt</a></li>
                <li><a href="/privacy" style="color: #b45309; text-decoration: underline;">Privacy Policy</a></li>
                <li><a href="/terms" style="color: #b45309; text-decoration: underline;">Terms of Service</a></li>
                <li><a href="/contact" style="color: #b45309; text-decoration: underline;">Contact Support</a></li>
              </ul>
            </div>
          </div>
        </div>

        <p><strong>Note:</strong> PDFBolt operates 100% in your browser. Please enable JavaScript to access the interactive tool.</p>
      </div>
    </noscript>
"""

        # Replace Title
        html = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', base_template)

        # Replace Description
        html = re.sub(r'<meta name="description"[^>]*content=".*?"', f'<meta name="description" data-rh="true"\n    content="{description}"', html)

        # Replace Canonical
        html = re.sub(r'<link rel="canonical"[^>]*>', f'<link rel="canonical" data-rh="true" href="{canonical_url}" />', html)

        # Replace OpenGraph
        html = re.sub(r'<meta property="og:title"[^>]*>', f'<meta property="og:title" data-rh="true" content="{title}" />', html)
        html = re.sub(r'<meta property="og:description"[^>]*>', f'<meta property="og:description" data-rh="true"\n    content="{description}" />', html)
        html = re.sub(r'<meta property="og:url"[^>]*>', f'<meta property="og:url" data-rh="true" content="{canonical_url}" />', html)

        # Replace Twitter
        html = re.sub(r'<meta name="twitter:title"[^>]*>', f'<meta name="twitter:title" data-rh="true" content="{title}" />', html)
        html = re.sub(r'<meta name="twitter:description"[^>]*>', f'<meta name="twitter:description" data-rh="true"\n    content="{description}" />', html)

        # Replace Noscript
        html = re.sub(r'<noscript>.*?</noscript>', custom_noscript, html, flags=re.DOTALL)

        with open(target_file, "w", encoding="utf-8") as out:
            out.write(html)

    print(f"Successfully generated {len(all_pages)} prerendered canonical pages in {DIST_DIR}!")

if __name__ == "__main__":
    generate_prerendered_pages()
