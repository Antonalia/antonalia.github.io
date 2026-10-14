# 仓鼠小乐的个人博客

这是 `https://antonalia.github.io` 的 Hexo 源码仓库。GitHub Actions 会在 `main` 分支收到推送后自动安装依赖、生成静态站点并发布到 GitHub Pages。

## 新电脑初始化

```powershell
git clone https://github.com/Antonalia/antonalia.github.io.git
cd antonalia.github.io
npm ci
npm run server
```

本地预览地址为 `http://localhost:4000`。

## 日常更新

每次开始编辑前先拉取最新源码，完成后提交并推送：

```powershell
git pull --rebase
# 编辑 source/_posts、source/images 或主题配置
git add .
git commit -m "更新博客"
git push
```

推送完成后，GitHub Actions 会自动发布网站。不要提交 `public/`、`node_modules/`、`db.json` 或 `.deploy_git/`，也不要再运行 `hexo deploy`。

文章开头的 `date` 是首次发布时间，必须填写，后续修改时保留这个值。首页、归档和分类列表都以它显示日期和排序。

文章内的“最后更新”取 `updated` 与 Git 后续修改提交时间中的较晚时间；无需每次手动填 `updated`，有需要也可明确指定。仅首次提交、重新检出、重新构建或修改其他文件都不会刷新文章更新时间。尚未提交的本地修改需要填写 `updated` 才会显示新的更新时间。统一使用北京时间（`Asia/Shanghai`）。

## 主要目录

- `source/_posts/`：文章 Markdown 文件。
- `source/images/`：文章图片。
- `themes/fluid/_config.yml`：主题外观、个人信息和插件配置。
- `_config.yml`：Hexo 站点配置。
- `.github/workflows/pages.yml`：自动构建和发布工作流。

不要把个人访问令牌、密码或其他密钥写入配置文件或提交到仓库。

## 小游戏

导航中的“小游戏”入口位于 `/games/`，数独功能版位于 `/games/sudoku/`，VAL 极简练枪位于 `/aim/`。

数独源码在 `source/games/sudoku/`，使用浏览器本地存储保存本题、笔记和用时，无须服务器或额外依赖。难度按预填数字数量区分，题目生成时校验唯一解；刷新前的撤销记录不保存。

练枪源码在 `source/aim/`，页面使用 Three.js 与 Pointer Lock，固定 103° 水平 FOV，并按 VAL 灵敏度控制视角。仅保留三个小球的点击练习，不包含枪械、移动、商店或 PWA。适合电脑鼠标：选择 30 秒或 60 秒（默认 60 秒），点击开始锁定鼠标，按 Esc 暂停、按 R 重开，暂停后可结束本局并返回设置；结束后显示命中数、准确率和每分钟命中数，灵敏度保存在浏览器本地。优先使用原始鼠标输入，不支持时会提示普通浏览器输入可能受系统鼠标加速影响。

本地运行 `npm run server` 后打开 `http://localhost:4000/aim/`。页面随 Hexo 一起生成并发布，无须独立服务；实现参考 MIT 许可的 [VALOTRAINER](https://github.com/Pratilectron/valotrainer)。

原版功能完整版位于 `/valotrainer/`，源码在 `source/valotrainer/`，与极简版同时保留。原版四种模式、完整枪械、移动、商店、准星编辑、主题、训练记录及 PWA 都可使用；默认中文，可点击「中文 / English」即时切换并记住选择，枪械名称对照无畏契约国服官方武器库。Three.js 与字体本地托管，离线缓存只管理自己的目录。访问 `http://localhost:4000/valotrainer/`，点击训练模式卡片开始。上游版本、许可和维护说明见 [完整版集成说明](docs/valotrainer.md)。

运行 `npm test` 检查出题和游戏状态逻辑，运行 `npm run build` 生成网站。通过现有 GitHub Actions 流程发布，与博客其他页面相同。

数独界面使用本地托管的站酷快乐体与 Nunito；字体许可、来源及中文子集维护说明见 [字体说明](docs/sudoku-fonts.md)。仓鼠插图和生成提示词见 [插图说明](docs/sudoku-art.md)。
