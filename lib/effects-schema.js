'use strict';

// Shared by the local editor, API validation and documentation checks.
const groups = [];
function group(title, prefix, fields) {
  groups.push({ title, fields: fields.map(([key, label, type, min, max]) => ({ path: `${prefix}.${key}`, label, type, min, max })) });
}
group('头像旋转与呼吸光', 'effects.avatar', [
  ['enable', '启用头像特效', 'boolean'], ['seconds', '旋转时长（秒）', 'number', .1, 20],
  ['degrees', '旋转角度', 'number', -1440, 1440], ['glow', '启用呼吸光', 'boolean'],
  ['glowSeconds', '呼吸周期（秒）', 'number', .5, 30], ['color', '光晕颜色', 'color']
]);
group('点击浮动文字', 'effects.click', [
  ['enable', '启用点击文字', 'boolean'], ['texts', '轮播文字（每行一句）', 'lines'],
  ['duration', '动画时长（毫秒）', 'number', 200, 10000], ['distance', '上浮距离（像素）', 'number', 10, 400],
  ['size', '字号（像素）', 'number', 10, 48], ['randomColor', '随机颜色', 'boolean'], ['color', '固定颜色', 'color']
]);
group('日期与运行时长', 'effects.runtime', [
  ['enable', '显示日期计数', 'boolean'], ['start', '起始时间（ISO 格式，含时区）', 'date'],
  ['prefix', '计数前缀', 'text'], ['suffix', '计数后缀', 'text']
]);
group('动态雪花', 'effects.snow', [
  ['enable', '启用雪花', 'boolean'], ['count', '雪花数量', 'integer', 1, 200],
  ['size', '最大半径（像素）', 'number', 1, 20], ['speed', '下落速度（像素/秒）', 'number', 1, 150],
  ['wind', '横向风速（负数向左）', 'number', -100, 100], ['color', '雪花颜色', 'color'],
  ['opacity', '不透明度', 'number', .05, 1], ['mobile', '手机也启用', 'boolean']
]);
group('动态线条（默认关闭）', 'effects.lines', [
  ['enable', '启用线条', 'boolean'], ['count', '粒子数量', 'integer', 2, 120],
  ['distance', '连线距离（像素）', 'number', 20, 240], ['width', '线宽（像素）', 'number', .1, 5],
  ['speed', '移动速度（像素/秒）', 'number', 1, 80], ['color', '线条颜色', 'color'],
  ['opacity', '不透明度', 'number', .05, 1], ['mobile', '手机也启用', 'boolean']
]);
group('滚动条', 'effects.scrollbar', [
  ['enable', '启用自定义滚动条', 'boolean'], ['width', '宽度（像素）', 'integer', 4, 20], ['color', '滑块颜色', 'color']
]);
group('鼠标指针', 'effects.cursor', [
  ['enable', '启用自定义指针', 'boolean'], ['normal', '普通指针资源路径', 'asset'],
  ['text', '文本指针资源路径', 'asset'], ['copy', '复制指针资源路径', 'asset']
]);
group('离开标题与跑马灯', 'fun_features.monitortext', [
  ['enable', '启用标题特效', 'boolean'], ['text', '离开页面时的文字', 'text'],
  ['marquee.enable', '启用标题跑马灯', 'boolean'], ['marquee.interval', '移动间隔（毫秒）', 'integer', 50, 10000],
  ['marquee.separator', '首尾分隔符', 'text']
]);
group('打字机', 'fun_features.typing', [
  ['enable', '启用打字机', 'boolean'], ['typeSpeed', '每字间隔（毫秒）', 'integer', 1, 500],
  ['cursorChar', '游标字符', 'text'], ['loop', '循环播放', 'boolean']
]);
group('页面加载进度条', 'fun_features.progressbar', [
  ['enable', '启用进度条', 'boolean'], ['height_px', '高度（像素）', 'integer', 1, 10], ['color', '颜色', 'color']
]);
group('互动彩蛋', 'fun_features.easter_eggs', [
  ['enable', '彩蛋总开关', 'boolean'], ['quip_enable', '显示吐槽挂件', 'boolean'],
  ['quip_interval', '吐槽切换间隔（秒）', 'integer', 10, 3600], ['quips', '吐槽文案（每行一句）', 'lines'],
  ['copy_enable', '启用复制成功提示', 'boolean'], ['copy_text', '复制成功文案', 'text'],
  ['idle_enable', '启用闲置提醒与返回提示', 'boolean'], ['idle_seconds', '闲置多久触发（秒）', 'integer', 10, 3600],
  ['idle_interval', '重复提醒间隔（秒）', 'integer', 8, 3600], ['idle_messages', '闲置文案（每行一句）', 'lines'],
  ['visitor_enable', '显示访客称号', 'boolean'], ['visit_titles', '称号等级（JSON 数组，min 为次数）', 'levels']
]);
group('背景与导航', 'banner', [['parallax', '启用头图视差', 'boolean']]);
group('导航毛玻璃', 'navbar.ground_glass', [
  ['enable', '启用毛玻璃', 'boolean'], ['px', '模糊半径（像素）', 'integer', 0, 30], ['alpha', '不透明度', 'number', 0, 1]
]);
const get = (obj, path) => path.split('.').reduce((v, k) => v == null ? undefined : v[k], obj);
function set(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  keys.slice(0, -1).forEach(k => { target = target[k] || (target[k] = {}); });
  target[keys[keys.length - 1]] = value;
}
function validate(field, value) {
  const fail = () => { throw new Error(`参数无效：${field.label}`); };
  if (field.type === 'boolean') { if (typeof value !== 'boolean') fail(); }
  else if (['number', 'integer'].includes(field.type)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max || (field.type === 'integer' && !Number.isInteger(value))) fail();
  } else if (field.type === 'lines') {
    if (!Array.isArray(value) || !value.length || value.length > 100 || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 300)) fail();
  } else if (field.type === 'levels') {
    if (!Array.isArray(value) || !value.length || value.length > 50) fail();
    value.forEach((v, i) => {
      if (!v || !Number.isInteger(v.min) || v.min < 1 || (i && v.min <= value[i-1].min) || typeof v.title !== 'string' || !v.title.trim() || v.title.length > 80 || Object.keys(v).some(k => !['min', 'title'].includes(k))) fail();
    });
  } else {
    if (typeof value !== 'string' || value.length > 500) fail();
    if (field.type === 'color' && !/^#[0-9a-f]{6}$/i.test(value)) fail();
    if (field.type === 'asset' && !/^\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(cur|png)$/i.test(value)) fail();
    if (field.type === 'date') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:Z|[+-]\d{2}:\d{2})$/);
      if (!match || !Number.isFinite(Date.parse(value))) fail();
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) fail();
    }
  }
}
module.exports = { groups, get, set, validate };
