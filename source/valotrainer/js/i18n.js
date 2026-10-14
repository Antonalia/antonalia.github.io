// UI-only localization. IDs, weapon data, saved training history and profile codes stay stable.
import { UI_ZH } from './ui/translations.js';

export const LANGUAGE_KEY = 'lele:valotrainer:language:v1';
const listeners = new Set();
let language = 'zh-CN';
try { if (globalThis.localStorage?.getItem(LANGUAGE_KEY) === 'en') language = 'en'; } catch (_) {}

const DYNAMIC_ZH = {
  'GRIDSHOT': '三球速射', 'FLICK SHOT': '甩枪训练', 'TRACKING': '跟枪训练', 'RANGE BOTS': '靶场机器人',
  'Three bots live at all times. Kill fast, keep the streak — pure speed & precision.': '同时保持三个目标。快速击破，保持连杀，练习速度与精准度。',
  'One target at a time, random position. 30 targets — true flick reaction time.': '每次随机出现一个目标，共 30 个目标，练习甩枪反应。',
  'A bot strafes, jukes, pauses and crouches like a duelist. Stay glued — time-on-target + consistency. Difficulty in Settings.': '机器人会横移、变向、停步和蹲伏。持续跟住目标，练习跟枪时长与稳定性，可在设置中调整难度。',
  'VALORANT Range, hard mode. Real per-gun damage: tap heads, manage your mag, R to reload.': '模拟无畏契约靶场的困难训练。按武器伤害计算命中，练习爆头与弹匣管理，按 R 换弹。',
  'POINTER LOCK BLOCKED — FALLBACK AIM. OPEN IN CHROME/EDGE FOR RAW INPUT': '鼠标锁定受限，已启用备用瞄准。使用 Chrome / Edge 可尝试原始鼠标输入。',
  'MOUSE NOT CAPTURED — CLICK ONCE TO AIM': '鼠标尚未锁定，单击以开始瞄准',
  'MAG': '弹匣', 'PWR': '头部伤害', 'RPM': '射速/秒', 'PEN': '穿透力',
  'EQUIPPED': '已装备', 'EQUIPPING': '装备中', 'RELOADING': '换弹中',
  'AUTO': '全自动', 'SEMI': '半自动', 'MELEE': '近战', 'SUPPRESSED': '消音',
  'Low': '低', 'Medium': '中', 'High': '高', 'low': '低', 'medium': '中', 'high': '高',
  'cr': '誉币', 'credits': '誉币', 'game data': '游戏数据', 'estimate': '估算值',
  'Damage H/B/L by range': '各距离伤害（头部/躯干/腿部）', 'Fire rate': '射速',
  'Mag / reload / equip': '弹匣容量 / 换弹时间 / 装备时间', '1st-shot spread': '首发散布',
  'Zoom / pen / silenced': '瞄准倍率 / 穿透力 / 消音', 'Move speed': '移动速度',
  'swings/s': '次挥砍/秒', 'ADS': '开镜', 'semi': '半自动', 'spools': '加速', 'yes': '是', 'no': '否',
  'HEADSHOT': '爆头', 'BACKSTAB': '背刺', 'YOU': '你', 'BOT': '机器人',
  'READY': '准备', 'GO': '开始', 'STANDBY': '待机', 'RUN': '跑步', 'WALK': '静步', 'CROUCH': '蹲伏', 'AIR': '腾空', 'BUILD': '版本',
  'K': '击杀', 'ACC': '命中率', 'ABYSS': '深海', 'm': '米',
  'kills': '击杀数', 'headshot %': '爆头率', 'accuracy': '命中率', 'damage': '伤害',
  'best streak': '最高连杀', 'time on target': '瞄准目标时长', 'consistency': '跟枪稳定性',
  'avg flick': '平均甩枪用时', 'k/s': '每秒击杀',
  'Session {count} — {remaining} more to unlock your improvement tracker.': '已完成 {count} 次训练，再完成 {remaining} 次即可解锁进步统计。',
  'Road to +50%: <b>{value}%</b> vs your baseline in this mode.': '目标提升 50%：本模式较基准成绩 <b>{value}%</b>。',
  'best {best} · {count} sessions': '最佳 {best} · {count} 次训练',
  'no sessions yet — click to start': '暂无训练记录，点击开始', '{count}/4 sessions': '{count}/4 次训练',
  'Search…': '搜索…', 'No matches': '无匹配结果',
  'Import failed: ': '导入失败：', 'Imported ✓ ': '已导入 ✓ ',
  '{count} note(s): {notes}': '{count} 条提示：{notes}',
  'extra tokens preserved': '已保留额外参数', 'ADS/scope profile kept': '已保留开镜/狙击镜准星设置',
  'Copied — paste into VALORANT Settings → Crosshair → Import Profile Code': '已复制，请粘贴至无畏契约：设置 → 准星 → 导入档案代码',
  'Reset all training history?': '确定重置全部训练记录吗？',
  'empty code': '档案代码为空',
  'not a VALORANT profile code (must start with 0; and contain P;)': '不是有效的无畏契约准星代码（须以 0; 开头且包含 P;）',
  "dangling token '{key}' ignored": '已忽略缺少值的参数「{key}」',
  "unknown token '{key}' preserved": '已保留未知参数「{key}」',
  "token '{key}' invalid ('{value}') — default used": '参数「{key}」的值「{value}」无效，已使用默认值',
  "token '{key}' clamped {value} -> [{min},{max}]": '参数「{key}」的值 {value} 已限制在 [{min},{max}] 内',
  'custom color missing/invalid — white used': '自定义颜色缺失或无效，已使用白色',
  'unlinked vertical inner length merged into length': '已将独立的内线垂直长度合并至统一长度',
  'unlinked vertical outer length merged into length': '已将独立的外线垂直长度合并至统一长度',
  'White': '白色', 'Green': '绿色', 'Yellow-Green': '黄绿色', 'Green-Yellow': '绿黄色',
  'Yellow': '黄色', 'Cyan': '青色', 'Pink': '粉色', 'Red': '红色', 'Custom': '自定义',
  'Protocol Hall': '训练大厅', 'Desert Range': '沙漠靶场', 'Arctic Outpost': '极地哨站',
  'Night Ops': '夜间基地', 'Sunset Courtyard': '落日庭院', 'Bamboo Garden': '竹林花园',
  'Lunar Base': '月球基地', 'Abyss Lab': '深海实验室', 'Sakura Court': '樱花庭院',
  'Clean VALORANT training hall.': '简洁的无畏契约风格训练大厅。',
  'Sun-bleached outdoor range.': '阳光下的户外沙漠靶场。', 'Snowfield under pale sun.': '冬日阳光下的雪原。',
  'Dark facility, lit trim.': '灯带照明的暗色基地。', 'Terracotta dusk, string lights.': '暖色暮光中的庭院与灯串。',
  'Walled green garden, lanterns.': '绿意环绕的围墙花园与灯笼。', 'Regolith, stars, Earthrise.': '月壤、星空与地球升起的景色。',
  'Pressurized deep-sea dome.': '深海中的加压穹顶。', 'Blossom courtyard, torii gate.': '樱花庭院与鸟居。',
};

