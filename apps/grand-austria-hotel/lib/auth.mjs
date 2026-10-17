import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const token = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) throw Object.assign(new Error('访问密码需要 12–200 个字符'), { status: 400 });
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 200 || !encoded) return false;
  const [algorithm, salt, expected] = encoded.split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(expected || '')) return false;
  return timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(expected, 'hex'));
}
export class RateLimiter {
  constructor({ disabled = false } = {}) { this.buckets = new Map(); this.disabled = disabled; }
  take(key, limit, windowMs = 60000) {
    if (this.disabled) return true;
    const now = Date.now(); let b = this.buckets.get(key);
    if (!b || b.reset < now) { b = { used: 0, reset: now + windowMs }; this.buckets.set(key, b); }
    if (this.buckets.size > 10000) { for (const [k, v] of this.buckets) if (v.reset < now) this.buckets.delete(k); if (this.buckets.size > 10000) this.buckets.delete(this.buckets.keys().next().value); }
    return ++b.used <= limit;
  }
}
