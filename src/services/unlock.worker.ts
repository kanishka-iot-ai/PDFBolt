import { PDFDocument } from 'pdf-lib-plus-encrypt';

// Respond to messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    const { pdfBytes, passwords, batchId } = e.data;

    for (let i = 0; i < passwords.length; i++) {
        const password = passwords[i];
        
        if (i > 0 && i % 100 === 0) {
            self.postMessage({ type: 'PROGRESS', current: i, total: passwords.length });
        }

        try {
            // Attempt load
            const pdfDoc = await PDFDocument.load(pdfBytes, { password } as any);

            // Success! Send result back immediately
            self.postMessage({
                type: 'SUCCESS',
                password,
                batchId
            });
            return;
        } catch (err) {
            const errorMsg = (err as Error).message.toLowerCase();
            if (!errorMsg.includes('password') && !errorMsg.includes('decrypt')) {
                // Actual file corruption
                self.postMessage({ type: 'ERROR', message: 'File appears to be corrupted' });
                return;
            }
            // Wrong password, continue
        }
    }

    // Finished batch with no success
    self.postMessage({
        type: 'FINISHED',
        count: passwords.length,
        batchId,
        lastAttempt: passwords[passwords.length - 1]
    });
};