export const WEAPON_ZH = Object.freeze({
  classic: '标配', shorty: '短炮', frenzy: '狂怒', ghost: '鬼魅', bandit: '追猎', sheriff: '正义',
  stinger: '蜂刺', spectre: '骇灵', bucky: '雄鹿', judge: '判官', bulldog: '獠犬', guardian: '戍卫',
  phantom: '幻影', vandal: '狂徒', marshal: '飞将', outlaw: '莽侠', operator: '冥驹',
  ares: '战神', odin: '奥丁', knife: '鬼丸国纲',
});
const GUN_DESC_ZH = {
  classic: '免费佩枪。右键瞬间发射 3 枚弹丸，射速 2.22 次/秒。',
  shorty: '每发 15 枚弹丸，超过 7 米后伤害大幅衰减。',
  frenzy: '经济局全自动佩枪，超过 20 米后更难控制。',
  ghost: '手枪局常用消音佩枪，可一枪爆头击杀无护甲目标。',
  bandit: '2026 年推出的精准佩枪，10 米内可一枪爆头击杀轻型护甲目标。',
  sheriff: '30 米内可一枪爆头击杀，穿透力高。',
  stinger: '每秒 16 发。开镜倍率 1.15 倍，四连发。',
  spectre: '半起局常用消音冲锋枪，开镜倍率 1.15 倍。',
  bucky: '每发 9 枚弹丸。右键发射 5 枚集中弹丸，适合中距离。',
  judge: '全自动霰弹枪，每发 12 枚弹丸，擅长近距离作战。',
  bulldog: '经济型步枪，开镜倍率 1.25 倍，三连发。',
  guardian: '半自动步枪，任意距离均可一枪爆头击杀，开镜倍率 1.5 倍。',
  phantom: '消音步枪，适合扫射，超过 20 米后伤害衰减。',
  vandal: '无伤害衰减，任意距离均可一枪爆头击杀。',
  marshal: '经济型狙击枪，3.5 倍狙击镜，开镜后精准射击。',
  outlaw: '双发狙击枪，躯干伤害 140，可击杀轻型护甲目标。',
  operator: '命中躯干可一枪击杀重型护甲目标，狙击镜倍率 2.5 倍/5 倍。',
  ares: '射速从每秒 10 发加速至 13 发，适合穿墙射击。',
  odin: '100 发弹匣，适合火力压制，射速可加速至每秒 15.6 发。',
  knife: '鬼丸国纲。左键挥砍伤害 50（0.49 秒连击），右键重击伤害 75（1.2 秒）。背刺伤害翻倍；按 Y 检视。',
};
const CLASS_ZH = { Sidearm: '佩枪', SMG: '冲锋枪', Shotgun: '霰弹枪', Rifle: '步枪', Sniper: '狙击枪', Heavy: '机枪', Melee: '近战武器' };
const ARMOR_ZH = { none: '无护甲', light: '轻型护甲', heavy: '重型护甲' };

