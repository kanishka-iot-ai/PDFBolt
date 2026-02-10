/// <reference types="vite/client" />

// Generic module declarations to silence "Cannot find module" errors
// if npm install hasn't run or types are missing.

declare module 'pdf-lib' {
    export const PDFDocument: any;
    export const StandardFonts: any;
    export const rgb: any;
}

declare module 'mammoth' {
    export const convertToHtml: any;
    export const extractRawText: any;
}


declare module 'file-saver' {
    export const saveAs: any;
}

declare module 'jszip' {
    const JSZip: any;
    export default JSZip;
}

declare module 'pdfjs-dist' {
    export const GlobalWorkerOptions: { workerSrc: string };
    export const getDocument: any;
    export const version: string;
}

declare module '@aws-sdk/client-s3' {
    export const S3Client: any;
    export const PutObjectCommand: any;
    export const GetObjectCommand: any;
}

declare module '@aws-sdk/s3-request-presigner' {
    export const getSignedUrl: any;
}

declare module 'react-helmet-async' {
    export const Helmet: any;
    export const HelmetProvider: any;
}

declare module 'tesseract.js' {
    const Tesseract: any;
    export default Tesseract;
}

declare module 'pptxgenjs' {
    const PptxGenJS: any;
    export default PptxGenJS;
}
