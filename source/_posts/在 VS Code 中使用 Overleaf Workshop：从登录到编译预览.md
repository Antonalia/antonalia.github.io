---
title: 在 VS Code 中使用 Overleaf Workshop：从登录到编译预览
author: 仓鼠小乐
categories:
  - 学习
date: 2026-09-17 22:40:58
tags:
---
Overleaf Workshop 把 Overleaf 的在线写作流程带进了 VS Code：项目保留在云端，在熟悉的编辑器里修改 LaTeX 源码，再调用 Overleaf 编译并查看 PDF。对于已经在 Overleaf 上维护的论文，这样既能沿用原有项目，又能使用 VS Code 的搜索、多文件编辑和快捷键。

本文以 **Windows + Overleaf 官网**为例，使用插件的远程工作区模式，完成从安装、登录到编译预览的一套流程。

## 1. 安装插件

在 VS Code 中按 `Ctrl + Shift + X` 打开扩展面板，搜索 **Overleaf Workshop**，确认发布者为 `iamhyc`，然后点击安装。也可以通过 [扩展商店页面](https://marketplace.visualstudio.com/items?itemName=iamhyc.overleaf-workshop)进入安装。

安装完成后，点击左侧活动栏中的 Overleaf 图标，进入服务器与项目列表。接下来需要把已有的 Overleaf 登录状态接入插件。

## 2. 使用 Cookie 登录 Overleaf

Overleaf 官网可能涉及验证码或单点登录，插件官方建议使用 **Login with Cookies**。操作分为两步：先在浏览器取得当前会话的 Cookie，再回到 VS Code 登录。以下步骤依据[官方登录说明](https://github.com/overleaf-workshop/Overleaf-Workshop#how-to-login-with-cookies)。

### 在浏览器中获取 Cookie

1. 使用 Chrome 或 Edge 登录 [Overleaf 项目页面](https://www.overleaf.com/project)，确认可以看到自己的项目。
2. 按 `F12` 打开开发者工具，切换到 **Network（网络）**，然后刷新页面，让请求记录出现。
3. 在过滤框输入 `/project`，选择请求地址对应项目页面的那一条记录。
4. 打开 **Headers（标头）→ Request Headers（请求标头）**，找到 `Cookie`，复制它的完整值。

复制的是 `Cookie:` 后面的内容，不包含字段名本身。会话字段可能形如 `overleaf_session2=...`；如果这一行还有其他字段，保留完整值即可。

> Cookie 相当于当前会话的登录凭证。只将它填入插件的登录框，不要写进文章、代码仓库或公开截图。

### 回到 VS Code 登录

在 Overleaf Workshop 面板中找到官网服务器，选择登录并使用 **Login with Cookies**，粘贴刚才复制的值后确认。若列表中没有服务器，先通过添加服务器入口填入 `https://www.overleaf.com`；地址应保留 `www`，末尾不要加 `/project`。

登录成功后展开服务器，即可看到项目列表。若列表尚未更新，点击服务器旁的刷新按钮。服务器地址与项目管理的细节可参阅[官方使用手册](https://github.com/overleaf-workshop/Overleaf-Workshop/blob/master/docs/wiki.md#servers-management)。

## 3. 打开项目并开始编辑

在项目列表中找到要编辑的论文，通过项目菜单选择在当前窗口或新窗口打开。首次使用时，选择新窗口会更方便，原来的 VS Code 工作区也可以继续保留。

这种打开方式会进入插件的远程工作区。资源管理器中会显示项目里的 `.tex`、`.bib` 和图片等文件，打开正文文件即可开始写作。本文后续步骤都在这个远程工作区中进行。

编辑后按 `Ctrl + S` 保存，并留意插件的连接状态。第一次配置完成时，可以做一处容易识别的小修改，再到 Overleaf 网页端核对，确认当前打开的项目和修改内容一致。

## 4. 编译、预览与双向定位

打开一个 `.tex` 文件，将焦点放在源码编辑区，按 `Ctrl + Alt + B` 发起编译；完成后按 `Ctrl + Alt + V` 打开 PDF 预览。远程工作区调用 Overleaf 的编译服务，本机无需为这套流程另行安装 TeX 发行版。

日常写作可以将源码和 PDF 并排放置：修改一段文字，保存并编译，再检查版面。常用操作集中在下面这张表中。


| 操作             | Windows 快捷键或方式            |
| ---------------- | ------------------------------- |
| 保存当前文件     | `Ctrl + S`                      |
| 编译项目         | `Ctrl + Alt + B`                |
| 打开 PDF 预览    | `Ctrl + Alt + V`                |
| 从源码定位到 PDF | `Ctrl + Alt + J`                |
| 从 PDF 返回源码  | 在插件的 PDF 预览中双击对应文字 |

其中，源码与 PDF 之间的跳转由 **SyncTeX** 提供。把光标放在需要检查的源码处，即可定位到 PDF 中的对应位置；反过来，从 PDF 双击文字也能回到编辑位置。改动较大时，先重新编译，让预览和定位信息保持更新。上述操作见[插件功能说明](https://github.com/overleaf-workshop/Overleaf-Workshop#features)。

macOS 上，插件的编译、预览和正向定位快捷键分别为 `Cmd + Option + B`、`Cmd + Option + V`、`Cmd + Option + J`。如果快捷键没有响应，先确认焦点在 `.tex` 编辑区，也可以通过命令面板搜索 Overleaf 的对应命令。

### 按需要调整保存时自动编译

插件的 `overleaf-workshop.compileOnSave.enabled` 默认开启。短文档可以保留这一设置，保存后就能触发编译；如果项目较大，或者正在连续修改文字，可以在 VS Code 的**用户设置**中搜索该设置并关闭，等改完一段后再手动编译。快捷键和默认值可在[插件配置定义](https://github.com/overleaf-workshop/Overleaf-Workshop/blob/master/package.json)中查到。

## 5. 常见问题

**Cookie 登录失败**

先确认浏览器仍能正常进入项目页面，再刷新页面，从新的 `/project` 请求中重新复制 Cookie。检查复制的内容来自请求标头且没有截断，同时确认插件中配置的是 `https://www.overleaf.com`。若使用旧版本插件，先更新后重试；[更新日志](https://github.com/overleaf-workshop/Overleaf-Workshop/blob/master/CHANGELOG.md)记录过与 Cookie 登录有关的兼容性修复。

**登录后看不到项目，或网页端没有出现修改**

核对登录账号和项目名称，刷新项目列表，并检查连接是否正常。确认文件已经保存后，再到网页端查看同一文件。第一次使用时先完成一次小范围的同步验证，后续编辑会更踏实。

**编译失败，或 PDF 没有更新**

先确认编译已经结束，再查看 VS Code 的 **Problems**（问题）面板中的错误信息。若网页端可以编译而插件中失败，重点核对项目的主文档和编译器设置；也可以在 Overleaf 命令中查找设置编译器、设置主文档的入口。相关说明见[官方编译文档](https://github.com/overleaf-workshop/Overleaf-Workshop/blob/master/docs/wiki.md#compile-the-project)。

完成首次登录和同步验证后，日常使用只需围绕“打开项目 → 编辑保存 → 编译 → 检查 PDF”展开。把双向定位融入修改过程，长文档中的源码与版面就能更容易对应起来。
