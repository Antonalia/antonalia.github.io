'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const runtime = path.resolve(__dirname, '../source/valotrainer/js');
const moduleUrl = name => pathToFileURL(path.join(runtime, name)).href;
const languageKey = 'lele:valotrainer:language:v1';
let importNumber = 0;

// Every test loads an independent language instance. Only browser globals are
// stubbed; the actual runtime dictionaries, weapon data and codec are imported.
async function fixture(context, { saved = null, denied = false, document } = {}) {
  const descriptors = ['localStorage', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const values = new Map(saved === null ? [] : [[languageKey, saved]]);
  const writes = [];
  const storage = {
    getItem(key) {
      if (denied) throw new Error('Storage denied');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (denied) throw new Error('Storage denied');
      writes.push([key, value]);
      values.set(key, String(value));
    }
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storage });
  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: document });
  context.after(() => {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const api = await import(`${moduleUrl('i18n.js')}?test-instance=${++importNumber}`);
  return { api, values, writes };
}

function markedElement(attributes) {
  const attrs = new Map(Object.entries(attributes));
  return {
    textContent: '',
    dataset: { language: attrs.get('data-language') },
    getAttribute(name) { return attrs.get(name) ?? null; },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    hasAttribute(name) { return attrs.has(name); }
  };
}

function markedDocument(elements) {
  return {
    documentElement: { lang: '' },
    querySelectorAll(selector) {
      const attribute = selector.match(/^\[([^\]]+)\]$/)?.[1];
      assert.ok(attribute, `unexpected localization selector: ${selector}`);
      return elements.filter(element => element.hasAttribute(attribute));
    }
  };
}

test('trainer language defaults to Chinese and restores a saved English choice', async context => {
  const { api, values } = await fixture(context);
  assert.equal(api.LANGUAGE_KEY, languageKey);
  assert.equal(api.getLanguage(), 'zh-CN');
  assert.equal(api.t('HEADSHOT'), '爆头');
  api.setLanguage('en');
  assert.equal(values.get(languageKey), 'en');
  const restored = await import(`${moduleUrl('i18n.js')}?test-instance=${++importNumber}`);
  assert.equal(restored.getLanguage(), 'en');
  assert.equal(restored.t('HEADSHOT'), 'HEADSHOT');
});

test('an unsupported saved language falls back to mainland Chinese', async context => {
  const { api } = await fixture(context, { saved: '{broken preference}' });
  assert.equal(api.getLanguage(), 'zh-CN');
  assert.equal(api.gunName('vandal'), '狂徒');
});

test('all twenty weapons use mainland names and preserve original game data', async context => {
  const { api } = await fixture(context);
  const { GUNS, GUN_CLASSES } = await import(moduleUrl('data/guns.js'));
  const before = structuredClone(GUNS);
  const chinese = {
    classic: '标配', shorty: '短炮', frenzy: '狂怒', ghost: '鬼魅',
    bandit: '追猎', sheriff: '正义', stinger: '蜂刺', spectre: '骇灵',
    bucky: '雄鹿', judge: '判官', bulldog: '獠犬', guardian: '戍卫',
    phantom: '幻影', vandal: '狂徒', marshal: '飞将', outlaw: '莽侠',
    operator: '冥驹', ares: '战神', odin: '奥丁', knife: '鬼丸国纲'
  };
  assert.equal(GUNS.length, 20);
  assert.deepEqual(api.WEAPON_ZH, chinese);
  for (const gun of GUNS) {
    assert.equal(api.gunName(gun), chinese[gun.id], gun.id);
    assert.equal(api.gunName(gun.id), chinese[gun.id], gun.id);
  }
  const classes = {
    Sidearm: '佩枪', SMG: '冲锋枪', Shotgun: '霰弹枪', Rifle: '步枪',
    Sniper: '狙击枪', Heavy: '机枪', Melee: '近战武器'
  };
  for (const cls of GUN_CLASSES) assert.equal(api.gunClass(cls), classes[cls]);
  assert.deepEqual(['none', 'light', 'heavy'].map(api.armorName), ['无护甲', '轻型护甲', '重型护甲']);
  api.setLanguage('en');
  for (const gun of GUNS) {
    assert.equal(api.gunName(gun), gun.name, gun.id);
    assert.equal(api.gunName(gun.id), gun.name, gun.id);
  }
  for (const cls of GUN_CLASSES) {
    assert.equal(api.gunClass(cls), cls);
    assert.equal(api.gunClass(cls, true), cls.toUpperCase());
  }
  assert.deepEqual(['none', 'light', 'heavy'].map(api.armorName), ['NO ARMOR', 'LIGHT SHIELD', 'HEAVY SHIELD']);
  assert.deepEqual(GUNS, before, 'translation must not alter IDs, names or mechanics');
});

test('named values are preserved in both languages including zero', async context => {
  const { api } = await fixture(context);
  const phrase = 'Session {count} — {remaining} more to unlock your improvement tracker.';
  const values = { count: 0, remaining: 2 };
  const translated = api.t(phrase, values);
  assert.match(translated, /已完成 0 次训练/);
  assert.match(translated, /2 次/);
  assert.doesNotMatch(translated, /\{(?:count|remaining)\}/);
  assert.equal(api.t('Untranslated {value}', { value: false }), 'Untranslated false');
  assert.equal(api.t('Untranslated {value}'), 'Untranslated {value}');
  api.setLanguage('en');
  assert.equal(api.t(phrase, values), 'Session 0 — 2 more to unlock your improvement tracker.');
  assert.deepEqual(values, { count: 0, remaining: 2 });
});

