const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const PORT = process.env.BFF_PORT || 4000;
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // BFF stub: /api/status
  const reqPath = new URL(req.url || '/', 'http://localhost').pathname;
  if (reqPath === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        user: 'dev-user',
        isAdmin: false,
        isAllowed: true,
        serverReady: true,
      }),
    );
    return;
  }

  // Static file serving (production mode)
  const safePath = path.posix.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const relativePath = safePath.replace(/^[/\\]+/, '');
  const filePath = path.resolve(PUBLIC_DIR, relativePath || 'index.html');
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (_err, fallback) => {
        if (_err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fallback);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\x1b[32m✓ BFF stub listening on http://localhost:${PORT}\x1b[0m`);
  console.log('  GET /api/status — returns stub user');
});
