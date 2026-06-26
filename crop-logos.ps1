Add-Type -AssemblyName System.Drawing

function Save-Crop($bmp, $x, $y, $cw, $ch, $path, [bool]$keyWhite = $false) {
    $out = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($out)
    if ($keyWhite) { $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0)) }
    else { $g.Clear([System.Drawing.Color]::White) }
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $srcRect = New-Object System.Drawing.Rectangle($x, $y, $cw, $ch)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)
    $g.DrawImage($bmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    if ($keyWhite) {
        for ($py = 0; $py -lt $ch; $py++) {
            for ($px = 0; $px -lt $cw; $px++) {
                $c = $out.GetPixel($px, $py)
                if ($c.R -gt 232 -and $c.G -gt 232 -and $c.B -gt 232) {
                    $out.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B))
                }
            }
        }
    }

    $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    Write-Host "Saved $path (${cw}x${ch}) from (${x},${y})"
}

function Pad-Bounds($minX, $minY, $maxX, $maxY, $padPct, $clipMinX, $clipMinY, $clipMaxX, $clipMaxY) {
    $w = $maxX - $minX + 1
    $h = $maxY - $minY + 1
    $padX = [Math]::Max(10, [int]($w * $padPct))
    $padY = [Math]::Max(10, [int]($h * $padPct))
    $x = [Math]::Max($clipMinX, $minX - $padX)
    $y = [Math]::Max($clipMinY, $minY - $padY)
    $x2 = [Math]::Min($clipMaxX, $maxX + $padX)
    $y2 = [Math]::Min($clipMaxY, $maxY + $padY)
    return @{ x = $x; y = $y; w = ($x2 - $x + 1); h = ($y2 - $y + 1); padX = $padX; padY = $padY }
}

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $base "logo-source.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($src)

# White canvas (excludes black letterbox bars)
$clipMinX = 430; $clipMinY = 220; $clipMaxX = 2488; $clipMaxY = 1341

# Verified bounds from logo-source.jpg pixel scan (System.Drawing)
#
# TEXT scan: x=430..2488, y=220..1341
#   Flat dark blue (R<60, G<100, B 90-180)
#   Leftmost text pixel: x=839 ("NextGen Business Solutions")
#   Rightmost text pixel: x=1983 ("Private Limited")
#   Per-line: Trinitas 1080..1680 | NextGen 839..1593 | Private 840..1983
#   Anti-aliased left edge: x=838
#   Full-canvas vertical extent: minY=250 maxY=1311 (250 is icon-shadow false positive)
#   Wordmark vertical extent: minY=580 maxY=1312 (top of "Trinitas" letterforms)
#   Left-edge "NextGen" starts at y=916, x=839
#
# ICON scan: x=900..2000, y=220..750
#   3D blue graphic (exclude text pixels)
#   minX=1077 maxX=1784 minY=246 maxY=750

$icon = @{ minX = 1077; minY = 246; maxX = 1784; maxY = 750 }
$textScan = @{ minX = 839; minY = 250; maxX = 1983; maxY = 1311 }
$text = @{ minX = 838; minY = 580; maxX = 1983; maxY = 1312 }
$full = @{
    minX = [Math]::Min($icon.minX, $text.minX)
    minY = $icon.minY
    maxX = [Math]::Max($icon.maxX, $text.maxX)
    maxY = $text.maxY
}

Write-Host "White canvas: $clipMinX..$clipMaxX x $clipMinY..$clipMaxY"
Write-Host "Icon bounds:  $($icon.minX)..$($icon.maxX) x $($icon.minY)..$($icon.maxY)"
Write-Host "Text scan:    $($textScan.minX)..$($textScan.maxX) x $($textScan.minY)..$($textScan.maxY)"
Write-Host "Text crop:    $($text.minX)..$($text.maxX) x $($text.minY)..$($text.maxY)"
Write-Host "Full bounds:  $($full.minX)..$($full.maxX) x $($full.minY)..$($full.maxY)"

$iconCrop = Pad-Bounds $icon.minX $icon.minY $icon.maxX $icon.maxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY
$fullCrop = Pad-Bounds $full.minX $full.minY $full.maxX $full.maxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY
$wordCrop = Pad-Bounds $text.minX $text.minY $text.maxX $text.maxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY

Write-Host "Icon crop (4%):      x=$($iconCrop.x) y=$($iconCrop.y) w=$($iconCrop.w) h=$($iconCrop.h) pad=$($iconCrop.padX)x$($iconCrop.padY)"
Write-Host "Wordmark crop (4%):  x=$($wordCrop.x) y=$($wordCrop.y) w=$($wordCrop.w) h=$($wordCrop.h) pad=$($wordCrop.padX)x$($wordCrop.padY)"
Write-Host "Full crop (4%):      x=$($fullCrop.x) y=$($fullCrop.y) w=$($fullCrop.w) h=$($fullCrop.h) pad=$($fullCrop.padX)x$($fullCrop.padY)"

Save-Crop $bmp $iconCrop.x $iconCrop.y $iconCrop.w $iconCrop.h (Join-Path $base "logo-icon.png") $true
Save-Crop $bmp $fullCrop.x $fullCrop.y $fullCrop.w $fullCrop.h (Join-Path $base "logo-full.png") $false
Save-Crop $bmp $wordCrop.x $wordCrop.y $wordCrop.w $wordCrop.h (Join-Path $base "logo-wordmark.png") $false

$bmp.Dispose()
Write-Host "Done."