import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

// Local storage never lives under public/. Mutations are serialized and replaced atomically.
export class LocalStore {
  constructor(path = null) { this.path = path; this.data = null; this.tail = Promise.resolve(); }
  async load() {
    if (this.data) return;
    try { this.data = JSON.parse(await readFile(this.path, 'utf8')); }
    catch (e) { if (this.path && e.code !== 'ENOENT') throw e; this.data = { settings: {}, sessions: {}, rooms: {} }; }
  }
  async mutate(fn) {
    const task = this.tail.then(async () => {
      await this.load(); const copy = structuredClone(this.data); const result = fn(copy);
      if (this.path) { await mkdir(dirname(this.path), { recursive: true }); await writeFile(`${this.path}.tmp`, JSON.stringify(copy), { mode: 0o600 }); await rename(`${this.path}.tmp`, this.path); }
      this.data = copy; return structuredClone(result);
    });
    this.tail = task.catch(() => {}); return task;
  }
  async setting(key) { await this.tail; await this.load(); return this.data.settings[key]; }
  async setInitialPassword(hash) { return this.mutate(d => { if (d.settings.passwordHash) return false; d.settings.passwordHash = hash; return true; }); }
  async session(hash) { await this.tail; await this.load(); return structuredClone(this.data.sessions[hash] || null); }
  async createSession(hash, session) { return this.mutate(d => { d.sessions[hash] = session; const now = Date.now(); for (const [key, value] of Object.entries(d.sessions)) if (value.expiresAt < now) delete d.sessions[key]; }); }
  async deleteSession(hash) { return this.mutate(d => { delete d.sessions[hash]; }); }
  async room(code) { await this.tail; await this.load(); return structuredClone(this.data.rooms[code] || null); }
  async rooms(playerId) { await this.tail; await this.load(); return Object.values(this.data.rooms).filter(r => r.expiresAt > Date.now() && r.game.players.some(p => p.id === playerId)).map(r => ({ code: r.code, name: r.game.name, phase: r.game.phase, players: r.game.players.length, updatedAt: r.updatedAt })); }
  async createRoom(room) { return this.mutate(d => { if (d.rooms[room.code]) return false; const now = Date.now(); for (const [key, value] of Object.entries(d.rooms)) if (value.expiresAt < now) delete d.rooms[key]; d.rooms[room.code] = room; return true; }); }
  async saveRoom(room, previousVersion) { return this.mutate(d => { if (d.rooms[room.code]?.version !== previousVersion) return false; d.rooms[room.code] = room; return true; }); }
}

export class NeonStore {
  constructor(url) { this.url = url; this.query = null; }
  async sql() { if (!this.query) { const { neon } = await import('@neondatabase/serverless'); this.query = neon(this.url); } return this.query; }
  async setting() { return undefined; }
  async setInitialPassword() { return false; }
  async session(hash) { const q = await this.sql(); const rows = await q`SELECT data FROM hotel.sessions WHERE token_hash=${hash} AND expires_at > now()`; return rows[0]?.data || null; }
  async createSession(hash, data) { const q = await this.sql(); await q`INSERT INTO hotel.sessions(token_hash, data, expires_at) VALUES(${hash},${JSON.stringify(data)}::jsonb,${new Date(data.expiresAt).toISOString()}::timestamptz)`; }
  async deleteSession(hash) { const q = await this.sql(); await q`DELETE FROM hotel.sessions WHERE token_hash=${hash}`; }
  async room(code) { const q = await this.sql(); const rows = await q`SELECT data FROM hotel.rooms WHERE code=${code} AND expires_at > now()`; return rows[0]?.data || null; }
  async rooms(playerId) {
    const q = await this.sql(); const rows = await q`SELECT code,data->'game'->>'name' AS name,data->'game'->>'phase' AS phase,jsonb_array_length(data->'game'->'players') AS players,data->>'updatedAt' AS "updatedAt" FROM hotel.rooms WHERE data->'game'->'players' @> ${JSON.stringify([{ id: playerId }])}::jsonb AND expires_at > now() ORDER BY updated_at DESC LIMIT 20`;
    return rows;
  }
  async createRoom(room) {
    const q = await this.sql(); const rows = await q`INSERT INTO hotel.rooms(code,data,version,updated_at,expires_at) VALUES(${room.code},${JSON.stringify(room)}::jsonb,${room.version},now(),${new Date(room.expiresAt).toISOString()}::timestamptz) ON CONFLICT DO NOTHING RETURNING code`; return rows.length > 0;
  }
  async saveRoom(room, previousVersion) {
    const q = await this.sql(); const rows = await q`UPDATE hotel.rooms SET data=${JSON.stringify(room)}::jsonb, version=${room.version}, updated_at=now(), expires_at=${new Date(room.expiresAt).toISOString()}::timestamptz WHERE code=${room.code} AND version=${previousVersion} RETURNING code`; return rows.length > 0;
  }
}
