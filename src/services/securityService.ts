import { PDFDocument, StandardFonts, rgb } from 'pdf-lib-plus-encrypt';

/**
 * Encrypts a PDF file with a password.
 * @param file The original PDF file.
 * @param password The password to set.
 * @returns Encrypted PDF as Uint8Array.
 */
export async function protectPdf(file: File, password: string): Promise<Uint8Array> {
    try {
        const bytes = await file.arrayBuffer();

        // Load PDF using the extended library
        const pdfDoc = await PDFDocument.load(bytes);

        // Encrypt
        await pdfDoc.encrypt({
            userPassword: password,
            ownerPassword: password,
            permissions: {
                printing: 'highResolution',
                modifying: false,
                copying: false,
                annotating: false,
                fillingForms: false,
                contentAccessibility: false,
                documentAssembly: false,
            },
        });

        // Save encrypted PDF
        return await pdfDoc.save();
    } catch (err) {
        console.error("Encryption Error:", err);
        throw err;
    }
}

/**
 * Unlocks (Decrypts) a PDF file using the provided password.
 * @param file The encrypted PDF file.
 * @param password The password to unlock.
 * @returns Decrypted PDF (no password) as Uint8Array.
 */
export async function unlockPdf(file: File, password: string): Promise<Uint8Array> {
    const bytes = await file.arrayBuffer();
    try {
        // Load with password - bypass TS check for library extension
        const pdfDoc = await PDFDocument.load(bytes, { password } as any);

        // To "remove" encryption in pdf-lib, we just save it. 
        // pdf-lib does not persist encryption on save unless .encrypt() is called again.
        return await pdfDoc.save();
    } catch (err) {
        throw new Error("Invalid password or failed to decrypt.");
    }
}

/**
 * Signs a PDF with an image signature.
 * @param file PDF File
 * @param signatureFile Image File (PNG/JPG)
 */
/**
 * Signs a PDF with an image signature.
 * @param file PDF File
 * @param signatureFile Image File (PNG/JPG) or Blob
 * @param position Position of the signature ('bottom-right' | 'bottom-left' | 'top-right' | 'top-left')
 */
export async function signPdf(
    file: File,
    signatureFile: File | Blob,
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right'
): Promise<Uint8Array> {
    const pdfBytes = await file.arrayBuffer();
    const sigBytes = await signatureFile.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Detect type - default to PNG if Blob (usually from canvas)
    let isPng = true;
    if (signatureFile instanceof File) {
        isPng = signatureFile.name.toLowerCase().endsWith('.png');
    }

    const signatureImage = isPng
        ? await pdfDoc.embedPng(sigBytes)
        : await pdfDoc.embedJpg(sigBytes);

    const pages = pdfDoc.getPages();
    const { width, height } = signatureImage.scale(0.15); // Scale down signature (0.15 is smaller than 0.25)

    for (const page of pages) {
        const { width: pageWidth, height: pageHeight } = page.getSize();

        let x = pageWidth - width - 50;
        let y = 50;

        switch (position) {
            case 'bottom-left':
                x = 50;
                y = 50;
                break;
            case 'bottom-right':
                x = pageWidth - width - 50;
                y = 50;
                break;
            case 'top-left':
                x = 50;
                y = pageHeight - height - 50;
                break;
            case 'top-right':
                x = pageWidth - width - 50;
                y = pageHeight - height - 50;
                break;
        }

        page.drawImage(signatureImage, {
            x,
            y,
            width,
            height,
        });
    }

    return await pdfDoc.save();
}

/**
 * Attempts to brute force a PDF password.
 * @param file Encrypted PDF file
 * @param options Charset and length options
 * @param onProgress Callback for progress
 */
