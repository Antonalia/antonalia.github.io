param(
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$root = Split-Path -Parent $PSCommandPath
Set-Location -LiteralPath $root

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $Arguments,
    [switch] $AllowFailure
  )

  & git -c core.quotepath=false @Arguments
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0 -and -not $AllowFailure) {
    throw "Git 命令失败：git $($Arguments -join ' ')"
  }
  return $exitCode
}

Write-Host ''
Write-Host '========================================'
Write-Host '  博客发布到 GitHub'
Write-Host '========================================'
Write-Host ''
Write-Host "当前博客目录：$root"
Write-Host ''
Write-Host '这个工具会做三件事：'
Write-Host '1. 把你在 Hexo Pro 里改过的文章加入提交'
Write-Host '2. 提交到本地 Git 仓库'
Write-Host '3. 推送到 GitHub，然后 GitHub Pages 自动发布'
Write-Host ''
Write-Host '为什么发布前要 pull --rebase：'
Write-Host '  它会先同步 GitHub 上的最新内容，再把你的本地修改接在最后。'
Write-Host '  例如：远程改了 b.md，你本地改了 a.md，两边改动都会保留。'
Write-Host '  如果远程和本地都改了同一段内容，Git 会停下来提示冲突，不会偷偷覆盖。'
Write-Host ''

try {
  & git --version | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw '没有找到 Git。请先安装 Git。'
  }

  $statusOutput = & git -c core.quotepath=false status --short 2>&1
  if ($LASTEXITCODE -ne 0) {
    $statusText = $statusOutput | Out-String
    if ($statusText -match 'dubious ownership') {
      Write-Host 'Git 认为这个仓库的所有者不一致，需要加一次信任。'
      Write-Host '正在自动修复...'
      Invoke-Git -Arguments @('config', '--global', '--add', 'safe.directory', 'D:/antonalia.github.io') | Out-Null
      $statusOutput = & git -c core.quotepath=false status --short 2>&1
      if ($LASTEXITCODE -ne 0) {
        throw ($statusOutput | Out-String)
      }
    } else {
      throw $statusText
    }
  }

  Write-Host '符号说明：'
  Write-Host '  M  = 已修改：仓库里原本就有这个文件，现在内容变了。'
  Write-Host '  ?? = 新增文件：Git 以前没见过这个文件，还没有提交过。'
  Write-Host '  D  = 已删除：这个文件被删除了。'
  Write-Host '  A  = 已添加：这个新文件已经进入待提交状态。'
  Write-Host '  R  = 已重命名：文件名或路径变了。'
  Write-Host ''
  Write-Host '当前待发布的改动：'
  if ($statusOutput) {
    $statusOutput | ForEach-Object { Write-Host "  $_" }
  } else {
    Write-Host '  没有新的文章或配置改动。'
  }
  Write-Host ''

  if ($DryRun) {
    Write-Host '这是检查模式，没有提交或推送。'
    exit 0
  }

  $message = Read-Host '请输入本次发布说明，直接回车则使用默认值 [update blog]'
  if ([string]::IsNullOrWhiteSpace($message)) {
    $message = 'update blog'
  }

  Write-Host ''
  Write-Host '[1/4] 正在整理要提交的文件...'
  Invoke-Git -Arguments @('add', '-A') | Out-Null

  & git diff --cached --quiet
  $diffExit = $LASTEXITCODE
  if ($diffExit -eq 1) {
    Write-Host "[2/4] 正在创建提交：$message"
    Invoke-Git -Arguments @('commit', '-m', $message) | Out-Null
  } elseif ($diffExit -eq 0) {
    Write-Host '[2/4] 没有新的本地改动需要提交。'
  } else {
    throw '检查暂存改动失败。'
  }

  Write-Host ''
  Write-Host '[3/4] 正在拉取 GitHub 上的最新 main 分支...'
  Write-Host '      这一步使用 pull --rebase：先追上远程最新内容，再接上你的提交。'
  Invoke-Git -Arguments @('pull', '--rebase', 'origin', 'main') | Out-Null

  Write-Host ''
  Write-Host '[4/4] 正在推送到 GitHub...'
  Invoke-Git -Arguments @('push', 'origin', 'main') | Out-Null

  Write-Host ''
  Write-Host '发布提交完成。'
  Write-Host '接下来 GitHub Actions 会自动生成并发布 GitHub Pages。'
  Write-Host '你可以稍等 1 到 3 分钟后刷新博客网站查看效果。'
  exit 0
} catch {
  Write-Host ''
  Write-Host '发布失败。'
  Write-Host $_
  Write-Host ''
  Write-Host '常见原因：GitHub 没登录、网络问题、远端有冲突，或者还没配置 Git 用户名邮箱。'
  exit 1
}
