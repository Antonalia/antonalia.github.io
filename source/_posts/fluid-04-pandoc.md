---
title: 04 · 安装 Pandoc，让 Markdown 正常生成
date: '2026-09-27 10:03:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-04-pandoc/
description: 本站使用 hexo-renderer-pandoc；安装系统级 Pandoc 并检查 PATH，解决构建时找不到渲染器的问题。
categories:
  - 博客搭建
  - 基础搭建
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 为什么需要单独安装

本站 package.json 使用 `hexo-renderer-pandoc`。npm 安装的是 Hexo 与 Pandoc 之间的适配插件，**不会替你安装 Pandoc 程序本身**。

## 操作步骤

1. 从 [Pandoc 安装页](https://pandoc.org/installing.html) 安装 Windows 版本。
2. 重新打开终端，进入博客目录。
3. 检查安装并生成文章：

```powershell
pandoc --version
npm run build
```

本次本机检查的 Pandoc 版本为 3.11。成功标准是版本命令有输出，Hexo 构建结束且没有渲染错误。

## 本站的启动脚本

`run-hexo-server.bat` 会将 `%LOCALAPPDATA%\Pandoc` 加入当前进程 PATH。如果你安装到了其他位置，应以 `Get-Command pandoc` 找到的真实路径为准。

线上 GitHub Actions 在构建前通过 apt 安装 Pandoc，定义见 `.github/workflows/pages.yml`。本机成功并不代表线上已经安装；两边都需要渲染程序。

遇到 `pandoc not found` 或 `ENOENT`，先解决 PATH，再重新执行 build。下一步：[安装 Fluid](/fluid-05-theme/)。

---
[返回完整搭建与特效目录](/fluid-guide/)
