const fs = require('fs');

const portFile = fs.readFileSync('C:\\Users\\KANISHKA GIRI\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort', 'utf8');
const lines = portFile.split('\n').map(l => l.trim()).filter(Boolean);
const port = lines[0];
const browserPath = lines[1];
const wsUrl = `ws://127.0.0.1:${port}${browserPath}`;

console.log('Connecting to Chrome CDP at:', wsUrl);

const ws = new WebSocket(wsUrl);

let sessionId = null;
const pdfPath = 'C:\\Users\\KANISHKA GIRI\\Downloads\\PDFBolt--pro-portfolio.com\\free-backlinks\\documents\\PDFBolt_Ultimate_Guide_To_Private_PDF_Tools_2026.pdf';

ws.onopen = () => {
  console.log('Connected! Searching for SpeakerDeck target...');
  ws.send(JSON.stringify({ id: 1, method: 'Target.getTargets' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  // 1. Target list received
  if (msg.id === 1) {
    const targets = msg.result.targetInfos;
    const speaker = targets.find(t => t.url.includes('speakerdeck.com/new') || t.url.includes('speakerdeck.com/upload'));
    if (!speaker) {
      console.error('Speaker Deck target not found! Current targets:', targets.map(t => t.url).slice(0, 10));
      process.exit(1);
    }
    console.log('Attaching to target:', speaker.targetId, speaker.url);
    ws.send(JSON.stringify({
      id: 2,
      method: 'Target.attachToTarget',
      params: { targetId: speaker.targetId, flatten: true }
    }));
  }

  // 2. Attached to target -> get document DOM
  if (msg.id === 2) {
    sessionId = msg.result.sessionId;
    console.log('Attached with sessionId:', sessionId);
    ws.send(JSON.stringify({
      sessionId,
      id: 3,
      method: 'DOM.getDocument'
    }));
  }

  // 3. Document received -> query input[type=file]
  if (msg.id === 3) {
    const rootNodeId = msg.result.root.nodeId;
    console.log('Root node:', rootNodeId, 'Querying input[type=file]...');
    ws.send(JSON.stringify({
      sessionId,
      id: 4,
      method: 'DOM.querySelector',
      params: { nodeId: rootNodeId, selector: 'input[type=file]' }
    }));
  }

  // 4. Input node found -> setFileInputFiles
  if (msg.id === 4) {
    const fileNodeId = msg.result.nodeId;
    if (!fileNodeId) {
      console.error('File input node not found!');
      process.exit(1);
    }
    console.log('Found file input node:', fileNodeId);
    console.log('Attaching PDF file:', pdfPath);
    ws.send(JSON.stringify({
      sessionId,
      id: 5,
      method: 'DOM.setFileInputFiles',
      params: { files: [pdfPath], nodeId: fileNodeId }
    }));
  }

  // 5. File attached -> Trigger input/change event & submit
  if (msg.id === 5) {
    console.log('✅ PDF file successfully attached to Speaker Deck file input via CDP!');
    // Trigger form submission or click submit button
    ws.send(JSON.stringify({
      sessionId,
      id: 6,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const input = document.querySelector('input[type=file]');
            if (input) {
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // Wait 1.5s for file preview to load, then submit
            setTimeout(() => {
              const submitBtn = document.querySelector('input[type=submit], button[type=submit], .btn-primary, [value*="Save"]');
              if (submitBtn) {
                console.log('Clicking submit button:', submitBtn);
                submitBtn.click();
              } else {
                console.log('Attempting form submit...');
                document.querySelector('form')?.submit();
              }
            }, 1500);
            return 'File attached and submit scheduled';
          })()
        `
      }
    }));
  }

  if (msg.id === 6) {
    console.log('Runtime eval result:', msg.result.result.value);
    console.log('Waiting 5 seconds for Speaker Deck upload and processing...');
    setTimeout(() => {
      // Check current page URL
      ws.send(JSON.stringify({
        sessionId,
        id: 7,
        method: 'Runtime.evaluate',
        params: { expression: 'window.location.href' }
      }));
    }, 5000);
  }

  if (msg.id === 7) {
    const currentUrl = msg.result.result.value;
    console.log('📍 Current Page URL after submission:', currentUrl);
    ws.close();
    process.exit(0);
  }
};

ws.onerror = (err) => {
  console.error('WebSocket Error:', err);
  process.exit(1);
};
