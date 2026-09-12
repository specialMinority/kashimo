import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const manifest = {
    id: './', name: 'Kashimo · カシモ', short_name: 'カシモ',
    description: '友だちとの貸し借りを、やさしく記録。',
    lang: 'ja', start_url: './', scope: './', display: 'standalone',
    orientation: 'portrait', background_color: '#F6F3EC', theme_color: '#F6F3EC',
    icons: [
        { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
};
await writeFile(path.join(root, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
await writeFile(path.join(root, '.nojekyll'), '');
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace('<html lang="en">', '<html lang="ja">')
    .replace(/<title>.*?<\/title>/, '<title>Kashimo · カシモ</title>')
    .replace(/content="width=device-width[^"]*"/, 'content="width=device-width, initial-scale=1, viewport-fit=cover"');
const metadata = [
    '<link rel="manifest" href="./manifest.webmanifest" />',
    '<link rel="apple-touch-icon" href="./icons/icon-180.png" />',
    '<meta name="theme-color" content="#F6F3EC" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="カシモ" />',
    '<style>html,body{background:#F6F3EC;overscroll-behavior-y:none}#root{height:100%;height:100dvh;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box}*:focus-visible{outline:2px solid #3F6154;outline-offset:3px}input,textarea{font-size:16px}button,[role=button],a{-webkit-tap-highlight-color:transparent}</style>',
    '<script src="./register-sw.js" defer></script>',
].join('\n');
html = html.replace('</head>', metadata + '\n</head>');
await writeFile(path.join(root, 'index.html'), html);
await writeFile(path.join(root, 'register-sw.js'), [
    "if ('serviceWorker' in navigator) {",
    "  window.addEventListener('load', () => {",
    "    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(error => console.warn('Offline setup failed', error));",
    "  });",
    "}",
].join('\n'));

// Precache only application files. User records remain in their existing localStorage key.
const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .filter(file => !file.endsWith('.map') && !['sw.js', '.nojekyll'].includes(file)).sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(path.join(root, file)));
const version = hash.digest('hex').slice(0, 12);
const sw = [
    "const PREFIX = 'kashimo-static-v1-';",
    "const CACHE = PREFIX + '" + version + "';",
    'const FILES = ' + JSON.stringify(files.map(file => './' + file)) + ';',
    "const HOME = new URL('./index.html', self.registration.scope).href;",
    "self.addEventListener('install', event => {",
    "  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));",
    "});",
    // Do not skipWaiting: a new version activates after all old app tabs are closed.
    "self.addEventListener('activate', event => {",
    "  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));",
    "});",
    "self.addEventListener('fetch', event => {",
    "  const url = new URL(event.request.url);",
    "  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;",
    "  event.respondWith(caches.open(CACHE).then(async cache => {",
    "    if (event.request.mode === 'navigate') return (await cache.match(HOME)) || fetch(event.request);",
    "    return (await cache.match(event.request)) || fetch(event.request);",
    "  }));",
    "});",
].join('\n');
await writeFile(path.join(root, 'sw.js'), sw);
console.log('PWA ready: ' + files.length + ' local files; cache version ' + version);

