---
title: 06 · 写文章、添加首页简介与准确分类
date: '2026-09-27 10:05:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-06-posts/
description: 用 description 控制首页简介，用分类层级组织教程，给文章设置稳定链接和图片地址。
categories:
  - 博客搭建
  - 主题配置
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 新建一篇文章

```powershell
npx hexo new "我的 Fluid 教程"
```

编辑生成的 `source/_posts/我的 Fluid 教程.md`。本站已经在新文章模板中加入简介和分类字段。

```yaml
---
title: 我的 Fluid 教程
date: 2026-09-27 12:00:00
permalink: my-fluid-guide/
description: 一句话说明这篇文章解决什么问题，以及读完能完成什么操作。
categories:
  - 博客搭建
  - 主题配置
tags:
  - Hexo
  - Fluid
---
```

## 简介显示在哪里

本站 Fluid 首页优先使用 `description`，其次使用 `excerpt`，最后才自动截取正文。列表卡片会截取至多 200 个字符，建议简介控制在一两句。`<!-- more -->` 也可用于划分正文摘要。

![首页教程标题与简介的实际截图](/images/fluid-guide/home-tutorials.png)

## 分类与标签

上例表示“博客搭建 → 主题配置”两级分类，不是两个平级分类。本站系列分为：基础搭建、主题配置、部署发布、视觉特效、交互特效、后台管理。Hexo、Fluid 等技术名称放在 tags 中。

## 插图与检查

将共享图片放到 `source/images/`，文章写 `![说明](/images/文件名.png)`。生成后同时检查首页简介、文章图片和分类页。部署流程见[发布教程](/fluid-08-deploy/)。

---
[返回完整搭建与特效目录](/fluid-guide/)
