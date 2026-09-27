---
title: 03 · 安装 Hexo 并启动本地博客
date: '2026-09-27 10:02:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-03-hexo/
description: 从现有锁文件安装 Hexo，掌握生成、预览和目录用途，避免在已有项目重复初始化。
categories:
  - 博客搭建
  - 基础搭建
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 已有项目：直接恢复依赖

在博客根目录执行：

```powershell
npm ci
npx hexo version
```

本站 package.json 记录 Hexo 7.3.0，文章放在 `source/_posts/`，页面生成到 `public/`。不要直接编辑 public，下一次构建会覆盖它。

## 全新空目录：才需要初始化

下面是一条独立的新站路线，已有本站源码时跳过：

```powershell
npm install -g hexo-cli
hexo init my-blog
cd my-blog
npm install
```

初始化所得依赖版本可能与本站不同。复现本站应优先使用本站源码与锁文件。

## 本地生成与预览

本站使用 Pandoc 渲染文章，先完成[下一篇的 Pandoc 安装](/fluid-04-pandoc/)，再运行：

```powershell
npm run build
npx hexo server --ip 127.0.0.1 --port 4000
```

浏览器访问 `http://localhost:4000/`；Ctrl+C 停止服务。`npm run build` 仅生成页面，不会发布到 GitHub。

| 路径 | 用途 |
| --- | --- |
| _config.yml | 博客站点配置 |
| themes/fluid/ | 本站 Fluid 主题与定制代码 |
| source/_posts/ | 已发布文章源码 |
| source/_data/fluid_config.yml | 特效与主题覆盖配置 |
| scripts/ | Hexo 构建及本地服务扩展 |

依据：[Hexo 文档](https://hexo.io/docs/)。

---
[返回完整搭建与特效目录](/fluid-guide/)
