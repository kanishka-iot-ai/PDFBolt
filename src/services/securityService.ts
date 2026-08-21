import { PDFDocument, StandardFonts, rgb } from 'pdf-lib-plus-encrypt';

/**
 * Encrypts a PDF with user and owner passwords and configurable security permissions.
 * @param file The source PDF file.
 * @param password The password to set.
 * @returns Encrypted PDF as Uint8Array.
 */
export async function protectPdf(file: File, password: string): Promise<Uint8Array> {
    try {
        const bytes = await file.arrayBuffer();

        // 1. Load source document
        const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

        // 2. Create clean target document and copy all pages with full content streams, fonts, and images
        const pdfDoc = await PDFDocument.create();
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(page => pdfDoc.addPage(page));

        // 3. Encrypt with full content viewing, rendering, and accessibility permissions enabled
        await pdfDoc.encrypt({
            userPassword: password,
            ownerPassword: password,
            permissions: {
                printing: 'highResolution',
                modifying: true,
                copying: true,
                annotating: true,
                fillingForms: true,
                contentAccessibility: true,
                documentAssembly: true,
            },
        });

        // 4. Save encrypted PDF
        return await pdfDoc.save();
    } catch (err) {
        console.error("Encryption Error:", err);
        throw err;
    }
}

/**
 * Unlocks and permanently decrypts a PDF file using the authorized password.
 * Removes user password encryption and all permission restriction flags.
 * @param file The encrypted PDF file.
 * @param password The password to unlock.
 * @returns Decrypted PDF (unencrypted) as Uint8Array.
 */
export async function unlockPdf(file: File, password: string): Promise<Uint8Array> {
    const bytes = await file.arrayBuffer();
    try {
        // Load document with the provided authorization password
        const pdfDoc = await PDFDocument.load(bytes, { password } as any);

        // Saving without calling .encrypt() permanently removes encryption
        return await pdfDoc.save();
    } catch (err: any) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('password') || msg.includes('decrypt') || msg.includes('encrypted') || msg.includes('auth')) {
            throw new Error("Incorrect password. Please verify and enter the correct document password.");
        }
        throw new Error("Failed to decrypt document. Please verify the password and try again.");
    }
}

/**
 * Removes permission restrictions (such as printing or copying locks) from a document.
 * @param file PDF file with permission restrictions.
 * @returns Unrestricted PDF as Uint8Array.
 */
export async function removePermissions(file: File): Promise<Uint8Array> {
    const bytes = await file.arrayBuffer();
    try {
        const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pdfDoc = await PDFDocument.create();
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(page => pdfDoc.addPage(page));
        return await pdfDoc.save();
    } catch (err: any) {
        throw new Error("Unable to remove permissions. Document may require a user password.");
    }
}

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
    } else if (signatureFile instanceof Blob) {
        const header = new Uint8Array(sigBytes.slice(0, 4));
        if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
            isPng = true;
        } else if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
            isPng = false;
        }
    }

    const signatureImage = isPng
        ? await pdfDoc.embedPng(sigBytes)
        : await pdfDoc.embedJpg(sigBytes);

    const pages = pdfDoc.getPages();
    const { width, height } = signatureImage.scale(0.15);

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
