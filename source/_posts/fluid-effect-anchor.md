---
title: Fluid 特效 · 文章标题锚点链接
date: '2026-09-27 11:42:00'
permalink: fluid-effect-anchor/
description: 为文章章节生成可分享的定位链接，配置图标出现的位置、时机和作用标题范围。
categories:
  - 博客搭建
  - 主题配置
tags:
  - Hexo
  - Fluid
index_img: false
---

## 修改现有配置

本站已在数据覆盖文件 `source/_data/fluid_config.yml` 保存 `fun_features.anchorjs`。该字段不在特效表单中，可直接编辑覆盖文件，或使用能编辑该文件的配置编辑器：

```yaml
fun_features:
  anchorjs:
    enable: true
    element: h1,h2,h3,h4,h5,h6
    placement: left
    visible: hover
    icon: ''
```

## 参数与操作

placement 设为 left 或 right，决定图标在标题哪边；visible 为 hover 时悬停才出现，为 always 时常驻。element 控制处理哪些标题等级。

保存后重新生成文章，将鼠标移到本节标题上，点击旁边的链接图标，地址栏应附加 `#章节标识`。把这个 URL 打开，浏览器应定位到对应章节。

## 实现与注意

Fluid 使用 `_partials/plugins/anchorjs.ejs` 和 AnchorJS，只对正文标题添加链接。标题改名后生成的锚点可能变化，因此需要长期分享时尽量保持标题稳定。此功能与右侧文章目录有关联但不是同一个开关。

[返回完整搭建与特效目录](/fluid-guide/)
