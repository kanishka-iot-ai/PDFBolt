import JSZip from 'jszip';

/**
 * Creates a ZIP file from an array of File objects.
 * Preserves relative paths if available (from webkitdirectory uploads).
 */
export async function createZipFromFiles(files: File[]): Promise<Blob> {
    const zip = new JSZip();

    files.forEach(file => {
        // webkitRelativePath is available when uploading folders or files from a directory
        // If not available, we just use the file name (flat structure)
        const storedName = file.webkitRelativePath || file.name;
        zip.file(storedName, file);
    });

    return await zip.generateAsync({ type: 'blob' });
}
