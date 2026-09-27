---
title: Fluid 特效 · 文章图片点击放大
date: '2026-09-27 11:41:00'
permalink: fluid-effect-image-zoom/
description: 启用 Fluid 图片灯箱与图片说明，使用已有文章截图验证放大和关闭操作。
categories:
  - 博客搭建
  - 主题配置
tags:
  - Hexo
  - Fluid
index_img: false
---

## 配置

在 Hexo Pro 的主题配置中找到 `post.image_zoom`，或编辑 `themes/fluid/_config.yml`：

```yaml
post:
  image_zoom:
    enable: true
    img_url_replace: ['', '']
  image_caption:
    enable: true
```

合并到已有 post 节点，别新增重复的 post 顶层键。本站已开启这两项，不必重复安装灯箱插件。

## 使用

在文章内用 Markdown 插图：

```markdown
![特效工作台](/images/fluid-guide/effects-admin.png)
```

![点击这张真实工作台截图验证放大](/images/fluid-guide/effects-admin.png)

保存并生成后，点击图片应进入 Fancybox 灯箱，按 Esc 或关闭按钮退出。`img_url_replace` 用于将缩略图地址改为原图地址；本站为空替换，不需要另配原图规则。图片注释和灯箱是两个独立开关。

## 排错

检查图片链接能否直接打开，再检查 Fancybox 资源是否加载。手机上用点击测试；不要把“图片本身就是小图、放大后模糊”误判为灯箱失效。

[返回完整搭建与特效目录](/fluid-guide/)
