Add-Type -AssemblyName System.Drawing

function Save-Crop($bmp, $x, $y, $cw, $ch, $path, [bool]$transparent = $false) {
    if ($transparent) {
        $out = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        for ($py = 0; $py -lt $ch; $py++) {
            for ($px = 0; $px -lt $cw; $px++) {
                $src = $bmp.GetPixel($x + $px, $y + $py)
                if ($src.R -gt 232 -and $src.G -gt 232 -and $src.B -gt 232) {
                    $out.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                }
                else {
                    $out.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(255, $src.R, $src.G, $src.B))
                }
            }
        }
    }
    else {
        $out = New-Object System.Drawing.Bitmap($cw, $ch)
        $g = [System.Drawing.Graphics]::FromImage($out)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $srcRect = New-Object System.Drawing.Rectangle($x, $y, $cw, $ch)
        $dstRect = New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)
        $g.DrawImage($bmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
    }
    $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    Write-Host "Saved $path (${cw}x${ch}) from (${x},${y})"
}

function Pad-Bounds($minX, $minY, $maxX, $maxY, $padPct, $clipMinX, $clipMinY, $clipMaxX, $clipMaxY) {
    $bw = $maxX - $minX + 1
    $bh = $maxY - $minY + 1
    $padX = [Math]::Max(10, [int]($bw * $padPct))
    $padY = [Math]::Max(10, [int]($bh * $padPct))
    $x = [Math]::Max($clipMinX, $minX - $padX)
    $y = [Math]::Max($clipMinY, $minY - $padY)
    $x2 = [Math]::Min($clipMaxX, $maxX + $padX)
    $y2 = [Math]::Min($clipMaxY, $maxY + $padY)
    return @{ x = $x; y = $y; w = ($x2 - $x + 1); h = ($y2 - $y + 1) }
}

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $base "logo-source.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($src)

$clipMinX = 430; $clipMinY = 220; $clipMaxX = 2488; $clipMaxY = 1341

# Verified via pixel scan of logo-source.jpg
$icon = @{ minX = 1101; minY = 247; maxX = 1785; maxY = 720 }
$text = @{ minX = 838; minY = 550; maxX = 1983; maxY = 1312 }
$full = @{
    minX = [Math]::Min($icon.minX, $text.minX)
    minY = $icon.minY
    maxX = [Math]::Max($icon.maxX, $text.maxX)
    maxY = $text.maxY
}

$iconCrop = Pad-Bounds $icon.minX $icon.minY $icon.maxX $icon.maxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY
$textCrop = Pad-Bounds $text.minX $text.minY $text.maxX $text.maxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY
$fullCrop = Pad-Bounds $full.minX $full.minY $full.maxX $full.maxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY

Write-Host "Icon crop: $($iconCrop.x),$($iconCrop.y) $($iconCrop.w)x$($iconCrop.h)"
Write-Host "Text crop: $($textCrop.x),$($textCrop.y) $($textCrop.w)x$($textCrop.h)"
Write-Host "Full crop: $($fullCrop.x),$($fullCrop.y) $($fullCrop.w)x$($fullCrop.h)"

Save-Crop $bmp $iconCrop.x $iconCrop.y $iconCrop.w $iconCrop.h (Join-Path $base "logo-icon.png") $true
Save-Crop $bmp $fullCrop.x $fullCrop.y $fullCrop.w $fullCrop.h (Join-Path $base "logo-full.png") $false
Save-Crop $bmp $textCrop.x $textCrop.y $textCrop.w $textCrop.h (Join-Path $base "logo-wordmark.png") $false

$bmp.Dispose()
Write-Host "Done."