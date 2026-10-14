# 数独页面本地字体

字体以本地 WOFF2 提供；浏览器加载页面时无需连接 Google Fonts。

| 文件 | 用途 | 字重 |
| --- | --- | --- |
| `zcool-kuaile.woff2` | 站酷快乐体，中文标题、按钮等 | 400 |
| `nunito.woff2` | Nunito，圆润英文、数字及标点 | 600–800 可变字重 |

两种字体均采用 SIL Open Font License 1.1，允许商用、嵌入、修改及随软件再分发。保留 `source/games/sudoku/fonts/` 目录两份 `LICENSE-*.txt` 的完整版权声明及许可；不要单独销售字体。

## 官方来源

原始字体及随附许可来自 Google Fonts 官方仓库，获取时固定到提交 `9710da1eacb3be272583c3224dcb70f9da6eadbb`：

- [ZCOOL KuaiLe TTF](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf) / [OFL](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/zcoolkuaile/OFL.txt)
- [Nunito TTF](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/nunito/Nunito%5Bwght%5D.ttf) / [OFL](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/nunito/OFL.txt)

WOFF2 由 Google Fonts 官方服务提供：

- Nunito：请求 [CSS API](https://fonts.googleapis.com/css2?family=Nunito:wght@600..800&display=swap)，采用 `/* latin */` 区段的 [v32 WOFF2](https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofINeaB.woff2)。它覆盖全部可打印 ASCII，包含数字 0–9。
- ZCOOL KuaiLe：请求 `https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap&text=`，在 `text=` 后追加 `encodeURIComponent` 编码的 `zcool-kuaile-subset.txt` 完整内容，再下载返回 CSS 中的 `fonts.gstatic.com` WOFF2。当前官方服务字体版本为 v22。

以上接口只在准备字体资产时使用。完整 TTF 不随网站发布，以免重复增加体积。

## 中文子集维护

`zcool-kuaile-subset.txt` 按码点排序去重，涵盖全部可打印 ASCII、`index.html` 和 `sudoku-app.js` 中的中文及相关标点，也包括预留的界面文案。修改静态文字、动态状态消息或无障碍标签后，应更新这份列表并重新请求官方 WOFF2 子集。

字符覆盖通过独立解析 TTF/WOFF2 的 Unicode `cmap` 表检查；WOFF2 表用 Node.js 内置 Brotli 解压，没有安装额外依赖。所有子集请求字符必须存在于生成后的 `cmap`，避免依赖系统字体补字。
