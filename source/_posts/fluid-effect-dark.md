---
title: Fluid 特效 · 深色模式与默认外观
date: '2026-09-27 11:40:00'
permalink: fluid-effect-dark/
description: 设置深色、浅色和自动主题，区分站点默认值与访客浏览器记住的手动选择。
categories:
  - 博客搭建
  - 主题配置
tags:
  - Hexo
  - Fluid
index_img: false
---

## 配置入口

这是 Fluid 原生功能，可在 Hexo Pro 的主题配置中调整，无需另建一套开关。本站主题文件 `themes/fluid/_config.yml` 中的当前配置：

```yaml
dark_mode:
  enable: true
  default: dark
```

`default` 可设为 `dark`、`light` 或 `auto`。启用后导航会显示切换按钮；主题颜色由同文件的 `color` 下浅色/深色字段控制。

## 设置与验证

1. 修改默认值，保存后重新生成。
2. 用一个没有本站历史设置的浏览器上下文打开页面，确认初始外观。
3. 点击导航的外观切换按钮，再刷新，确认选择被记住。

本站脚本 `themes/fluid/source/js/color-schema.js` 将用户选择保存在 localStorage 的 `Fluid_Color_Scheme` 中。已有手动选择优先，因此更改站点默认值后，旧浏览器不一定立即跟随。不要把这一现象当作配置没有保存。

![本站关于页的深色外观与头像](/images/fluid-guide/about-effects.png)

[返回完整搭建与特效目录](/fluid-guide/)
