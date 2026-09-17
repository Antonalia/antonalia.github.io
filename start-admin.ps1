param(
  [switch] $NoBrowser
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$root = Split-Path -Parent $PSCommandPath
Set-Location -LiteralPath $root
$adminUrl = 'http://localhost:4000/pro/'
$siteUrl = 'http://localhost:4000/'

function Test-LocalPort {
  param([int] $Port)

  try {
    $client = [Net.Sockets.TcpClient]::new()
    $client.Connect('127.0.0.1', $Port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Test-AdminPage {
  try {
    $response = Invoke-WebRequest -Uri $adminUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

Write-Host ''
Write-Host '========================================'
Write-Host '  打开 Hexo Pro 博客后台'
Write-Host '========================================'
Write-Host ''
Write-Host "当前博客目录：$root"
Write-Host ''

if (-not (Test-LocalPort -Port 4000)) {
  Write-Host '正在启动 Hexo 服务，请稍等...'
  Start-Process -FilePath (Join-Path $root 'run-hexo-server.bat') -WorkingDirectory $root

  $ready = $false
  for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-AdminPage) {
      $ready = $true
      break
    }
    Write-Host "等待后台启动中... $i/30"
  }

  if (-not $ready) {
    Write-Host ''
    Write-Host '后台暂时没有启动成功。'
    Write-Host '请看新打开的 Hexo Local Server 窗口里有没有红色错误。'
    exit 1
  }
} else {
  Write-Host 'Hexo 服务已经在运行，直接打开后台。'
}

Write-Host ''
Write-Host "后台地址：$adminUrl"
Write-Host "博客首页：$siteUrl"

if (-not $NoBrowser) {
  Start-Process $adminUrl
  Write-Host ''
  Write-Host '浏览器已打开。如果没有弹出，请复制上面的后台地址。'
}

exit 0
