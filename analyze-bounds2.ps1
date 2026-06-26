Add-Type -AssemblyName System.Drawing

$src = "C:\Users\balah\workspace\trinitas\logo-source.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($src)

function Is-TextPixel($c) {
    $r = $c.R; $g = $c.G; $b = $c.B
    return ($r -lt 60 -and $g -lt 100 -and $b -ge 90 -and $b -le 180)
}

function Is-IconPixel($c) {
    $r = $c.R; $g = $c.G; $b = $c.B
    $isWhite = ($r -gt 240 -and $g -gt 240 -and $b -gt 240)
    if ($isWhite) { return $false }
    if (Is-TextPixel $c) { return $false }
    $isBlue = ($b -gt $r -and $b -gt $g -and $b -ge 50)
    return $isBlue
}

# Icon bounds first
$iconMinX = [int]::MaxValue; $iconMaxX = [int]::MinValue
$iconMinY = [int]::MaxValue; $iconMaxY = [int]::MinValue
for ($y = 220; $y -le 750; $y++) {
    for ($x = 900; $x -le 2000; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (Is-IconPixel $c) {
            if ($x -lt $iconMinX) { $iconMinX = $x }
            if ($x -gt $iconMaxX) { $iconMaxX = $x }
            if ($y -lt $iconMinY) { $iconMinY = $y }
            if ($y -gt $iconMaxY) { $iconMaxY = $y }
        }
    }
}
Write-Host "ICON: minX=$iconMinX maxX=$iconMaxX minY=$iconMinY maxY=$iconMaxY"

# Text bounds - exclude pixels that are icon pixels (in icon region)
$textMinX = [int]::MaxValue; $textMaxX = [int]::MinValue
$textMinY = [int]::MaxValue; $textMaxY = [int]::MinValue
for ($y = 220; $y -le 1341; $y++) {
    for ($x = 430; $x -le 2488; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (Is-TextPixel $c) {
            # Skip if this pixel is in icon region and also an icon pixel
            $inIconRegion = ($x -ge 900 -and $x -le 2000 -and $y -ge 220 -and $y -le 750)
            if ($inIconRegion -and (Is-IconPixel $c)) { continue }
            # Also skip if surrounded by icon (icon interior flat blue)
            if ($x -ge $iconMinX -and $x -le $iconMaxX -and $y -ge $iconMinY -and $y -le $iconMaxY) {
                if (Is-IconPixel $c) { continue }
            }
            if ($x -lt $textMinX) { $textMinX = $x }
            if ($x -gt $textMaxX) { $textMaxX = $x }
            if ($y -lt $textMinY) { $textMinY = $y }
            if ($y -gt $textMaxY) { $textMaxY = $y }
        }
    }
}
Write-Host "TEXT (icon-excluded): minX=$textMinX maxX=$textMaxX minY=$textMinY maxY=$textMaxY"

# Text bounds - only y >= 550 (below icon)
$text2MinX = [int]::MaxValue; $text2MaxX = [int]::MinValue
$text2MinY = [int]::MaxValue; $text2MaxY = [int]::MinValue
for ($y = 550; $y -le 1341; $y++) {
    for ($x = 430; $x -le 2488; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (Is-TextPixel $c) {
            if ($x -lt $text2MinX) { $text2MinX = $x }
            if ($x -gt $text2MaxX) { $text2MaxX = $x }
            if ($y -lt $text2MinY) { $text2MinY = $y }
            if ($y -gt $text2MaxY) { $text2MaxY = $y }
        }
    }
}
Write-Host "TEXT (y>=550): minX=$text2MinX maxX=$text2MaxX minY=$text2MinY maxY=$text2MaxY"

# Include anti-aliased edge pixels for text
$text3MinX = [int]::MaxValue; $text3MaxX = [int]::MinValue
$text3MinY = [int]::MaxValue; $text3MaxY = [int]::MinValue
for ($y = 550; $y -le 1341; $y++) {
    for ($x = 430; $x -le 2488; $x++) {
        $c = $bmp.GetPixel($x, $y)
        $r = $c.R; $g = $c.G; $b = $c.B
        $isTextLoose = ($b -gt $r + 20 -and $b -gt $g + 10 -and $b -ge 60 -and $r -lt 120 -and $g -lt 150 -and ($r + $g + $b) -lt 500)
        if ($isTextLoose) {
            if ($x -lt $text3MinX) { $text3MinX = $x }
            if ($x -gt $text3MaxX) { $text3MaxX = $x }
            if ($y -lt $text3MinY) { $text3MinY = $y }
            if ($y -gt $text3MaxY) { $text3MaxY = $y }
        }
    }
}
Write-Host "TEXT loose (y>=550): minX=$text3MinX maxX=$text3MaxX minY=$text3MinY maxY=$text3MaxY"

# Per-line extents
foreach ($band in @(
    @{ name = "Trinitas"; yStart = 580; yEnd = 750 },
    @{ name = "NextGen"; yStart = 750; yEnd = 950 },
    @{ name = "Private"; yStart = 950; yEnd = 1150 }
)) {
    $bMinX = [int]::MaxValue; $bMaxX = [int]::MinValue; $bMinY = [int]::MaxValue; $bMaxY = [int]::MinValue
    for ($y = $band.yStart; $y -le $band.yEnd; $y++) {
        for ($x = 430; $x -le 2488; $x++) {
            $c = $bmp.GetPixel($x, $y)
            $r = $c.R; $g = $c.G; $b = $c.B
            $isTextLoose = ($b -gt $r + 20 -and $b -gt $g + 10 -and $b -ge 60 -and $r -lt 120 -and $g -lt 150 -and ($r + $g + $b) -lt 500)
            if ($isTextLoose) {
                if ($x -lt $bMinX) { $bMinX = $x }
                if ($x -gt $bMaxX) { $bMaxX = $x }
                if ($y -lt $bMinY) { $bMinY = $y }
                if ($y -gt $bMaxY) { $bMaxY = $y }
            }
        }
    }
    Write-Host "$($band.name): minX=$bMinX maxX=$bMaxX minY=$bMinY maxY=$bMaxY"
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

$clip = @{ minX = 430; minY = 220; maxX = 2488; maxY = 1341 }

# Use best text bounds: loose y>=550 for full anti-alias coverage
$textFinal = @{ minX = $text3MinX; minY = $text3MinY; maxX = $text3MaxX; maxY = $text3MaxY }
$iconFinal = @{ minX = $iconMinX; minY = $iconMinY; maxX = $iconMaxX; maxY = $iconMaxY }
$fullFinal = @{
    minX = [Math]::Min($iconFinal.minX, $textFinal.minX)
    minY = $iconFinal.minY
    maxX = [Math]::Max($iconFinal.maxX, $textFinal.maxX)
    maxY = $textFinal.maxY
}

Write-Host "--- FINAL with 4% pad ---"
foreach ($name in @("text", "icon", "full")) {
    $b = if ($name -eq "text") { $textFinal } elseif ($name -eq "icon") { $iconFinal } else { $fullFinal }
    $p = Pad-Bounds $b.minX $b.minY $b.maxX $b.maxY 0.04 $clip.minX $clip.minY $clip.maxX $clip.maxY
    Write-Host "${name}: raw=$($b.minX)..$($b.maxX) x $($b.minY)..$($b.maxY) => crop x=$($p.x) y=$($p.y) w=$($p.w) h=$($p.h)"
}

$bmp.Dispose()