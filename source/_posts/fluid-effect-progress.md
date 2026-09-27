---
title: Fluid 特效 · 页面加载进度条
date: '2026-09-27 11:20:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-progress/
description: 调整 Fluid 原生 NProgress 进度条的高度和颜色，区分页面加载与文章阅读进度。
categories:
  - 博客搭建
  - 视觉特效
tags:
  - Hexo
  - Fluid
  - 博客特效
index_img: /images/fluid-guide/about-effects.png
---

本篇针对本站 **Fluid 1.9.8 + 本站特效扩展**。先完成[特效管理接入](/fluid-effects-manager/)，再调整以下配置。

## 设置步骤

进入“页面加载进度条”，启用开关，修改高度和颜色。本站默认 3 像素高、颜色 #2299dd。

![页面加载进度条对应的本地管理设置截图](/images/fluid-guide/settings-9.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.progressbar`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  progressbar:
    enable: true
    height_px: 3
    color: '#2299dd'
    options:
      showSpinner: false
      trickleSpeed: 100
```

这条线表示页面加载过程，不是“文章已读百分比”。点击导航加载新页面时更容易看到；本地缓存很快时可能一闪而过。

## 实现位置

Fluid 的 _partials/plugins/nprogress.ejs 负责加载和启动 NProgress，主题样式读取 height_px 和 color。高级 options 保留在配置中，本站默认不显示旋转图标。



## 验证与排错

保存并生成后重新打开文章页，观察浏览器内容顶部。关闭开关后，不应再加载本项插件；无需改动文章正文。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
