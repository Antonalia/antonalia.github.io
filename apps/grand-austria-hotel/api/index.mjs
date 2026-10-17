import { createApi } from '../lib/api.mjs';
import { NeonStore } from '../lib/store.mjs';
let handler;
export default async function endpoint(req, res) {
  if (!process.env.GAME_DATABASE_URL || !process.env.GAME_PASSWORD_HASH || !process.env.ALLOWED_ORIGINS) { res.statusCode = 503; res.end(JSON.stringify({ error: '服务尚未配置' })); return; }
  handler ||= createApi({ store: new NeonStore(process.env.GAME_DATABASE_URL), passwordHash: process.env.GAME_PASSWORD_HASH,
    allowedOrigins: process.env.ALLOWED_ORIGINS.split(',').map(x => x.trim()), trustedProxy: true });
  return handler(req, res);
}
