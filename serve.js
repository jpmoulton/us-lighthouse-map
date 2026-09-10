// Development server: expose only the distributable map and its notices.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.join(__dirname, 'deploy/lighthouse-map');
const port = Number(process.argv[2] ?? 8080);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Use a port between 0 and 65535.');
if (!fs.existsSync(path.join(directory, 'index.html'))) throw new Error('Run npm run build first.');
const allowed = new Map([
  ['index.html', 'text/html; charset=utf-8'],
  ['D3-LICENSE.txt', 'text/plain; charset=utf-8'],
  ['OFL-Geist.txt', 'text/plain; charset=utf-8'],
  ['THIRD_PARTY_NOTICES.md', 'text/plain; charset=utf-8']
]);
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  let pathname;
  try { pathname = new URL(request.url, 'http://127.0.0.1').pathname; }
  catch { response.writeHead(400); response.end(); return; }
  let file = pathname.replace(/^\/lighthouse-map\//, '/').slice(1);
  if (!file || file === 'lighthouse-map') file = 'index.html';
  if (!allowed.has(file) || !fs.existsSync(path.join(directory, file))) {
    response.writeHead(404); response.end('Not found'); return;
  }
  const body = fs.readFileSync(path.join(directory, file));
  response.writeHead(200, { 'Content-Type': allowed.get(file), 'Content-Length': body.length,
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(request.method === 'HEAD' ? undefined : body);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Map available at http://127.0.0.1:${server.address().port}/lighthouse-map/`);
});
