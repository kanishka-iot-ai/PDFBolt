import { PDFDocument } from 'pdf-lib-plus-encrypt';

// Respond to messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    const { pdfBytes, passwords, batchId } = e.data;

    for (const password of passwords) {
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
            // Wrong password, continue
        }
    }

    // Finished batch with no success
    self.postMessage({
        type: 'PROGRESS',
        count: passwords.length,
        batchId,
        lastAttempt: passwords[passwords.length - 1]
    });
};
