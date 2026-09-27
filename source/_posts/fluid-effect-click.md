---
title: Fluid 特效 · 点击页面浮出文字
date: '2026-09-27 11:11:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-effect-click/
description: 设置点击文字、颜色、字号、上浮距离和持续时间，并避免干扰链接、按钮与评论输入。
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

进入“点击浮动文字”，每行写一句文案；多句会按顺序轮换。设置字号、上浮距离和动画时长。勾选随机颜色时每次点击会换色，取消后才使用固定颜色。

![点击页面浮出文字对应的本地管理设置截图](/images/fluid-guide/settings-1.png)

## 配置位置与参数

参数位于 `source/_data/fluid_config.yml` 的 `effects.click`。以下为相关字段示例；请合并到已有节点，**不要用片段替换整份文件**。列表仅展示部分示例时，保存前保留你自己的完整列表。

```yaml
effects:
  click:
    enable: true
    texts:
      - ❤️小乐❤️
    duration: 3000
    distance: 160
    size: 16
    randomColor: true
    color: '#ef7195'
```

当前默认文案为“❤️小乐❤️”，动画持续 3000 毫秒、向上移动 160 像素。点击位置使用 clientX/clientY 配合 fixed 定位，滚动页面后也能准确跟随。

## 实现位置

浏览器脚本在 document 上监听 click，创建 span 并通过 textContent 写入文案，再使用 Web Animations API 上浮。动画结束会删除节点，同时最多保留 20 个，避免连续点击堆积。

统一浏览器实现位于 `source/js/blog-effects.js` 与 `source/css/blog-effects.css`，模板 `_partials/effects.ejs` 负责输出配置。

## 验证与排错

点击正文空白区域应出现文字；点击导航、按钮、输入框、可编辑区域或 Waline 评论区不触发。开启系统“减少动态效果”时也不显示。旧 click_show_text.js 已停止加载，勿重复引入。

管理页保存后会重新生成本地站点。刷新验证无误，再按[发布教程](/fluid-08-deploy/)提交上线。

[返回完整搭建与特效目录](/fluid-guide/)
