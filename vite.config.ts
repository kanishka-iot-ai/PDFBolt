import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const rootDir = __dirname;
  const env = loadEnv(mode, rootDir, '');
  return {
    root: rootDir,
    envDir: rootDir,
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api/v1': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (env.GEMINI_API_KEY) {
                proxyReq.setHeader('x-goog-api-key', env.GEMINI_API_KEY);
              }
            });
          }
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      target: 'es2022',
      minify: 'terser',
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      reportCompressedSize: false,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          passes: 2,
        },
      },
      modulePreload: {
        polyfill: false,
        resolveDependencies(filename, deps) {
          return deps.filter(dep => 
            !dep.includes('vendor-jspdf') && 
            !dep.includes('vendor-exceljs') && 
            !dep.includes('vendor-pdflib') && 
            !dep.includes('vendor-office') && 
            !dep.includes('vendor-tesseract') &&
            !dep.includes('vendor-html2canvas')
          );
        },
      },
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/node_modules/')) {
              if (
                normalizedId.includes('/react/') || 
                normalizedId.includes('/react-dom/') || 
                normalizedId.includes('/react-router/') || 
                normalizedId.includes('/react-router-dom/') || 
                normalizedId.includes('/react-helmet-async/') ||
                normalizedId.includes('/scheduler/')
              ) {
                return 'vendor-core';
              }
              if (normalizedId.includes('/lucide-react/')) {
                return 'vendor-icons';
              }
              if (normalizedId.includes('/pdf-lib/') || normalizedId.includes('/pdf-lib-plus-encrypt/')) {
                return 'vendor-pdflib';
              }
              if (normalizedId.includes('/jspdf/')) {
                return 'vendor-jspdf';
              }
              if (normalizedId.includes('/exceljs/')) {
                return 'vendor-exceljs';
              }
              if (normalizedId.includes('/docx/') || normalizedId.includes('/mammoth/')) {
                return 'vendor-office';
              }
              if (normalizedId.includes('/html2canvas/')) {
                return 'vendor-html2canvas';
              }
              if (normalizedId.includes('/tesseract.js/')) {
                return 'vendor-tesseract';
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
