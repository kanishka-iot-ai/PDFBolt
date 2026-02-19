
/**
 * Privacy Utility for PDFBolt
 * Allows users to manually wipe all stored application data (Caches, Service Workers, Storage)
 */

export const clearAllAppData = async () => {
    try {
        // 1. Unregister all Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // 2. Clear all named Caches (This is where the 24MB lives)
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
                await caches.delete(name);
            }
        }

        // 3. Clear LocalStorage and SessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // 4. Force reload to clear memory
        window.location.reload();

        return true;
    } catch (error) {
        console.error("Cleanup error:", error);
        return false;
    }
};
