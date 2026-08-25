/**
 * Native Document Scanner Bridge for Android (Google Play Services ML Kit) & iOS (Apple VisionKit)
 * 
 * Flow:
 * - Android: Triggers Google ML Kit Document Scanner API (`GmsDocumentScanning` with `SCANNER_MODE_FULL`)
 * - iOS: Triggers Apple VisionKit (`VNDocumentCameraViewController` with auto-edge detection & perspective crop)
 * - Mobile Web / PWA: Directly invokes system camera with document scanner intent (`capture="environment"`)
 */

export interface NativeScanResult {
    images: string[];
    pdfUri?: string;
}

/**
 * Detect client operating system
 */
export function getMobilePlatform(): 'android' | 'ios' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) return 'android';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return 'ios';
    return 'desktop';
}

/**
 * Check if running inside a native Android wrapper with Google ML Kit Document Scanner
 */
export function isAndroidNativeScannerAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).AndroidDocumentScanner);
}

/**
 * Check if running inside an iOS native wrapper with Apple VisionKit
 */
export function isIOSNativeScannerAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(
        (window as any).webkit &&
        (window as any).webkit.messageHandlers &&
        (window as any).webkit.messageHandlers.visionDocumentScanner
    );
}

/**
 * Check if any native bridge is present
 */
export function isNativeScannerBridgeAvailable(): boolean {
    return isAndroidNativeScannerAvailable() || isIOSNativeScannerAvailable();
}

/**
 * Launch native document scanning using the appropriate platform API:
 * 1. Android -> Google ML Kit Document Scanner
 * 2. iOS -> Apple VisionKit Document Scanner
 * 3. Mobile Browser -> Native Camera with Document Scanner Intent
 */
export function triggerNativeDocumentScanner(
    fileInputRef: HTMLInputElement | null,
    onSuccess: (images: string[]) => void,
    onError?: (err: string) => void
): void {
    // 1. Android Native Wrapper (Google Play Services ML Kit Document Scanner)
    if (isAndroidNativeScannerAvailable()) {
        try {
            (window as any).onNativeScanComplete = (resultsJson: string) => {
                try {
                    const parsed = JSON.parse(resultsJson);
                    if (parsed.images && parsed.images.length > 0) {
                        onSuccess(parsed.images);
                    }
                } catch (e) {
                    if (onError) onError("Failed to process Google ML Kit scan result.");
                }
            };

            (window as any).AndroidDocumentScanner.startScan();
            return;
        } catch (e) {
            console.warn("Google ML Kit Android Bridge failed, falling back to camera intent", e);
        }
    }

    // 2. iOS Native Wrapper (Apple VisionKit VNDocumentCameraViewController)
    if (isIOSNativeScannerAvailable()) {
        try {
            (window as any).onIOSScanComplete = (images: string[]) => {
                if (images && images.length > 0) {
                    onSuccess(images);
                }
            };

            (window as any).webkit.messageHandlers.visionDocumentScanner.postMessage({
                action: 'startScan',
                maxPages: 30
            });
            return;
        } catch (e) {
            console.warn("Apple VisionKit iOS Bridge failed, falling back to camera intent", e);
        }
    }

    // 3. Web & Mobile Browser (System Camera / ML Kit / VisionKit via HTML5 Capture)
    if (fileInputRef) {
        fileInputRef.click();
    } else if (onError) {
        onError("Camera scanner input element not initialized.");
    }
}
