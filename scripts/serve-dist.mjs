import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const base = '/feromeet-web';
const port = Number(process.env.PORT || 4174);
const types = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith(base)) {
    response.writeHead(302, { Location: `${base}/` });
    response.end();
    return;
  }

  pathname = pathname.slice(base.length) || '/';
  const relative =
    pathname === '/'
      ? 'index.html'
      : extname(pathname)
        ? pathname.slice(1)
        : `${pathname.slice(1).replace(/\/$/, '')}.html`;
  const safePath = normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
  const file = join(root, safePath);

  if (!existsSync(file)) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': types[extname(file)] || 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Feromeet preview: http://127.0.0.1:${port}${base}/`);
});
