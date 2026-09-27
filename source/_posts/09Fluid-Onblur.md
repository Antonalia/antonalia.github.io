---
title: Fluid 特效 · 离开页面时切换标签标题
date: '2026-09-27 11:17:00'
updated: '2026-09-27 12:00:00'
permalink: 09Fluid-Onblur/
description: 配置失焦提示文案，结合 blur、focus 与 visibilitychange，在返回时恢复原文章标题。
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

在“离开标题与跑马灯”中启用标题特效，填写离开页面时的文字。如果只想切换标题而不滚动，关闭同组的跑马灯开关。

![离开页面时切换标签标题对应的本地管理设置截图](/images/fluid-guide/settings-7.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.monitortext`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  monitortext:
    enable: true
    text: 🌞妳是心中的日月~落在這裡~🌛
    marquee:
      enable: true
      interval: 500
      separator: 　　
```

本功能修改的是浏览器标签上的 document.title，不会改变文章标题、首页标题或搜索引擎里的正文。回到页面时恢复进入页面时保存的原始标题。

## 实现位置

入口是 scripts/page.js 的 theme_inject，注入 source/_inject/monitortext.ejs。模板监听窗口焦点和页面可见性，不用 window.onblur 覆盖其他事件处理器。文案写入脚本前转义小于号，避免文本被当作脚本标签。



## 验证与排错

保存后刷新一篇文章，再切换到其他标签页，原标签应显示离开文案；切回后恢复文章标题。如果跑马灯仍开启，恢复后的标题继续滚动，这是另一项设置的作用。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