export function getLanguage() { return language; }
export function t(source, values = {}) {
  const translated = Object.hasOwn(UI_ZH, source) ? UI_ZH[source] : Object.hasOwn(DYNAMIC_ZH, source) ? DYNAMIC_ZH[source] : source;
  const phrase = language === 'zh-CN' ? translated : source;
  return phrase.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
export function gunName(gun) {
  const id = typeof gun === 'string' ? gun : gun?.id;
  return language === 'zh-CN' ? (WEAPON_ZH[id] ?? gun?.name ?? id) : (gun?.name ?? (id === 'knife' ? 'ONI KATANA' : String(id).toUpperCase()));
}
export function gunDescription(gun) { return language === 'zh-CN' ? (GUN_DESC_ZH[gun.id] ?? gun.desc) : gun.desc; }
export function gunClass(cls, upper = false) { return language === 'zh-CN' ? (CLASS_ZH[cls] ?? cls) : (upper ? cls.toUpperCase() : cls); }
export function armorName(id) { return language === 'zh-CN' ? (ARMOR_ZH[id] ?? id) : ({ none: 'NO ARMOR', light: 'LIGHT SHIELD', heavy: 'HEAVY SHIELD' }[id] ?? id.toUpperCase()); }
export function codeMessage(source) {
  const rules = [
    [/^dangling token '([^']+)' ignored$/, "dangling token '{key}' ignored", ['key']],
    [/^unknown token '([^']+)' preserved$/, "unknown token '{key}' preserved", ['key']],
    [/^token '([^']+)' invalid \('([^']*)'\) — default used$/, "token '{key}' invalid ('{value}') — default used", ['key', 'value']],
    [/^token '([^']+)' clamped (.*?) -> \[(.*?),(.*?)\]$/, "token '{key}' clamped {value} -> [{min},{max}]", ['key', 'value', 'min', 'max']],
  ];
  for (const [pattern, phrase, names] of rules) {
    const match = source.match(pattern);
    if (match) return t(phrase, Object.fromEntries(names.map((name, i) => [name, match[i + 1]])));
  }
  return t(source);
}
export function applyTranslations(root = globalThis.document) {
  if (!root) return;
  if (root.documentElement) root.documentElement.lang = language;
  for (const attr of ['text', 'placeholder', 'title', 'aria-label', 'content']) {
    const marker = attr === 'text' ? 'data-i18n' : `data-i18n-${attr}`;
    root.querySelectorAll(`[${marker}]`).forEach(el => {
      const value = t(el.getAttribute(marker));
      if (attr === 'text') el.textContent = value; else el.setAttribute(attr, value);
    });
  }
  root.querySelectorAll('[data-language]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.language === language)));
}
export function onLanguageChange(callback) { listeners.add(callback); return () => listeners.delete(callback); }
export function setLanguage(next) {
  if (next !== 'zh-CN' && next !== 'en') return false;
  if (language === next) return true;
  language = next;
  try { globalThis.localStorage?.setItem(LANGUAGE_KEY, next); } catch (_) {}
  applyTranslations();
  for (const listener of listeners) listener(next);
  return true;
}
export function initializeLanguage() {
  applyTranslations();
  globalThis.document?.querySelectorAll('[data-language]').forEach(el => el.addEventListener('click', event => {
    event.stopPropagation(); setLanguage(el.dataset.language);
  }));
}
