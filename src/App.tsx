import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { soundEngine } from './utils/sounds';
import { NotifySystem } from './types';
import { TOOLS } from './constants';
import ErrorBoundary from './components/ErrorBoundary';
import AdSenseScript from './components/AdSenseScript';
import CookieConsent from './components/CookieConsent';
import { ActiveWorkProvider } from './context/ActiveWorkContext';

// Lazy load core tools
const Home = lazy(() => import('./pages/Home'));
const MergeTool = lazy(() => import('./pages/MergeTool'));
const QRTool = lazy(() => import('./pages/QRTool'));
const SimpleTool = lazy(() => import('./pages/SimpleTool'));
const RedactTool = lazy(() => import('./pages/RedactTool'));
const EditTool = lazy(() => import('./pages/EditTool'));
const ScanTool = lazy(() => import('./pages/ScanTool'));
const QRSuccess = lazy(() => import('./pages/QRSuccess'));
const SEOLandingPage = lazy(() => import('./components/SEOLandingPage'));
const TutorialsPage = lazy(() => import('./pages/TutorialsPage'));
const HandwritingTool = lazy(() => import('./pages/HandwritingTool'));
const AnalyzerPage = lazy(() => import('./pages/AnalyzerPage'));
const CompressTool = lazy(() => import('./pages/CompressTool'));

