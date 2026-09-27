---
title: Fluid 特效 · 代码复制成功提示
date: '2026-09-27 11:22:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-copy/
description: 为 Fluid 代码块复制按钮添加一句轻量提示，只在确认复制成功后显示。
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

在“互动彩蛋”中打开总开关和“启用复制成功提示”，修改复制成功文案。保存后找一篇含代码块且带复制按钮的文章验证。

![代码复制成功提示对应的本地管理设置截图](/images/fluid-guide/settings-10.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.easter_eggs`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  easter_eggs:
    enable: true
    copy_enable: true
    copy_text: 代码已复制，Bug 是否附赠取决于缘分。
```

提示依赖 Fluid 的复制按钮 .copy-btn。普通 Ctrl+C、复制正文或浏览器右键复制不会触发这条彩蛋，也不会修改剪贴板内容。

## 实现位置

fun-interactions.ejs 监听 fluid:copy-success，并兼容按钮内出现 .icon-success 的状态。针对同一按钮的一次成功事件做去重，提示在约一秒后消失。



## 验证与排错

点击代码块右上角复制按钮，确认剪贴板得到代码且按钮附近出现提示。若复制本身失败，不应该出现虚假的“已复制”提示；先检查浏览器剪贴板权限与 HTTPS/本地安全上下文。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
