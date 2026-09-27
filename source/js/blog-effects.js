(() => {
  'use strict';
  const node = document.getElementById('blog-effects-config');
  if (!node) return;
  const config = JSON.parse(node.textContent), root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    const footer = document.querySelector('.footer-inner');
    if (footer) { const link = document.createElement('a'); link.href = '/effects-admin/'; link.textContent = '特效管理（本地）'; link.style.display = 'block'; footer.append(link); }
  }
  const css = (key, value) => root.style.setProperty(key, value);
  const avatar = config.avatar || {};
  root.classList.toggle('effects-avatar', !!avatar.enable);
  root.classList.toggle('effects-avatar-glow', !!avatar.enable && !!avatar.glow);
  css('--avatar-seconds', `${avatar.seconds}s`); css('--avatar-degrees', `${avatar.degrees}deg`);
  css('--avatar-glow-seconds', `${avatar.glowSeconds}s`); css('--avatar-color', avatar.color);
  const scrollbar = config.scrollbar || {};
  root.classList.toggle('effects-scrollbar', !!scrollbar.enable);
  css('--scrollbar-width', `${scrollbar.width}px`); css('--scrollbar-color', scrollbar.color);
  const cursor = config.cursor || {};
  root.classList.toggle('effects-cursor', !!cursor.enable);
  ['normal', 'text', 'copy'].forEach(key => { if (typeof cursor[key] === 'string' && /^\/[a-z0-9_./-]+$/i.test(cursor[key])) css(`--cursor-${key}`, `url("${cursor[key]}")`); });

  const runtime = config.runtime || {}, date = document.getElementById('timeDate'), time = document.getElementById('times');
  if (date && time) {
    if (!runtime.enable) { date.hidden = true; time.hidden = true; }
    else {
      const start = Date.parse(runtime.start);
      const update = () => {
        if (!Number.isFinite(start)) { date.textContent = '请检查日期配置'; time.textContent = ''; return; }
        const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
        const pad = n => String(n).padStart(2, '0');
        date.textContent = `${runtime.prefix} ${Math.floor(seconds / 86400)} d `;
        time.textContent = `${pad(Math.floor(seconds / 3600) % 24)} h ${pad(Math.floor(seconds / 60) % 60)} m ${pad(seconds % 60)} s ${runtime.suffix}`;
      };
      update(); window.setInterval(update, 1000); document.addEventListener('visibilitychange', update);
    }
  }
  const click = config.click || {}; let textIndex = 0;
  if (click.enable && Array.isArray(click.texts) && click.texts.length) {
    document.addEventListener('click', event => {
      if (reduced.matches || event.target.closest('a,button,input,textarea,select,[contenteditable],#waline') || document.querySelectorAll('.blog-click-text').length >= 20) return;
      const span = document.createElement('span'); span.className = 'blog-click-text'; span.setAttribute('aria-hidden', 'true');
      span.textContent = click.texts[textIndex++ % click.texts.length];
      Object.assign(span.style, { left: `${event.clientX}px`, top: `${event.clientY - 20}px`, fontSize: `${click.size}px`, color: click.randomColor ? `hsl(${Math.random() * 360} 75% 58%)` : click.color });
      document.body.append(span);
      const animation = span.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(-${click.distance}px)`, opacity: 0 }], { duration: click.duration, easing: 'ease-out' });
      animation.onfinish = () => span.remove();
    });
  }
  function particles(kind, options) {
    if (!options || !options.enable) return;
    const canvas = document.createElement('canvas'); canvas.id = `blog-${kind}`; canvas.className = 'blog-effects-canvas'; canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    document.body.append(canvas);
    let width = 0, height = 0, frame = 0, previous = 0, points = [];
    function resize() {
      width = window.innerWidth; height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = Array.from({ length: options.count }, () => ({ x: Math.random() * width, y: Math.random() * height, r: 1 + Math.random() * Math.max(0, (options.size || 2) - 1), vx: Math.random() - .5, vy: .5 + Math.random() * .5 }));
    }
    function draw(now) {
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now;
      ctx.clearRect(0, 0, width, height); ctx.fillStyle = options.color; ctx.strokeStyle = options.color; ctx.globalAlpha = options.opacity;
      points.forEach(p => {
        p.x = (p.x + (kind === 'snow' ? options.wind : p.vx * options.speed) * dt + width) % width;
        p.y = (p.y + p.vy * options.speed * dt + height) % height;
        if (kind === 'snow') {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          glow.addColorStop(0, options.color); glow.addColorStop(.45, options.color + '80'); glow.addColorStop(1, options.color + '00');
          ctx.fillStyle = glow;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, kind === 'snow' ? p.r : 1.4, 0, Math.PI * 2); ctx.fill();
      });
      if (kind === 'lines') {
        ctx.lineWidth = options.width;
        for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j], distance = Math.hypot(a.x-b.x, a.y-b.y);
          if (distance < options.distance) { ctx.globalAlpha = options.opacity * (1 - distance / options.distance); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
        }
      }
      frame = requestAnimationFrame(draw);
    }
    function sync() {
      cancelAnimationFrame(frame); previous = 0;
      const active = !document.hidden && !reduced.matches && (!mobile.matches || options.mobile);
      canvas.hidden = !active;
      if (active) frame = requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync); mobile.addEventListener('change', sync);
    resize(); sync();
  }
  particles('snow', config.snow); particles('lines', config.lines);
})();
