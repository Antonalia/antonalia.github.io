---
title: Hexo + Fluid 搭建与特效教程
layout: page
permalink: fluid-guide/
description: 按安装、主题、发布与特效分类的分篇教程，每篇提供简介、操作和验证步骤。
comments: false
---

这里记录本站实际使用的 **Hexo 7.3.0 · Fluid 1.9.8 · Hexo Pro 2.0.0**。每篇只讲一个步骤或一项设置，先看简介，再按需阅读。

## 从哪里开始

- 第一次搭建：按 01–08 阅读安装与发布教程。
- 已有本站源码：先安装依赖与 Pandoc，再启动本地服务。
- 只想调特效：双击 `start-effects.bat`，配合[特效管理说明](/fluid-effects-manager/)。

![本站特效管理工作台实拍](/images/fluid-guide/effects-admin.png)

## 基础搭建

### [01 · 安装 Node.js 与 npm](/fluid-01-node/)

准备 Hexo 的 JavaScript 运行环境，检查 Node.js、npm 与 Windows 命令行路径。

### [02 · 安装 Git 并连接博客源码仓库](/fluid-02-git/)

安装 Git、设置提交身份，区分首次创建博客和恢复已有博客源码两条路径。

### [03 · 安装 Hexo 并启动本地博客](/fluid-03-hexo/)

从现有锁文件安装 Hexo，掌握生成、预览和目录用途，避免在已有项目重复初始化。

### [04 · 安装 Pandoc，让 Markdown 正常生成](/fluid-04-pandoc/)

本站使用 hexo-renderer-pandoc；安装系统级 Pandoc 并检查 PATH，解决构建时找不到渲染器的问题。

## 主题配置

### [05 · 安装 Fluid 主题与分清配置位置](/fluid-05-theme/)

启用 Fluid 1.9.8，区分站点配置、主题配置和覆盖配置，避免把定制设置写到错误位置。

### [06 · 写文章、添加首页简介与准确分类](/fluid-06-posts/)

用 description 控制首页简介，用分类层级组织教程，给文章设置稳定链接和图片地址。

### [Fluid 特效 · 返回顶部与下滑箭头](/fluid-effect-backtop/)

分别控制右下角返回顶部和头图底部下滑箭头，说明本站当前开启与关闭的状态。

### [Fluid 特效 · 深色模式与默认外观](/fluid-effect-dark/)

设置深色、浅色和自动主题，区分站点默认值与访客浏览器记住的手动选择。

### [Fluid 特效 · 文章标题锚点链接](/fluid-effect-anchor/)

为文章章节生成可分享的定位链接，配置图标出现的位置、时机和作用标题范围。

### [Fluid 特效 · 文章图片点击放大](/fluid-effect-image-zoom/)

启用 Fluid 图片灯箱与图片说明，使用已有文章截图验证放大和关闭操作。

## 部署发布

### [08 · 用 GitHub Actions 发布 Hexo 博客](/fluid-08-deploy/)

沿用本站 main 分支的 Actions 发布链路，检查构建与部署结果，不把本地生成误当成上线。

## 视觉特效

### [Fluid 特效 · 导航栏毛玻璃（默认关闭）](/fluid-effect-glass/)

开启 Fluid 实验性导航模糊效果，调整模糊半径和不透明度，兼顾背景可见性与文字清晰度。

### [Fluid 特效 · 动态粒子连线（默认关闭）](/fluid-effect-lines/)

启用备用的动态线条背景，调节粒子数、连接距离、线宽和速度，控制画面密度。

### [Fluid 特效 · 动态雪花的密度、大小与风速](/fluid-effect-snow/)

用集中配置调整雪花数量、半径、下落速度和风向，并控制是否在手机上显示。

### [Fluid 特效 · 普通、文本与复制鼠标指针](/fluid-effect-cursor/)

分别设置普通指针、文本选择指针和复制按钮指针，使用项目内资源保证部署后路径正确。

