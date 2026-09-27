---
title: Fluid 特效 · 浏览器标签标题跑马灯
date: '2026-09-27 11:18:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-marquee/
description: 设置标签标题滚动间隔与首尾分隔符，让正常标题和离开提示都能循环滚动。
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

在“离开标题与跑马灯”分组同时启用“标题特效”和“标题跑马灯”。设置移动间隔，例如 500 毫秒，再选择首尾分隔符。只开启跑马灯子开关但关闭标题总开关，不会运行。

![浏览器标签标题跑马灯对应的本地管理设置截图](/images/fluid-guide/settings-7.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.monitortext.marquee`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  monitortext:
    marquee:
      enable: true
      interval: 500
      separator: 　　
```

每次移动一个字符，间隔越大滚动越慢。本站使用 Array.from 拆分字符串，比按 UTF-16 单元截断更适合常见 emoji，但组合 emoji 仍可能由多个字符组成。

## 实现位置

焦点变化时先清除旧定时器，再根据当前页面状态选择原始标题或离开提示，防止重复切换标签后出现多个定时器叠加。



## 验证与排错

观察当前标签的文字应循环左移；切走后轮播离开提示；关闭跑马灯只保留静态的失焦标题切换。后台标签页可能被浏览器降低定时器频率，不保证后台严格按毫秒刷新。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
