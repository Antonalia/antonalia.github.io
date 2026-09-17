$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$assetDir = Join-Path $root 'assets'
$adminIconPath = Join-Path $assetDir 'hexo-admin.ico'
$publishIconPath = Join-Path $assetDir 'publish-github.ico'

if (-not (Test-Path -LiteralPath $assetDir)) {
  New-Item -ItemType Directory -Path $assetDir | Out-Null
}

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class NativeIcon {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool DestroyIcon(IntPtr hIcon);
}
'@

function Save-BlogIcon {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path,
    [Parameter(Mandatory = $true)]
    [scriptblock] $Draw
  )

  $bitmap = [System.Drawing.Bitmap]::new(256, 256)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $rect = [System.Drawing.Rectangle]::new(0, 0, 256, 256)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    & $Draw $graphics $rect

    $hicon = $bitmap.GetHicon()
    try {
      $icon = [System.Drawing.Icon]::FromHandle($hicon)
      $stream = [System.IO.File]::Create($Path)
      try {
        $icon.Save($stream)
      } finally {
        $stream.Dispose()
        $icon.Dispose()
      }
    } finally {
      [NativeIcon]::DestroyIcon($hicon) | Out-Null
    }
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

Save-BlogIcon -Path $adminIconPath -Draw {
  param($graphics, $rect)

  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $rect,
    [System.Drawing.Color]::FromArgb(26, 103, 184),
    [System.Drawing.Color]::FromArgb(20, 155, 132),
    35
  )
  $paper = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(246, 250, 255))
  $fold = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(208, 226, 247))
  $linePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(26, 103, 184), 12)
  $penBody = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 197, 55), 22)
  $penTip = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(21, 43, 64), 14)

  try {
    $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penBody.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penBody.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penTip.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penTip.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $graphics.FillRectangle($background, $rect)
    $graphics.FillRectangle($paper, [System.Drawing.Rectangle]::new(58, 38, 124, 160))
    $graphics.FillPolygon($fold, [System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(142, 38),
      [System.Drawing.Point]::new(182, 78),
      [System.Drawing.Point]::new(142, 78)
    ))
    $graphics.DrawLine($linePen, 82, 94, 154, 94)
    $graphics.DrawLine($linePen, 82, 126, 154, 126)
    $graphics.DrawLine($linePen, 82, 158, 132, 158)
    $graphics.DrawLine($penBody, 128, 194, 194, 128)
    $graphics.DrawLine($penTip, 185, 137, 204, 118)
  } finally {
    $penTip.Dispose()
    $penBody.Dispose()
    $linePen.Dispose()
    $fold.Dispose()
    $paper.Dispose()
    $background.Dispose()
  }
}

Save-BlogIcon -Path $publishIconPath -Draw {
  param($graphics, $rect)

  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $rect,
    [System.Drawing.Color]::FromArgb(19, 132, 92),
    [System.Drawing.Color]::FromArgb(32, 86, 180),
    35
  )
  $cloud = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 252, 255))
  $arrowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 204, 69), 22)
  $arrowHead = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 204, 69))
  $basePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(21, 43, 64), 14)

  try {
    $arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $basePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $basePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $graphics.FillRectangle($background, $rect)
    $graphics.FillEllipse($cloud, [System.Drawing.Rectangle]::new(50, 112, 62, 62))
    $graphics.FillEllipse($cloud, [System.Drawing.Rectangle]::new(91, 78, 78, 78))
    $graphics.FillEllipse($cloud, [System.Drawing.Rectangle]::new(143, 106, 64, 64))
    $graphics.FillRectangle($cloud, [System.Drawing.Rectangle]::new(70, 128, 124, 50))
    $graphics.DrawLine($arrowPen, 128, 178, 128, 82)
    $graphics.FillPolygon($arrowHead, [System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(128, 54),
      [System.Drawing.Point]::new(88, 102),
      [System.Drawing.Point]::new(168, 102)
    ))
    $graphics.DrawLine($basePen, 78, 204, 178, 204)
  } finally {
    $basePen.Dispose()
    $arrowHead.Dispose()
    $arrowPen.Dispose()
    $cloud.Dispose()
    $background.Dispose()
  }
}

$programs = [Environment]::GetFolderPath('Programs')
$shortcutDir = Join-Path $programs 'Hexo Blog'

if (-not (Test-Path -LiteralPath $shortcutDir)) {
  New-Item -ItemType Directory -Path $shortcutDir | Out-Null
}

$shell = New-Object -ComObject WScript.Shell

function New-BlogShortcut {
  param(
    [string] $Name,
    [string] $BatchFile,
    [string] $IconFile,
    [string] $Description
  )

  $shortcutPath = Join-Path $shortcutDir $Name
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $env:ComSpec
  $shortcut.Arguments = "/c `"$BatchFile`""
  $shortcut.WorkingDirectory = $root
  $shortcut.IconLocation = $IconFile
  $shortcut.Description = $Description
  $shortcut.Save()
}

New-BlogShortcut `
  -Name '打开博客后台.lnk' `
  -BatchFile (Join-Path $root 'start-admin.bat') `
  -IconFile $adminIconPath `
  -Description '打开本地 Hexo Pro 博客后台。'

New-BlogShortcut `
  -Name '发布博客到 GitHub.lnk' `
  -BatchFile (Join-Path $root 'publish-github.bat') `
  -IconFile $publishIconPath `
  -Description '提交并推送博客源码到 GitHub。'

Write-Host "Created shortcuts in: $shortcutDir"