// Lazy load SEO Hubs, Guides, Encyclopedia, Workflows, Calculators & Playground
const HubPage = lazy(() => import('./pages/HubPage'));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'));
const GuidesHub = lazy(() => import('./pages/GuidesHub'));
const GuideDetailPage = lazy(() => import('./pages/GuideDetailPage'));
const EncyclopediaHub = lazy(() => import('./pages/EncyclopediaHub'));
const EncyclopediaDetailPage = lazy(() => import('./pages/EncyclopediaDetailPage'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage'));
const TestFilesPage = lazy(() => import('./pages/TestFilesPage'));

// Static pages
const PrivacyPage = lazy(() => import('./pages/StaticPages').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/StaticPages').then(m => ({ default: m.TermsPage })));
const AboutPage = lazy(() => import('./pages/StaticPages').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/StaticPages').then(m => ({ default: m.ContactPage })));

// Loading Fallback
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fadeIn">
    <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Loading PDF Tools...</p>
  </div>
);

const NotFoundPage = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
    <h1 className="text-6xl font-black mb-4 text-slate-900 dark:text-white">404</h1>
    <h2 className="text-2xl font-bold mb-4 text-slate-600 dark:text-slate-400">Page Not Found</h2>
    <p className="mb-8 text-slate-500 max-w-md text-sm">The tool or guide you are looking for doesn't exist or has been relocated.</p>
    <div className="flex gap-4">
      <Link to="/" aria-label="Go to PDFBolt home" className="px-6 py-3 bg-yellow-500 text-slate-950 rounded-xl font-bold hover:bg-yellow-400 transition-colors shadow-md text-sm">
        Go Home
      </Link>
      <Link to="/tools" className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
        Browse All Tools
      </Link>
    </div>
  </div>
);

const SEOManager: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const baseUrl = 'https://pdfbolt.in';
    let title = "Free Online PDF Tools – Merge, Compress, Convert & Edit PDFs | PDFBolt";
    let description = "Use free online PDF tools to merge, compress, split, convert, edit and protect PDF files. Fast, private and easy-to-use PDF tools with PDFBolt.";

    // Match Tool Pages
    const tool = TOOLS.find(t => t.canonicalPath === location.pathname || t.path === location.pathname || t.seoPath === location.pathname);
    if (tool) {
      title = `${tool.seoTitle || `${tool.title} Online`} | PDFBolt`;
      description = tool.description;
    } else if (location.pathname === '/tools' || location.pathname === '/pdf-tools') {
      title = "All 25+ Online PDF Tools (Free & Unlimited) | PDFBolt Directory";
      description = "Browse our full suite of 25+ browser-based PDF tools. Fast, free, and private conversion, editing, and compression tools.";
    } else if (location.pathname === '/guides') {
      title = "Free PDF Guides, Tutorials & Document Processing Knowledge Base | PDFBolt";
      description = "Comprehensive step-by-step guides on converting, compressing, merging, redacting, signing, and editing PDF files online with 100% privacy.";
    } else if (location.pathname === '/encyclopedia') {
      title = "PDF Format Encyclopedia & Technical Standards | PDFBolt";
      description = "Technical explainers on PDF specifications (ISO 32000), PDF/A digital preservation standards, OCR neural networks, and vector graphics.";
    } else if (location.pathname === '/compare/online-pdf-tools') {
      title = "Online PDF Tools Comparison (2026) – Client-Side Privacy vs Cloud | PDFBolt";
      description = "Compare client-side WebAssembly document processing vs cloud server upload converters and desktop Adobe Acrobat.";
    } else if (location.pathname === '/tools/pdf-size-calculator') {
      title = "Interactive PDF Size & Compression Calculator | PDFBolt";
      description = "Calculate and estimate how much file size you can save when compressing PDF documents based on page count, image DPI, and content type.";
    } else if (location.pathname === '/test-files') {
      title = "Download Free Sample PDF Test Files | PDFBolt Playground";
      description = "Download free sample PDF files for testing: multi-page documents, tables, scanned receipts, and slides ready for testing PDF conversion and editing tools.";
    } else if (location.pathname === '/contact') {
      title = "Contact Customer Care | PDFBolt";
    }

    document.title = title;

    const metaDesc = document.getElementById('seo-description');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }

    const canonicalPath = location.pathname === '/' ? '' : location.pathname;
    const canonicalUrl = `${baseUrl}${canonicalPath}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    window.scrollTo(0, 0);
  }, [location]);

  return null;
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('sound') !== 'false');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  const notify: NotifySystem = {
    success: () => soundEnabled && soundEngine.playSuccess(),
    complete: () => soundEnabled && soundEngine.playComplete(),
    error: () => soundEnabled && soundEngine.playError(),
    upload: () => soundEnabled && soundEngine.playUpload(),
  };

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Router>
          <ActiveWorkProvider>
            <SEOManager />
          <div className={`min-h-screen flex flex-col transition-colors duration-300 font-sans ${darkMode ? 'dark bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <Navbar
              darkMode={darkMode}
              toggleDarkMode={() => setDarkMode(!darkMode)}
              soundEnabled={soundEnabled}
              toggleSound={() => setSoundEnabled(!soundEnabled)}
            />
            <main className="flex-grow">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Home & Hubs */}
                  <Route path="/" element={<Home darkMode={darkMode} />} />
                  <Route path="/tools" element={<HubPage darkMode={darkMode} />} />
                  <Route path="/pdf-tools" element={<HubPage darkMode={darkMode} />} />

                  {/* Persona Workflows */}
                  <Route path="/student-pdf-tools" element={<WorkflowPage workflowSlug="student-pdf-tools" darkMode={darkMode} />} />
                  <Route path="/business-pdf-tools" element={<WorkflowPage workflowSlug="business-pdf-tools" darkMode={darkMode} />} />
                  <Route path="/developer-pdf-tools" element={<WorkflowPage workflowSlug="developer-pdf-tools" darkMode={darkMode} />} />

                  {/* How-To Guides Knowledge Base */}
                  <Route path="/guides" element={<GuidesHub darkMode={darkMode} />} />
                  <Route path="/guides/:slug" element={<GuideDetailPage darkMode={darkMode} />} />

                  {/* PDF Format Encyclopedia */}
                  <Route path="/encyclopedia" element={<EncyclopediaHub darkMode={darkMode} />} />
                  <Route path="/encyclopedia/:slug" element={<EncyclopediaDetailPage darkMode={darkMode} />} />

                  {/* Comparisons & Calculators & Test Files */}
                  <Route path="/compare/online-pdf-tools" element={<ComparisonPage darkMode={darkMode} />} />
                  <Route path="/tools/pdf-size-calculator" element={<CalculatorPage darkMode={darkMode} />} />
                  <Route path="/test-files" element={<TestFilesPage darkMode={darkMode} />} />

                  {/* Canonical Tool Routes (Wrapped in Rich SEOLandingPage) */}
                  <Route path="/merge-pdf" element={<SEOLandingPage toolId="merge" darkMode={darkMode}><MergeTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/split-pdf" element={<SEOLandingPage toolId="split" darkMode={darkMode}><SimpleTool title="Split PDF" mode="split" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/compress-pdf" element={<SEOLandingPage toolId="compress" darkMode={darkMode}><CompressTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/pdf-to-word" element={<SEOLandingPage toolId="pdf-to-word" darkMode={darkMode}><SimpleTool title="PDF to Word" mode="pdf2word" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/pdf-to-ppt" element={<SEOLandingPage toolId="pdf-to-ppt" darkMode={darkMode}><SimpleTool title="PDF to PPT" mode="pdf2ppt" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/pdf-to-excel" element={<SEOLandingPage toolId="pdf-to-excel" darkMode={darkMode}><SimpleTool title="PDF to Excel" mode="pdf2excel" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/pdf-to-jpg" element={<SEOLandingPage toolId="pdf-to-jpg" darkMode={darkMode}><SimpleTool title="PDF to JPG" mode="pdf2jpg" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/word-to-pdf" element={<SEOLandingPage toolId="word-to-pdf" darkMode={darkMode}><SimpleTool title="Word to PDF" mode="word2pdf" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/excel-to-pdf" element={<SEOLandingPage toolId="excel-to-pdf" darkMode={darkMode}><SimpleTool title="Excel to PDF" mode="excel2pdf" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/ppt-to-pdf" element={<SEOLandingPage toolId="ppt-to-pdf" darkMode={darkMode}><SimpleTool title="PPT to PDF" mode="ppt2pdf" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/jpg-to-pdf" element={<SEOLandingPage toolId="jpg-to-pdf" darkMode={darkMode}><SimpleTool title="JPG to PDF" mode="jpg2pdf" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/html-to-pdf" element={<SEOLandingPage toolId="html-to-pdf" darkMode={darkMode}><SimpleTool title="HTML to PDF" mode="html2pdf" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/edit-pdf" element={<SEOLandingPage toolId="edit" darkMode={darkMode}><EditTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/protect-pdf" element={<SEOLandingPage toolId="protect" darkMode={darkMode}><SimpleTool title="Protect PDF" mode="protect" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/unlock-pdf" element={<SEOLandingPage toolId="unlock" darkMode={darkMode}><SimpleTool title="Unlock PDF" mode="unlock" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/sign-pdf" element={<SEOLandingPage toolId="sign" darkMode={darkMode}><SimpleTool title="Sign PDF" mode="sign" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/redact-pdf" element={<SEOLandingPage toolId="redact" darkMode={darkMode}><RedactTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/ocr-pdf" element={<SEOLandingPage toolId="ocr" darkMode={darkMode}><SimpleTool title="OCR PDF" mode="ocr" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/scan-to-pdf" element={<SEOLandingPage toolId="scan-to-pdf" darkMode={darkMode}><ScanTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/scan-handwriting-to-pdf" element={<SEOLandingPage toolId="scan-handwriting" darkMode={darkMode}><HandwritingTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/rotate-pdf" element={<SEOLandingPage toolId="rotate" darkMode={darkMode}><SimpleTool title="Rotate PDF" mode="rotate" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/organize-pdf" element={<SEOLandingPage toolId="organize" darkMode={darkMode}><SimpleTool title="Organize PDF" mode="organize" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/add-page-numbers-to-pdf" element={<SEOLandingPage toolId="page-numbers" darkMode={darkMode}><SimpleTool title="Add Page Numbers" mode="numbers" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/watermark-pdf" element={<SEOLandingPage toolId="watermark" darkMode={darkMode}><SimpleTool title="Watermark PDF" mode="watermark" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/delete-pdf-pages" element={<SEOLandingPage toolId="delete-pages" darkMode={darkMode}><SimpleTool title="Delete Pages" mode="delete-pages" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/compare-pdf" element={<SEOLandingPage toolId="compare" darkMode={darkMode}><SimpleTool title="Compare PDF" mode="compare" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/repair-pdf" element={<SEOLandingPage toolId="repair" darkMode={darkMode}><SimpleTool title="Repair PDF" mode="repair" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/pdf-to-qr-code" element={<SEOLandingPage toolId="pdf-to-qr" darkMode={darkMode}><QRTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                  <Route path="/analyze-pdf" element={<AnalyzerPage darkMode={darkMode} notify={notify} />} />
                  <Route path="/pdf-builder" element={<Home darkMode={darkMode} />} />

                  {/* Clean Canonical Redirects for Short Aliases & Secondary Search Queries */}
                  <Route path="/pdf-to-images" element={<Navigate to="/pdf-to-jpg" replace />} />
                  <Route path="/pdf-editor" element={<Navigate to="/edit-pdf" replace />} />
                  <Route path="/reorder-pages" element={<Navigate to="/organize-pdf" replace />} />
                  <Route path="/extract-pages" element={<Navigate to="/split-pdf" replace />} />
                  <Route path="/extract-pdf-pages" element={<Navigate to="/split-pdf" replace />} />
                  <Route path="/add-page-numbers" element={<Navigate to="/add-page-numbers-to-pdf" replace />} />
                  <Route path="/qr-pdf-share" element={<Navigate to="/pdf-to-qr-code" replace />} />
                  <Route path="/pdf-analyzer" element={<Navigate to="/analyze-pdf" replace />} />
                  <Route path="/analyze" element={<Navigate to="/analyze-pdf" replace />} />
                  <Route path="/tools/pdf-analyzer" element={<Navigate to="/analyze-pdf" replace />} />
                  <Route path="/merge" element={<Navigate to="/merge-pdf" replace />} />
                  <Route path="/split" element={<Navigate to="/split-pdf" replace />} />
                  <Route path="/compress" element={<Navigate to="/compress-pdf" replace />} />
                  <Route path="/pdf-to-qr" element={<Navigate to="/pdf-to-qr-code" replace />} />
                  <Route path="/organize" element={<Navigate to="/organize-pdf" replace />} />
                  <Route path="/edit" element={<Navigate to="/edit-pdf" replace />} />
                  <Route path="/page-numbers" element={<Navigate to="/add-page-numbers-to-pdf" replace />} />
                  <Route path="/rotate" element={<Navigate to="/rotate-pdf" replace />} />
                  <Route path="/watermark" element={<Navigate to="/watermark-pdf" replace />} />
                  <Route path="/delete-pages" element={<Navigate to="/delete-pdf-pages" replace />} />
                  <Route path="/protect" element={<Navigate to="/protect-pdf" replace />} />
                  <Route path="/unlock" element={<Navigate to="/unlock-pdf" replace />} />
                  <Route path="/sign" element={<Navigate to="/sign-pdf" replace />} />
                  <Route path="/redact" element={<Navigate to="/redact-pdf" replace />} />
                  <Route path="/repair" element={<Navigate to="/repair-pdf" replace />} />
                  <Route path="/ocr" element={<Navigate to="/ocr-pdf" replace />} />
                  <Route path="/scan-pdf" element={<Navigate to="/scan-to-pdf" replace />} />
                  <Route path="/scan-handwriting" element={<Navigate to="/scan-handwriting-to-pdf" replace />} />
                  <Route path="/compare" element={<Navigate to="/compare-pdf" replace />} />

                  {/* Static Support Pages */}
                  <Route path="/privacy" element={<PrivacyPage darkMode={darkMode} />} />
                  <Route path="/terms" element={<TermsPage darkMode={darkMode} />} />
                  <Route path="/about" element={<AboutPage darkMode={darkMode} />} />
                  <Route path="/contact" element={<ContactPage darkMode={darkMode} />} />
                  <Route path="/tutorials" element={<TutorialsPage darkMode={darkMode} />} />
                  <Route path="/qr-success" element={<QRSuccess darkMode={darkMode} />} />
                  <Route path="/s/:shareId" element={<QRSuccess darkMode={darkMode} />} />

                  {/* 404 Catch-All */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
            <Footer darkMode={darkMode} />
          </div>

            <AdSenseScript />
            <CookieConsent darkMode={darkMode} />
          </ActiveWorkProvider>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
};
export default App;
