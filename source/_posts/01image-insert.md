---
title: hexo中插入图片和注释语句的方法
excerpt: 在文章中我将会介绍一些关于博客中插入图片的方法和注释语句的方法。
date: 
tags:
  - 写作
categories:
  - 博客
typora-root-url: ./..
---

# 图片插入的方法

## 方法一：不好用

```方法一
{% asset_img lic.png 给图片添加的注释文字%}
```
<br/>{% asset_img lic.png  图片引用方法一 %}

```方法一
{% asset_img lic.png 图片长度 图片宽度 给图片添加的注释文字%}
```
<br/>{% asset_img lic.png 400 100 图片引用方法一 图片长度=400 图片宽度=100%}

## 方法二
```方法二
<center> # 图片不居中故采用此方法
<img src="/images/lic.png" width=400 height=250 align="middle" > # 根目录在source
<br/>{% link hexo官网 https://hexo.io/zh-cn/ %} # 超链接
</center>
# 或者采用如下方法居中
<div align=center><img src="/images/lic.png" width=400 height=250></div>
```
<center>
<img src="/images/lic.png" width=200 height=200 align="middle" >
<br/>{% link hexo官网 https://hexo.io/zh-cn/ %} 
</center>

<div align=center>
<img src="/images/lic.png" width=400 height=250>
<br/>{% link hexo官网 https://hexo.io/zh-cn/ %}
</div>

## 方法三
```方法三
![图片引用方法三](/images/lic.png)
```
![图片引用方法三](/images/lic.png)

# 注释方法
```注释方法
# 方法一: 使用 HTML 样式实现隐藏
<div style="display:none">
<img src="/images/lic.png" >
</div>

# 方法二: 使用原生 HTML 注释语法
<!-- 
<img src="/images/lic.png" > 
<img src="/images/lic.png" >
-->

# 方法三: 通过 Markdown 自身的解析功能，容易出问题
[//]: <img src="/images/lic.png" >
```

<div style="display:none">
<img src="/images/lic.png" >
</div>


<!-- 
<img src="/images/lic.png" > 
<img src="/images/lic.png" >
-->

[//]: <img src="/images/lic.png" >
