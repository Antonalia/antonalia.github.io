---
title: Fluid 特效 · 闲置提醒与欢迎回来
date: '2026-09-27 11:23:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-idle/
description: 设定闲置触发时间、重复间隔和随机文案，页面隐藏时暂停提醒，返回后继续观察活动。
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

打开彩蛋总开关及“启用闲置提醒与返回提示”。设置闲置秒数和重复间隔，再逐行填写提醒文案。默认闲置 45 秒触发，之后每隔 18 秒提示一次。

![闲置提醒与欢迎回来对应的本地管理设置截图](/images/fluid-guide/settings-10.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.easter_eggs`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  easter_eggs:
    enable: true
    idle_enable: true
    idle_seconds: 45
    idle_interval: 18
    idle_messages:
      - 你还在吗？服务器有点担心你。
      - 检测到你正在认真发呆。
      - 页面没动，但时间已经偷偷跑了。
```

鼠标移动、点击、键盘输入、滚轮和触摸都会重置闲置计时。提醒不是服务端监控，也不是访客在线统计；它只观察当前打开的页面。

## 实现位置

切到后台时清除闲置定时器，返回前台重新开始。隐藏达到 15 秒后返回会显示固定的欢迎回来提示；这个 15 秒阈值目前写在 fun-interactions.ejs 中，不在管理表单内。



## 验证与排错

保存后保持页面前台且不操作超过阈值，应出现提醒。操作一次后计时重新开始。若想只保留挂件而不要提醒，关闭此子开关即可。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
