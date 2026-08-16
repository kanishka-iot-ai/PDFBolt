import JSZip from 'jszip';
import { sanitizeFileName } from '../utils/fileValidation';

export interface BatchItem {
    id: string;
    file: File;
    status: 'queued' | 'processing' | 'completed' | 'error';
    progress: number;
    resultBlob?: Blob;
    resultName?: string;
    error?: string;
}

export type BatchProcessor = (file: File, updateProgress: (pct: number) => void) => Promise<{ blob: Blob; name: string }>;

/**
 * Runs batch processing with bounded concurrency (default 2 parallel workers)
 * to prevent browser RAM exhaustion on large PDF collections.
 */
export async function executeBatch(
    items: BatchItem[],
    processor: BatchProcessor,
    onItemUpdate: (updatedItem: BatchItem) => void,
    concurrency: number = 2
): Promise<BatchItem[]> {
    const queue = [...items];
    const results: BatchItem[] = [];

    const worker = async () => {
        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) break;

            current.status = 'processing';
            current.progress = 10;
            onItemUpdate({ ...current });

            try {
                const output = await processor(current.file, (pct) => {
                    current.progress = Math.max(10, Math.min(95, pct));
                    onItemUpdate({ ...current });
                });

                current.status = 'completed';
                current.progress = 100;
                current.resultBlob = output.blob;
                current.resultName = output.name;
                onItemUpdate({ ...current });
                results.push(current);
            } catch (err: any) {
                current.status = 'error';
                current.progress = 100;
                current.error = err?.message || 'Processing failed';
                onItemUpdate({ ...current });
                results.push(current);
            }
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);

    return results;
}

/**
 * Packages all completed batch items into a single ZIP archive for instant download
 */
export async function createBatchZip(
    completedItems: BatchItem[],
    zipFileName: string = 'pdfbolt_batch_export.zip'
): Promise<Blob> {
    const zip = new JSZip();

    for (const item of completedItems) {
        if (item.resultBlob && item.resultName) {
            const safeName = sanitizeFileName(item.resultName);
            zip.file(safeName, item.resultBlob);
        }
    }

    return zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
}
