(() => {
  'use strict';
  const form = document.querySelector('#form'), status = document.querySelector('#status'), save = document.querySelector('#save');
  let state, dirty = false;
  const get = (obj, path) => path.split('.').reduce((v, k) => v == null ? undefined : v[k], obj);
  function set(obj, path, value) { const keys = path.split('.'); let target = obj; keys.slice(0,-1).forEach(k => { target = target[k] || (target[k] = {}); }); target[keys.at(-1)] = value; }
  function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
  async function load() {
    save.disabled = true;
    try {
      const response = await fetch('/effects-admin/api');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      state = data;
      document.querySelector('#groups').replaceChildren(); document.querySelector('#nav').replaceChildren();
      data.groups.forEach((group, index) => {
        const section = document.createElement('section'); section.id = `group-${index}`;
        const heading = document.createElement('h2'), number = document.createElement('span');
        number.textContent = String(index + 1).padStart(2, '0'); heading.append(number, group.title);
        const link = document.createElement('a'); link.href = `#${section.id}`; link.textContent = group.title; document.querySelector('#nav').append(link);
        const grid = document.createElement('div'); grid.className = 'fields';
        group.fields.forEach(field => {
          const label = document.createElement('label'); label.htmlFor = field.path;
          const value = get(data.config, field.path);
          const multiline = ['lines', 'levels'].includes(field.type);
          const input = document.createElement(multiline ? 'textarea' : 'input'); input.id = field.path; input.name = field.path;
          if (multiline) { label.className = 'wide'; input.value = field.type === 'lines' ? value.join('\n') : JSON.stringify(value, null, 2); }
          else if (field.type === 'boolean') { input.type = 'checkbox'; input.checked = value; label.className = 'toggle'; }
          else { input.type = field.type === 'color' ? 'color' : ['number','integer'].includes(field.type) ? 'number' : 'text'; input.value = value; if (field.min !== undefined) { input.min = field.min; input.max = field.max; input.step = field.type === 'integer' ? '1' : 'any'; } }
          if (input.type !== 'checkbox') label.append(field.label);
          label.append(input);
          if (input.type === 'checkbox') label.append(field.label);
          grid.append(label);
        });
        section.append(heading, grid); document.querySelector('#groups').append(section);
      });
      dirty = false; save.disabled = false; message('已读取项目配置 · 尚未修改');
    } catch (error) { message(`读取失败：${error.message}`, true); }
  }
  form.addEventListener('input', () => { dirty = true; message('有未保存的修改'); });
  document.querySelector('#reload').addEventListener('click', () => { if (!dirty || confirm('放弃未保存的修改并重新载入？')) load(); });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!state || !form.reportValidity()) return;
    save.disabled = true; document.querySelector('#reload').disabled = true; message('正在保存并生成，请稍候…');
    try {
      const config = structuredClone(state.config);
      for (const field of state.groups.flatMap(g => g.fields)) {
        const input = document.getElementById(field.path);
        let value = input.value;
        if (field.type === 'boolean') value = input.checked;
        if (['number','integer'].includes(field.type)) value = input.value === '' ? null : Number(value);
        if (field.type === 'lines') value = value.split('\n').map(s => s.trim()).filter(Boolean);
        if (field.type === 'levels') { try { value = JSON.parse(value); } catch { throw new Error('称号等级必须是有效的 JSON 数组。'); } }
        set(config, field.path, value);
      }
      const response = await fetch('/effects-admin/api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Effects-Token': state.token }, body: JSON.stringify({ config, revision: state.revision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      state.config = config; state.revision = result.revision; dirty = false; message(result.message);
    } catch (error) { message(error.message, true); }
    finally { save.disabled = false; document.querySelector('#reload').disabled = false; }
  });
  load();
})();
