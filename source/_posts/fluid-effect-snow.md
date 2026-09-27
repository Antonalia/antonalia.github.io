---
title: Fluid 特效 · 动态雪花的密度、大小与风速
date: '2026-09-27 11:13:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-snow/
description: 用集中配置调整雪花数量、半径、下落速度和风向，并控制是否在手机上显示。
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

进入“动态雪花”，按需修改数量、最大半径和下落速度。横向风速小于零表示向左、大于零表示向右，零表示无横向风。手机开关单独控制窄屏显示。

![动态雪花的密度、大小与风速对应的本地管理设置截图](/images/fluid-guide/settings-3.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `effects.snow`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
effects:
  snow:
    enable: true
    count: 90
    size: 7
    speed: 45
    wind: -12
    color: '#ffffff'
    opacity: 0.7
    mobile: true
```

本站默认 90 片雪花、最大半径 7 像素、下落速度参数 45 像素/秒，单片实际速度为该值的 50%–100%。当前风速为 -12，表示向左移动。默认颜色为白色，在深色背景上更明显。

## 实现位置

Canvas 使用 requestAnimationFrame 绘制，并按帧时间差计算位移，不把高刷新率等同于更快下落。画布设置 pointer-events:none，不拦截页面点击；像素比最高取 2，避免高分屏资源开销过大。

统一浏览器实现位于 `source/js/blog-effects.js` 与 `source/css/blog-effects.css`，模板 `_partials/effects.ejs` 负责输出配置。

## 验证与排错

保存后刷新页面，画布 id 为 blog-snow。关闭开关后不创建画布；切到后台会暂停绘制；系统减少动态效果时隐藏。旧 Snowflake.js 虽保留在仓库中，但不再参与当前运行，修改它不会改变新效果。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
