/**
 * Native Document Scanner Bridge for Android (Google Play ML Kit) & iOS (Apple VisionKit)
 * 
 * Supports:
 * 1. Web / PWA Native Camera Scanner via HTML5 Media Capture (`capture="environment"`)
 * 2. Android WebView / Capacitor / Cordova JavascriptInterface for Google ML Kit Document Scanner
 * 3. iOS WKWebView / Capacitor / Cordova ScriptMessageHandler for Apple VisionKit VNDocumentCameraViewController
 */

export interface NativeScanResult {
    images: string[]; // Base64 data URLs or Blob URLs
    pdfUri?: string;
}

/**
 * Check if running inside a native Android wrapper with Google ML Kit Document Scanner exposed
 */
export function isAndroidNativeScannerAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).AndroidDocumentScanner);
}

/**
 * Check if running inside an iOS native wrapper with Apple VisionKit exposed
 */
export function isIOSNativeScannerAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(
        (window as any).webkit &&
        (window as any).webkit.messageHandlers &&
        (window as any).webkit.messageHandlers.visionDocumentScanner
    );
}

/**
 * Check if any native bridge is available
 */
export function isNativeScannerBridgeAvailable(): boolean {
    return isAndroidNativeScannerAvailable() || isIOSNativeScannerAvailable();
}

/**
 * Trigger native document scanning via native bridge or HTML5 environment capture
 */
export async function launchNativeDocumentScan(
    fileInputRef: HTMLInputElement | null,
    onSuccess: (images: string[]) => void,
    onError?: (err: string) => void
): Promise<void> {
    // 1. Android Native Bridge (Google Play Services ML Kit)
    if (isAndroidNativeScannerAvailable()) {
        try {
            // Setup global callback listener for native response
            (window as any).onNativeScanComplete = (resultsJson: string) => {
                try {
                    const parsed = JSON.parse(resultsJson);
                    if (parsed.images && parsed.images.length > 0) {
                        onSuccess(parsed.images);
                    }
                } catch (e) {
                    if (onError) onError("Failed to parse native Android scanner output.");
                }
            };

            (window as any).AndroidDocumentScanner.startScan();
            return;
        } catch (e: any) {
            console.warn("Android native bridge failed, falling back to camera input", e);
        }
    }

    // 2. iOS Native Bridge (Apple VisionKit VNDocumentCameraViewController)
    if (isIOSNativeScannerAvailable()) {
        try {
            (window as any).onIOSScanComplete = (images: string[]) => {
                if (images && images.length > 0) {
                    onSuccess(images);
                }
            };

            (window as any).webkit.messageHandlers.visionDocumentScanner.postMessage({
                action: 'startScan',
                maxPages: 20
            });
            return;
        } catch (e: any) {
            console.warn("iOS VisionKit bridge failed, falling back to camera input", e);
        }
    }

    // 3. Web / Mobile Browser Native Camera Intent (`capture="environment"`)
    if (fileInputRef) {
        fileInputRef.click();
    } else if (onError) {
        onError("Camera scanner input is not ready.");
    }
}
