---
title: VSCode中侧边栏Codex中缺失“替我审批”选项的解决办法
author: 仓鼠小乐
categories:
  - 工具
date: 2026-09-18 14:46:39
tags:
---
# 在 VS Code Codex 中启用“替我审批”

适用场景：侧边栏没有“替我审批 / Approve for me”，希望通过配置文件启用自动审批。本文记录 2026-09-18 在当前服务器上的实际操作。

本文配有三张操作示意图；权限菜单按本次聊天截图重绘，其他图片为步骤说明。图片文件放在同级 codex-auto-review-assets/ 目录，分享教程时请一并保留。

1. ## 我这次是怎么实现的

我在 /root/.codex/config.toml 的最前面增加了两行：

```
approval_policy = "on-request"approvals_reviewer = "auto_review"
```

操作时先解析原配置、备份，再通过临时文件替换原文件，最后重新解析，确认其他配置没有改变。备份文件是：

```
/root/.codex/config.toml.bak-20260918T055110888666Z
```

重载后，侧边栏出现“自定义（config.toml）”，当前会话的有效审批设置也变成了 auto\_review。我随后显式申请额外执行权限，在 /tmp 创建、读取并删除临时文件，测试成功。

2. ## 找到正确的配置文件

在 Codex 插件右上角选择齿轮 → **Codex Settings → Open config.toml**。具体菜单文字可能随版本变化。

默认用户配置路径是 \\x7e/.codex/config.toml。本次 Codex 运行在远程服务器的 root 用户下，所以实际路径是 /root/.codex/config.toml。使用 Remote SSH、容器或 WSL 时，确认打开的是实际运行 Codex 的环境中的配置；如果自定义了 CODEX\_HOME，请检查对应目录。

用户配置与项目内 .codex/config.toml 是不同层级，项目配置可能覆盖用户设置。路径和打开方式参见 [OpenAI 官方配置说明](https://learn.chatgpt.com/docs/config-file/config-basic)。

3. ## 先备份

可以在文件管理器中复制一份原文件，或者在 Codex 所在环境的终端执行下面的 Python 命令。它只创建备份，不修改配置内容：

```
python3 - <<'PY_BACKUP'from datetime import datetime, timezonefrom pathlib import Pathimport osimport shutil
config_dir = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex").expanduser()p = config_dir / "config.toml"if p.exists():    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")    backup = p.with_name(p.name + ".bak-" + stamp)    shutil.copy2(p, backup)    print("备份已保存：", backup)else:    print("尚无配置文件，请在插件中创建：", p)PY_BACKUP
```

4. ## 添加或修改两个顶层配置项

![01-config-location.svg](/images/01-config-location.svg)

将下面两行放在文件最前面，在任何 [features]、[[model\_providers.xxx](http://model_providers.xxx)] 等区块之前：

```
approval_policy = "on-request"approvals_reviewer = "auto_review"
```

如果已有这两个顶层配置项，修改原值即可，不要重复添加。其他模型、服务商、MCP 和项目设置保留原样。

例如，文件结构应当是：

```
approval_policy = "on-request"approvals_reviewer = "auto_review"
# 原有的其他顶层配置继续放在这里。
[features]# 原有 features 配置继续放在这里。
```

不要把这两行直接追加到文件末尾：如果末尾处于某个 [区块] 中，它们就不再是顶层配置。

两个设置的含义：on-request 允许 Codex 在需要时提出审批请求；auto\_review 将符合条件的请求交给独立审核代理处理。原有沙箱边界继续生效，审核仍可能拒绝请求。approval\_policy = "never" 不会触发这种自动审核流程。参见 [OpenAI 官方 Auto-review 说明](https://learn.chatgpt.com/docs/sandboxing/auto-review)。

本次只添加了这两个配置项，没有设置 sandbox\_mode；测试时会话处于只读沙箱，是当时的有效环境状态。

5. ## 重新加载并选择“自定义”
6. 保存 config.toml。
7. 打开 VS Code 命令面板：Windows/Linux 使用 Ctrl+Shift+P，macOS 使用 Cmd+Shift+P。
8. 执行 **Developer: Reload Window（开发人员：重新加载窗口）**。
9. 打开 Codex，新建一个对话。
10. 在权限菜单中选择或保持 **自定义（config.toml）**。

![02-custom-menu.svg](/images/02-custom-menu.svg)

*图 2 根据你提供的截图重绘；绿色边框是教程标注，不代表原截图中的选中状态。*

本次插件用“自定义”表示使用配置文件里的权限组合，这是正常结果。是否显示独立的“替我审批”菜单项还受插件功能开关和权限状态影响；仅凭菜单名称不能确认自动审核是否已生效。

6. ## 验证是否生效

![03-verification-flow.svg](/images/03-verification-flow.svg)

先确认配置文件保存无误。若环境有 Python 3.11+，或较旧 Python 已安装 tomli，可以运行下面的只读检查：

```
python3 - <<'PY_CHECK'from pathlib import Pathimport ostry:    import tomllibexcept ModuleNotFoundError:    import tomli as tomllib
config_dir = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex").expanduser()p = config_dir / "config.toml"d = tomllib.loads(p.read_text())assert d.get("approval_policy") == "on-request"assert d.get("approvals_reviewer") == "auto_review"print("TOML 格式正确，两个顶层配置项均已设置。")PY_CHECK
```

如果提示缺少 tomli，可以改用 Python 3.11+ 执行。这一步只证明文件内容正确，不代表运行中的会话已经加载它。

然后把下面这段话发给 Codex：

> 请测试自动审批。先确认当前会话的有效 approvals\_reviewer 是否为 auto\_review，并说明当前沙箱权限。然后显式申请一次额外执行权限，在 /tmp 创建一个随机命名的临时文本文件，写入一行测试文字，读回验证，并立即删除。只操作本次创建的文件。请报告是否触发审批以及最终执行结果；如果无法观察审批状态，请明确说明。

本次测试工具请求包含 sandbox\_permissions = "require\_escalated"，在只读沙箱下成功完成文件创建、读回和清理；同时，会话有效设置明确显示 approvals\_reviewer = "auto\_review"。

注意：在其他环境中，/tmp 可能原本就可写。仅仅“创建文件成功”或“没弹确认框”不能证明自动审核运行过，必须结合实际审批请求及会话有效设置判断。自己在终端执行测试脚本也不会经过 Codex 的工具审批流程。

7. ## 不生效时检查什么

* **配置没有被加载**：确认修改的是实际执行环境的文件，保存后重载并新建对话。
* **键放错位置或重复**：确认两个键在第一个 TOML 区块之前，且顶层各只有一份。
* **配置被覆盖**：检查项目 .codex/config.toml、启动参数、所选配置以及组织管理要求。参见 [官方配置优先级说明](https://learn.chatgpt.com/docs/config-file/config-basic)。
* **仍显示“自定义”**：这是本次正常结果，以有效设置和审批测试为准。
* **某个请求仍要求人工处理或被拒绝**：查看该次审核结果；开启自动审核不保证每个请求都获批。参见 [官方 Auto-review 说明](https://learn.chatgpt.com/docs/sandboxing/auto-review)。

8. ## 恢复为自己审批

在文件顶层将审核者改为：

```
approval_policy = "on-request"approvals_reviewer = "user"
```

保存、重载窗口并新建对话。

如果要完全撤销本次添加，在当前这台机器上删除新增的两个顶层配置项即可，因为修改前它们都不存在。也可以恢复先前备份，但整份恢复会覆盖备份之后的其他配置修改。
