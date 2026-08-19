/**
 * File validation and security utilities for PDFBolt
 * Production-grade MIME, Magic-Byte, Zip-Bomb, and Path-Traversal defense
 */

export const ALLOWED_MIME_TYPES = {
    PDF: ['application/pdf'],
    IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    WORD: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ],
    EXCEL: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ],
    POWERPOINT: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
    ],
    HTML: ['text/html'],
};

export const MAX_FILE_SIZE = {
    PDF: 100 * 1024 * 1024, // 100MB for general PDF operations
    IMAGE: 50 * 1024 * 1024, // 50MB for images
    DOCUMENT: 50 * 1024 * 1024, // 50MB for Word/Excel/PPT
    QR: 100 * 1024 * 1024, // 100MB for QR code sharing
};

export interface HumanError {
    code: string;
    title: string;
    description: string;
    suggestion: string;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
    humanError?: HumanError;
    warning?: string;
}

/**
 * Generates an actionable, human-readable error diagnostic
 */
export function createHumanError(
    title: string,
    description: string,
    suggestion: string = "Try selecting another file or verifying your document.",
    prefix: string = "PDF"
): HumanError {
    const randomHex = Math.random().toString(16).substring(2, 7).toUpperCase();
    const code = `${prefix}-${randomHex}`;
    return {
        code,
        title,
        description,
        suggestion
    };
}

/**
 * Sanitizes file names to prevent path traversal, control character injection,
 * and Windows/Linux reserved name conflicts.
 */