test('invalid language requests do not change or save the current choice', async context => {
  const { api, writes } = await fixture(context, { saved: 'en' });
  for (const invalid of ['zh', 'zh-TW', 'EN', 'fr', '', null, undefined, {}]) {
    assert.equal(api.setLanguage(invalid), false);
    assert.equal(api.getLanguage(), 'en');
  }
  assert.deepEqual(writes, []);
});

test('storage access failures still allow a live language switch', async context => {
  const { api } = await fixture(context, { denied: true });
  assert.equal(api.getLanguage(), 'zh-CN');
  assert.doesNotThrow(() => api.setLanguage('en'));
  assert.equal(api.getLanguage(), 'en');
  assert.equal(api.t('RELOADING'), 'RELOADING');
  assert.doesNotThrow(() => api.setLanguage('zh-CN'));
  assert.equal(api.t('RELOADING'), '换弹中');
});

test('language subscriptions notify once and stop after unsubscribe', async context => {
  const { api } = await fixture(context);
  const seen = [];
  const unsubscribe = api.onLanguageChange(language => seen.push([language, api.getLanguage()]));
  api.setLanguage('en');
  api.setLanguage('en');
  assert.deepEqual(seen, [['en', 'en']]);
  unsubscribe();
  api.setLanguage('zh-CN');
  assert.deepEqual(seen, [['en', 'en']]);
});

test('marked text and accessible attributes switch without losing English sources', async context => {
  const text = markedElement({ 'data-i18n': 'HEADSHOT' });
  const input = markedElement({ 'data-i18n-placeholder': 'Search…' });
  const title = markedElement({ 'data-i18n-title': 'EQUIPPING' });
  const label = markedElement({ 'data-i18n-aria-label': 'RELOADING' });
  const descriptionSource = 'VALORANT-accurate aim lab in the browser. 103° FOV, 1:1 sensitivity, full arsenal.';
  const description = markedElement({ 'data-i18n-content': descriptionSource });
  const chinese = markedElement({ 'data-language': 'zh-CN' });
  const english = markedElement({ 'data-language': 'en' });
  const document = markedDocument([text, input, title, label, description, chinese, english]);
  const { api } = await fixture(context, { document });
  api.applyTranslations(document);
  assert.equal(document.documentElement.lang, 'zh-CN');
  assert.equal(text.textContent, '爆头');
  assert.equal(input.getAttribute('placeholder'), '搜索…');
  assert.equal(title.getAttribute('title'), '装备中');
  assert.equal(label.getAttribute('aria-label'), '换弹中');
  assert.match(description.getAttribute('content'), /无畏契约.*103°.*灵敏度/);
  assert.equal(chinese.getAttribute('aria-pressed'), 'true');
  assert.equal(english.getAttribute('aria-pressed'), 'false');
  api.setLanguage('en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(text.textContent, 'HEADSHOT');
  assert.equal(input.getAttribute('placeholder'), 'Search…');
  assert.equal(title.getAttribute('title'), 'EQUIPPING');
  assert.equal(label.getAttribute('aria-label'), 'RELOADING');
  assert.equal(description.getAttribute('content'), descriptionSource);
  assert.equal(chinese.getAttribute('aria-pressed'), 'false');
  assert.equal(english.getAttribute('aria-pressed'), 'true');
  api.setLanguage('zh-CN');
  assert.equal(text.textContent, '爆头');
  assert.equal(text.getAttribute('data-i18n'), 'HEADSHOT');
  assert.equal(input.getAttribute('data-i18n-placeholder'), 'Search…');
});

test('profile warnings translate while codec parameters and profile segments stay intact', async context => {
  const { api } = await fixture(context);
  const { parseCode, buildCode } = await import(moduleUrl('core/crosshair.js'));
  const parsed = parseCode('0;s;1;P;c;8;u;GGGGGG;0l;999;0f;wat;future_key;原值-ABC;A;c;3;S;c;5');
  assert.equal(parsed.ok, true);
  const before = structuredClone(parsed);
  const exported = buildCode(parsed.settings, parsed.segments);
  assert.ok(parsed.unknown.includes('future_key'));
  assert.ok(parsed.unknown.includes('原值-ABC'));
  const warnings = parsed.warnings.map(api.codeMessage);
  assert.ok(warnings.every(message => /[\u4e00-\u9fff]/.test(message)));
  assert.ok(warnings.some(message => message.includes('future_key')));
  assert.ok(warnings.some(message => message.includes('wat')));
  assert.ok(warnings.some(message => message.includes('999') && message.includes('[0,20]')));
  assert.match(api.codeMessage("dangling token '0z' ignored"), /0z/);
  assert.match(api.codeMessage('empty code'), /档案代码为空/);
  assert.match(api.codeMessage('not a VALORANT profile code (must start with 0; and contain P;)'), /0;.*P;/);
  api.setLanguage('en');
  for (const warning of parsed.warnings) assert.equal(api.codeMessage(warning), warning);
  assert.equal(buildCode(parsed.settings, parsed.segments), exported);
  assert.deepEqual(parsed, before, 'message translation must preserve original warning data and token values');
  assert.equal(parsed.segments.A, 'c;3');
  assert.equal(parsed.segments.S, 'c;5');
});