export async function bruteForceUnlock(
    file: File,
    options: {
        charset: 'numeric' | 'alpha-lower' | 'alpha-mixed' | 'alphanumeric' | 'all';
        maxLength: number;
        signal?: AbortSignal;
    },
    onProgress: (currentAttempt: string, totalAttempts: number) => void
): Promise<{ password: string | null; decryptedPdf: Uint8Array | null }> {

    // Define charsets
    const charsets = {
        'numeric': '0123456789',
        'alpha-lower': 'abcdefghijklmnopqrstuvwxyz',
        'alpha-mixed': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'alphanumeric': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'all': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
    };

    const chars = charsets[options.charset];
    const bytes = await file.arrayBuffer();

    // Helper to generate combinations
    const generateCombinations = function* (maxLength: number) {
        // Try lengths from 1 up to maxLength
        for (let len = 1; len <= maxLength; len++) {
            const indices = new Array(len).fill(0);

            while (true) {
                let password = "";
                for (let i = 0; i < len; i++) {
                    password += chars[indices[i]];
                }
                yield password;

                let nextIndex = len - 1;
                while (nextIndex >= 0) {
                    indices[nextIndex]++;
                    if (indices[nextIndex] < chars.length) {
                        break;
                    }
                    indices[nextIndex] = 0;
                    nextIndex--;
                }

                if (nextIndex < 0) break;
            }
        }
    };

    let count = 0;
    const generator = generateCombinations(options.maxLength);

    for (const password of generator) {
        // Check for cancellation
        if (options.signal?.aborted) {
            throw new Error("Brute force stopped by user.");
        }

        count++;
        // Update more frequently for better responsiveness
        if (count % 10 === 0) {
            onProgress(password, count);
            // Yield to main thread
            await new Promise(r => setTimeout(r, 0));
        }

        try {
            // Attempt load
            const pdfDoc = await PDFDocument.load(bytes, { password } as any);

            // If we get here, password is correct!
            const decryptedPdf = await pdfDoc.save();
            return { password, decryptedPdf };
        } catch (e) {
            // Wrong password, continue
        }
    }

    return { password: null, decryptedPdf: null };
}

/**
 * Attempts to unlock a PDF using a dictionary of common passwords (John the Ripper style).
 * @param file Encrypted PDF file
 * @param wordlist Array of passwords to try
 * @param onProgress Callback for progress
 */
export async function dictionaryUnlock(
    file: File,
    wordlist: string[],
    onProgress: (currentAttempt: string, totalAttempts: number) => void
): Promise<{ password: string | null; decryptedPdf: Uint8Array | null }> {
    const bytes = await file.arrayBuffer();
    let count = 0;

    for (const password of wordlist) {
        count++;

        // Update UI every 5 attempts for dictionary (since it's usually small)
        if (count % 5 === 0) {
            onProgress(password, count);
            await new Promise(r => setTimeout(r, 0));
        }

        try {
            const pdfDoc = await PDFDocument.load(bytes, { password } as any);
            const decryptedPdf = await pdfDoc.save();
            return { password, decryptedPdf };
        } catch (e) {
            // Continue
        }
    }

    return { password: null, decryptedPdf: null };
}

/**
 * Attempts to unlock a PDF using multiple Web Workers for high performance.
 * @param file Encrypted PDF file
 * @param wordlist List of passwords to test
 * @param onProgress Callback for total progress
 */
export async function multiThreadedUnlock(
    file: File,
    wordlist: string[],
    onProgress: (lastAttempt: string, totalCount: number) => void
): Promise<{ password: string | null; decryptedPdf: Uint8Array | null }> {
    const pdfBytes = await file.arrayBuffer();
    const coreCount = navigator.hardwareConcurrency || 4;
    const workers: Worker[] = [];
    const batchSize = Math.ceil(wordlist.length / coreCount);

    return new Promise((resolve, reject) => {
        let isResolved = false;
        let finishedWorkers = 0;
        let totalTested = 0;

        const cleanup = () => {
            workers.forEach(w => w.terminate());
        };

        for (let i = 0; i < coreCount; i++) {
            const worker = new Worker(new URL('./unlock.worker.ts', import.meta.url), { type: 'module' });
            workers.push(worker);

            const start = i * batchSize;
            const end = Math.min(start + batchSize, wordlist.length);
            const batch = wordlist.slice(start, end);

            worker.onmessage = async (e) => {
                if (isResolved) return;
                const { type, password, count, lastAttempt } = e.data;

                if (type === 'SUCCESS') {
                    isResolved = true;
                    cleanup();

                    try {
                        const { PDFDocument } = await import('pdf-lib-plus-encrypt');
                        const pdfDoc = await PDFDocument.load(pdfBytes, { password } as any);
                        const decryptedPdf = await pdfDoc.save();
                        resolve({ password, decryptedPdf });
                    } catch (err) {
                        reject(err);
                    }
                } else if (type === 'PROGRESS') {
                    totalTested += count;
                    onProgress(lastAttempt, totalTested);

                    if (totalTested >= wordlist.length) {
                        finishedWorkers++;
                        if (finishedWorkers >= coreCount && !isResolved) {
                            cleanup();
                            resolve({ password: null, decryptedPdf: null });
                        }
                    }
                }
            };

            worker.onerror = (err) => {
                console.error("Worker Error:", err);
                finishedWorkers++;
                if (finishedWorkers >= coreCount && !isResolved) {
                    cleanup();
                    resolve({ password: null, decryptedPdf: null });
                }
            };

            worker.postMessage({ pdfBytes, passwords: batch, batchId: i });
        }
    });
}
