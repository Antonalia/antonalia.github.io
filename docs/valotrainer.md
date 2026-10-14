# VALOTRAINER 完整版集成

本站提供两个独立练枪页面：极简版 `/aim/` 与原版功能完整的 `/valotrainer/`。“小游戏”页同时链接两者。

完整版源码位于 `source/valotrainer/`。固定上游 [Pratilectron/valotrainer](https://github.com/Pratilectron/valotrainer) 的提交 `ded498f5eb54867bd3d55648774984f6e3a90004`，支持中文与原版英文切换，保留四种训练模式、枪械、移动、商店、准星编辑、主题、音效与训练记录。上游 MIT 许可证保存在 `source/valotrainer/LICENSE`。

## 本站适配

- `_config.yml` 的 `skip_render` 覆盖 `valotrainer/**`，原始 HTML、ES modules 和其他资源按原样复制到 `public/valotrainer/`，不套用博客布局。
- Three.js 固定为上游使用的 0.160.0；Anton、Barlow 字体和图标都本地托管。完整应用运行时无需访问 CDN 或 Google Fonts。字体与 Three.js 的许可位于 `licenses/`。
- canonical、Open Graph 地址指向本站，菜单中增加小游戏、极简版及开源声明链接。没有导入上游的 CNAME、robots、sitemap、服务器配置或部署工作流。
- 保留原版 PWA 安装与离线功能。Service Worker 注册于 `/valotrainer/sw.js`，作用域仅为 `/valotrainer/`；只清理 `lele-valotrainer-` 前缀下的旧缓存，读取也限于本应用缓存。
- 原版的 `vlt_settings_v1` 与 `vlt_history_v1` 本地存储键独立于极简版 `lele:aim:settings:v1`。数据留在当前浏览器。
- 默认中文，菜单、购买、暂停和战斗报告中的「中文 / English」按钮即时切换。语言独立保存在 `lele:valotrainer:language:v1`，切换不会重载页面、重启训练、改动准星代码或重复写入成绩。浏览器禁止本地存储时仍可切换。
- `js/i18n.js` 处理动态显示与国服武器名，`js/ui/translations.js` 保存静态界面译文。翻译仅用于显示，武器 ID、数值、场景 ID、准星解析格式保持上游定义。场景中的屏幕与距离标记也随语言重绘；两套语言都可离线使用。
- `css/site.css` 将菜单顶栏压为一行，并让表单按内容高度展开。窄屏、矮窗口或浏览器放大时可以滚动整个菜单访问所有设置；准星档案代码不再被嵌套网格裁切，下拉列表也不会因面板切换滚动方式而跳动。

## 国服术语来源

枪名逐项核对腾讯[无畏契约官方武器库](https://val.qq.com/game-data.html?pageType=2)使用的[公开武器数据接口](https://api.val.qq.com/go/agame/graphql/graphiQL?query=%7B%20guns%20%7B%20id%20name%20e_name%20%7D%20%7D)，核对日期为 2026-10-02。例如 Vandal → 狂徒、Phantom → 幻影、Marshal → 飞将、Outlaw → 莽侠、Bandit → 追猎。近战造型 Onimaru Kunitsuna 使用国服名称「鬼丸国纲」，可对照[腾讯官网的般若假面 2.0 公告](https://val.qq.com/newsdetails.html?docid=11393017560755392538&goback=main)。

武器类别「佩枪」「机枪」对照官网武器分类；「护甲」「轻型护甲」「蹲伏」可对照[国服 9.11 公告](https://val.qq.com/newsdetails.html?docid=9168187755260941574&goback=main)。准星导入提示采用「设置 → 准星 → 导入档案代码」，参考[注明来源 WeGame 的国服使用教程](https://www.gamersky.com/handbook/202405/1758811.shtml)。其他编辑器标签为对应功能的中文说明。

Gridshot、Flick Shot、Tracking、Range Bots 为训练器模式，中文分别显示「三球速射」「甩枪训练」「跟枪训练」「靶场机器人」。九种场景同样采用描述性译名；这些名称并非国服正式模式或地图名。

## 本地预览与维护

运行 `npm run server`，访问 `http://localhost:4000/valotrainer/`。点击训练模式卡片开始；WASD 移动、R 换弹、B 商店、1/2/3 切换武器、Q 快速切换、Y 检视、Shift 行走、C 蹲下、Space 跳跃、右键瞄准、Esc 暂停。

运行 `npm test` 检查博客与集成，`npm run build` 生成静态页面。应用与其他页面走同一 GitHub Pages 发布流程。

升级上游时先比较游戏模块与原版测试，再保留上述本站适配。修改离线缓存内的任何文件时，递增 `sw.js` 的 `CACHE` 版本，确保已安装用户获取完整更新；新增资源还需加入 `ASSETS`。上游数值来源见仓库中的 [DATA_SOURCES.md](https://github.com/Pratilectron/valotrainer/blob/ded498f5eb54867bd3d55648774984f6e3a90004/DATA_SOURCES.md)。