### [Fluid 特效 · 首页与文章标题打字机](/fluid-effect-typing/)

复用 Fluid 原生打字机设置，调整速度、游标和循环，并分清首页文案与动画参数的位置。

### [Fluid 特效 · 头图视差滚动](/fluid-effect-parallax/)

使用 Fluid 原生头图视差开关，观察滚动时背景与正文移动速度的差异。

### [Fluid 特效 · 头像悬停旋转与呼吸发光](/08avatar-rotation/)

单独控制关于页头像的旋转角度、时长和呼吸光，避免普通文章图片也跟着转动。

### [Fluid 特效 · 页面加载进度条](/fluid-effect-progress/)

调整 Fluid 原生 NProgress 进度条的高度和颜色，区分页面加载与文章阅读进度。

### [Fluid 特效 · 自定义滚动条颜色与宽度](/fluid-effect-scrollbar/)

调整滚动条配色和宽度，了解 Chromium、Firefox 与系统覆盖式滚动条的显示差异。

## 交互特效

### [Fluid 互动 · Waline 阅读反馈按钮](/fluid-effect-reactions/)

配置文章下方的四种阅读反馈图标与文字，区分服务端反馈计数和本地访客称号。

### [Fluid 特效 · 本机访客称号与来访次数](/fluid-effect-visitors/)

用浏览器本地计数解锁访客称号，明确它与真实 PV、UV 和跨设备访问统计的区别。

### [Fluid 特效 · 浮动挂件与随机吐槽](/fluid-effect-quips/)

修改浮动挂件的轮播文案、切换间隔与显示开关，保留点击换句和收起状态。

### [Fluid 特效 · 代码复制成功提示](/fluid-effect-copy/)

为 Fluid 代码块复制按钮添加一句轻量提示，只在确认复制成功后显示。

### [Fluid 特效 · 点击页面浮出文字](/fluid-effect-click/)

设置点击文字、颜色、字号、上浮距离和持续时间，并避免干扰链接、按钮与评论输入。

### [Fluid 特效 · 纪念日与运行时长计数](/fluid-effect-runtime/)

设置带时区的起始日期和文案，逐秒显示天时分秒，避免后台标签页造成计时漂移。

### [Fluid 特效 · 离开页面时切换标签标题](/09Fluid-Onblur/)

配置失焦提示文案，结合 blur、focus 与 visibilitychange，在返回时恢复原文章标题。

### [Fluid 特效 · 浏览器标签标题跑马灯](/fluid-effect-marquee/)

设置标签标题滚动间隔与首尾分隔符，让正常标题和离开提示都能循环滚动。

### [Fluid 特效 · 闲置提醒与欢迎回来](/fluid-effect-idle/)

设定闲置触发时间、重复间隔和随机文案，页面隐藏时暂停提醒，返回后继续观察活动。

## 后台管理

### [07 · 安装 Hexo Pro 并打开本地后台](/fluid-07-pro/)

运行 Hexo Pro 2.0.0，区分文章后台、主题设置和本站新增的特效工作台。

### [特效管理：开关、参数、保存与发布](/fluid-effects-manager/)

集中调整 13 组外观与互动设置，保存到 Fluid 覆盖配置，附本地预览、备份恢复和扩展文件位置。

## 评论系统与图片素材

- [Waline 评论、Neon 数据库与文章阅读量](/Hexo-Fluid-Waline-comments-pageview/)：沿用已有详细安装文章及七张步骤截图。
- [文章插入图片](/01image-insert/)：原有图片教程入口。

## 当前效果状态

头像旋转与呼吸光、点击文字、日期计数、雪花、鼠标指针、滚动条、标签标题、打字机、加载进度条及互动彩蛋默认开启。动态线条与导航毛玻璃默认关闭，教程中单独注明。

纪念日计数从 2019-06-09 开始；访客称号是本机浏览器记录；Waline 阅读量与反馈是另一套服务端功能，三者不要混淆。
