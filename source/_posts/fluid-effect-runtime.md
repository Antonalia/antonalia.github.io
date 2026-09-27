---
title: Fluid 特效 · 纪念日与运行时长计数
date: '2026-09-27 11:12:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-runtime/
description: 设置带时区的起始日期和文案，逐秒显示天时分秒，避免后台标签页造成计时漂移。
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

进入“日期与运行时长”，输入带时区的起始时间，例如 2019-06-09T00:00:00+08:00。修改前缀和后缀后保存，在页面最底部查看结果。

![纪念日与运行时长计数对应的本地管理设置截图](/images/fluid-guide/settings-2.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `effects.runtime`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
effects:
  runtime:
    enable: true
    start: '2019-06-09T00:00:00+08:00'
    prefix: '🐹LeLe has been with 🐶TianTian:'
    suffix: ❤️
```

本站原始计数是 LeLe 与 TianTian 的纪念日，起点为 2019 年 6 月 9 日。本次保留这个日期，不把它解释为博客创建时间。你可以改成自己的建站时间，让它显示真正的站点运行时长。

## 实现位置

每次刷新显示都以 Date.now() 减去起始时间，再换算成天、小时、分钟和秒。没有使用“每次定时器触发就累加 250 毫秒”的旧方法，因此标签页后台限流后返回也能恢复正确时间。

统一浏览器实现位于 `source/js/blog-effects.js` 与 `source/css/blog-effects.css`，模板 `_partials/effects.ejs` 负责输出配置。

## 验证与排错

页脚使用 timeDate 和 times 两个占位节点。计数每秒更新，秒数应在 00–59 之间；未来日期暂时显示零，不显示负数。若没有显示，先检查开关与时间格式，再检查页脚节点是否仍存在。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
