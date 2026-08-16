/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_ADS_ENABLED?: string;
    readonly VITE_ADSENSE_PUB_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
