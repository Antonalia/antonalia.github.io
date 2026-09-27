---
title: Fluid 特效 · 返回顶部与下滑箭头
date: '2026-09-27 11:43:00'
permalink: fluid-effect-backtop/
description: 分别控制右下角返回顶部和头图底部下滑箭头，说明本站当前开启与关闭的状态。
categories:
  - 博客搭建
  - 主题配置
tags:
  - Hexo
  - Fluid
index_img: false
---

## 两个独立入口

在 Hexo Pro 主题配置中修改，或编辑 `themes/fluid/_config.yml`。本站当前配置的相关字段如下：

```yaml
scroll_top_arrow:
  enable: true
scroll_down_arrow:
  enable: false
  banner_height_limit: 80
  scroll_after_turning_page: true
```

右下角返回顶部已开启；头图下滑箭头默认关闭。两者不应混为一项。

## 验证

保存并生成后，打开长文章向下滚动，返回顶部按钮应出现，点击后回到页面上方。要试下滑箭头，需同时开启它，并使当前页面的头图高度达到 banner_height_limit。

本站首页头图高度为 60，而阈值为 80，因此仅把 enable 改为 true 并不一定在首页出现；可合理降低阈值或调整头图高度。

## 实现位置

返回顶部按钮在 `themes/fluid/layout/layout.ejs` 输出；下滑箭头由 `_partials/header/banner.ejs` 根据开关和头图高度输出，交互由主题脚本处理。无需再添加重复的置顶插件。

[返回完整搭建与特效目录](/fluid-guide/)
