---
title: Tmux 使用教程（转载与勘误）
date: '2026-09-28 12:00:00'
permalink: tmux-guide/
author: 阮一峰（原文）
categories:
  - 开发工具
tags:
  - Tmux
  - Linux
  - 终端
description: 转载阮一峰的 Tmux 使用教程，保留原图，另附评论区补充与命令勘误。
index_img: false
copyright: false
---

引用链接：[阮一峰《Tmux 使用教程》](https://www.ruanyifeng.com/blog/2019/10/tmux.html)

原文作者：阮一峰；原文发布日期：2019 年 10 月 21 日。原文按 [CC BY-NC-ND 3.0](https://creativecommons.org/licenses/by-nc-nd/3.0/deed.zh) 转载（署名、非商用、非衍生）。下方保留原文内容和原站图片链接；文末「本站补充与勘误」由本站另行整理，不属于原作者正文。原文中的历史说明请结合文末勘误阅读。

<!-- more -->

Tmux 是一个终端复用器（terminal multiplexer），非常有用，属于常用的开发工具。

本文介绍如何使用 Tmux。

![](https://cdn.beekka.com/blogimg/asset/201910/bg2019102005.png)

## 一、Tmux 是什么？

### 1.1 会话与进程

命令行的典型使用方式是，打开一个终端窗口（terminal window，以下简称"窗口"），在里面输入命令。**用户与计算机的这种临时的交互，称为一次"会话"（session）** 。

会话的一个重要特点是，窗口与其中启动的进程是[连在一起](https://www.ruanyifeng.com/blog/2016/02/linux-daemon.html)的。打开窗口，会话开始；关闭窗口，会话结束，会话内部的进程也会随之终止，不管有没有运行完。

一个典型的例子就是，[SSH 登录](https://www.ruanyifeng.com/blog/2011/12/ssh_remote_login.html)远程计算机，打开一个远程窗口执行命令。这时，网络突然断线，再次登录的时候，是找不回上一次执行的命令的。因为上一次 SSH 会话已经终止了，里面的进程也随之消失了。

为了解决这个问题，会话与窗口可以"解绑"：窗口关闭时，会话并不终止，而是继续运行，等到以后需要的时候，再让会话"绑定"其他窗口。

### 1.2 Tmux 的作用

**Tmux 就是会话与窗口的"解绑"工具，将它们彻底分离。**

> （1）它允许在单个窗口中，同时访问多个会话。这对于同时运行多个命令行程序很有用。
>
> （2） 它可以让新窗口"接入"已经存在的会话。
>
> （3）它允许每个会话有多个连接窗口，因此可以多人实时共享会话。
>
> （4）它还支持窗口任意的垂直和水平拆分。

类似的终端复用器还有 GNU Screen。Tmux 与它功能相似，但是更易用，也更强大。

## 二、基本用法

### 2.1 安装

Tmux 一般需要自己安装。

> ``` bash
>
> # Ubuntu 或 Debian
> $ sudo apt-get install tmux
>
> # CentOS 或 Fedora
> $ sudo yum install tmux
>
> # Mac
> $ brew install tmux
> ```

### 2.2 启动与退出

安装完成后，键入`tmux`命令，就进入了 Tmux 窗口。

> ``` bash
>
> $ tmux
> ```

上面命令会启动 Tmux 窗口，底部有一个状态栏。状态栏的左侧是窗口信息（编号和名称），右侧是系统信息。

![](https://cdn.beekka.com/blogimg/asset/201910/bg2019102006.png)

按下`Ctrl+d`或者显式输入`exit`命令，就可以退出 Tmux 窗口。

> ``` bash
>
> $ exit
> ```

### 2.3 前缀键

Tmux 窗口有大量的快捷键。所有快捷键都要通过前缀键唤起。默认的前缀键是`Ctrl+b`，即先按下`Ctrl+b`，快捷键才会生效。

举例来说，帮助命令的快捷键是`Ctrl+b ?`。它的用法是，在 Tmux 窗口中，先按下`Ctrl+b`，再按下`?`，就会显示帮助信息。

然后，按下 ESC 键或`q`键，就可以退出帮助。

## 三、会话管理

### 3.1 新建会话

第一个启动的 Tmux 窗口，编号是`0`，第二个窗口的编号是`1`，以此类推。这些窗口对应的会话，就是 0 号会话、1 号会话。

使用编号区分会话，不太直观，更好的方法是为会话起名。

> ``` bash
>
> $ tmux new -s <session-name>
> ```

上面命令新建一个指定名称的会话。

### 3.2 分离会话

在 Tmux 窗口中，按下`Ctrl+b d`或者输入`tmux detach`命令，就会将当前会话与窗口分离。

> ``` bash
>
> $ tmux detach
> ```

上面命令执行后，就会退出当前 Tmux 窗口，但是会话和里面的进程仍然在后台运行。

`tmux ls`命令可以查看当前所有的 Tmux 会话。

> ``` bash
>
> $ tmux ls
> # or
> $ tmux list-session
> ```

### 3.3 接入会话

`tmux attach`命令用于重新接入某个已存在的会话。

> ``` bash
>
> # 使用会话编号
> $ tmux attach -t 0
>
> # 使用会话名称
> $ tmux attach -t <session-name>
> ```

### 3.4 杀死会话

`tmux kill-session`命令用于杀死某个会话。

> ``` bash
>
> # 使用会话编号
> $ tmux kill-session -t 0
>
> # 使用会话名称
> $ tmux kill-session -t <session-name>
> ```

### 3.5 切换会话

`tmux switch`命令用于切换会话。

> ``` bash
>
> # 使用会话编号
> $ tmux switch -t 0
>
> # 使用会话名称
> $ tmux switch -t <session-name>
> ```

### 3.6 重命名会话

`tmux rename-session`命令用于重命名会话。

> ``` bash
>
> $ tmux rename-session -t 0 <new-name>
> ```

上面命令将0号会话重命名。

### 3.7 会话快捷键

下面是一些会话相关的快捷键。

> - `Ctrl+b d`：分离当前会话。
> - `Ctrl+b s`：列出所有会话。
> - `Ctrl+b $`：重命名当前会话。

## 四、最简操作流程

综上所述，以下是 Tmux 的最简操作流程。

> 1.  新建会话`tmux new -s my_session`。
> 2.  在 Tmux 窗口运行所需的程序。
> 3.  按下快捷键`Ctrl+b d`将会话分离。
> 4.  下次使用时，重新连接到会话`tmux attach-session -t my_session`。

## 五、窗格操作

Tmux 可以将窗口分成多个窗格（pane），每个窗格运行不同的命令。以下命令都是在 Tmux 窗口中执行。

### 5.1 划分窗格

`tmux split-window`命令用来划分窗格。

> ``` bash
>
> # 划分上下两个窗格
> $ tmux split-window
>
> # 划分左右两个窗格
> $ tmux split-window -h
> ```

![](https://cdn.beekka.com/blogimg/asset/201910/bg2019102007.jpg)

### 5.2 移动光标

`tmux select-pane`命令用来移动光标位置。

> ``` bash
>
> # 光标切换到上方窗格
> $ tmux select-pane -U
>
> # 光标切换到下方窗格
> $ tmux select-pane -D
>
> # 光标切换到左边窗格
> $ tmux select-pane -L
>
> # 光标切换到右边窗格
> $ tmux select-pane -R
> ```

### 5.3 交换窗格位置

`tmux swap-pane`命令用来交换窗格位置。

> ``` bash
>
> # 当前窗格上移
> $ tmux swap-pane -U
>
> # 当前窗格下移
> $ tmux swap-pane -D
> ```

### 5.4 窗格快捷键

下面是一些窗格操作的快捷键。

> - `Ctrl+b %`：划分左右两个窗格。
> - `Ctrl+b "`：划分上下两个窗格。
> - `Ctrl+b <arrow key>`：光标切换到其他窗格。`<arrow key>`是指向要切换到的窗格的方向键，比如切换到下方窗格，就按方向键`↓`。
> - `Ctrl+b ;`：光标切换到上一个窗格。
> - `Ctrl+b o`：光标切换到下一个窗格。
> - `Ctrl+b {`：当前窗格与上一个窗格交换位置。
> - `Ctrl+b }`：当前窗格与下一个窗格交换位置。
> - `Ctrl+b Ctrl+o`：所有窗格向前移动一个位置，第一个窗格变成最后一个窗格。
> - `Ctrl+b Alt+o`：所有窗格向后移动一个位置，最后一个窗格变成第一个窗格。
> - `Ctrl+b x`：关闭当前窗格。
> - `Ctrl+b !`：将当前窗格拆分为一个独立窗口。
> - `Ctrl+b z`：当前窗格全屏显示，再使用一次会变回原来大小。
> - `Ctrl+b Ctrl+<arrow key>`：按箭头方向调整窗格大小。
> - `Ctrl+b q`：显示窗格编号。

## 六、窗口管理

除了将一个窗口划分成多个窗格，Tmux 也允许新建多个窗口。

### 6.1 新建窗口

`tmux new-window`命令用来创建新窗口。

> ``` bash
>
> $ tmux new-window
>
> # 新建一个指定名称的窗口
> $ tmux new-window -n <window-name>
> ```

### 6.2 切换窗口

`tmux select-window`命令用来切换窗口。

> ``` bash
>
> # 切换到指定编号的窗口
> $ tmux select-window -t <window-number>
>
> # 切换到指定名称的窗口
> $ tmux select-window -t <window-name>
> ```

### 6.3 重命名窗口

`tmux rename-window`命令用于为当前窗口起名（或重命名）。

> ``` bash
>
> $ tmux rename-window <new-name>
> ```

### 6.4 窗口快捷键

下面是一些窗口操作的快捷键。

> - `Ctrl+b c`：创建一个新窗口，状态栏会显示多个窗口的信息。
> - `Ctrl+b p`：切换到上一个窗口（按照状态栏上的顺序）。
> - `Ctrl+b n`：切换到下一个窗口。
> - `Ctrl+b <number>`：切换到指定编号的窗口，其中的`<number>`是状态栏上的窗口编号。
> - `Ctrl+b w`：从列表中选择窗口。
> - `Ctrl+b ,`：窗口重命名。

## 七、其他命令

下面是一些其他命令。

> ``` bash
>
> # 列出所有快捷键，及其对应的 Tmux 命令
> $ tmux list-keys
>
> # 列出所有 Tmux 命令及其参数
> $ tmux list-commands
>
> # 列出当前所有 Tmux 会话的信息
> $ tmux info
>
> # 重新加载当前的 Tmux 配置
> $ tmux source-file ~/.tmux.conf
> ```

## 八、参考链接

- [A Quick and Easy Guide to tmux](https://www.hamvocke.com/blog/a-quick-and-easy-guide-to-tmux/)
- [Tactical tmux: The 10 Most Important Commands](https://danielmiessler.com/study/tmux/)
- [Getting started with Tmux](https://linuxize.com/post/getting-started-with-tmux/)

（完）

---

## 本站补充与勘误（不属于转载原文）

以下依据[原文评论区](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comments)整理，并参考 [Tmux 官方手册](https://man.openbsd.org/tmux)。快捷键以默认配置为准；自定义配置与版本可能改变行为，可用 `tmux list-keys` 查看实际绑定。

### 退出、分离与远程任务

针对原文 2.2 节：[Z 的评论](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-426350)提醒区分 shell 退出与客户端分离。`exit` 结束当前 shell；在空提示符处，`Ctrl+d` 通常也会使 shell 退出。默认情况下，窗格内程序结束后窗格关闭，最后一个窗格关闭后窗口消失，最后一个窗口关闭后会话结束。要保留任务，应按 `Ctrl+b`，松开，再按 `d`。

[评论区的远程运行提醒](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-429378)：需要先 SSH 登录服务器，再在服务器上启动 Tmux 和任务。仅在本地 Tmux 中运行 SSH，不能让远程任务自动获得同样的保护。服务器重启或任务进程被杀死，也不能靠重新 attach 恢复。

### 快捷键的按法与概念

针对 2.3 节：[朱军浩的补充](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-419104)说明，前缀与功能键分两步操作。例如 `Ctrl+b %` 是先按 `Ctrl+b`、松开，再输入 `%`。默认多数操作使用前缀，但 Tmux 也允许绑定无前缀快捷键。

针对 3.1 节：session、window、pane 是三层不同对象；一个会话可包含多个窗口，一个窗口可包含多个窗格。会话名称或 ID 与窗口编号不应混为一谈。列出会话时推荐完整命令 `tmux list-sessions` 或别名 `tmux ls`。

针对 5.4 节：[关于分号键的纠正](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-448832)：`Ctrl+b ;` 返回上一次活跃的窗格，不是按编号选择前一个窗格。

### 交换与调整窗格

针对 5.3 节：[作者已确认](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-414103)早期版本中 `swap-pane -L/-R` 的错误，目前转载的原文已移除这两项。`swap-pane -U/-D` 按前一个／后一个窗格交换，不应理解为屏幕上方／下方的方向选择。需要明确目标时，可参考[韩光的补充](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-414094)：

```sh
# 交换当前窗口中编号为 0 与 2 的窗格
tmux swap-pane -s 0 -t 2
```

评论中的复杂布局失败现象属于当时的使用反馈，不作为所有版本的通用限制。

针对调整大小：[评论存在不同意见](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-427132)。默认配置下，前缀后按 `Ctrl+方向键` 与 `Alt+方向键` 都可调整大小，通常分别移动 1 格和 5 格。终端若拦截组合键，可直接运行 `tmux resize-pane -L 5` 等命令。

### 历史输出与鼠标

[历史输出补充](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-425575)：前缀后按 `[` 进入复制模式，再使用翻页键浏览历史输出；按 `q`（vi 模式）或 `Esc`（默认 emacs 模式）退出。历史内容受缓冲区容量限制。

[鼠标模式补充](https://www.ruanyifeng.com/blog/2019/10/tmux.html#comment-437631)：执行 `tmux set -g mouse on` 可开启鼠标支持。若要持久启用，在当前用户的 `~/.tmux.conf` 写入：

```tmux
set -g mouse on
```

然后运行 `tmux source-file ~/.tmux.conf`。配置文件应使用普通半角引号，不要直接粘贴评论中的弯引号；也不必使用 root 用户的配置路径。

### 其他评论问题

- 窗口编号留空：可在配置中加入 `set -g renumber-windows on`，使关闭窗口后自动整理编号。
- 同时输入：`tmux setw synchronize-panes on` 作用于当前窗口的多个窗格，不是所有会话；完成后用 `tmux setw synchronize-panes off` 关闭。
- 批量关闭：评论里的 `kill-window -a` 会关闭目标会话中除目标窗口外的其他窗口，不是关闭所有窗口。执行前务必确认任务已保存。
- 原文 7 节的 `tmux info` 属于旧版用法。当前版本可用 `tmux list-sessions` 查看会话；诊断终端信息可查看 `tmux show-messages -T` 的本机支持情况。

评论中未提供复现条件的崩溃、重命名失效等反馈，没有作为确定结论写入教程。实际排查时应记录 `tmux -V`、配置和错误输出。