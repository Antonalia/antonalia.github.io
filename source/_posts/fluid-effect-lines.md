---
title: Fluid 特效 · 动态粒子连线（默认关闭）
date: '2026-09-27 11:14:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-lines/
description: 启用备用的动态线条背景，调节粒子数、连接距离、线宽和速度，控制画面密度。
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

进入“动态线条（默认关闭）”，先启用开关，再设置粒子数量、连线距离、线宽和移动速度。本站默认不开启此特效，教程展示的是可选配置，不代表原网站一直在运行。

![动态粒子连线（默认关闭）对应的本地管理设置截图](/images/fluid-guide/settings-4.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `effects.lines`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
effects:
  lines:
    enable: false
    count: 60
    distance: 140
    width: 1
    speed: 24
    color: '#c8c8c8'
    opacity: 0.6
    mobile: false
```

粒子彼此接近时才连线。数量和连接距离同时增大会显著增加画面密度，建议从默认 60 个粒子、140 像素距离开始。手机开关默认为关闭。

## 实现位置

此版本在 blog-effects.js 中统一绘制粒子，比较粒子两两距离后连线，透明度随距离增大而减小。旧 DynamicLine.js 保留作历史参考，但当前统一管理入口不会加载它。新实现不包含旧脚本的鼠标吸附行为。

统一浏览器实现位于 `source/js/blog-effects.js` 与 `source/css/blog-effects.css`，模板 `_partials/effects.ejs` 负责输出配置。

## 验证与排错

开启后刷新应出现 blog-lines 画布，关闭后消失。纯白色背景上浅灰线条可能很淡，可调整颜色；内容卡片可能遮住背景画布，这是预期层级。不要同时在 custom_js 中加入旧线条脚本。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
