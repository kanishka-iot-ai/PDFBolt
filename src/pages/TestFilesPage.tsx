import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SAMPLE_TEST_FILES, TOOLS } from '../constants';
import { Download, FileText, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface TestFilesPageProps {
  darkMode: boolean;
}

const TestFilesPage: React.FC<TestFilesPageProps> = ({ darkMode }) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const generateAndDownloadSample = async (type: string, name: string) => {
    setGeneratingId(type);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      if (type === 'text') {
        for (let i = 1; i <= 5; i++) {
          const page = pdfDoc.addPage([595.28, 841.89]); // A4
          page.drawText(`PDFBolt Sample Research Report`, { x: 50, y: 780, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
          page.drawText(`Page ${i} of 5 — Generated for Testing & Demonstration`, { x: 50, y: 755, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
          page.drawText(`This is a standardized sample PDF document generated to test Merge, Split, Page Numbers, and Compression tools.`, { x: 50, y: 710, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
          page.drawRectangle({ x: 50, y: 400, width: 495, height: 260, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
          page.drawText(`Sample Chart / Exhibit Block [Page ${i}]`, { x: 70, y: 530, size: 14, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
        }
      } else if (type === 'table') {
        const page = pdfDoc.addPage([595.28, 841.89]);
        page.drawText(`Quarterly Balance Sheet & Income Statement`, { x: 50, y: 780, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(`Sample Tabular Data for PDF to Excel Conversion`, { x: 50, y: 755, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
        
        // Draw Table Grid
        const startY = 700;
        const rowHeight = 30;
        const headers = ['Quarter', 'Revenue (USD)', 'Operating Cost', 'Net Margin'];
        const rows = [
          ['Q1 2026', '$1,250,000', '$780,000', '37.6%'],
          ['Q2 2026', '$1,420,000', '$820,000', '42.2%'],
          ['Q3 2026', '$1,680,000', '$910,000', '45.8%'],
          ['Q4 2026', '$2,100,000', '$1,050,000', '50.0%']
        ];

        headers.forEach((h, hIdx) => {
          page.drawText(h, { x: 60 + hIdx * 120, y: startY, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        });

        rows.forEach((r, rIdx) => {
          const currentY = startY - (rIdx + 1) * rowHeight;
          r.forEach((cell, cIdx) => {
            page.drawText(cell, { x: 60 + cIdx * 120, y: currentY, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
          });
        });
      } else {
        const page = pdfDoc.addPage([595.28, 841.89]);
        page.drawText(`PDFBolt Sample Test File`, { x: 50, y: 780, size: 20, font: boldFont });
        page.drawText(`Ready for instant testing across all conversion and security tools.`, { x: 50, y: 750, size: 12, font });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error creating sample PDF:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="animate-fadeIn pb-24">
      <Helmet>
        <title>Download Free Sample PDF Test Files | PDFBolt Playground</title>
        <meta name="description" content="Download free sample PDF files for testing: multi-page documents, tables, scanned receipts, and slides ready for testing PDF conversion and editing tools." />
        <link rel="canonical" href="https://pdfbolt.com/test-files" />
      </Helmet>

      {/* Hero Header */}
      <section className={`py-16 border-b ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase tracking-widest mb-4">
            <Sparkles size={14} /> Sample Document Playground
          </div>
          <h1 className={`text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Sample PDF Test Files
          </h1>
          <p className={`text-base md:text-lg max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Don't have a document on hand? Generate and download safe, clean sample PDFs to test any PDFBolt tool instantly.
          </p>
        </div>
      </section>

      {/* Files Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SAMPLE_TEST_FILES.map(file => (
            <div
              key={file.id}
              className={`p-8 rounded-3xl border flex flex-col justify-between ${
                darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    {file.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {file.pageCount} Pages • ~{file.size}
                  </span>
                </div>
                <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {file.name}
                </h2>
                <p className={`text-xs leading-relaxed mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {file.description}
                </p>

                <div className="mb-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Ideal for testing:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {file.idealFor.map((toolName, i) => (
                      <span key={i} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {toolName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => generateAndDownloadSample(file.generatorType, file.name)}
                disabled={generatingId === file.generatorType}
                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} /> {generatingId === file.generatorType ? 'Generating...' : `Download ${file.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TestFilesPage;
