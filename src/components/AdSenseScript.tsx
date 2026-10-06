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
    if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
      return;
    }

    const INTERACTION_EVENTS = ['pointerdown', 'touchstart', 'scroll', 'keydown'] as const;

    const loadScript = () => {
      INTERACTION_EVENTS.forEach((event) => {
        window.removeEventListener(event, loadScript);
      });

      if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
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
    };

    INTERACTION_EVENTS.forEach((event) => {
      window.addEventListener(event, loadScript, { passive: true, once: true });
    });

    return () => {
      INTERACTION_EVENTS.forEach((event) => {
        window.removeEventListener(event, loadScript);
      });
    };
  }, []);

  return null;
};

export default AdSenseScript;
