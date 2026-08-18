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
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      modulePreload: {
        polyfill: false,
        resolveDependencies: (filename, deps) => {
          // Never preload heavy processing chunks on landing/initial page load
          const heavyPatterns = [
            'jspdf',
            'pdf-lib',
            'pdfjs-dist',
            'docx',
            'html2canvas',
            'tesseract',
            'mammoth',
            'exceljs'
          ];
          return deps.filter(dep => !heavyPatterns.some(pattern => dep.includes(pattern)));
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'pdf-lib': ['pdf-lib'],
            'pdfjs-dist': ['pdfjs-dist'],
            'docx-vendor': ['docx'],
            'html2canvas-vendor': ['html2canvas'],
            'jspdf-vendor': ['jspdf'],
            'tesseract': ['tesseract.js'],
            'mammoth': ['mammoth'],
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
