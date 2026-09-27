---
title: Fluid 特效 · 浮动挂件与随机吐槽
date: '2026-09-27 11:21:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-quips/
description: 修改浮动挂件的轮播文案、切换间隔与显示开关，保留点击换句和收起状态。
categories:
  - 博客搭建
  - 交互特效
tags:
  - Hexo
  - Fluid
  - 博客特效
index_img: /images/fluid-guide/about-effects.png
---

本篇针对本站 **Fluid 1.9.8 + 本站特效扩展**。先完成[特效管理接入](/fluid-effects-manager/)，再调整以下配置。

## 设置步骤

在“互动彩蛋”打开彩蛋总开关和“显示吐槽挂件”。吐槽列表每行一句，轮播间隔以秒为单位，最低 10 秒。保存后刷新任意博客页面。

![浮动挂件与随机吐槽对应的本地管理设置截图](/images/fluid-guide/settings-10.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.easter_eggs`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  easter_eggs:
    enable: true
    quip_enable: true
    quip_interval: 60
    quips:
      - 今天的代码也有自己的想法。
      - 能跑就先别问原理。
      - 这篇文章已通过“我觉得可以”认证。
```

点击文字卡片立即换一句，点击角色图标切换展开与收起，卡片右上角箭头也能收起。展开状态保存在当前浏览器的 localStorage，不会跨设备同步。

## 实现位置

HTML 在主题 footer.ejs 中，行为和样式在 fun-interactions.ejs 中。图片使用 source/img/quip-mascot.png；要替换形象，可替换该图片并保持路径。随机选取时会避免连续两次使用同一条，只有一条文案时仍显示那条。



## 验证与排错

只关闭挂件子开关不会影响复制提示或访客称号；关闭彩蛋总开关则关闭整组互动。若挂件只露出左侧一部分，先点击角色图标展开，不要误判为文案丢失。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
