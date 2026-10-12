# Draws the app icons (black belt with gold stripes on red). Run: powershell -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent

function New-Brush($r, $g, $b) { New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($r, $g, $b)) }

function Draw-Icon([int]$size, [string]$name, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $red = New-Brush 179 34 46
  if ($maskable) {
    $g.FillRectangle($red, 0, 0, $size, $size)
    $scale = 0.70
  } else {
    $r = $size * 0.22
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
    $p.AddArc($size - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
    $p.AddArc($size - 2 * $r, $size - 2 * $r, 2 * $r, 2 * $r, 0, 90)
    $p.AddArc(0, $size - 2 * $r, 2 * $r, 2 * $r, 90, 90)
    $p.CloseFigure()
    $g.FillPath($red, $p)
    $scale = 0.92
  }
  $c = $size * $scale
  $o = ($size - $c) / 2
  # Shapes are laid out on a 100 x 100 grid, then scaled into the icon.
  $pt = { param($x, $y) [System.Drawing.PointF]::new($o + $c * $x / 100, $o + $c * $y / 100) }
  $rect = { param($brush, $x1, $y1, $x2, $y2) $g.FillRectangle($brush, $o + $c * $x1 / 100, $o + $c * $y1 / 100, $c * ($x2 - $x1) / 100, $c * ($y2 - $y1) / 100) }
  $black = New-Brush 20 20 20
  $knot = New-Brush 44 44 44
  $gold = New-Brush 214 166 48
  & $rect $black 6 36 94 56
  foreach ($x in 72, 78, 84) { & $rect $gold $x 36 ($x + 3) 56 }
  $g.FillPolygon($black, [System.Drawing.PointF[]]@((& $pt 44 56), (& $pt 52 56), (& $pt 40 86), (& $pt 31 82)))
  $g.FillPolygon($black, [System.Drawing.PointF[]]@((& $pt 49 56), (& $pt 57 56), (& $pt 69 82), (& $pt 60 86)))
  & $rect $knot 40 31 60 61
  $bmp.Save((Join-Path $root $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Draw-Icon 180 'icon-180.png' $false
Draw-Icon 192 'icon-192.png' $false
Draw-Icon 512 'icon-512.png' $false
Draw-Icon 512 'icon-maskable-512.png' $true
'icons written'
