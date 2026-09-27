---
title: 05 · 安装 Fluid 主题与分清配置位置
date: '2026-09-27 10:04:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-05-theme/
description: 启用 Fluid 1.9.8，区分站点配置、主题配置和覆盖配置，避免把定制设置写到错误位置。
categories:
  - 博客搭建
  - 主题配置
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 本站采用目录安装

项目已包含 `themes/fluid/`，主题 package.json 标明版本 **1.9.8**。恢复本站时不必重复下载安装。

全新博客可以从 [Fluid 官方发行页](https://github.com/fluid-dev/hexo-theme-fluid/releases) 取得主题压缩包，解压为 `themes/fluid/`。目录中应直接看到 `_config.yml`、`layout`、`source`，不能多套一层文件夹。

在根目录 `_config.yml` 设置：

```yaml
theme: fluid
language: zh-CN
```

## 三类配置分别负责什么

| 文件 | 负责内容 |
| --- | --- |
| _config.yml | 站点名称、URL、文章路径、启用哪个主题 |
| themes/fluid/_config.yml | Fluid 基础配置、导航、评论等 |
| source/_data/fluid_config.yml | 本站特效参数及部分 Fluid 覆盖设置 |

本项目的 Fluid 会读取数据覆盖配置；相同字段以覆盖值为准。修改主题原文件却没有生效时，先查覆盖文件，不要反复添加同名字段。

## 生成验证

```powershell
npm run build
npx hexo server --ip 127.0.0.1
```

能看到 Fluid 导航、头图和文章列表即为成功。**本系列自定义特效并非原版 Fluid 内置功能**；复现整套特效请使用本站源码，或按[特效管理说明](/fluid-effects-manager/)复制对应扩展文件。

依据：[Fluid 项目](https://github.com/fluid-dev/hexo-theme-fluid)。

---
[返回完整搭建与特效目录](/fluid-guide/)
