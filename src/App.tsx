

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import MergeTool from './pages/MergeTool';
import QRTool from './pages/QRTool';
import SimpleTool from './pages/SimpleTool';
import RedactTool from './pages/RedactTool';
import EditTool from './pages/EditTool';
import QRSuccess from './pages/QRSuccess';
import SEOLandingPage from './components/SEOLandingPage';
import { PrivacyPage, TermsPage, AboutPage, ContactPage } from './pages/StaticPages';
import TutorialsPage from './pages/TutorialsPage';
import { soundEngine } from './utils/sounds';
import { NotifySystem } from './types';
import { TOOLS } from './constants';
import ErrorBoundary from './components/ErrorBoundary';
import DownloadModal from './components/DownloadModal';

const SEOManager: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const currentTool = TOOLS.find(t => t.path === location.pathname || t.seoPath === location.pathname);
    const defaultTitle = "PDFBolt - Lightning Fast PDF Tools";
    const defaultDesc = "Lightning-fast browser-based PDF toolkit. Merge, split, compress, protect, and convert PDFs without uploading to a server. 100% private and blazing fast.";
    const baseUrl = 'https://pdfbolt.in';

    let title = defaultTitle;
    let description = defaultDesc;

    if (currentTool) {
      title = `${currentTool.seoTitle || currentTool.title} | PDFBolt`;
      description = currentTool.description;
    } else if (location.pathname === '/contact') {
      title = "Contact Customer Care | PDFBolt";
    }

    // Update Title
    document.title = title;

    // Update Meta Description
    const metaDesc = document.getElementById('seo-description');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }

    // Update Canonical URL
    const canonicalPath = location.pathname === '/' ? '' : location.pathname;
    const canonicalUrl = `${baseUrl}${canonicalPath}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Update Open Graph
    const updateMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateMeta('og:title', title);
    updateMeta('og:description', description);
    updateMeta('og:url', canonicalUrl);
    updateMeta('og:image', `${baseUrl}/logo.jpg`);

    window.scrollTo(0, 0);
  }, [location]);

  return null;
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('sound') !== 'false');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: Show "Coming Soon" modal instead of downloading ZIP
      setShowDownloadModal(true);
    }
  };

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
          <SEOManager />
          <div className={`min-h-screen flex flex-col transition-colors duration-300 font-sans ${darkMode ? 'dark bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <Navbar
              darkMode={darkMode}
              toggleDarkMode={() => setDarkMode(!darkMode)}
              soundEnabled={soundEnabled}
              toggleSound={() => setSoundEnabled(!soundEnabled)}
              canInstall={!!deferredPrompt}
              onInstall={handleInstall}
            />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home darkMode={darkMode} onInstall={handleInstall} />} />
                <Route path="/merge" element={<MergeTool darkMode={darkMode} notify={notify} />} />
                <Route path="/merge-pdf-online" element={<SEOLandingPage toolId="merge" darkMode={darkMode}><MergeTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                <Route path="/split" element={<SimpleTool title="Split PDF" mode="split" darkMode={darkMode} notify={notify} />} />
                <Route path="/split-pdf-pages" element={<SEOLandingPage toolId="split" darkMode={darkMode}><SimpleTool title="Split PDF" mode="split" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                <Route path="/compress" element={<SimpleTool title="Compress PDF" mode="compress" darkMode={darkMode} notify={notify} />} />
                <Route path="/compress-pdf-online" element={<SEOLandingPage toolId="compress" darkMode={darkMode}><SimpleTool title="Compress PDF" mode="compress" darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                <Route path="/pdf-to-qr" element={<QRTool darkMode={darkMode} notify={notify} />} />
                <Route path="/pdf-to-qr-code" element={<SEOLandingPage toolId="pdf-to-qr" darkMode={darkMode}><QRTool darkMode={darkMode} notify={notify} /></SEOLandingPage>} />
                <Route path="/privacy" element={<PrivacyPage darkMode={darkMode} />} />
                <Route path="/terms" element={<TermsPage darkMode={darkMode} />} />
                <Route path="/about" element={<AboutPage darkMode={darkMode} />} />
                <Route path="/contact" element={<ContactPage darkMode={darkMode} />} />
                <Route path="/tutorials" element={<TutorialsPage darkMode={darkMode} />} />
                <Route path="/qr-success" element={<QRSuccess darkMode={darkMode} />} />
                <Route path="/organize" element={<SimpleTool title="Organize PDF" mode="organize" darkMode={darkMode} notify={notify} />} />
                <Route path="/edit" element={<EditTool darkMode={darkMode} notify={notify} />} />
                <Route path="/page-numbers" element={<SimpleTool title="Add Page Numbers" mode="numbers" darkMode={darkMode} notify={notify} />} />
                <Route path="/rotate" element={<SimpleTool title="Rotate PDF" mode="rotate" darkMode={darkMode} notify={notify} />} />
                <Route path="/watermark" element={<SimpleTool title="Watermark PDF" mode="watermark" darkMode={darkMode} notify={notify} />} />
                <Route path="/delete-pages" element={<SimpleTool title="Delete Pages" mode="delete-pages" darkMode={darkMode} notify={notify} />} />
                <Route path="/jpg-to-pdf" element={<SimpleTool title="JPG to PDF" mode="jpg2pdf" darkMode={darkMode} notify={notify} />} />
                <Route path="/word-to-pdf" element={<SimpleTool title="Word to PDF" mode="word2pdf" darkMode={darkMode} notify={notify} />} />
                <Route path="/ppt-to-pdf" element={<SimpleTool title="PPT to PDF" mode="ppt2pdf" darkMode={darkMode} notify={notify} />} />
                <Route path="/excel-to-pdf" element={<SimpleTool title="Excel to PDF" mode="excel2pdf" darkMode={darkMode} notify={notify} />} />
                <Route path="/html-to-pdf" element={<SimpleTool title="HTML to PDF" mode="html2pdf" darkMode={darkMode} notify={notify} />} />
                <Route path="/pdf-to-jpg" element={<SimpleTool title="PDF to JPG" mode="pdf2jpg" darkMode={darkMode} notify={notify} />} />
                <Route path="/pdf-to-word" element={<SimpleTool title="PDF to Word" mode="pdf2word" darkMode={darkMode} notify={notify} />} />
                <Route path="/pdf-to-ppt" element={<SimpleTool title="PDF to PPT" mode="pdf2ppt" darkMode={darkMode} notify={notify} />} />
                <Route path="/pdf-to-excel" element={<SimpleTool title="PDF to Excel" mode="pdf2excel" darkMode={darkMode} notify={notify} />} />
                <Route path="/protect" element={<SimpleTool title="Protect PDF" mode="protect" darkMode={darkMode} notify={notify} />} />
                <Route path="/unlock" element={<SimpleTool title="Unlock PDF" mode="unlock" darkMode={darkMode} notify={notify} />} />
                <Route path="/sign" element={<SimpleTool title="Sign PDF" mode="sign" darkMode={darkMode} notify={notify} />} />
                <Route path="/redact" element={<RedactTool darkMode={darkMode} notify={notify} />} />
                <Route path="/repair" element={<SimpleTool title="Repair PDF" mode="repair" darkMode={darkMode} notify={notify} />} />
                <Route path="/ocr" element={<SimpleTool title="OCR PDF" mode="ocr" darkMode={darkMode} notify={notify} />} />
                <Route path="/compare" element={<SimpleTool title="Compare PDF" mode="compare" darkMode={darkMode} notify={notify} />} />
              </Routes>
            </main>
            <Footer darkMode={darkMode} />
          </div>

          {showDownloadModal && (
            <DownloadModal onClose={() => setShowDownloadModal(false)} />
          )}
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
};
export default App;
