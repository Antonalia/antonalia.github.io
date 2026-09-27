---
title: Fluid 特效 · 头像悬停旋转与呼吸发光
date: '2026-09-27 11:10:00'
updated: '2026-09-27 12:00:00'
permalink: 08avatar-rotation/
description: 单独控制关于页头像的旋转角度、时长和呼吸光，避免普通文章图片也跟着转动。
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

打开“特效管理 → 头像旋转与呼吸光”，保留启用勾选。将旋转角度设为 360、旋转时长设为 1.7 秒；呼吸周期为 4 秒，颜色可以直接用取色器修改。保存并生成后，打开 /about/，将鼠标移到圆形头像上。

![头像悬停旋转与呼吸发光对应的本地管理设置截图](/images/fluid-guide/settings-0.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `effects.avatar`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
effects:
  avatar:
    enable: true
    seconds: 1.7
    degrees: 360
    glow: true
    glowSeconds: 4
    color: '#e6e65a'
```

本站真正显示圆形头像的位置是关于页，图片由主题 about.avatar 指定，当前使用 /img/bear.png。首页副标题中的旧头像 HTML 已被注释，不要把首页没有头像误判为旋转失效。

## 实现位置

CSS 只匹配 .about-avatar img，由根节点的 effects-avatar 类控制旋转，effects-avatar-glow 控制阴影动画。不要使用 .img-fluid:hover 作为全局旋转选择器，它会误伤其他图片。

统一浏览器实现位于 `source/js/blog-effects.js` 与 `source/css/blog-effects.css`，模板 `_partials/effects.ejs` 负责输出配置。

## 验证与排错

头像应转动一圈，移开鼠标后回到原角度；关闭“启用头像特效”后，旋转与呼吸光均停止。系统开启“减少动态效果”时动画也会停止。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
