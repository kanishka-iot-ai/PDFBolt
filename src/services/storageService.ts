/**
 * PDFBolt Secure Storage Client Service
 * Routes upload and download requests securely through the backend API.
 * All cloud storage credentials (Google Cloud Storage / Render) are held strictly server-side.
 */

/**
 * Uploads a file via the backend QR Share / Storage endpoint and returns the share ID or key.
 */
export async function uploadFile(file: File, durationSeconds: number = 86400): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('duration_seconds', durationSeconds.toString());

    try {
        const res = await fetch('/api/v1/qr-shares', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            return data.share_id;
        }
    } catch (err) {
        console.warn("Backend storage API unavailable, falling back to local simulated key:", err);
    }

    // Local simulated mode
    const simulatedKey = `simulated-upload-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
    return simulatedKey;
}

/**
 * Generates or retrieves a secure download URL for a given document share ID.
 */
export async function getSecureDownloadUrl(shareId: string): Promise<string> {
    if (shareId.startsWith('simulated-')) {
        return "javascript:alert('DEMO MODE: Simulated document transfer.')";
    }

    return `/api/v1/qr-shares/${shareId}/download`;
}

/**
 * Generates the public share landing URL.
 */
export function getPublicUrl(shareId: string): string {
    return `${window.location.origin}/s/${shareId}`;
}
