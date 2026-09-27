---
title: 01 · 安装 Node.js 与 npm
date: '2026-09-27 10:00:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-01-node/
description: 准备 Hexo 的 JavaScript 运行环境，检查 Node.js、npm 与 Windows 命令行路径。
categories:
  - 博客搭建
  - 基础搭建
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 目标与版本

本站使用 **Hexo 7.3.0、Fluid 1.9.8、Hexo Pro 2.0.0**。本次本机验证环境为 Node.js 22.15.0；仓库的 `.nvmrc` 和 GitHub Actions 目前指定 Node.js 20。这里记录实际环境，不代表这些版本是最新版本。

## 安装

1. 从 [Node.js 官网](https://nodejs.org/) 下载 Windows 安装程序，安装时保留加入 PATH 的选项。
2. 关闭旧终端，重新打开 PowerShell。
3. 检查两个命令是否可用：

```powershell
node --version
npm --version
```

正常结果是两个版本号。npm 随 Node.js 安装，不需要再单独下载一个 npm 安装器。

## 排错

如果提示找不到命令，先重开终端，再用 `Get-Command node` 检查路径。若 PowerShell 拦截 `npm.ps1`，可使用 `npm.cmd --version`，不必为此关闭整个系统的脚本安全策略。

下一步：[安装 Git](/fluid-02-git/)。依据：[Hexo 安装文档](https://hexo.io/docs/)。

---
[返回完整搭建与特效目录](/fluid-guide/)
