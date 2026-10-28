/**
 * PDFBolt Web & Client SDK v1.0.0
 * Universal client library and drop-in embeddable widget for PDFBolt Processing API.
 * https://pdfbolt.in
 * 
 * Usage 1: Drop-in Embeddable Widget (Zero-Code for websites & WordPress)
 * <div data-pdfbolt-tool="compress" data-pdfbolt-key="YOUR_API_KEY"></div>
 * <script src="https://pdfbolt.in/sdk/pdfbolt.js" async></script>
 * 
 * Usage 2: Programmatic JavaScript / TypeScript
 * const pdfbolt = new PDFBolt({ apiKey: "YOUR_API_KEY" });
 * const blob = await pdfbolt.compress(file, { targetKb: 100 });
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PDFBolt = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_BASE_URL = 'https://pdfbolt-api.onrender.com';

  class PDFBolt {
    constructor(options = {}) {
      if (typeof options === 'string') {
        this.apiKey = options;
        this.baseUrl = DEFAULT_BASE_URL;
      } else {
        this.apiKey = options.apiKey || '';
        this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
      }

      if (!this.apiKey) {
        console.warn('[PDFBolt SDK] Warning: No apiKey provided. External API requests will be rejected without an authenticated API key.');
      }
    }

    // ------------------------------------------------------------------------
    // Low-Level Request Handlers
    // ------------------------------------------------------------------------
    async _request(path, fetchOptions = {}) {
      const url = `${this.baseUrl}${path}`;
      const headers = {
        'X-API-Key': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`,
        ...(fetchOptions.headers || {})
      };

      const response = await fetch(url, {
        ...fetchOptions,
        headers
      });

      return response;
    }

    async _runJob(operation, files, options = {}) {
      const formData = new FormData();
      formData.append('operation', operation);
      formData.append('options', JSON.stringify(options));

      const fileList = Array.isArray(files) ? files : [files];
      for (const f of fileList) {
        formData.append('files', f);
      }

      const res = await this._request('/api/v1/jobs', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch (_) { errData = { message: res.statusText }; }
        throw new Error(errData.detail?.message || errData.message || `PDFBolt Job Error (${res.status})`);
      }

      const jobResult = await res.json();
      if (!jobResult.success) {
        throw new Error(jobResult.error || 'Job processing failed.');
      }

      if (!jobResult.download_url) {
        return jobResult;
      }

      // Download the processed file as a Blob
      const dlRes = await this._request(jobResult.download_url, { method: 'GET' });
      if (!dlRes.ok) {
        throw new Error(`Failed to download processed document (${dlRes.status})`);
      }

      const blob = await dlRes.blob();
      blob.filename = jobResult.filename || `pdfbolt_${operation}.pdf`;
      return blob;
    }

    async _convertDirect(endpoint, file, expectedExt = '.pdf') {
      const formData = new FormData();
      formData.append('file', file);

      const res = await this._request(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch (_) { errData = { message: res.statusText }; }
        throw new Error(errData.detail || errData.message || `Conversion Error (${res.status})`);
      }

      const blob = await res.blob();
      const originalName = file.name || 'document';
      const stem = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      blob.filename = `${stem}${expectedExt}`;
      return blob;
    }

    // ------------------------------------------------------------------------
    // High-Level Document Operations
    // ------------------------------------------------------------------------

    /**
     * Compress PDF to a target file size or quality preset.
     * @param {File|Blob} file 
     * @param {Object} [opts] - { level: 'extreme'|'recommended'|'low', targetKb: 100 }
     */
    async compress(file, opts = {}) {
      const options = {
        level: opts.level || 'recommended',
        ...(opts.targetKb ? { target_kb: opts.targetKb } : {})
      };
      return this._runJob('compress', file, options);
    }

    /**
     * Merge multiple PDF files into a single document.
     * @param {Array<File|Blob>} files 
     */
    async merge(files) {
      if (!Array.isArray(files) || files.length < 2) {
        throw new Error('Merge requires an array of at least 2 PDF files.');
      }
      return this._runJob('merge', files, {});
    }

    /**
     * Split a PDF by extracting specific page ranges.
     * @param {File|Blob} file 
     * @param {string} [ranges='1-5'] 
     */
    async split(file, ranges = '1-5') {
      return this._runJob('split', file, { ranges });
    }

    /**
     * Convert Word DOCX/DOC to PDF.
     * @param {File|Blob} file 
     */
    async wordToPdf(file) {
      return this._convertDirect('/api/v1/convert/word-to-pdf', file, '.pdf');
    }

    /**
     * Convert PDF to editable Word DOCX.
     * @param {File|Blob} file 
     */
    async pdfToWord(file) {
      return this._convertDirect('/api/v1/convert/pdf-to-word', file, '.docx');
    }

    /**
     * Convert Excel XLSX/XLS to PDF.
     * @param {File|Blob} file 
     */
    async excelToPdf(file) {
      return this._convertDirect('/api/v1/convert/excel-to-pdf', file, '.pdf');
    }

    /**
     * Convert PowerPoint PPTX/PPT to PDF.
     * @param {File|Blob} file 
     */
    async pptToPdf(file) {
      return this._convertDirect('/api/v1/convert/ppt-to-pdf', file, '.pdf');
    }

    /**
     * Convert Images (JPG, PNG, WebP) to PDF.
     * @param {Array<File|Blob>|File|Blob} files 
     */
    async jpgToPdf(files) {
      const list = Array.isArray(files) ? files : [files];
      return this._runJob('images_to_pdf', list, {});
    }

    /**
     * Password-protect a PDF with AES-256 encryption.
     * @param {File|Blob} file 
     * @param {string} password 
     */
    async protect(file, password) {
      return this._runJob('protect', file, { user_password: password, owner_password: password });
    }

    /**
     * Remove password protection from an unlocked PDF.
     * @param {File|Blob} file 
     * @param {string} password 
     */
    async unlock(file, password) {
      return this._runJob('unlock', file, { password });
    }

    /**
     * Run OCR on a scanned PDF to make text searchable and selectable.
     * @param {File|Blob} file 
     * @param {string} [language='eng'] 
     */
    async ocr(file, language = 'eng') {
      return this._runJob('ocr', file, { language });
    }

    /**
     * Redact sensitive text (names, credit cards, SSN, PAN, Aadhaar) or coordinates.
     * @param {File|Blob} file 
     * @param {Array<string>} searchTerms 
     */
    async redact(file, searchTerms = []) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('search_terms', JSON.stringify(searchTerms));

      const res = await this._request('/api/v1/redact', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(`Redact failed (${res.status})`);
      const blob = await res.blob();
      blob.filename = `redacted_${file.name || 'document.pdf'}`;
      return blob;
    }

    /**
     * Analyze PDF metadata, page count, security flags, and embedded image stats.
     * @param {File|Blob} file 
     */
    async analyze(file) {
      const formData = new FormData();
      formData.append('file', file);

      const res = await this._request('/api/v1/analyze', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(`Analyze failed (${res.status})`);
      return res.json();
    }

    // ------------------------------------------------------------------------
    // Static Utilities
    // ------------------------------------------------------------------------
    /**
     * Triggers instant browser download of any Blob.
     */
    static downloadBlob(blob, filename) {
      const fname = filename || blob.filename || 'download.pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    // ------------------------------------------------------------------------
    // Drop-in Embeddable Web Widget
    // ------------------------------------------------------------------------
    /**
     * Mounts an interactive PDF processing widget into any DOM element.
     * @param {string|HTMLElement} target - CSS selector or element
     * @param {Object} config - { apiKey, tool: 'compress'|'merge'|'word-to-pdf', ... }
     */
    static mount(target, config = {}) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) {
        console.error('[PDFBolt] Target container not found:', target);
        return;
      }

      const apiKey = config.apiKey || el.getAttribute('data-pdfbolt-key') || '';
      const tool = (config.tool || el.getAttribute('data-pdfbolt-tool') || 'compress').toLowerCase();
      const theme = config.theme || el.getAttribute('data-pdfbolt-theme') || 'light';
      const targetKb = config.targetKb || el.getAttribute('data-pdfbolt-target-kb');

      const toolTitles = {
        'compress': 'Compress PDF File',
        'merge': 'Merge Multiple PDFs',
        'word-to-pdf': 'Word to PDF Converter',
        'pdf-to-word': 'PDF to Word Converter',
        'excel-to-pdf': 'Excel to PDF Converter',
        'ppt-to-pdf': 'PowerPoint to PDF Converter',
        'protect': 'Protect PDF with Password',
        'ocr': 'OCR Searchable PDF'
      };

      const title = config.title || toolTitles[tool] || 'Process Document with PDFBolt';
      const isMulti = tool === 'merge' || tool === 'jpg-to-pdf';

      const client = new PDFBolt({ apiKey, baseUrl: config.baseUrl });

      el.innerHTML = `
        <div class="pdfbolt-widget" style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          border: 2px dashed #3b82f6;
          border-radius: 16px;
          padding: 28px 20px;
          text-align: center;
          background: ${theme === 'dark' ? '#0f172a' : '#f8fafc'};
          color: ${theme === 'dark' ? '#f1f5f9' : '#1e293b'};
          max-width: 520px;
          margin: 0 auto;
          box-sizing: border-box;
          transition: all 0.2s ease;
        ">
          <div style="margin-bottom: 14px;">
            <svg style="width: 44px; height: 44px; color: #2563eb; margin: 0 auto;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 style="margin: 0 0 6px 0; font-size: 19px; font-weight: 700; color: #1e40af;">${title}</h3>
          <p style="margin: 0 0 16px 0; font-size: 13.5px; opacity: 0.8;">Drag & drop your ${isMulti ? 'files' : 'file'} here, or click to browse</p>
          
          <input type="file" class="pdfbolt-file-input" ${isMulti ? 'multiple' : ''} style="display: none;" />
          
          <button type="button" class="pdfbolt-browse-btn" style="
            background: #2563eb;
            color: #ffffff;
            font-weight: 600;
            font-size: 14px;
            padding: 10px 22px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(37,99,235,0.25);
            transition: background 0.15s ease;
          ">Choose ${isMulti ? 'Files' : 'File'}</button>
          
          <div class="pdfbolt-status" style="margin-top: 14px; font-size: 14px; font-weight: 500; display: none;"></div>
          
          <a class="pdfbolt-download-btn" style="
            display: none;
            margin-top: 14px;
            background: #16a34a;
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            padding: 10px 24px;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(22,163,74,0.25);
          ">Download Result</a>

          <div style="margin-top: 16px; font-size: 11px; opacity: 0.6;">
            Powered by <a href="https://pdfbolt.in" target="_blank" style="color: inherit; text-decoration: underline;">PDFBolt Engine</a> • 100% Secure & Ephemeral
          </div>
        </div>
      `;

      const container = el.querySelector('.pdfbolt-widget');
      const fileInput = el.querySelector('.pdfbolt-file-input');
      const browseBtn = el.querySelector('.pdfbolt-browse-btn');
      const statusDiv = el.querySelector('.pdfbolt-status');
      const downloadBtn = el.querySelector('.pdfbolt-download-btn');

      browseBtn.addEventListener('click', () => fileInput.click());

      // Drag & drop highlight
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.style.borderColor = '#1d4ed8';
        container.style.background = theme === 'dark' ? '#1e293b' : '#eff6ff';
      });
      container.addEventListener('dragleave', () => {
        container.style.borderColor = '#3b82f6';
        container.style.background = theme === 'dark' ? '#0f172a' : '#f8fafc';
      });
      container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.style.borderColor = '#3b82f6';
        container.style.background = theme === 'dark' ? '#0f172a' : '#f8fafc';
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleFiles(e.target.files);
        }
      });

      async function handleFiles(files) {
        statusDiv.style.display = 'block';
        statusDiv.style.color = '#2563eb';
        statusDiv.textContent = 'Processing with PDFBolt Engine... Please wait.';
        browseBtn.style.display = 'none';
        downloadBtn.style.display = 'none';

        try {
          let outputBlob;
          if (tool === 'compress') {
            outputBlob = await client.compress(files[0], { targetKb: targetKb ? parseInt(targetKb, 10) : null });
          } else if (tool === 'merge') {
            outputBlob = await client.merge(Array.from(files));
          } else if (tool === 'word-to-pdf') {
            outputBlob = await client.wordToPdf(files[0]);
          } else if (tool === 'pdf-to-word') {
            outputBlob = await client.pdfToWord(files[0]);
          } else if (tool === 'excel-to-pdf') {
            outputBlob = await client.excelToPdf(files[0]);
          } else if (tool === 'ppt-to-pdf') {
            outputBlob = await client.pptToPdf(files[0]);
          } else if (tool === 'ocr') {
            outputBlob = await client.ocr(files[0]);
          } else {
            outputBlob = await client.compress(files[0]);
          }

          statusDiv.style.color = '#16a34a';
          statusDiv.textContent = 'Processing complete!';

          const downloadUrl = URL.createObjectURL(outputBlob);
          downloadBtn.href = downloadUrl;
          downloadBtn.download = outputBlob.filename || 'processed_document.pdf';
          downloadBtn.style.display = 'inline-block';

          if (typeof config.onSuccess === 'function') {
            config.onSuccess(downloadUrl, outputBlob);
          }
        } catch (err) {
          statusDiv.style.color = '#dc2626';
          statusDiv.textContent = `Error: ${err.message}`;
          browseBtn.style.display = 'inline-block';
          if (typeof config.onError === 'function') {
            config.onError(err);
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // Auto-Mount on Page Load
    // ------------------------------------------------------------------------
    static autoInit() {
      const widgets = document.querySelectorAll('[data-pdfbolt-tool], [data-pdfbolt-key]');
      widgets.forEach(w => PDFBolt.mount(w));
    }
  }

  // Auto-run if embedded in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => PDFBolt.autoInit());
    } else {
      PDFBolt.autoInit();
    }
  }

  return PDFBolt;
}));
