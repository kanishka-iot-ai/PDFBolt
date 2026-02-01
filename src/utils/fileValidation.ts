/**
 * File validation utilities for PDFBolt
 * Ensures security and proper file handling
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
    PDF: 30 * 1024 * 1024, // 30MB for general PDF operations
    IMAGE: 30 * 1024 * 1024, // 30MB for images
    DOCUMENT: 30 * 1024 * 1024, // 30MB for Word/Excel/PPT
    QR: 100 * 1024 * 1024, // 100MB for QR code feature only
};

export interface ValidationResult {
    valid: boolean;
    error?: string;
    warning?: string;
}

/**
 * Validates file type against allowed MIME types and extensions
 */
export function validateFileType(file: File, allowedTypes: string[]): ValidationResult {
    // Check MIME type
    const mimeTypeValid = allowedTypes.includes(file.type);

    // Check file extension as fallback
    const fileExtension = file.name.toLowerCase().split('.').pop() || '';
    const allowedExtensions = allowedTypes.map(type => {
        // Map MIME types to extensions
        const mimeToExt: Record<string, string[]> = {
            'application/pdf': ['pdf'],
            'image/jpeg': ['jpg', 'jpeg'],
            'image/jpg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/webp': ['webp'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
            'application/msword': ['doc'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
            'application/vnd.ms-excel': ['xls'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
            'application/vnd.ms-powerpoint': ['ppt'],
            'text/html': ['html', 'htm'],
        };
        return mimeToExt[type] || [];
    }).flat();

    const extensionValid = allowedExtensions.includes(fileExtension);

    if (!mimeTypeValid && !extensionValid) {
        const expectedExtensions = allowedExtensions.join(', ');
        return {
            valid: false,
            error: `Invalid file type: "${file.name}". Expected: ${expectedExtensions.toUpperCase()} files only.`
        };
    }

    // Warn if MIME type doesn't match but extension does
    if (!mimeTypeValid && extensionValid) {
        return {
            valid: true,
            warning: `File "${file.name}" has an unusual MIME type (${file.type}), but the extension appears correct.`
        };
    }

    return { valid: true };
}

/**
 * Validates file size
 */
export function validateFileSize(file: File, maxSizeBytes: number): ValidationResult {
    if (file.size > maxSizeBytes) {
        const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            error: `File too large: ${fileSizeMB}MB. Maximum allowed: ${maxSizeMB}MB`
        };
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty (0 bytes)'
        };
    }

    return { valid: true };
}

/**
 * Validates PDF file structure by checking header
 */
export async function validatePDFStructure(file: File): Promise<ValidationResult> {
    try {
        const bytes = await file.arrayBuffer();
        const header = new Uint8Array(bytes.slice(0, 5));
        const pdfHeader = String.fromCharCode(...header);

        if (pdfHeader !== '%PDF-') {
            return {
                valid: false,
                error: 'Invalid PDF file: Missing PDF header'
            };
        }

        // Check if file is encrypted (basic check)
        const textDecoder = new TextDecoder();
        const firstKB = textDecoder.decode(new Uint8Array(bytes.slice(0, 1024)));

        if (firstKB.includes('/Encrypt')) {
            return {
                valid: true,
                warning: 'This PDF appears to be encrypted. Some operations may require a password.'
            };
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: 'Failed to read PDF file structure'
        };
    }
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
    file: File,
    options: {
        allowedTypes: string[];
        maxSize: number;
        checkStructure?: boolean;
    }
): Promise<ValidationResult> {
    // Check file type
    const typeCheck = validateFileType(file, options.allowedTypes);
    if (!typeCheck.valid) return typeCheck;

    // Check file size
    const sizeCheck = validateFileSize(file, options.maxSize);
    if (!sizeCheck.valid) return sizeCheck;

    // Check PDF structure if requested
    if (options.checkStructure && file.type === 'application/pdf') {
        const structureCheck = await validatePDFStructure(file);
        if (!structureCheck.valid) return structureCheck;
        if (structureCheck.warning) {
            return { valid: true, warning: structureCheck.warning };
        }
    }

    return { valid: true };
}

/**
 * Validates multiple files
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
            error: `Too many files: ${files.length}. Maximum allowed: ${options.maxFiles}`
        };
    }

    if (files.length === 0) {
        return {
            valid: false,
            error: 'No files selected'
        };
    }

    for (const file of files) {
        const result = await validateFile(file, options);
        if (!result.valid) {
            return {
                valid: false,
                error: `${file.name}: ${result.error}`
            };
        }
    }

    return { valid: true };
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