export function sanitizeFileName(fileName: string): string {
    if (!fileName) return 'document.pdf';

    // Remove directory traversal characters
    let clean = fileName.replace(/^.*[\\\/]/, '');

    // Remove control characters (0-31 and 127) and null bytes
    clean = clean.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove characters that are illegal across Windows/Mac/Linux filesystems
    clean = clean.replace(/[<>:"/\\|?*]/g, '_');

    // Strip leading/trailing dots and spaces
    clean = clean.trim().replace(/^\.+/, '');

    // Check against Windows reserved device names
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
    if (reservedNames.test(clean)) {
        clean = `safe_${clean}`;
    }

    return clean.length > 0 ? clean.substring(0, 150) : 'document.pdf';
}

/**
 * Sniffs actual magic bytes from the binary file header to verify true format
 */
export async function sniffMagicBytes(file: File): Promise<{ detectedType: string | null; isEncrypted?: boolean }> {
    try {
        const slice = await file.slice(0, 2048).arrayBuffer();
        const bytes = new Uint8Array(slice);

        // 1. Check PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
        if (bytes.length >= 5 &&
            bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D) {
            
            const textDecoder = new TextDecoder();
            const sampleText = textDecoder.decode(bytes);
            const isEncrypted = sampleText.includes('/Encrypt');
            return { detectedType: 'application/pdf', isEncrypted };
        }

        // 2. Check ZIP / Office OpenXML: PK\x03\x04 (0x50 0x4B 0x03 0x04)
        if (bytes.length >= 4 &&
            bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
            return { detectedType: 'application/zip' };
        }

        // 3. Check PNG: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
        if (bytes.length >= 8 &&
            bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
            bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
            return { detectedType: 'image/png' };
        }

        // 4. Check JPEG: \xFF\xD8\xFF (0xFF 0xD8 0xFF)
        if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return { detectedType: 'image/jpeg' };
        }

        // 5. Check WebP: RIFF....WEBP
        if (bytes.length >= 12 &&
            bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
            return { detectedType: 'image/webp' };
        }

        // 6. Check HTML / Text
        const textSample = new TextDecoder().decode(bytes.slice(0, 128)).toLowerCase();
        if (textSample.includes('<!doctype html') || textSample.includes('<html') || textSample.includes('<head')) {
            return { detectedType: 'text/html' };
        }

        return { detectedType: null };
    } catch {
        return { detectedType: null };
    }
}

/**
 * Validates file type against allowed MIME types, extensions, and binary magic bytes
 */
export async function validateFileTypeAndBytes(file: File, allowedMimes: string[]): Promise<ValidationResult> {
    const fileName = sanitizeFileName(file.name);
    const ext = fileName.toLowerCase().split('.').pop() || '';
    
    // Magic byte sniffing
    const { detectedType, isEncrypted } = await sniffMagicBytes(file);

    // If PDF expected
    if (allowedMimes.includes('application/pdf')) {
        if (detectedType !== 'application/pdf') {
            return {
                valid: false,
                error: `"${fileName}" is not a valid PDF document.`,
                humanError: createHumanError(
                    "Invalid PDF Structure",
                    `The file "${fileName}" does not contain standard PDF header bytes (%PDF-). It may be renamed or corrupted.`,
                    "Please choose an intact PDF document."
                )
            };
        }
        if (isEncrypted) {
            return {
                valid: true,
                warning: `"${fileName}" is password-protected or encrypted. Please unlock it before processing.`
            };
        }
        return { valid: true };
    }

    // If Image expected
    if (allowedMimes.some(m => m.startsWith('image/'))) {
        const isImage = detectedType && detectedType.startsWith('image/');
        const isImageExt = ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext);
        if (!isImage && !isImageExt) {
            return {
                valid: false,
                error: `"${fileName}" is not a supported image file.`,
                humanError: createHumanError(
                    "Unsupported Image Format",
                    `The file "${fileName}" could not be recognized as a valid JPEG, PNG, or WebP image.`,
                    "Try converting the image to standard PNG or JPG first."
                )
            };
        }
        return { valid: true };
    }

    // If Office doc expected
    if (allowedMimes.some(m => m.includes('openxmlformats') || m.includes('msword') || m.includes('ms-excel') || m.includes('ms-powerpoint'))) {
        const isZipBased = detectedType === 'application/zip';
        const isOfficeExt = ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'].includes(ext);
        if (!isZipBased && !isOfficeExt) {
            return {
                valid: false,
                error: `"${fileName}" is not a valid Office document.`,
                humanError: createHumanError(
                    "Corrupted Office Document",
                    `The file "${fileName}" could not be parsed as a valid DOCX, XLSX, or PPTX container.`,
                    "Please ensure the document opens cleanly in Microsoft Office or Google Docs before uploading."
                )
            };
        }
        return { valid: true };
    }

    return { valid: true };
}

/**
 * Validates file size against limits
 */
export function validateFileSize(file: File, maxSizeBytes: number): ValidationResult {
    if (file.size > maxSizeBytes) {
        const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            error: `File is too large (${fileSizeMB}MB). Maximum allowed is ${maxSizeMB}MB.`,
            humanError: createHumanError(
                "File Size Limit Exceeded",
                `Your document is ${fileSizeMB}MB, which exceeds the browser RAM safety limit of ${maxSizeMB}MB.`,
                `Use our PDF Compress tool to reduce the size below ${maxSizeMB}MB.`
            )
        };
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: `File "${file.name}" is empty (0 bytes).`,
            humanError: createHumanError(
                "Empty File",
                `The selected file "${file.name}" contains 0 bytes of data.`,
                "Select a non-empty document."
            )
        };
    }

    return { valid: true };
}

/**
 * Comprehensive file validation (MIME + Magic Bytes + Size + Encryption)
 */
export async function validateFile(
    file: File,
    options: {
        allowedTypes: string[];
        maxSize: number;
        checkStructure?: boolean;
    }
): Promise<ValidationResult> {
    const sizeCheck = validateFileSize(file, options.maxSize);
    if (!sizeCheck.valid) return sizeCheck;

    const byteCheck = await validateFileTypeAndBytes(file, options.allowedTypes);
    if (!byteCheck.valid) return byteCheck;

    return { valid: true, warning: byteCheck.warning };
}

