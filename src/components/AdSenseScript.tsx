import React, { useEffect } from 'react';
import { isAdsEnabled, getAdSenseClient } from '../config/adsenseConfig';

/**
 * Global Google AdSense Script Loader.
 * Ensures the Google AdSense SDK is loaded safely, asynchronously, and exactly once.
 */
const AdSenseScript: React.FC = () => {
  useEffect(() => {
    if (!isAdsEnabled()) {
      return;
    }

    const clientId = getAdSenseClient();
    if (!clientId) {
      return;
    }

    // Prevent duplicate script tag insertion
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-ad-client', clientId);
    script.onerror = (err) => {
      console.warn('[PDFBolt AdSense] Failed to load AdSense SDK script:', err);
    };

    document.head.appendChild(script);
  }, []);

  return null;
};

export default AdSenseScript;
