Add-Type -AssemblyName System.Drawing

function Save-Crop($bmp, $x, $y, $cw, $ch, $path, [bool]$transparent = $false) {
    if ($transparent) {
        $out = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        for ($py = 0; $py -lt $ch; $py++) {
            for ($px = 0; $px -lt $cw; $px++) {
                $src = $bmp.GetPixel($x + $px, $y + $py)
                if (Is-Background $src) {
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
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $srcRect = New-Object System.Drawing.Rectangle($x, $y, $cw, $ch)
        $dstRect = New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)
        $g.DrawImage($bmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
    }
    $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    Write-Host "Saved $path (${cw}x${ch}) from (${x},${y})"
}

function Is-Background($c) {
    return ($c.R -gt 238 -and $c.G -gt 238 -and $c.B -gt 238)
}

function Is-TextPixel($c) {
    if (Is-Background $c) { return $false }
    # Flat dark blue text: R<55, G<95, B 95-175
    return ($c.R -lt 55 -and $c.G -lt 95 -and $c.B -gt 95 -and $c.B -lt 175)
}

function Is-IconPixel($c) {
    if (Is-Background $c) { return $false }
    if (Is-TextPixel $c) { return $false }
    if ($c.R -lt 20 -and $c.G -lt 20 -and $c.B -lt 20) { return $false }
    # 3D icon: cyan highlights or strong blue facets (NOT flat text blue)
    if ($c.G -gt 105 -and $c.B -gt 120 -and $c.R -lt 210) { return $true }
    if ($c.B -gt 70 -and ($c.B - $c.R) -gt 18 -and $c.G -gt 40) { return $true }
    return $false
}

function Get-BoundsInRegion($bmp, $x1, $y1, $x2, $y2, $predicate) {
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0; $count = 0
    for ($y = $y1; $y -le $y2; $y++) {
        for ($x = $x1; $x -le $x2; $x++) {
            if (& $predicate ($bmp.GetPixel($x, $y))) {
                $count++
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($count -eq 0) {
        return @{ minX = $null; minY = $null; maxX = $null; maxY = $null; count = 0 }
    }
    return @{ minX = $minX; minY = $minY; maxX = $maxX; maxY = $maxY; count = $count }
}

function Count-PixelsInRegion($bmp, $x1, $y1, $x2, $y2, $predicate) {
    $count = 0
    for ($y = $y1; $y -le $y2; $y++) {
        for ($x = $x1; $x -le $x2; $x++) {
            if (& $predicate ($bmp.GetPixel($x, $y))) { $count++ }
        }
    }
    return $count
}

function Find-GapRowY($bmp, $x1, $x2, $y1, $y2) {
    $bestY = $y1; $bestBg = 0
    $width = $x2 - $x1 + 1
    for ($y = $y1; $y -le $y2; $y++) {
        $bgCnt = 0
        for ($x = $x1; $x -le $x2; $x++) {
            if (Is-Background ($bmp.GetPixel($x, $y))) { $bgCnt++ }
        }
        if ($bgCnt -gt $bestBg) { $bestBg = $bgCnt; $bestY = $y }
    }
    return @{ y = $bestY; bg = $bestBg; width = $width }
}



function Add-Padding3Pct($bounds, $clipMinX, $clipMinY, $clipMaxX, $clipMaxY) {
    $bw = $bounds.maxX - $bounds.minX + 1
    $bh = $bounds.maxY - $bounds.minY + 1
    $padX = [Math]::Max(1, [int]([Math]::Ceiling($bw * 0.03)))
    $padY = [Math]::Max(1, [int]([Math]::Ceiling($bh * 0.03)))
    $x = [Math]::Max($clipMinX, $bounds.minX - $padX)
    $y = [Math]::Max($clipMinY, $bounds.minY - $padY)
    $x2 = [Math]::Min($clipMaxX, $bounds.maxX + $padX)
    $y2 = [Math]::Min($clipMaxY, $bounds.maxY + $padY)
    return @{
        x = $x; y = $y; w = ($x2 - $x + 1); h = ($y2 - $y + 1)
        padX = $padX; padY = $padY
    }
}

function Union-Bounds($a, $b) {
    return @{
        minX = [Math]::Min($a.minX, $b.minX)
        minY = [Math]::Min($a.minY, $b.minY)
        maxX = [Math]::Max($a.maxX, $b.maxX)
        maxY = [Math]::Max($a.maxY, $b.maxY)
    }
}

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $base "logo-source.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($src)

$iconX1 = 900; $iconY1 = 220; $iconX2 = 2000; $iconY2 = 700
$textX1 = 900; $textY1 = 580; $textX2 = 2000; $textY2 = 1340

Write-Host "Source image: $($bmp.Width)x$($bmp.Height)"
Write-Host "Icon scan: x=$iconX1..$iconX2 y=$iconY1..$iconY2"
Write-Host "Text scan: x=$textX1..$textX2 y=$textY1..$textY2"

# 1. Icon only - 3D graphic pixels in icon region
$icon = Get-BoundsInRegion $bmp $iconX1 $iconY1 $iconX2 $iconY2 { param($c) Is-IconPixel $c }

# 2. Text only - flat text pixels in text region (raw, includes icon-shadow false positives above wordmark)
$textRaw = Get-BoundsInRegion $bmp $textX1 $textY1 $textX2 $textY2 { param($c) Is-TextPixel $c }

# Text bounds: flat text pixels after the white gap (excludes icon-shadow false positives above gap)
$gap = Find-GapRowY $bmp $textX1 $textX2 $textY1 ([Math]::Min($textY2, 950))
$textAfterGapY = $gap.y + 1
$text = Get-BoundsInRegion $bmp $textX1 $textAfterGapY $textX2 $textY2 { param($c) Is-TextPixel $c }

$full = Union-Bounds $icon $text

$iconW = $icon.maxX - $icon.minX + 1
$iconH = $icon.maxY - $icon.minY + 1
$textW = $text.maxX - $text.minX + 1
$textH = $text.maxY - $text.minY + 1
$fullW = $full.maxX - $full.minX + 1
$fullH = $full.maxY - $full.minY + 1

Write-Host ""
Write-Host "=== EXACT BOUNDS ==="
Write-Host "Icon:  minX=$($icon.minX) minY=$($icon.minY) maxX=$($icon.maxX) maxY=$($icon.maxY)  (${iconW}x${iconH}, $($icon.count) px)"
Write-Host "Text:  minX=$($text.minX) minY=$($text.minY) maxX=$($text.maxX) maxY=$($text.maxY)  (${textW}x${textH}, $($text.count) px)"
Write-Host "       (raw text scan minY=$($textRaw.minY); gap row y=$($gap.y); text after gap from y=$textAfterGapY)"
Write-Host "Full:  minX=$($full.minX) minY=$($full.minY) maxX=$($full.maxX) maxY=$($full.maxY)  (${fullW}x${fullH})"

$iconTextInBounds = Count-PixelsInRegion $bmp $icon.minX $icon.minY $icon.maxX $icon.maxY { param($c) Is-TextPixel $c }
$textIconInBounds = Count-PixelsInRegion $bmp $text.minX $text.minY $text.maxX $text.maxY { param($c) Is-IconPixel $c }
$iconInTextCropZone = Count-PixelsInRegion $bmp $text.minX $text.minY $text.maxX $text.maxY { param($c) Is-IconPixel $c }
Write-Host ""
Write-Host "=== VALIDATION ==="
Write-Host "Text-classified px in icon bounds: $iconTextInBounds (icon shadows; no letterforms)"
Write-Host "Icon-classified px in text bounds: $textIconInBounds"

$clipMinX = 430; $clipMinY = 220; $clipMaxX = 2488; $clipMaxY = 1341

$iconCrop = Add-Padding3Pct $icon $clipMinX $clipMinY $clipMaxX $clipMaxY
$textCrop = Add-Padding3Pct $text $clipMinX $clipMinY $clipMaxX $clipMaxY
$fullCrop = Add-Padding3Pct $full $clipMinX $clipMinY $clipMaxX $clipMaxY

$iconTextInCrop = Count-PixelsInRegion $bmp $iconCrop.x $iconCrop.y ($iconCrop.x + $iconCrop.w - 1) ($iconCrop.y + $iconCrop.h - 1) { param($c) Is-TextPixel $c }
$textIconInCrop = Count-PixelsInRegion $bmp $textCrop.x $textCrop.y ($textCrop.x + $textCrop.w - 1) ($textCrop.y + $textCrop.h - 1) { param($c) Is-IconPixel $c }

Write-Host ""
Write-Host "=== CROPS (3% padding) ==="
Write-Host "Icon crop:      x=$($iconCrop.x) y=$($iconCrop.y) w=$($iconCrop.w) h=$($iconCrop.h)  (pad $($iconCrop.padX)x$($iconCrop.padY))"
Write-Host "Wordmark crop:  x=$($textCrop.x) y=$($textCrop.y) w=$($textCrop.w) h=$($textCrop.h)  (pad $($textCrop.padX)x$($textCrop.padY))"
Write-Host "Full crop:      x=$($fullCrop.x) y=$($fullCrop.y) w=$($fullCrop.w) h=$($fullCrop.h)  (pad $($fullCrop.padX)x$($fullCrop.padY))"
Write-Host "Icon px in wordmark crop: $textIconInCrop"

Save-Crop $bmp $iconCrop.x $iconCrop.y $iconCrop.w $iconCrop.h (Join-Path $base "logo-icon.png") $true
Save-Crop $bmp $fullCrop.x $fullCrop.y $fullCrop.w $fullCrop.h (Join-Path $base "logo-full.png") $false
Save-Crop $bmp $textCrop.x $textCrop.y $textCrop.w $textCrop.h (Join-Path $base "logo-wordmark.png") $false

$bmp.Dispose()
Write-Host ""
Write-Host "Done."