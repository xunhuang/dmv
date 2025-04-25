// Simple file server for the email test HTML
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    // Serve the email test HTML
    fs.readFile(path.join(__dirname, 'email-test.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Error: ${err.message}`);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Test page server running at http://localhost:${PORT}`);
  console.log('Open your browser to this URL to test email sending');
});