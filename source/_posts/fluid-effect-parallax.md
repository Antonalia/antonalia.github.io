---
title: Fluid 特效 · 头图视差滚动
date: '2026-09-27 11:25:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-parallax/
description: 使用 Fluid 原生头图视差开关，观察滚动时背景与正文移动速度的差异。
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

进入“背景与导航”，启用“头图视差”。保存后打开首页，向下滚动比较背景图与正文板块的移动。

![头图视差滚动对应的本地管理设置截图](/images/fluid-guide/settings-11.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `banner`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
banner:
  parallax: true
```

本站头图来自 themes/fluid/_config.yml 的 index.banner_img，首页高度由 index.banner_img_height 控制。视差开关不会替你更换图片，也不会修改头图高度。

## 实现位置

Fluid 在 banner 节点上输出 parallax 属性，由主题脚本和样式处理滚动表现。本站复用这一原生行为，没有额外叠加一个滚动监听动画。



## 验证与排错

关闭开关后刷新，同样的图片仍保留，但不再采用该视差行为。若页面滚动不流畅，可以关闭此项，保留其他特效。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