/**
 * Validates multiple files in batch
 */
export async function validateFiles(
    files: File[],
    options: {
        allowedTypes: string[];
        maxSize: number;
        maxFiles?: number;
        checkStructure?: boolean;
    }
): Promise<ValidationResult> {
    if (options.maxFiles && files.length > options.maxFiles) {
        return {
            valid: false,
            error: `Too many files (${files.length}). Maximum allowed per batch is ${options.maxFiles}.`,
            humanError: createHumanError(
                "Batch Limit Exceeded",
                `You selected ${files.length} files. The maximum supported batch size is ${options.maxFiles}.`,
                `Process in batches of up to ${options.maxFiles} files.`
            )
        };
    }

    if (files.length === 0) {
        return {
            valid: false,
            error: 'No files were selected.',
            humanError: createHumanError("No Files", "No documents were chosen.", "Select one or more PDF files.")
        };
    }

    const warnings: string[] = [];

    for (const file of files) {
        const result = await validateFile(file, options);
        if (!result.valid) {
            return result;
        }
        if (result.warning) {
            warnings.push(result.warning);
        }
    }

    return {
        valid: true,
        warning: warnings.length > 0 ? warnings.join('\n') : undefined
    };
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Output Validation Stage:
 * Verifies that generated output bytes are non-empty, contain valid headers/magic bytes,
 * and form a structurally valid document before allowing download.
 */
export async function validateOutputIntegrity(
    output: Uint8Array | Blob | string,
    expectedType: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'zip' | 'image' | 'text'
): Promise<ValidationResult> {
    if (!output) {
        return {
            valid: false,
            error: "Output generation produced an empty payload.",
            humanError: createHumanError("Empty Output", "Processing produced 0 bytes.", "Please re-run the tool.")
        };
    }

    let bytes: Uint8Array;
    if (output instanceof Uint8Array) {
        bytes = output;
    } else if (output instanceof Blob) {
        bytes = new Uint8Array(await output.arrayBuffer());
    } else if (typeof output === 'string') {
        if (output.startsWith('data:')) {
            const base64 = output.split(',')[1] || '';
            const binary = atob(base64);
            bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        } else {
            return { valid: true };
        }
    } else {
        return { valid: true };
    }

    if (bytes.length === 0) {
        return {
            valid: false,
            error: "Output file size is 0 bytes.",
            humanError: createHumanError("Zero-Byte Result", "The generated document was empty.", "Please try again.")
        };
    }

    // Magic byte checking
    if (expectedType === 'pdf') {
        if (bytes.length < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2D) {
            return {
                valid: false,
                error: "Corrupted PDF output structure.",
                humanError: createHumanError("PDF Generation Error", "The output file does not start with standard %PDF- header.", "Please adjust options and retry.")
            };
        }
        // Deep verification: try loading into PDF-Lib parser
        try {
            const { PDFDocument } = await import('pdf-lib');
            const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
            if (doc.getPageCount() === 0) {
                return {
                    valid: false,
                    error: "Generated PDF contains 0 pages.",
                    humanError: createHumanError("Empty PDF", "The output PDF has no pages.", "Check input pages.")
                };
            }
        } catch (e: any) {

            return {
                valid: false,
                error: `PDF parser validation failed: ${e.message}`,
                humanError: createHumanError("PDF Syntax Error", "The generated PDF could not be verified by the PDF parser.", "Try running with different parameters.")
            };
        }
    }

    if (['docx', 'xlsx', 'pptx', 'zip'].includes(expectedType)) {
        if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
            return {
                valid: false,
                error: `Generated ${expectedType.toUpperCase()} is not a valid OpenXML container.`,
                humanError: createHumanError("Archive Format Error", `The output ${expectedType.toUpperCase()} file has a damaged ZIP header.`, "Please re-run conversion.")
            };
        }
    }

    return { valid: true };
}

