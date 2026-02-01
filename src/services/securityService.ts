
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Encrypts a PDF file with a password.
 * @param file The original PDF file.
 * @param password The password to set.
 * @returns Encrypted PDF as Uint8Array.
 */
export async function protectPdf(file: File, password: string): Promise<Uint8Array> {
    const bytes = await file.arrayBuffer();
    // Load the PDF. Note: helper to load without password if it's already encrypted? 
    // We assume the input file is NOT encrypted for "Protect" action.
    const pdfDoc = await PDFDocument.load(bytes);

    // Encrypt
    pdfDoc.encrypt({
        userPassword: password,
        ownerPassword: password, // Same for simplicity
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

    return await pdfDoc.save();
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
        // Load with password
        const pdfDoc = await PDFDocument.load(bytes, { password });

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
export async function signPdf(file: File, signatureFile: File): Promise<Uint8Array> {
    const pdfBytes = await file.arrayBuffer();
    const sigBytes = await signatureFile.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const isPng = signatureFile.name.toLowerCase().endsWith('.png');

    const signatureImage = isPng
        ? await pdfDoc.embedPng(sigBytes)
        : await pdfDoc.embedJpg(sigBytes);

    const pages = pdfDoc.getPages();
    const { width, height } = signatureImage.scale(0.25); // Scale down signature

    for (const page of pages) {
        const { width: pageWidth } = page.getSize();
        // Place at bottom right
        page.drawImage(signatureImage, {
            x: pageWidth - width - 50,
            y: 50,
            width: width,
            height: height,
        });
    }

    return await pdfDoc.save();
}
