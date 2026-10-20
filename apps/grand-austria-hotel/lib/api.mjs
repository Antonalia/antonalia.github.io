import { newLobby, joinLobby, applyAction, viewGame,advanceTableTime } from './game.mjs';
import { token, digest, hashPassword, verifyPassword, RateLimiter } from './auth.mjs';
import { randomInt } from 'node:crypto';
import {ACTIVITY_KINDS,liveActivity} from './activity.mjs';

const TTL = 7 * 24 * 60 * 60 * 1000;
const invalid = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
function cleanName(name) { if (typeof name !== 'string' || !name.trim() || name.trim().length > 24 || /[\u0000-\u001f\u007f]/.test(name)) invalid('昵称需要 1–24 个普通字符'); return name.trim(); }
async function jsonBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) invalid('请求必须使用 JSON', 415);
  if(req.body!==undefined){
    if(Buffer.byteLength(typeof req.body==='string'?req.body:JSON.stringify(req.body))>32768)invalid('请求内容过大',413);
    try{const value=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!value||Array.isArray(value)||typeof value!=='object')invalid('请求内容无效');return value;}catch{invalid('JSON 格式无效');}
  }
  let size = 0, data = ''; for await (const chunk of req) { size += chunk.length; if (size > 32768) invalid('请求内容过大', 413); data += chunk; }
  try { const value = JSON.parse(data); if (!value || Array.isArray(value) || typeof value !== 'object') invalid('请求内容无效'); return value; } catch { invalid('JSON 格式无效'); }
}
export function createApi({ store, passwordHash, allowLocalSetup = false, allowedOrigins = [], trustedProxy = false, rateLimiter = new RateLimiter() }) {
  async function configuredHash() { return passwordHash || await store.setting('passwordHash'); }
  function publicRoom(room, id) { return { code: room.code, version: room.version, updatedAt: room.updatedAt, liveActivity:liveActivity(room), game: viewGame(room.game, id) }; }
  const roomIdentity = room => room.instanceId || String(room.createdAt);
  const publicSession = (rawToken, session) => ({ token: rawToken, player: { id: session.id, name: session.name }, expiresAt: session.expiresAt, access: session.access || 'admin' });
  async function settleClock(room){
    const identity=roomIdentity(room);
    for(let attempt=0;attempt<4;attempt++){
      const game=advanceTableTime(room.game);if(game===room.game)return room;
      const next={...room,game,version:room.version+1,updatedAt:Date.now(),expiresAt:Date.now()+TTL};
      if(await store.saveRoom(next,room.version))return next;
      room=await store.room(room.code);if(!room||roomIdentity(room)!==identity||room.expiresAt<=Date.now())invalid('房间不存在或已经过期',404);
    }
    invalid('对局正在更新，请重试',409);
  }
  async function joinRoom(room, session) {
    const identity = roomIdentity(room);
    for (let i = 0; i < 4; i++) {
      if (!room || room.expiresAt <= Date.now() || roomIdentity(room) !== identity) invalid('房间不存在或已经过期', 404);
      const next = { ...room, game: joinLobby(room.game, session), version: room.version + 1, updatedAt: Date.now(), expiresAt: Date.now() + TTL };
      if (await store.saveRoom(next, room.version)) return next;
      room = await store.room(room.code);
    }
    invalid('房间正在更新，请重试', 409);
  }
  return async function api(req, res) {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const origin = req.headers.origin;
    const requestHost = req.headers.host;
    const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(requestHost || '');
    const validOrigin = !origin || allowedOrigins.includes(origin) || (allowLocalSetup && origin === `http://${requestHost}`);
    if (!validOrigin) { res.statusCode = 403; res.end(JSON.stringify({ error: '来源不在允许列表中' })); return; }
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    const send = (status, value) => { res.statusCode = status; res.end(JSON.stringify(value)); };
    if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
    const ip = trustedProxy ? String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() : req.socket?.remoteAddress || 'local';
    try {
      if (!rateLimiter.take(`ip:${ip}`, 300)) invalid('请求过于频繁，请稍后再试', 429);
      const url = new URL(req.url, 'http://local'), path = url.pathname.replace(/\/$/, '');
      if (path === '/api/health' && req.method === 'GET') { send(200, { ok: true, configured: !!await configuredHash(), canSetup: allowLocalSetup && localHost && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress) }); return; }
      if (path === '/api/setup' && req.method === 'POST') {
        if (!allowLocalSetup || !localHost || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)) invalid('只能从本机 localhost 设置初始密码', 403);
        if (await configuredHash()) invalid('访问密码已经设置', 409);
        const { password } = await jsonBody(req), hash = await hashPassword(password);
        if (!await store.setInitialPassword(hash)) invalid('访问密码已经设置', 409);
        send(201, { ok: true }); return;
      }
      if (path === '/api/login' && req.method === 'POST') {
        if (!rateLimiter.take(`login:${ip}`, 8)) invalid('密码尝试过于频繁，请一分钟后重试', 429);
        const body = await jsonBody(req), name = cleanName(body.name);
        if (!await verifyPassword(body.password, await configuredHash())) invalid('管理员密码不正确，或尚未设置', 401);
        const rawToken = token(), session = { id: token(12), name, expiresAt: Date.now() + TTL, access: 'admin' };
        await store.createSession(digest(rawToken), session);
        send(200, publicSession(rawToken, session)); return;
      }
      if (path === '/api/room-login' && req.method === 'POST') {
        if (!rateLimiter.take(`login:${ip}`, 8)) invalid('入口尝试过于频繁，请一分钟后重试', 429);
        const body = await jsonBody(req), name = cleanName(body.name), code = String(body.code || '').trim();
        if (!/^\d{4}$/.test(code)) invalid('请输入四位数字房间码');
        let room = await store.room(code);
        if (!room || room.expiresAt <= Date.now()) invalid('房间码无效或已经过期', 401);
        const rawToken = token(), hash = digest(rawToken), session = { id: token(12), name, expiresAt: Date.now() + TTL, access: 'room', roomCode: code, roomId: roomIdentity(room) };
        await store.createSession(hash, session);
        try { room = await joinRoom(room, session); }
        catch (error) { await store.deleteSession(hash); throw error; }
        send(200, { ...publicSession(rawToken, session), room: publicRoom(room, session.id) }); return;
      }
      const rawToken = /^Bearer ([A-Za-z0-9_-]{40,100})$/.exec(req.headers.authorization || '')?.[1];
      const session = rawToken && await store.session(digest(rawToken));
      if (!session || session.expiresAt < Date.now()) invalid('请先输入访问密码登录', 401);
      if (!rateLimiter.take(`player:${session.id}`, 180)) invalid('操作过于频繁', 429);
      if (path === '/api/me' && req.method === 'GET') { send(200, { player: { id: session.id, name: session.name }, access: session.access || 'admin', roomCode: session.roomCode, rooms: (await store.rooms(session.id)).filter(room => session.access !== 'room' || room.code === session.roomCode) }); return; }
      if (path === '/api/logout' && req.method === 'POST') { await store.deleteSession(digest(rawToken)); send(200, { ok: true }); return; }
      if (path === '/api/rooms' && req.method === 'POST') {
        if (session.access === 'room') invalid('创建房间需要统一管理员密码', 403);
        if (!rateLimiter.take(`create:${session.id}`, 5, 3600000)) invalid('每小时最多创建五个房间', 429);
        const body = await jsonBody(req);
        if ((await store.rooms(session.id)).filter(x => x.phase !== 'finished').length >= 5) invalid('最多同时保留五个未完成房间');
        for (let i = 0; i < 8; i++) {
          const code = String(randomInt(1000, 10000));
          const room = { code, instanceId: token(12), version: 0, createdAt: Date.now(), updatedAt: Date.now(), expiresAt: Date.now() + TTL, requests: [], game: newLobby(session, body) };
          if (await store.createRoom(room)) { send(201, publicRoom(room, session.id)); return; }
        }
        invalid('创建房间失败，请重试', 503);
      }
      const match = /^\/api\/rooms\/(\d{4}|[A-Z2-9]{7})(?:\/(join|action|activity))?$/.exec(path);
      if (!match) invalid('接口不存在', 404);
      const code = match[1], operation = match[2];
      if (session.access === 'room' && session.roomCode !== code) invalid('房间码仅用于进入对应房间', 403);
      let room = await store.room(code); if (!room || room.expiresAt < Date.now()) invalid('房间不存在或已经过期', 404);
      if (session.access === 'room' && (session.roomId !== roomIdentity(room) || !room.game.players.some(p => p.id === session.id))) invalid('房间邀请已经失效，请重新输入房间码', 403);
      if (operation === 'join' && req.method === 'POST') {
        room = await joinRoom(room, session);
        send(200, publicRoom(room, session.id)); return;
      }
      if (!room.game.players.some(p => p.id === session.id)) invalid('你不是这个房间的成员', 403);
      if(operation==='activity'&&req.method==='POST'){
        if(!rateLimiter.take(`activity:${session.id}`,30))invalid('活动状态更新过于频繁',429);
        const body=await jsonBody(req),view=viewGame(room.game,session.id);
        if(body.version!==room.version)invalid('活动状态已过期',409);
        if(!Object.hasOwn(ACTIVITY_KINDS,body.kind)||Object.keys(body).some(k=>!['version','kind'].includes(k)))invalid('活动状态无效');
        if(view.activePlayerId!==session.id||room.game.players.find(p=>p.id===session.id).bot)invalid('只能更新自己的当前行动状态',403);
        const activity={playerId:session.id,kind:body.kind,version:room.version,expiresAt:Date.now()+12000};
        if(!await store.setActivity(code,roomIdentity(room),room.version,activity))invalid('活动状态已变化',409);
        send(200,{ok:true});return;
      }
      room=await settleClock(room);
      if (!operation && req.method === 'GET') {
        if (url.searchParams.get('since') === String(room.version)) send(200, { unchanged: true, version: room.version, liveActivity:liveActivity(room) }); else send(200, publicRoom(room, session.id)); return;
      }
      if (operation === 'action' && req.method === 'POST') {
        const body = await jsonBody(req);
        if (!/^[a-zA-Z0-9_-]{12,100}$/.test(body.requestId || '')) invalid('缺少有效的操作编号');
        const key = `${session.id}:${body.requestId}`;
        if (room.requests.includes(key)) { send(200, publicRoom(room, session.id)); return; }
        if (body.version !== room.version) invalid('其他玩家已经更新对局，请刷新后重试', 409);
        const game = applyAction(room.game, session.id, body.action);
        const next = { ...room, game, version: room.version + 1, requests: [...room.requests.slice(-127), key], updatedAt: Date.now(), expiresAt: Date.now() + TTL };
        if (!await store.saveRoom(next, room.version)) invalid('操作冲突，请刷新后重试', 409);
        send(200, publicRoom(next, session.id)); return;
      }
      invalid('请求方法不支持', 405);
    } catch (e) {
      // SQL errors/connection strings are never sent to clients or written to application logs.
      if (e.status) send(e.status, { error: e.message });
      else send(500, { error: '服务暂时不可用，请稍后重试' });
    }
  };
}
