---
title: Fluid 特效 · 首页与文章标题打字机
date: '2026-09-27 11:19:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-typing/
description: 复用 Fluid 原生打字机设置，调整速度、游标和循环，并分清首页文案与动画参数的位置。
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

进入“打字机”，设置每字间隔、游标字符与循环。本站默认 typeSpeed 为 70，cursorChar 为“🐾”，loop 为 false。数值越大打印越慢。

![首页与文章标题打字机对应的本地管理设置截图](/images/fluid-guide/settings-8.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.typing`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  typing:
    enable: true
    typeSpeed: 70
    cursorChar: 🐾
    loop: false
    scope: []
```

动画参数和显示文案是两类配置。首页显示文案来自 themes/fluid/_config.yml 的 index.slogan.text；文章页则使用该文章标题。想改首页欢迎词，应修改 slogan，而非 cursorChar。

## 实现位置

本站复用 Fluid 的 _partials/plugins/typed.ejs 与 Typed.js，不另造一套标题动画。配置中的 scope 是页面范围，当前空数组表示不额外限制；需要限制到首页时可在覆盖配置中设置 scope: [home]。



## 验证与排错

刷新首页应逐字显示欢迎词；关闭打字机后直接显示完整内容。如果没有打字，检查开关、scope 和浏览器是否加载到 Typed.js 资源。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
