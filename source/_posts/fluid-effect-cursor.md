---
title: Fluid 特效 · 普通、文本与复制鼠标指针
date: '2026-09-27 11:16:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-cursor/
description: 分别设置普通指针、文本选择指针和复制按钮指针，使用项目内资源保证部署后路径正确。
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

进入“鼠标指针”，启用后填写以 / 开头的站内 .cur 或 .png 路径。本站使用 /css/arrow.cur、/css/beam.cur、/css/copy.cur 三个现有资源。

![普通、文本与复制鼠标指针对应的本地管理设置截图](/images/fluid-guide/settings-6.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `effects.cursor`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
effects:
  cursor:
    enable: true
    normal: /css/arrow.cur
    text: /css/beam.cur
    copy: /css/copy.cur
```

这些文件实际位于 themes/fluid/source/css/，生成后映射到网站 /css/。新增资源也可以放在 source/css/，浏览器访问路径仍从网站根目录开始。不要填写 Windows 盘符或本机绝对路径。

## 实现位置

普通指针应用到页面、链接和按钮，文本指针应用到输入框、文本域和代码，复制指针应用到 .copy-btn。每项都保留 auto、text 或 copy 作为加载失败时的后备指针。

统一浏览器实现位于 `source/js/blog-effects.js` 与 `source/css/blog-effects.css`，模板 `_partials/effects.ejs` 负责输出配置。

## 验证与排错

在电脑上分别悬停普通区域、代码和复制按钮观察；手机触屏没有鼠标指针，不能用手机是否显示判断配置正确与否。旧 Shubiao.css 已停止加载，避免其 !important 覆盖管理设置。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
