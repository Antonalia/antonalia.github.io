---
title: 08 · 用 GitHub Actions 发布 Hexo 博客
date: '2026-09-27 10:07:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-08-deploy/
description: 沿用本站 main 分支的 Actions 发布链路，检查构建与部署结果，不把本地生成误当成上线。
categories:
  - 博客搭建
  - 部署发布
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 本站发布链路

源码推送至 `main` → GitHub Actions 安装依赖与 Pandoc → Hexo 生成 public → 上传 Pages 产物 → 部署 GitHub Pages。

配置在 `.github/workflows/pages.yml`。仓库 Pages 的构建来源应设为 **GitHub Actions**；它不是直接把 main 中的 Markdown 当网页展示。

## 发布步骤

1. 在根目录运行 `npm run build`，确认无错误。
2. 用 `git status` 查看改动，确认没有密码、令牌或不打算发布的草稿。
3. 双击 `publish-github.bat`，输入发布说明。
4. 打开 [仓库 Actions](https://github.com/Antonalia/antonalia.github.io/actions)，等待 **Build and deploy Hexo site** 的 build、deploy 两个任务成功。
5. 刷新线上网站，核对标题、图片、简介和特效。

## 发布脚本具体做了什么

`publish-github.ps1` 会将当前改动加入 Git、创建提交、执行 `pull --rebase origin main`，然后推送。脚本会包含所有未忽略的改动，所以发布前必须先核对列表。遇到同一段内容的冲突，应处理冲突后再继续。

## 常见误区

本站虽然安装了 hexo-deployer-git，但根配置没有设置 deploy 目标；当前实际流程是 Actions。不要直接照搬其他教程的 `hexo d` 当作本站的发布步骤。`public/`、本地数据库和后台配置不入库，见 `.gitignore`。

依据：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

---
[返回完整搭建与特效目录](/fluid-guide/)
