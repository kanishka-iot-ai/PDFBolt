const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function buildPdfs() {
  const outputDir = path.resolve('free-backlinks/documents');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Helper color palette
  const darkBlue = rgb(0.06, 0.09, 0.16);
  const slate700 = rgb(0.2, 0.25, 0.35);
  const slate500 = rgb(0.4, 0.45, 0.55);
  const linkBlue = rgb(0.08, 0.4, 0.85);
  const amber = rgb(0.92, 0.7, 0.03);

  // -------------------------------------------------------------
  // DOC 1: PDFBolt Ultimate Guide To Private PDF Tools 2026
  // -------------------------------------------------------------
  const doc1 = await PDFDocument.create();
  const font = await doc1.embedFont(StandardFonts.Helvetica);
  const bold = await doc1.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Cover & Architecture
  const p1 = doc1.addPage([595.28, 841.89]);
  p1.drawRectangle({ x: 0, y: 760, width: 595.28, height: 81.89, color: darkBlue });
  p1.drawText('PDFBOLT DOCUMENT INTELLIGENCE REPORT', { x: 50, y: 805, size: 10, font: bold, color: amber });
  p1.drawText('The Ultimate Guide to Private, In-Browser PDF Tools (2026 Edition)', { x: 50, y: 780, size: 16, font: bold, color: rgb(1, 1, 1) });

  p1.drawText('Executive Summary & Paradigm Shift', { x: 50, y: 720, size: 14, font: bold, color: darkBlue });
  p1.drawText('For decades, online document processing required uploading sensitive files to cloud servers.', { x: 50, y: 698, size: 10, font, color: slate700 });
  p1.drawText('PDFBolt (https://pdfbolt.in) replaces this legacy model with 100% in-browser WebAssembly.', { x: 50, y: 683, size: 10, font, color: slate700 });
  p1.drawText('Your documents never leave your device RAM, guaranteeing absolute confidentiality (GDPR/HIPAA compliant).', { x: 50, y: 668, size: 10, font, color: slate700 });

  p1.drawText('Architectural Comparison: Client-Side vs Cloud Server Converters', { x: 50, y: 630, size: 12, font: bold, color: darkBlue });
  p1.drawRectangle({ x: 50, y: 490, width: 495, height: 125, color: rgb(0.96, 0.97, 0.99), borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1 });
  
  p1.drawText('CRITERION', { x: 65, y: 595, size: 9, font: bold, color: darkBlue });
  p1.drawText('LEGACY CLOUD (iLovePDF / Smallpdf)', { x: 175, y: 595, size: 9, font: bold, color: darkBlue });
  p1.drawText('PDFBOLT (In-Browser WebAssembly)', { x: 375, y: 595, size: 9, font: bold, color: linkBlue });

  p1.drawText('Data Confidentiality', { x: 65, y: 570, size: 9, font, color: slate700 });
  p1.drawText('Stored on cloud queues & third-party disks', { x: 175, y: 570, size: 9, font, color: slate700 });
  p1.drawText('100% Local RAM (Zero upload / zero retention)', { x: 375, y: 570, size: 9, font: bold, color: linkBlue });

  p1.drawText('Task Limits & Quotas', { x: 65, y: 545, size: 9, font, color: slate700 });
  p1.drawText('2 tasks per day on free tier paywalls', { x: 175, y: 545, size: 9, font, color: slate700 });
  p1.drawText('Unlimited free tasks (No subscriptions)', { x: 375, y: 545, size: 9, font: bold, color: linkBlue });

  p1.drawText('Offline Operation', { x: 65, y: 520, size: 9, font, color: slate700 });
  p1.drawText('Requires active internet & high bandwidth', { x: 175, y: 520, size: 9, font, color: slate700 });
  p1.drawText('Works 100% offline in Airplane mode', { x: 375, y: 520, size: 9, font: bold, color: linkBlue });

  p1.drawText('Official Tool Homepage: https://pdfbolt.in', { x: 50, y: 460, size: 11, font: bold, color: linkBlue });
  p1.drawText('Read the complete technical comparison: https://pdfbolt.in/compare/ilovepdf-alternative/', { x: 50, y: 440, size: 10, font, color: linkBlue });

  // Page 2: Merging & Compressing
  const p2 = doc1.addPage([595.28, 841.89]);
  p2.drawText('Core Workflow 1: How to Merge Multiple PDFs Privately', { x: 50, y: 780, size: 14, font: bold, color: darkBlue });
  p2.drawText('Step 1: Open https://pdfbolt.in/merge-pdf/ in any web browser.', { x: 65, y: 755, size: 10, font, color: slate700 });
  p2.drawText('Step 2: Select or drag multiple PDF files onto the canvas.', { x: 65, y: 738, size: 10, font, color: slate700 });
  p2.drawText('Step 3: Arrange document order using intuitive reorder arrows.', { x: 65, y: 721, size: 10, font, color: slate700 });
  p2.drawText('Step 4: Click "MERGE PDF" to combine all streams in memory. Download instantly.', { x: 65, y: 704, size: 10, font, color: slate700 });
  p2.drawText('Direct Tool URL: https://pdfbolt.in/merge-pdf/', { x: 65, y: 685, size: 10, font: bold, color: linkBlue });

  p2.drawText('Core Workflow 2: Compressing PDFs to Exact Target Sizes', { x: 50, y: 640, size: 14, font: bold, color: darkBlue });
  p2.drawText('Government portals, university applications, and email gateways enforce strict file size limits.', { x: 65, y: 615, size: 10, font, color: slate700 });
  p2.drawText('PDFBolt allows smart compression using target size thresholds:', { x: 65, y: 598, size: 10, font, color: slate700 });
  p2.drawText('• Under 100KB: Recommended for signatures, receipts, and photo documents.', { x: 80, y: 578, size: 9, font, color: slate700 });
  p2.drawText('• Under 200KB / 500KB: Standard portal limit for SSC, UPSC, and Indian government applications.', { x: 80, y: 561, size: 9, font, color: slate700 });
  p2.drawText('• Smart Adaptive: Reduces file size by up to 80% while retaining vector text sharpness.', { x: 80, y: 544, size: 9, font, color: slate700 });
  p2.drawText('Direct Tool URL: https://pdfbolt.in/compress-pdf/', { x: 65, y: 520, size: 10, font: bold, color: linkBlue });

  // Page 3: Conversion & Security
  const p3 = doc1.addPage([595.28, 841.89]);
  p3.drawText('Core Workflow 3: PDF to Editable Word (.docx) Conversion', { x: 50, y: 780, size: 14, font: bold, color: darkBlue });
  p3.drawText('Converting PDF documents to editable Microsoft Word files often corrupts formatting on legacy sites.', { x: 65, y: 755, size: 10, font, color: slate700 });
  p3.drawText('PDFBolt preserves typography, table borders, vector graphics, and glyph hierarchy.', { x: 65, y: 738, size: 10, font, color: slate700 });
  p3.drawText('Direct Tool URL: https://pdfbolt.in/pdf-to-word/', { x: 65, y: 718, size: 10, font: bold, color: linkBlue });

  p3.drawText('Core Workflow 4: Permanent PII Redaction & Document Sanitization', { x: 50, y: 670, size: 14, font: bold, color: darkBlue });
  p3.drawText('Never use simple black highlighter rectangles to hide confidential data; underlying text remains extractable!', { x: 65, y: 645, size: 10, font, color: slate700 });
  p3.drawText('PDFBolt provides deep raster redaction for Aadhaar, PAN card, phone numbers, and bank details.', { x: 65, y: 628, size: 10, font, color: slate700 });
  p3.drawText('Direct Tool URL: https://pdfbolt.in/redact-pdf/', { x: 65, y: 608, size: 10, font: bold, color: linkBlue });

  // Page 4: Master Directory Index
  const p4 = doc1.addPage([595.28, 841.89]);
  p4.drawText('Complete PDFBolt Online Tool Ecosystem Directory', { x: 50, y: 780, size: 16, font: bold, color: darkBlue });
  p4.drawText('All tools are free, unrestricted, and operate 100% inside your web browser:', { x: 50, y: 755, size: 10, font, color: slate700 });

  const tools = [
    { name: 'Merge PDF', url: 'https://pdfbolt.in/merge-pdf/' },
    { name: 'Compress PDF', url: 'https://pdfbolt.in/compress-pdf/' },
    { name: 'Split PDF Pages', url: 'https://pdfbolt.in/split-pdf/' },
    { name: 'PDF to Word (.docx)', url: 'https://pdfbolt.in/pdf-to-word/' },
    { name: 'Word to PDF', url: 'https://pdfbolt.in/word-to-pdf/' },
    { name: 'Edit PDF Online', url: 'https://pdfbolt.in/edit-pdf/' },
    { name: 'Redact Confidential PDF', url: 'https://pdfbolt.in/redact-pdf/' },
    { name: 'Protect PDF (AES)', url: 'https://pdfbolt.in/protect-pdf/' },
    { name: 'Unlock Password PDF', url: 'https://pdfbolt.in/unlock-pdf/' },
    { name: 'Rotate PDF Pages', url: 'https://pdfbolt.in/rotate-pdf/' },
    { name: 'Add Page Numbers', url: 'https://pdfbolt.in/add-page-numbers-to-pdf/' },
    { name: 'Student & Exam Tools', url: 'https://pdfbolt.in/student-pdf-tools/' },
  ];

  let yPos = 720;
  for (const t of tools) {
    p4.drawText(`• ${t.name}:`, { x: 65, y: yPos, size: 10, font: bold, color: darkBlue });
    p4.drawText(t.url, { x: 220, y: yPos, size: 10, font, color: linkBlue });
    yPos -= 24;
  }

  p4.drawText('Explore All 25+ PDF Tools: https://pdfbolt.in/tools/', { x: 50, y: 410, size: 12, font: bold, color: amber });
  p4.drawText('Published by PDFBolt Open Documentation Initiative. 100% In-Browser Privacy.', { x: 50, y: 380, size: 9, font, color: slate500 });

  const doc1Bytes = await doc1.save();
  const doc1Path = path.join(outputDir, 'PDFBolt_Ultimate_Guide_To_Private_PDF_Tools_2026.pdf');
  fs.writeFileSync(doc1Path, doc1Bytes);
  console.log(`✅ Generated: ${doc1Path} (${(doc1Bytes.length / 1024).toFixed(1)} KB)`);

  // -------------------------------------------------------------
  // DOC 2: Indian Exam & Job Portal PDF Size Guide 2026
  // -------------------------------------------------------------
  const doc2 = await PDFDocument.create();
  const font2 = await doc2.embedFont(StandardFonts.Helvetica);
  const bold2 = await doc2.embedFont(StandardFonts.HelveticaBold);

  const dp1 = doc2.addPage([595.28, 841.89]);
  dp1.drawRectangle({ x: 0, y: 760, width: 595.28, height: 81.89, color: darkBlue });
  dp1.drawText('GOVERNMENT PORTAL & COMPETITIVE EXAM REFERENCE', { x: 50, y: 805, size: 10, font: bold2, color: amber });
  dp1.drawText('Indian Exam & Recruitment PDF File Size Guide (2026)', { x: 50, y: 780, size: 16, font: bold2, color: rgb(1, 1, 1) });

  dp1.drawText('Official File Specification Matrix for Indian Portals', { x: 50, y: 720, size: 14, font: bold2, color: darkBlue });
  dp1.drawText('Most government exams strictly reject uploads exceeding exact file boundaries:', { x: 50, y: 698, size: 10, font: font2, color: slate700 });

  dp1.drawRectangle({ x: 50, y: 500, width: 495, height: 180, color: rgb(0.96, 0.97, 0.99), borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1 });
  
  dp1.drawText('EXAM / PORTAL', { x: 65, y: 660, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('DOCUMENT TYPE', { x: 190, y: 660, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('ALLOWED SIZE LIMIT', { x: 330, y: 660, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('TOOL PRESET', { x: 450, y: 660, size: 9, font: bold2, color: linkBlue });

  dp1.drawText('SSC (CGL, CHSL, MTS)', { x: 65, y: 635, size: 9, font: font2, color: slate700 });
  dp1.drawText('Caste / Educational Certificate', { x: 190, y: 635, size: 9, font: font2, color: slate700 });
  dp1.drawText('Under 200 KB', { x: 330, y: 635, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('pdfbolt.in/compress-pdf-for-ssc', { x: 440, y: 635, size: 7.5, font: font2, color: linkBlue });

  dp1.drawText('UPSC (Civil Services)', { x: 65, y: 605, size: 9, font: font2, color: slate700 });
  dp1.drawText('DAF Application & Identity', { x: 190, y: 605, size: 9, font: font2, color: slate700 });
  dp1.drawText('Under 300 KB', { x: 330, y: 605, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('pdfbolt.in/compress-pdf-for-upsc', { x: 440, y: 605, size: 7.5, font: font2, color: linkBlue });

  dp1.drawText('NEET / JEE (NTA)', { x: 65, y: 575, size: 9, font: font2, color: slate700 });
  dp1.drawText('Category & PwD Certificate', { x: 190, y: 575, size: 9, font: font2, color: slate700 });
  dp1.drawText('50 KB to 300 KB', { x: 330, y: 575, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('pdfbolt.in/compress-pdf-for-neet', { x: 440, y: 575, size: 7.5, font: font2, color: linkBlue });

  dp1.drawText('IBPS / SBI Bank PO', { x: 65, y: 545, size: 9, font: font2, color: slate700 });
  dp1.drawText('Handwritten Declaration', { x: 190, y: 545, size: 9, font: font2, color: slate700 });
  dp1.drawText('50 KB to 100 KB', { x: 330, y: 545, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('pdfbolt.in/compress-pdf-for-ibps', { x: 440, y: 545, size: 7.5, font: font2, color: linkBlue });

  dp1.drawText('Identity Proof KYC', { x: 65, y: 515, size: 9, font: font2, color: slate700 });
  dp1.drawText('Aadhaar + PAN Joint PDF', { x: 190, y: 515, size: 9, font: font2, color: slate700 });
  dp1.drawText('Under 1 MB', { x: 330, y: 515, size: 9, font: bold2, color: darkBlue });
  dp1.drawText('pdfbolt.in/merge-aadhaar-and-pan-card', { x: 440, y: 515, size: 6.8, font: font2, color: linkBlue });

  dp1.drawText('Free Portal Tool Hub: https://pdfbolt.in/student-pdf-tools/', { x: 50, y: 460, size: 11, font: bold2, color: linkBlue });

  const doc2Bytes = await doc2.save();
  const doc2Path = path.join(outputDir, 'Indian_Exam_And_Job_Portal_PDF_Size_Guide_2026.pdf');
  fs.writeFileSync(doc2Path, doc2Bytes);
  console.log(`✅ Generated: ${doc2Path} (${(doc2Bytes.length / 1024).toFixed(1)} KB)`);
}

buildPdfs().catch(console.error);
