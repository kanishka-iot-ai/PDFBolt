# 🔥 PDF Master Pro - Ultimate PDF Toolkit

> **Privacy-First | Client-Side Processing | 25+ Tools | SEO Optimized**

A blazing-fast, production-ready PDF toolkit with advanced features including OCR, AI-powered processing, cloud sharing, and enterprise-grade security.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-green)

---

## ✨ Features

### 📄 Core PDF Tools
- **Merge PDFs** - Combine multiple PDFs into one
- **Split PDF** - Extract specific pages or ranges
- **Compress PDF** - Reduce file size (Low/Smart/Lite modes)
- **Rotate Pages** - Fix page orientation
- **Add Page Numbers** - Professional pagination
- **Watermark** - Add text watermarks
- **Delete Pages** - Remove unwanted pages

### 🔐 Security & Signing
- **Protect PDF** - Password encryption
- **Unlock PDF** - Remove password protection
- **Sign PDF** - Digital signature placement
- **Redact** - Permanently remove sensitive content

### 🔄 Format Conversion
- **PDF to Word** - Editable DOCX export
- **PDF to JPG** - High-quality image extraction
- **PDF to PowerPoint** - Slide deck conversion
- **Word to PDF** - DOCX → PDF
- **Excel to PDF** - XLSX → PDF
- **HTML to PDF** - Web page archival
- **Images to PDF** - JPG/PNG → PDF

### 🚀 Advanced Features
- **OCR (Optical Character Recognition)** - Extract text from scanned PDFs
- **PDF Repair** - Fix corrupted files
- **QR Code Sharing** - Cloud-based file sharing with 30-day expiry
- **AI Processing** - Google Gemini integration (optional)

### 🎯 SEO & Performance
- ⚡ **Client-Side Processing** - No server uploads, instant processing
- 🔒 **Privacy-First** - Files never leave your device (except QR sharing)
- 📱 **Responsive Design** - Works on mobile, tablet, desktop
- 🌐 **SEO Optimized** - JSON-LD schemas, meta tags, sitemap
- 🚀 **Fast Loading** - Optimized bundles, code splitting, lazy loading

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pdfmaster-pro.git
cd pdfmaster---pro-pdf-toolkit

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your AWS credentials

# Start development server
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## 📦 Production Build

### Build for Production
```bash
npm run build
```

The optimized build will be in the `dist/` folder.

### Preview Production Build
```bash
npm run preview
```

---

## 🐳 Docker Deployment

### Quick Deploy with Docker
```bash
# Build the image
docker build -t pdfmaster-pro .

# Run the container
docker run -d -p 80:80 --name pdfmaster pdfmaster-pro

# Access at http://localhost
```

### Docker Compose
```bash
docker-compose up -d
```

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.**

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19, TypeScript 5.8 |
| **Routing** | React Router 7 |
| **Styling** | Tailwind CSS 3.4 |
| **PDF Processing** | pdf-lib, pdfjs-dist |
| **OCR** | Tesseract.js |
| **Cloud Storage** | AWS S3 SDK |
| **Build Tool** | Vite 6 |
| **Deployment** | Docker + Nginx |
| **SEO** | react-helmet-async, JSON-LD |

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# AWS S3 (Required for QR Code feature)
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_AWS_REGION=us-east-1
VITE_AWS_BUCKET_NAME=your-bucket-name

# Google AI (Optional)
GEMINI_API_KEY=your_gemini_api_key
```

### AWS S3 Setup

1. Create an S3 bucket
2. Enable public read access
3. Add CORS policy:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```
4. (Optional) Add lifecycle rule to auto-delete after 30 days

---

## 📁 Project Structure

```
pdfmaster---pro-pdf-toolkit/
├── components/          # Reusable UI components
│   ├── FileUploader.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── SEOLandingPage.tsx
├── pages/              # Route pages
│   ├── Home.tsx
│   ├── MergeTool.tsx
│   ├── SimpleTool.tsx
│   ├── QRTool.tsx
│   └── StaticPages.tsx
├── services/           # Business logic
│   ├── pdfService.ts
│   ├── conversionService.ts
│   ├── securityService.ts
│   ├── ocrService.ts
│   ├── pptService.ts
│   ├── sanitizeService.ts
│   └── storageService.ts
├── public/             # Static assets
│   ├── sitemap.xml
│   └── robots.txt
├── App.tsx             # Main app component
├── constants.tsx       # Tool configurations
├── Dockerfile          # Docker configuration
├── nginx.conf          # Nginx server config
└── vite.config.ts      # Build configuration
```

---

## 🎨 Features Highlight

### Privacy-First Architecture
- **100% Client-Side Processing** - PDFs are processed locally in your browser
- **Zero Server Storage** - Files never uploaded (except optional QR sharing)
- **Instant Processing** - No waiting for server responses
- **Secure** - All processing happens in your device's memory

### QR Code Cloud Sharing
- Upload PDFs to AWS S3 with **30-day auto-expiry**
- Generate QR codes for easy mobile access
- Perfect for **"Scan to View"** workflows
- Secure, temporary links

### SEO Optimized
- JSON-LD Schema markup for all tools
- Dynamic meta tags with `react-helmet-async`
- Sitemap and robots.txt included
- Fast Core Web Vitals scores

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Upload and merge multiple PDFs
- [ ] Compress a large PDF
- [ ] Protect PDF with password
- [ ] Sign PDF with signature image
- [ ] OCR a scanned document
- [ ] Generate QR code and verify S3 upload
- [ ] Test on mobile device
- [ ] Verify SEO meta tags in page source

---

## 🚨 Troubleshooting

### Common Issues

**1. TypeScript Errors in IDE**
```bash
# Solution: Install dependencies
npm install
```

**2. QR Code Upload Fails**
- Verify AWS credentials in `.env`
- Check S3 bucket CORS policy
- Ensure bucket has public read access

**3. Build Fails**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**4. Large Bundle Size**
- The app uses code splitting by default
- PDF libraries (pdf-lib, tesseract) are chunked separately
- Lazy loading is enabled for conversion tools

---

## 📈 Performance

### Build Output (Approximate)
```
dist/
├── index.html            ~5 KB
├── react-vendor.js       ~150 KB (gzipped)
├── pdf-vendor.js         ~200 KB (gzipped)
├── conversion-vendor.js  ~400 KB (gzipped)
└── main.js              ~100 KB (gzipped)
```

### Optimizations
- ✅ Dead code elimination
- ✅ Tree shaking
- ✅ Manual chunk splitting
- ✅ Gzip/Brotli compression
- ✅ Asset caching (1 year)
- ✅ Console logs removed in production

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙏 Acknowledgments

- [pdf-lib](https://pdf-lib.js.org/) - PDF manipulation
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR capabilities
- [Lucide Icons](https://lucide.dev/) - Beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📧 Support

For issues or questions:
- 📝 Open an issue on GitHub
- 📧 Email: support@pdfmaster.io
- 📖 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help

---

## 🎯 Roadmap

- [ ] Batch processing (multiple files at once)
- [ ] Custom watermark positioning
- [ ] PDF form filling
- [ ] Digital signature with certificate
- [ ] Collaborative editing
- [ ] Mobile apps (iOS/Android)

---

**Made with ❤️ for privacy and performance**
