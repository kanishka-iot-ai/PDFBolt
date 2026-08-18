/**
 * On-demand lazy loader for OpenCV.js (10MB) and jscanify.min.js
 * Guarantees that OpenCV is NEVER downloaded on the homepage or initial boot.
 * It is only fetched dynamically when a camera or document scanner tool is explicitly opened.
 */

let openCvPromise: Promise<void> | null = null;
let jscanifyPromise: Promise<void> | null = null;

/**
 * Dynamically loads OpenCV.js on demand.
 * Returns a cached promise so multiple concurrent calls share the single network request.
 */
export function loadOpenCV(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  // Already loaded and initialized
  if ((window as any).cv && (window as any).cv.Mat) {
    return Promise.resolve();
  }

  if (openCvPromise) {
    return openCvPromise;
  }

  openCvPromise = new Promise<void>((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.querySelector('script[src="/lib/opencv.js"]');
    if (existingScript) {
      if ((window as any).cv && (window as any).cv.Mat) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = '/lib/opencv.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const cv = (window as any).cv;
      if (cv && typeof cv.then === 'function') {
        cv.then(() => resolve());
      } else if (cv && cv.onRuntimeInitialized) {
        const prevInit = cv.onRuntimeInitialized;
        cv.onRuntimeInitialized = () => {
          if (typeof prevInit === 'function') prevInit();
          resolve();
        };
      } else {
        let attempts = 0;
        const checkReady = () => {
          attempts++;
          if ((window as any).cv && (window as any).cv.Mat) {
            resolve();
          } else if (attempts < 50) {
            setTimeout(checkReady, 50);
          } else {
            resolve();
          }
        };
        checkReady();
      }
    };

    script.onerror = (err) => {
      openCvPromise = null;
      console.warn('[PDFBolt] Failed to lazy-load OpenCV.js, falling back to Canvas API.', err);
      reject(err);
    };

    document.body.appendChild(script);
  });

  return openCvPromise;
}

/**
 * Dynamically loads jscanify.min.js on demand (depends on OpenCV).
 */
export async function loadJscanify(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if ((window as any).jscanify) {
    return;
  }

  if (jscanifyPromise) {
    return jscanifyPromise;
  }

  await loadOpenCV();

  jscanifyPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[src="/lib/jscanify.min.js"]');
    if (existingScript) {
      if ((window as any).jscanify) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = '/lib/jscanify.min.js';
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = (err) => {
      jscanifyPromise = null;
      console.warn('[PDFBolt] Failed to lazy-load jscanify.min.js', err);
      reject(err);
    };

    document.body.appendChild(script);
  });

  return jscanifyPromise;
}
