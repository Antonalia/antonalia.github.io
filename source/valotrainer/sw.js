// VALOTRAINER offline app shell, confined to this trainer's directory and cache.
// Adapted from VALOTRAINER (MIT), Copyright (c) 2026 Anas T. See ./LICENSE.
const CACHE_PREFIX = 'lele-valotrainer-';
const CACHE = 'lele-valotrainer-ded498f5-layout-4';
const BASE = new URL('./', self.location.href);
const ASSETS = [
  './', 'index.html', 'css/style.css', 'css/fonts.css', 'css/site.css',
  'js/main.js', 'js/game.js', 'js/build.js', 'js/i18n.js', 'js/ui/translations.js',
  'js/data/guns.js', 'js/data/mechanics.js', 'js/data/themes.js',
  'js/core/ballistics.js', 'js/core/gunplay.js', 'js/core/stalker.js',
  'js/core/stats.js', 'js/core/crosshair.js', 'js/fx/audio.js',
  'js/three/world.js', 'js/three/targets.js', 'js/three/effects.js',
  'js/three/katana.js', 'js/ui/combo.js', 'vendor/three.module.min.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-512.png', 'icons/apple-180.png',
  'fonts/font-0.woff2', 'fonts/font-1.woff2', 'fonts/font-2.woff2',
  'fonts/font-3.woff2', 'fonts/font-4.woff2', 'fonts/font-5.woff2',
  'fonts/font-6.woff2', 'fonts/font-7.woff2', 'fonts/font-8.woff2',
  'fonts/font-9.woff2', 'fonts/font-10.woff2', 'fonts/font-11.woff2',
  'LICENSE', 'THIRD_PARTY.txt', 'licenses/three.txt',
  'licenses/Anton-OFL.txt', 'licenses/Barlow-OFL.txt'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(ASSETS.map(asset => new Request(new URL(asset, BASE), { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) event.waitUntil(cache.put(event.request, response.clone()));
    return response;
  }));
});
