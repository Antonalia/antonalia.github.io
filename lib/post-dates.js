'use strict';

const frontMatter = require('hexo-front-matter');
const { createRequire } = require('node:module');
// A schema must come from the same YAML version as the front-matter parser.
const yaml = createRequire(require.resolve('hexo-front-matter'))('js-yaml');
const moment = require('moment-timezone');

const formats = [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss.SSS', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD'];

function parseDate(value, timezone, field) {
  const date = typeof value === 'string' && value.trim()
    ? moment.tz(value, formats, true, timezone)
    : null;
  if (!date || !date.isValid()) {
    throw new Error(`文章 ${field} 必须填写有效日期（例如 2024-09-02 21:52:00）。首次发布时间 date 不能留空。`);
  }
  return date;
}

function resolvePostDates(raw, gitDates = [], timezone = 'Asia/Shanghai') {
  // Keep YAML timestamps as strings so the machine timezone cannot change them.
  const metadata = frontMatter.parse(raw.replace(/\r\n/g, '\n'), { schema: yaml.CORE_SCHEMA });
  const date = parseDate(metadata.date, timezone, 'date');
  const candidates = [date];
  if (metadata.updated != null && metadata.updated !== '') {
    candidates.push(parseDate(metadata.updated, timezone, 'updated'));
  }
  // An initial import/commit alone does not mean the article was updated.
  if (gitDates.length > 1 && gitDates[0] !== gitDates[gitDates.length - 1]) {
    candidates.push(parseDate(gitDates[0], timezone, 'Git 更新时间'));
  }
  return { date, updated: moment.max(candidates).clone() };
}

module.exports = { resolvePostDates };
