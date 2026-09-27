---
title: 特效管理：开关、参数、保存与发布
date: '2026-09-27 10:08:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effects-manager/
description: 集中调整 13 组外观与互动设置，保存到 Fluid 覆盖配置，附本地预览、备份恢复和扩展文件位置。
categories:
  - 博客搭建
  - 后台管理
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 打开管理页

双击根目录 `start-effects.bat`，访问 `http://localhost:4000/effects-admin/`。页面只允许本机连接，线上网站不提供写入接口；本地博客页脚也有“特效管理”入口。

![本地特效管理页面真实截图](/images/fluid-guide/effects-admin.png)

## 调整与保存

1. 左侧选择分组，例如“动态雪花”。
2. 修改开关、数量、颜色或速度；数值旁标注了单位。
3. 点击“保存并生成”，等待保存成功提示。
4. 点击“查看效果”，刷新博客确认变化。
5. 满意后运行 `publish-github.bat`，等待 GitHub Actions 发布成功。

“重新载入”会放弃未保存的输入。多个页面同时编辑时，旧页面保存会被拒绝，避免覆盖其他窗口刚保存的内容。

## 文件与优先级

实际设置写入 `source/_data/fluid_config.yml`。Fluid 将其覆盖到主题配置，不会改写整份主题默认文件。最后一次保存前的配置会备份为 `data/effects-backup.yml`，该本地备份不发布。

恢复时先停止服务，将备份复制回覆盖配置，再重新启动和构建。若提示“已保存但生成失败”，先修复错误再执行 `npm run build`，不要把失败提示误认为已经发布。

## 在另一份 Fluid 项目中复用

这不是只加一段 YAML 就能获得的功能。需要一同移植本仓库的以下文件及模板接入改动：

| 文件 | 用途 |
| --- | --- |
| lib/effects-schema.js | 字段、类型和范围校验 |
| scripts/effects-admin.js | 本地管理路由及保存接口 |
| assets/effects-admin/ | 管理页面、表单和样式 |
| source/_data/fluid_config.yml | 实际参数 |
| source/js/blog-effects.js、source/css/blog-effects.css | 浏览器端特效 |
| themes/fluid/layout/_partials/effects.ejs | 向页面输出配置和资源 |

`layout.ejs` 在 body 结束前加载 effects partial；旧的雪花、点击和日期脚本不再重复加载。彩蛋和标题另外依赖 `fun-interactions.ejs`、`footer.ejs`、`source/_inject/monitortext.ejs` 与 `scripts/page.js`。最稳妥的复现方式是检出[完整源码](https://github.com/Antonalia/antonalia.github.io)，而非逐个粘贴片段。

打字机、进度条、视差和毛玻璃复用 Fluid 原生配置；文章管理仍使用 Hexo Pro。纪念日计数与访客称号是两件事：前者计算日期差，后者只记录当前浏览器的来访会话。

---
[返回完整搭建与特效目录](/fluid-guide/)
