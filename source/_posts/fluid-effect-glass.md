---
title: Fluid 特效 · 导航栏毛玻璃（默认关闭）
date: '2026-09-27 11:26:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-glass/
description: 开启 Fluid 实验性导航模糊效果，调整模糊半径和不透明度，兼顾背景可见性与文字清晰度。
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

进入“导航毛玻璃”，开启开关，设置模糊半径 px 和不透明度 alpha。本站原来未启用，这里保留关闭状态，提供按需调整的入口。

![导航栏毛玻璃（默认关闭）对应的本地管理设置截图](/images/fluid-guide/settings-12.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `navbar.ground_glass`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
navbar:
  ground_glass:
    enable: false
    px: 3
    alpha: 0.7
```

px 越大模糊越强；alpha 越大越不透明。模糊需要背景纹理才容易看出，用纯色图片可能不明显。

## 实现位置

这项设置直接使用 Fluid 的 navbar.ground_glass 配置，属于主题标注的实验性视觉功能；不支持对应滤镜的浏览器可能回退为普通背景。



## 验证与排错

启用后在有纹理的头图上观察导航背景，再滚动检查文字是否清楚。若出现卡顿或抖动，可以直接关闭，无需移除任何文章。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
