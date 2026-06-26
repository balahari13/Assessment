Add-Type -AssemblyName System.Drawing

$src = "C:\Users\balah\workspace\trinitas\logo-source.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$w = $bmp.Width; $h = $bmp.Height

# Lock bits for fast access
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$bd = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $bmp.PixelFormat)
$stride = $bd.Stride
$bytes = [Math]::Abs($stride) * $h
$rgb = New-Object byte[] $bytes
[System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0, $rgb, 0, $bytes)
$bmp.UnlockBits($bd)

function Get-RGB($x, $y) {
    $i = $y * $stride + $x * 4
    return @{ B = $rgb[$i]; G = $rgb[$i+1]; R = $rgb[$i+2] }
}

function Is-TextPixel($r, $g, $b) {
    return ($r -lt 60 -and $g -lt 100 -and $b -ge 90 -and $b -le 180)
}

function Is-TextLoose($r, $g, $b) {
    return ($b -gt ($r + 20) -and $b -gt ($g + 10) -and $b -ge 60 -and $r -lt 120 -and $g -lt 150 -and ($r + $g + $b) -lt 500)
}

function Is-IconPixel($r, $g, $b) {
    if ($r -gt 240 -and $g -gt 240 -and $b -gt 240) { return $false }
    if (Is-TextPixel $r $g $b) { return $false }
    return ($b -gt $r -and $b -gt $g -and $b -ge 50)
}

function Scan-Region($x1, $y1, $x2, $y2, $testFn) {
    $minX = [int]::MaxValue; $maxX = [int]::MinValue
    $minY = [int]::MaxValue; $maxY = [int]::MinValue
    $count = 0
    for ($y = $y1; $y -le $y2; $y++) {
        for ($x = $x1; $x -le $x2; $x++) {
            $p = Get-RGB $x $y
            if (& $testFn $p.R $p.G $p.B) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
                $count++
            }
        }
    }
    return @{ minX = $minX; maxX = $maxX; minY = $minY; maxY = $maxY; count = $count }
}

# ICON: x=900..2000, y=220..750
$icon = Scan-Region 900 220 2000 750 { param($r,$g,$b) Is-IconPixel $r $g $b }
Write-Host "ICON: minX=$($icon.minX) maxX=$($icon.maxX) minY=$($icon.minY) maxY=$($icon.maxY) count=$($icon.count)"

# TEXT strict: full canvas
$textStrict = Scan-Region 430 220 2488 1341 { param($r,$g,$b) Is-TextPixel $r $g $b }
Write-Host "TEXT strict full: minX=$($textStrict.minX) maxX=$($textStrict.maxX) minY=$($textStrict.minY) maxY=$($textStrict.maxY)"

# TEXT strict: y>=550 only (below icon)
$textStrict2 = Scan-Region 430 550 2488 1341 { param($r,$g,$b) Is-TextPixel $r $g $b }
Write-Host "TEXT strict y>=550: minX=$($textStrict2.minX) maxX=$($textStrict2.maxX) minY=$($textStrict2.minY) maxY=$($textStrict2.maxY)"

# TEXT loose anti-alias: y>=550
$textLoose = Scan-Region 430 550 2488 1341 { param($r,$g,$b) Is-TextLoose $r $g $b }
Write-Host "TEXT loose y>=550: minX=$($textLoose.minX) maxX=$($textLoose.maxX) minY=$($textLoose.minY) maxY=$($textLoose.maxY)"

# Per-line
foreach ($band in @(
    @{ name = "Trinitas"; yStart = 580; yEnd = 750 },
    @{ name = "NextGen"; yStart = 750; yEnd = 950 },
    @{ name = "Private"; yStart = 950; yEnd = 1150 }
)) {
    $b = Scan-Region 430 $band.yStart 2488 $band.yEnd { param($r,$g,$b) Is-TextLoose $r $g $b }
    Write-Host "$($band.name): minX=$($b.minX) maxX=$($b.maxX) minY=$($b.minY) maxY=$($b.maxY)"
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
    return @{ x = $x; y = $y; w = ($x2 - $x + 1); h = ($y2 - $y + 1); padX = $padX; padY = $padY }
}

$clipMinX = 430; $clipMinY = 220; $clipMaxX = 2488; $clipMaxY = 1341

# Use loose text bounds for full anti-alias coverage (user wants nothing clipped)
$textFinal = $textLoose
$iconFinal = $icon
$fullFinal = @{
    minX = [Math]::Min($iconFinal.minX, $textFinal.minX)
    minY = $iconFinal.minY
    maxX = [Math]::Max($iconFinal.maxX, $textFinal.maxX)
    maxY = $textFinal.maxY
}

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

$base = Split-Path -Parent $MyInvocation.MyCommand.Path

# Widen icon bounds if right arrow facets were missed
if ($iconFinal.maxX -lt 1700) {
    $iconWide = Scan-Region 900 220 2000 750 { param($r,$g,$b) ($r -gt 240 -and $g -gt 240 -and $b -gt 240) -eq $false -and (Is-TextPixel $r $g $b) -eq $false -and $b -ge 45 -and ($b -gt $r -or $g -gt 90) }
    if ($iconWide.count -gt 0 -and $iconWide.maxX -gt $iconFinal.maxX) {
        $iconFinal = $iconWide
        Write-Host "ICON widened: minX=$($iconFinal.minX) maxX=$($iconFinal.maxX)"
    }
}

$fullFinal = @{
    minX = [Math]::Min($iconFinal.minX, $textFinal.minX)
    minY = $iconFinal.minY
    maxX = [Math]::Max($iconFinal.maxX, $textFinal.maxX)
    maxY = $textFinal.maxY
}

Write-Host "--- PADDED 4% ---"
$crops = @{}
foreach ($label in @("TEXT", "ICON", "FULL")) {
    $b = if ($label -eq "TEXT") { $textFinal } elseif ($label -eq "ICON") { $iconFinal } else { $fullFinal }
    $p = Pad-Bounds $b.minX $b.minY $b.maxX $b.maxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY
    $crops[$label] = $p
    Write-Host "$label raw: $($b.minX),$($b.minY) - $($b.maxX),$($b.maxY) => crop $($p.x),$($p.y) $($p.w)x$($p.h)"
}

$iconCrop = $crops["ICON"]
$textCrop = $crops["TEXT"]
$fullCrop = $crops["FULL"]

Save-Crop $bmp $iconCrop.x $iconCrop.y $iconCrop.w $iconCrop.h (Join-Path $base "logo-icon.png") $true
Save-Crop $bmp $fullCrop.x $fullCrop.y $fullCrop.w $fullCrop.h (Join-Path $base "logo-full.png") $false
Save-Crop $bmp $textCrop.x $textCrop.y $textCrop.w $textCrop.h (Join-Path $base "logo-wordmark.png") $false

$bmp.Dispose()
Write-Host "Done."