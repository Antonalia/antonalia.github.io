/* global hexo */
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { resolvePostDates } = require('../lib/post-dates');

hexo.extend.filter.register('before_generate', async function() {
  let warned = false;
  for (const post of this.model('Post').toArray()) {
    if (!post.published) continue;
    const source = path.relative(this.base_dir, post.full_source).split(path.sep).join('/');
    let gitDates = [];
    try {
      gitDates = execFileSync('git', ['log', '--follow', '--format=%cI', '--', source], {
        cwd: this.base_dir,
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      }).trim().split(/\r?\n/).filter(Boolean);
    } catch (error) {
      if (!warned) {
        this.log.warn('无法读取 Git 文章更新时间，使用文章 date / updated：%s', error.message);
        warned = true;
      }
    }
    try {
      // Recompute from raw metadata on every build, including cached posts.
      const dates = resolvePostDates(post.raw, gitDates, this.config.timezone || 'Asia/Shanghai');
      await post.update({ date: dates.date.toDate(), updated: dates.updated.toDate() });
    } catch (error) {
      throw new Error(`${source}: ${error.message}`);
    }
  }
}, 5);
