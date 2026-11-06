const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function packageExtension() {
  const extensionDir = path.resolve('extension');
  const distDir = path.resolve('dist-extension');
  const zipPath = path.join(distDir, 'pdfbolt-chrome-extension.zip');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const zip = new JSZip();

  function addDirToZip(dir, zipFolder) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addDirToZip(fullPath, zipFolder.folder(file));
      } else {
        zipFolder.file(file, fs.readFileSync(fullPath));
      }
    }
  }

  console.log('Packaging extension files into ZIP archive...');
  addDirToZip(extensionDir, zip);

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(zipPath, content);
  console.log(`✅ Chrome Web Store ready package generated at:\n   ${zipPath} (${(content.length / 1024).toFixed(1)} KB)`);
}

packageExtension().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
