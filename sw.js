// Shogun's Gate offline helper. VERSION changes with every build so updates arrive on their own.
const VERSION = 'sg-1a14f9f27f0c';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('sg-') && k !== VERSION && k !== 'sg-fonts').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function withTimeout(p, ms){ return Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]); }

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // The game page: try the network first so updates land, fall back to the saved copy when offline.
    if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
      e.respondWith(withTimeout(fetch(req, {cache:'no-store'}), 5000)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); } return res; })
        .catch(() => caches.match('index.html')));
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // Fonts: keep a copy so the game looks right offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('sg-fonts').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});
