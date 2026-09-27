/* global hexo */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const { groups, get, set, validate } = require('../lib/effects-schema');
const configPath = path.join(hexo.base_dir, 'source/_data/fluid_config.yml');
const assetDir = path.join(hexo.base_dir, 'assets/effects-admin');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const token = crypto.randomBytes(32).toString('hex');
let busy = false;

hexo.extend.filter.register('server_middleware', app => {
  app.use((req, res, next) => {
    const pathname = req.url.split('?')[0];
    if (!pathname.startsWith('/effects-admin')) return next();
    const remote = req.socket.remoteAddress;
    const host = req.headers.host || '';
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote);
    const validHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    };
    if (!local || !validHost) return reply(403, { error: '特效管理仅允许本机访问。' });
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return reply(403, { error: '不允许跨站请求。' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return reply(403, { error: '不允许跨站请求。' });
    if (pathname === '/effects-admin/api') {
      if (req.method === 'GET') {
        try {
          const raw = fs.readFileSync(configPath, 'utf8');
          return reply(200, { config: yaml.load(raw), revision: hash(raw), token, groups });
        } catch (error) { return reply(500, { error: error.message }); }
      }
      if (req.method !== 'POST') return reply(405, { error: '不支持此方法。' });
      if (req.headers['x-effects-token'] !== token || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(403, { error: '请刷新管理页面后重试。' });
      if (busy) return reply(409, { error: '正在生成页面，请稍后保存。' });
      let body = '', oversized = false;
      req.on('data', chunk => {
        if (oversized) return;
        body += chunk;
        if (Buffer.byteLength(body) > 65536) { oversized = true; reply(413, { error: '配置内容过大。' }); }
      });
      req.on('end', async () => {
        if (oversized) return;
        if (busy) return reply(409, { error: '正在保存，请稍后重试。' });
        let saved = false;
        try {
          const input = JSON.parse(body);
          const raw = fs.readFileSync(configPath, 'utf8');
          if (input.revision !== hash(raw)) return reply(409, { error: '配置已被其他窗口修改，请重新载入后再编辑。' });
          const config = yaml.load(raw);
          for (const field of groups.flatMap(g => g.fields)) {
            const value = get(input.config, field.path);
            validate(field, value);
            set(config, field.path, value);
          }
          busy = true;
          const output = '# 由本地特效管理页面维护；Fluid 官方数据覆盖配置。\n' + yaml.dump(config, { lineWidth: 110, noRefs: true });
          const backup = path.join(hexo.base_dir, 'data/effects-backup.yml');
          fs.mkdirSync(path.dirname(backup), { recursive: true });
          fs.writeFileSync(backup, raw, 'utf8');
          fs.writeFileSync(configPath + '.tmp', output, 'utf8');
          fs.renameSync(configPath + '.tmp', configPath);
          saved = true;
          await hexo.call('generate');
          reply(200, { revision: hash(output), message: '配置已保存并重新生成。本地刷新即可查看；发布到线上请运行 publish-github.bat。' });
        } catch (error) {
          reply(saved ? 500 : 400, { saved, error: saved ? `配置已保存，但生成失败：${error.message}。修复后运行 npm run build。` : error.message });
        } finally { busy = false; }
      });
      return;
    }
    const files = { '/effects-admin': 'index.html', '/effects-admin/': 'index.html', '/effects-admin/app.js': 'app.js', '/effects-admin/style.css': 'style.css' };
    const file = files[pathname];
    if (!file) return reply(404, { error: '页面不存在。' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, { error: '不支持此方法。' });
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(path.join(assetDir, file)).pipe(res);
  });
}, 1);
