'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const yaml = require('js-yaml');
const ejs = require('ejs');
const { groups, get, validate } = require('../lib/effects-schema');
const config = yaml.load(fs.readFileSync('source/_data/fluid_config.yml', 'utf8'));
const fields = groups.flatMap(g => g.fields);
const field = path => fields.find(f => f.path === path);

test('every managed setting has a valid persisted value', () => {
  for (const f of fields) assert.doesNotThrow(() => validate(f, get(config, f.path)), f.path);
});
test('particle count rejects fractions, excessive counts, strings and NaN', () => {
  for (const value of [0, 201, 1.5, '90', NaN, null]) assert.throws(() => validate(field('effects.snow.count'), value));
  validate(field('effects.snow.count'), 90);
});
test('date input requires explicit timezone and valid parse', () => {
  for (const value of ['2019-06-09', '2019-06-09T00:00:00', 'invalid', '2026-13-01T00:00:00Z', '2026-02-30T00:00:00Z', '2026-01-01T24:00:00Z']) assert.throws(() => validate(field('effects.runtime.start'), value));
  validate(field('effects.runtime.start'), '2019-06-09T00:00:00+08:00');
});
test('cursor assets reject external URLs, CSS injection and traversal', () => {
  for (const value of ['https://example.org/a.cur', '//example.org/a.cur', '/../../a.cur', '/a.cur");color:red', 'C:/a.cur']) assert.throws(() => validate(field('effects.cursor.normal'), value));
});
test('visit tiers reject unsorted thresholds and invalid titles', () => {
  for (const value of [[], [{min:2,title:'a'},{min:1,title:'b'}], [{min:1,title:''}], [{min:0,title:'a'}]]) assert.throws(() => validate(field('fun_features.easter_eggs.visit_titles'), value));
});
test('embedded JSON remains text even when a message contains an HTML script terminator', () => {
  const value = structuredClone(config.effects);
  value.click.texts = ['</script><script>alert(1)</script>'];
  const html = ejs.render(fs.readFileSync('themes/fluid/layout/_partials/effects.ejs','utf8'), {theme:{effects:value},url_for:s=>s});
  const json = html.match(/type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert(!json.includes('<'));
  assert.deepEqual(JSON.parse(json).click.texts, value.click.texts);
});
test('runtime catches up to wall clock after suspended timers and clamps future dates', () => {
  const start = Date.parse('2020-01-01T00:00:00Z'); let now = start;
  const data = {runtime:{enable:true,start:'2020-01-01T00:00:00Z',prefix:'Days',suffix:'end'}};
  const nodes = {'blog-effects-config':{textContent:JSON.stringify(data)},timeDate:{},times:{}};
  const intervals = [];
  const document = {documentElement:{classList:{toggle(){}},style:{setProperty(){}}},getElementById:id=>nodes[id],addEventListener(){}};
  class Clock extends Date { static now() { return now; } }
  const window = {matchMedia:()=>({matches:false}),setInterval:fn=>intervals.push(fn)};
  vm.runInNewContext(fs.readFileSync('source/js/blog-effects.js','utf8'), {document,window,Date:Clock,location:{hostname:'example.org'}});
  now = start + (3*86400+2*3600+4*60+59)*1000;
  intervals[0](); assert.equal(nodes.timeDate.textContent,'Days 3 d '); assert.equal(nodes.times.textContent,'02 h 04 m 59 s end');
  now = start - 1000; intervals[0](); assert.equal(nodes.times.textContent,'00 h 00 m 00 s end');
});
