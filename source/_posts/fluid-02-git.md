---
title: 02 · 安装 Git 并连接博客源码仓库
date: '2026-09-27 10:01:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-02-git/
description: 安装 Git、设置提交身份，区分首次创建博客和恢复已有博客源码两条路径。
categories:
  - 博客搭建
  - 基础搭建
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 安装和检查

1. 从 [Git 官网](https://git-scm.com/downloads/win) 安装 Git for Windows。
2. 重新打开 PowerShell，运行：

```powershell
git --version
git config --global user.name "你的名字"
git config --global user.email "你的邮箱或 GitHub noreply 邮箱"
```

提交名字和邮箱用于记录作者，不是 GitHub 登录密码。推送时仍需按 Git Credential Manager 的提示完成授权。

## 恢复已有博客

本站的源码仓库就是 `Antonalia/antonalia.github.io`。在一个尚未存在同名项目的父目录执行：

```powershell
git clone https://github.com/Antonalia/antonalia.github.io.git
cd antonalia.github.io
npm ci
```

如果已经打开现有项目，只需进入该目录，**不要再次初始化或覆盖项目**。`npm ci` 依照锁文件安装依赖，并会重建 node_modules。

## 验证

```powershell
git status
git remote -v
```

本站远程地址应指向上面的仓库。`ping github.com` 只检查 ICMP，不能用来判断 Git 的 HTTPS 推送一定成功；应以实际 Git 命令结果为准。

下一步：[Hexo 安装与预览](/fluid-03-hexo/)。

---
[返回完整搭建与特效目录](/fluid-guide/)
