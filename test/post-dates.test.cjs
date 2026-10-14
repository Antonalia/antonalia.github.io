'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const Hexo = require('hexo');
const { resolvePostDates } = require('../lib/post-dates');

const rawPost = (date, updated) => `---\ntitle: Example\ndate: ${date}\n${updated ? `updated: ${updated}\n` : ''}---\nArticle\n`;

test('empty and invalid publication dates cannot silently use filesystem dates', () => {
  for (const date of ['', 'null', 'invalid', '2024-02-30 12:00:00']) {
    assert.throws(() => resolvePostDates(rawPost(date)), /date/);
  }
});

test('first publication, manual updates and Git edits preserve the original date', () => {
  const raw = rawPost('2024-09-02 21:52:00');
  const firstCommit = '2026-09-02T22:05:38+08:00';
  const laterCommit = '2026-09-28T00:04:16+08:00';
  const first = resolvePostDates(raw, [firstCommit]);
  assert.equal(first.date.format('YYYY-MM-DD HH:mm:ss'), '2024-09-02 21:52:00');
  assert.equal(first.updated.valueOf(), first.date.valueOf());
  const edited = resolvePostDates(raw, [laterCommit, firstCommit]);
  assert.equal(edited.date.valueOf(), first.date.valueOf());
  assert.equal(edited.updated.toISOString(), '2026-09-27T16:04:16.000Z');
  const manual = resolvePostDates(rawPost('2024-09-02', "'2026-10-01 12:00:00'"), [laterCommit, firstCommit]);
  assert.equal(manual.updated.toISOString(), '2026-10-01T04:00:00.000Z');
  const earlier = resolvePostDates(rawPost('2024-09-02', '2024-09-01'));
  assert.equal(earlier.updated.valueOf(), earlier.date.valueOf());
});

test('quoted, unquoted and offset dates are consistent in UTC and Shanghai environments', () => {
  const modulePath = path.resolve('lib/post-dates.js');
  const code = `const {resolvePostDates}=require(${JSON.stringify(modulePath)}); console.log(JSON.stringify([
    "2024-09-02 21:52:00.993", "'2024-09-02 21:52:00.993'", "'2024-09-02T21:52:00.993+08:00'"
  ].map(date=>resolvePostDates('---\\ndate: '+date+'\\nupdated: 2026-10-01 12:00:00\\n---\\n').date.toISOString())));`;
  const results = ['UTC', 'Asia/Shanghai'].map(TZ => JSON.parse(execFileSync(process.execPath, ['-e', code], {
    env: { ...process.env, TZ }, encoding: 'utf8', windowsHide: true
  })));
  assert.deepEqual(results[0], Array(3).fill('2024-09-02T13:52:00.993Z'));
  assert.deepEqual(results[1], results[0]);
});

test('every published article has a stable explicit publication date', () => {
  for (const file of fs.readdirSync('source/_posts').filter(file => file.endsWith('.md'))) {
    assert.doesNotThrow(() => resolvePostDates(fs.readFileSync(path.join('source/_posts', file), 'utf8')), file);
  }
});

test('cached Hexo posts use article Git history, unaffected by mtime or unrelated commits', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hexo-post-dates-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true });
  const commit = (message, date) => execFileSync('git', ['-c', 'user.name=Date Test', '-c', 'user.email=date-test@example.invalid', 'commit', '-m', message], {
    cwd: dir, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
  });
  try {
    fs.mkdirSync(path.join(dir, 'source/_posts'), { recursive: true });
    fs.writeFileSync(path.join(dir, '_config.yml'), 'timezone: Asia/Shanghai\nupdated_option: date\n');
    const filename = path.join(dir, 'source/_posts/example.md');
    const raw = rawPost('2024-09-02 21:52:00');
    fs.writeFileSync(filename, raw);
    git('init');
    git('add', '.');
    commit('Publish', '2024-09-02T22:00:00+08:00');

    const hexo = new Hexo(dir, { silent: true });
    await hexo.init();
    const scriptPath = path.resolve('scripts/post-dates.js');
    let filter;
    vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), {
      hexo: { extend: { filter: { register(type, callback, priority) {
        assert.equal(type, 'before_generate');
        assert.equal(priority, 5);
        filter = callback;
      } } } }, require: createRequire(scriptPath)
    });
    await hexo.model('Post').insert({ source: '_posts/example.md', slug: 'example', published: true, raw,
      date: new Date('2030-01-01'), updated: new Date('2030-01-02') });
    const dates = () => {
      const post = hexo.model('Post').findOne({ slug: 'example' });
      return [post.date.toISOString(), post.updated.toISOString()];
    };
    await filter.call(hexo);
    const initial = ['2024-09-02T13:52:00.000Z', '2024-09-02T13:52:00.000Z'];
    assert.deepEqual(dates(), initial);

    fs.utimesSync(filename, new Date('2031-01-01'), new Date('2031-01-01'));
    fs.writeFileSync(path.join(dir, 'other.txt'), 'unrelated');
    git('add', 'other.txt');
    commit('Other file', '2026-09-27T12:00:00+08:00');
    await filter.call(hexo);
    assert.deepEqual(dates(), initial);

    fs.appendFileSync(filename, '\nEdit\n');
    git('add', 'source/_posts/example.md');
    commit('Edit article', '2026-09-28T00:04:16+08:00');
    await filter.call(hexo);
    assert.deepEqual(dates(), [initial[0], '2026-09-27T16:04:16.000Z']);
    await filter.call(hexo);
    assert.deepEqual(dates(), [initial[0], '2026-09-27T16:04:16.000Z']);
    await hexo.exit();
  } finally {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert(path.basename(dir).startsWith('hexo-post-dates-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
