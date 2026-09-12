import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
createServer(async (req, res) => {
    try {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname === '/' || url.pathname === '/kashimo') {
            res.writeHead(302, { Location: '/kashimo/' }).end(); return;
        }
        if (!url.pathname.startsWith('/kashimo/')) { res.writeHead(404).end(); return; }
        let relative = decodeURIComponent(url.pathname.slice('/kashimo/'.length)) || 'index.html';
        let file = path.resolve(root, relative);
        if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
        if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
        const data = await readFile(file);
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
    } catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Kashimo: http://localhost:4173/kashimo/'));

