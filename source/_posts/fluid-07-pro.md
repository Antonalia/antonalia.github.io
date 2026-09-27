---
title: 07 · 安装 Hexo Pro 并打开本地后台
date: '2026-09-27 10:06:00'
updated: '2026-09-27 12:00:00'
permalink: fluid-07-pro/
description: 运行 Hexo Pro 2.0.0，区分文章后台、主题设置和本站新增的特效工作台。
categories:
  - 博客搭建
  - 后台管理
tags:
  - Hexo
  - Fluid
index_img: /images/fluid-guide/effects-admin.png
---

## 安装与打开

本站已在 package.json 声明 `hexo-pro: ^2.0.0`，锁文件安装的版本为 2.0.0。恢复项目执行 `npm ci` 即可；在其他兼容项目首次安装可以运行 `npm install hexo-pro@2.0.0 --save`。

双击项目根目录 `start-admin.bat`，或者运行：

```powershell
npx hexo server --ip 127.0.0.1 --port 4000
```

访问 `http://localhost:4000/pro/`，按首次使用页面完成设置。后台仅在本地服务运行时可用。

## 原有功能与新增功能

Hexo Pro 已提供文章、图片、站点配置和主题管理，因此这些功能继续在 Pro 中使用。它不会自动理解写在 CSS、JavaScript 里的雪花速度、点击文字等参数。

本站新增的 `http://localhost:4000/effects-admin/` 专门处理这些特效，也可双击 `start-effects.bat` 打开。它是本站扩展，不是 Hexo Pro 官方页面。

![本站特效工作台实拍](/images/fluid-guide/effects-admin.png)

## 保存不等于发布

本地修改成功后仍需[提交并发布](/fluid-08-deploy/)。GitHub Pages 只托管生成后的静态页面，不会运行本地后台服务。

本站特效覆盖文件优先于主题默认值；同一个字段建议只在特效工作台中维护，避免在 Pro 主题编辑器里改了低优先级的值却误以为保存失败。

参考：[Hexo Pro 官方仓库](https://github.com/wuzheng228/hexo-pro)。

---
[返回完整搭建与特效目录](/fluid-guide/)
