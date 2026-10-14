'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../source/valotrainer');
const origin = 'https://antonalia.github.io';
const baseUrl = `${origin}/valotrainer/`;
const html = () => fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function localResource(reference, fromUrl = baseUrl) {
  const url = new URL(reference, fromUrl);
  assert.equal(url.origin, origin, `runtime resource must be self hosted: ${reference}`);
  assert.ok(url.pathname.startsWith('/valotrainer/'), `resource escapes trainer scope: ${reference}`);
  const relative = decodeURIComponent(url.pathname.slice('/valotrainer/'.length));
  const file = path.resolve(root, relative || 'index.html');
  assert.ok(file.startsWith(`${root}${path.sep}`), `resource escapes source directory: ${reference}`);
  assert.ok(fs.existsSync(file), `resource missing on disk: ${reference}`);
  return file;
}

function listFiles(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file, extension) : file.endsWith(extension) ? [file] : [];
  });
}

function workerFixture({ responseStatus = 200 } = {}) {
  const handlers = new Map();
  const stores = new Map();
  const deleted = [];
  const opened = [];
  const added = [];
  const fetched = [];
  const matched = [];
  const put = [];
  let claimed = 0;
  let skipped = 0;
  const requestUrl = request => new URL(typeof request === 'string' ? request : request.url || request.href, baseUrl).href;
  const cacheFor = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async addAll(requests) {
        for (const request of requests) {
          const url = requestUrl(request);
          added.push(url);
          entries.set(url, new Response('precache'));
        }
      },
      async match(request, options = {}) {
        const url = requestUrl(request);
        matched.push({ name, url });
        const key = options.ignoreSearch ? [...entries.keys()].find(entry => {
          const saved = new URL(entry);
          const wanted = new URL(url);
          return saved.origin === wanted.origin && saved.pathname === wanted.pathname;
        }) : url;
        return entries.get(key)?.clone();
      },
      async put(request, response) {
        const url = requestUrl(request);
        put.push({ name, url });
        entries.set(url, response.clone());
      }
    };
  };
  const self = {
    location: { href: `${baseUrl}sw.js`, origin },
    registration: { scope: baseUrl },
    addEventListener(type, handler) { handlers.set(type, handler); },
    async skipWaiting() { skipped += 1; },
    clients: { async claim() { claimed += 1; } }
  };
  const context = vm.createContext({
    self, location: self.location, URL, Request, Response, console,
    caches: {
      async keys() { return [...stores.keys()]; },
      async delete(name) { deleted.push(name); return stores.delete(name); },
      async open(name) { opened.push(name); return cacheFor(name); },
      async match() { throw new Error('Origin-wide cache lookup can leak another application cache'); }
    },
    async fetch(request) { fetched.push(requestUrl(request)); return new Response('network', { status: responseStatus }); }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), context, { filename: 'valotrainer/sw.js' });
  const cacheName = vm.runInContext('CACHE', context);
  return {
    handlers, stores, deleted, opened, added, fetched, matched, put, cacheName,
    get claimed() { return claimed; },
    get skipped() { return skipped; },
    async lifecycle(type) {
      const promises = [];
      assert.ok(handlers.has(type), `${type} handler missing`);
      handlers.get(type)({ waitUntil(promise) { promises.push(promise); } });
      await Promise.all(promises);
    },
    async request(url, method = 'GET') {
      let response = null;
      const pending = [];
      handlers.get('fetch')({
        request: { url, method },
        respondWith(promise) { response = promise; },
        waitUntil(promise) { pending.push(promise); }
      });
      if (response === null) return null;
      const result = await response;
      await Promise.all(pending);
      return result;
    }
  };
}

test('full trainer manifest installs and starts only within /valotrainer/', () => {
  const manifestUrl = `${baseUrl}manifest.webmanifest`;
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(new URL(manifest.start_url, manifestUrl).href, baseUrl);
  assert.equal(new URL(manifest.scope, manifestUrl).href, baseUrl);
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.length >= 3);
  for (const icon of manifest.icons) localResource(icon.src, manifestUrl);
});

