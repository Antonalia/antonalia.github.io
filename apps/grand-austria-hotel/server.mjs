import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { createApi } from './lib/api.mjs';
import { LocalStore, NeonStore } from './lib/store.mjs';
import { createHttpServer } from './lib/http.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
try { process.loadEnvFile(resolve(root, '.env')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const store = process.env.GAME_DATABASE_URL ? new NeonStore(process.env.GAME_DATABASE_URL) : new LocalStore(resolve(root, '.private', 'local-state.json'));
const handler = createApi({ store, passwordHash: process.env.GAME_PASSWORD_HASH, allowLocalSetup: !process.env.GAME_DATABASE_URL,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean) });
const server = createHttpServer(handler);
const port = Number(process.env.PORT || 4173), host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  console.log(`Grand Austria Hotel · http://localhost:${port}`);
  if (host === '0.0.0.0') for (const addresses of Object.values(networkInterfaces())) for (const a of addresses || []) if (a.family === 'IPv4' && !a.internal) console.log(`LAN · http://${a.address}:${port}`);
  console.log('首次使用请在本机页面设置访问密码。数据保存在本项目 .private/，不对外发布。');
});
