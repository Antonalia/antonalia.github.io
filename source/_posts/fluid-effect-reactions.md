---
title: Fluid 互动 · Waline 阅读反馈按钮
date: '2026-09-27 11:44:00'
permalink: fluid-effect-reactions/
description: 配置文章下方的四种阅读反馈图标与文字，区分服务端反馈计数和本地访客称号。
categories:
  - 博客搭建
  - 交互特效
tags:
  - Hexo
  - Fluid
index_img: false
---

## 前提

本站评论使用 Waline，需有可用服务端并启用文章评论。完整安装见[Waline、Neon 与阅读量教程](/Hexo-Fluid-Waline-comments-pageview/)。本篇只讲阅读反馈按钮。

## 设置图标与文字

在 Hexo Pro 的主题配置中调整 `waline`，对应文件为 `themes/fluid/_config.yml`：

```yaml
waline:
  reaction:
    - /img/reactions/understood.svg
    - /img/reactions/maybe.svg
    - /img/reactions/bug.svg
    - /img/reactions/bookmark.svg
  locale:
    reactionTitle: 读到这里，留下一个阅读结论吧
    reaction0: 看懂了
    reaction1: 好像懂了
    reaction2: 成功复现了新的错误
    reaction3: 先收藏，假装以后会看
```

这只是局部配置，保留原有 serverURL、path 等字段。列表中的顺序与 reaction0 至 reaction3 的文字一一对应。图标文件在 `source/img/reactions/`。

## 验证

生成后滚动到文章评论区，确认四个图标和文字顺序一致。点击会向 Waline 服务提交反馈；这里的计数由服务端处理，不是浏览器本地访客称号。

主题 `fun-interactions.ejs` 另提供反馈区域排版样式：桌面四列，窄屏两列；关闭彩蛋总开关会取消这层自定义样式，但不会直接关闭 Waline 反馈功能。

参考：[Waline 文章反应文档](https://waline.js.org/en/guide/features/reaction.html)。

[返回完整搭建与特效目录](/fluid-guide/)
