---
title: Fluid 特效 · 本机访客称号与来访次数
date: '2026-09-27 11:24:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-visitors/
description: 用浏览器本地计数解锁访客称号，明确它与真实 PV、UV 和跨设备访问统计的区别。
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

打开彩蛋总开关和“显示访客称号”。在称号等级框中填写 JSON 数组，每项包含 min 与 title，min 必须是递增的正整数。

![本机访客称号与来访次数对应的本地管理设置截图](/images/fluid-guide/settings-10.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `fun_features.easter_eggs`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
fun_features:
  easter_eggs:
    enable: true
    visitor_enable: true
    visit_titles:
      - min: 1
        title: 路过网友
      - min: 2
        title: 回头看了一眼
      - min: 4
        title: 博客熟面孔
```

例如 [{"min":1,"title":"路过网友"},{"min":5,"title":"常来看看"}]。达到第五次计数时显示后一个称号。本站默认还提供多个更高等级，可以按需调整。

## 实现位置

次数保存在 localStorage 的 lele-blog-visit-count；sessionStorage 的 lele-blog-visit-counted 避免同一个标签页会话每次刷新都加一。不同标签页与恢复会话的行为受浏览器实现影响，不应拿它当严格的“独立访客”统计。



## 验证与排错

同一标签内刷新通常不增加次数；清除浏览器站点数据后会重置。它不会同步到服务端或其他设备，和 Waline 阅读量、页脚 PV/UV 完全不同。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