test('full trainer HTML, CSS fonts and Three.js resolve entirely to local runtime assets', () => {
  const document = html();
  const importMap = JSON.parse(document.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
  localResource(importMap.imports.three);
  assert.doesNotMatch(document, /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/);
  for (const match of document.matchAll(/<(?:script|link|img|source)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
    localResource(match[1]);
  }
  const styles = listFiles(path.join(root, 'css'), '.css');
  let fontCount = 0;
  for (const file of styles) {
    const fromUrl = new URL(path.relative(root, file).split(path.sep).join('/'), baseUrl).href;
    const css = fs.readFileSync(file, 'utf8');
    for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
      if (match[1].startsWith('data:') || match[1].startsWith('#')) continue;
      localResource(match[1], fromUrl);
      if (/\.woff2(?:\?|$)/.test(match[1])) fontCount += 1;
    }
  }
  assert.ok(fontCount >= 4, 'Anton and Barlow font weights must be bundled');
});

test('every original runtime module import resolves inside the complete trainer', () => {
  const importMap = JSON.parse(html().match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
  const files = listFiles(path.join(root, 'js'), '.js');
  assert.equal(files.length, 19, 'the complete runtime includes seventeen upstream modules and two localization modules');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const fromUrl = new URL(path.relative(root, file).split(path.sep).join('/'), baseUrl).href;
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s*)?["']([^"']+)["']/g)) {
      const specifier = match[1];
      const target = specifier.startsWith('.') ? specifier : importMap.imports[specifier];
      assert.ok(target, `unmapped import ${specifier} in ${file}`);
      localResource(target, specifier.startsWith('.') ? fromUrl : baseUrl);
    }
  }
  assert.ok(fs.existsSync(path.join(root, 'LICENSE')));
});

test('trainer service worker precaches only existing local trainer assets', async () => {
  const worker = workerFixture();
  await worker.lifecycle('install');
  assert.ok(worker.cacheName.startsWith('lele-valotrainer-'));
  assert.ok(worker.added.length > 25);
  for (const url of worker.added) localResource(url);
  assert.ok(worker.added.some(url => /\/vendor\/three\.module/.test(url)));
  assert.ok(worker.added.some(url => /\/fonts\/.*\.woff2$/.test(url)));
  assert.ok(worker.added.some(url => /\/licenses\//.test(url)));
  assert.equal(worker.skipped, 1);
});

test('trainer service worker activation removes only its own obsolete caches', async () => {
  const worker = workerFixture();
  const oldCache = 'lele-valotrainer-old-version';
  const unrelated = ['blog-v3', 'lele:aim:v1', 'valotrainer-v22', 'another-app-cache'];
  for (const name of [worker.cacheName, oldCache, ...unrelated]) worker.stores.set(name, new Map());
  await worker.lifecycle('activate');
  assert.deepEqual(worker.deleted, [oldCache]);
  assert.ok(worker.stores.has(worker.cacheName));
  for (const name of unrelated) assert.ok(worker.stores.has(name), `${name} must remain intact`);
  assert.equal(worker.claimed, 1);
});

test('trainer service worker does not intercept other pages, external origins or writes', async () => {
  const worker = workerFixture();
  for (const url of [`${origin}/`, `${origin}/aim/`, `${origin}/games/`, `${origin}/valotrainer-other/js/main.js`, 'https://example.com/valotrainer/js/main.js']) {
    assert.equal(await worker.request(url), null, url);
  }
  assert.equal(await worker.request(`${baseUrl}js/main.js`, 'POST'), null);
  assert.deepEqual(worker.opened, []);
  assert.deepEqual(worker.fetched, []);
});

test('trainer fetch uses its own cache and stores successful misses inside that cache', async () => {
  const worker = workerFixture();
  const asset = `${baseUrl}js/game.js`;
  worker.stores.set('blog-v3', new Map([[asset, new Response('wrong application')]]));
  worker.stores.set(worker.cacheName, new Map([[asset, new Response('trainer cache')]]));
  assert.equal(await (await worker.request(asset)).text(), 'trainer cache');
  assert.equal(await (await worker.request(`${asset}?v=ded498f5`)).text(), 'trainer cache');
  assert.deepEqual(worker.fetched, []);
  const missing = `${baseUrl}css/style.css`;
  assert.equal(await (await worker.request(missing)).text(), 'network');
  assert.deepEqual(worker.fetched, [missing]);
  assert.ok(worker.put.some(entry => entry.name === worker.cacheName && entry.url === missing));
  assert.equal(await (await worker.request(missing)).text(), 'network');
  assert.deepEqual(worker.fetched, [missing], 'the next request must reuse the trainer cache');
  assert.ok(worker.matched.every(entry => entry.name === worker.cacheName));
});

test('trainer service worker does not permanently cache missing assets or network errors', async () => {
  const worker = workerFixture({ responseStatus: 404 });
  const missing = `${baseUrl}missing-module.js`;
  assert.equal((await worker.request(missing)).status, 404);
  assert.equal((await worker.request(missing)).status, 404);
  assert.deepEqual(worker.fetched, [missing, missing]);
  assert.deepEqual(worker.put, []);
});
