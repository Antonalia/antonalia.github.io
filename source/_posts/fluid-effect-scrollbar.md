---
title: Fluid 特效 · 自定义滚动条颜色与宽度
date: '2026-09-27 11:15:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-scrollbar/
description: 调整滚动条配色和宽度，了解 Chromium、Firefox 与系统覆盖式滚动条的显示差异。
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

进入“滚动条”，启用自定义样式，选择颜色与宽度。保存后打开一篇足够长的文章上下滚动，观察页面右侧滑块。

![自定义滚动条颜色与宽度对应的本地管理设置截图](/images/fluid-guide/settings-5.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `effects.scrollbar`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
effects:
  scrollbar:
    enable: true
    width: 9
    color: '#4f5a9c'
```

本站默认滑块颜色为 #4f5a9c，宽度参数 9 像素。CSS 同时提供 scrollbar-color 和 WebKit 伪元素；支持标准属性的浏览器可能优先采用系统的 thin 宽度，所以不保证所有浏览器都严格显示为 9 像素。

## 实现位置

样式仅在 html 带有 effects-scrollbar 类时生效。移除开关后恢复浏览器默认滚动条，不再依赖旧 Scroll.css 中的全局规则。

统一浏览器实现位于 `source/js/blog-effects.js` 与 `source/css/blog-effects.css`，模板 `_partials/effects.ejs` 负责输出配置。

## 验证与排错

Windows、macOS 和浏览器的“自动隐藏滚动条”选项会影响是否一直可见。页面内容不够长、没有滚动空间时，也不会出现滚动条。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
