Add-Type -AssemblyName System.Drawing

$src = "C:\Users\balah\workspace\trinitas\logo-source.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$w = $bmp.Width; $h = $bmp.Height
Write-Host "Image size: ${w}x${h}"

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

# TEXT scan: x=430..2488, y=220..1341
$textMinX = [int]::MaxValue; $textMaxX = [int]::MinValue
$textMinY = [int]::MaxValue; $textMaxY = [int]::MinValue
$textCount = 0

for ($y = 220; $y -le 1341; $y++) {
    for ($x = 430; $x -le 2488; $x++) {
        if ($x -lt $w -and $y -lt $h) {
            $c = $bmp.GetPixel($x, $y)
            if (Is-TextPixel $c) {
                if ($x -lt $textMinX) { $textMinX = $x }
                if ($x -gt $textMaxX) { $textMaxX = $x }
                if ($y -lt $textMinY) { $textMinY = $y }
                if ($y -gt $textMaxY) { $textMaxY = $y }
                $textCount++
            }
        }
    }
}

Write-Host "TEXT bounds raw: minX=$textMinX maxX=$textMaxX minY=$textMinY maxY=$textMaxY count=$textCount"

# ICON scan: x=900..2000, y=220..750
$iconMinX = [int]::MaxValue; $iconMaxX = [int]::MinValue
$iconMinY = [int]::MaxValue; $iconMaxY = [int]::MinValue
$iconCount = 0

for ($y = 220; $y -le 750; $y++) {
    for ($x = 900; $x -le 2000; $x++) {
        if ($x -lt $w -and $y -lt $h) {
            $c = $bmp.GetPixel($x, $y)
            if (Is-IconPixel $c) {
                if ($x -lt $iconMinX) { $iconMinX = $x }
                if ($x -gt $iconMaxX) { $iconMaxX = $x }
                if ($y -lt $iconMinY) { $iconMinY = $y }
                if ($y -gt $iconMaxY) { $iconMaxY = $y }
                $iconCount++
            }
        }
    }
}

Write-Host "ICON bounds raw: minX=$iconMinX maxX=$iconMaxX minY=$iconMinY maxY=$iconMaxY count=$iconCount"

# Per-line text analysis - find horizontal extents per Y band
Write-Host "--- Text Y-band analysis ---"
$bands = @(
    @{ name = "Trinitas"; yStart = 580; yEnd = 750 },
    @{ name = "NextGen"; yStart = 750; yEnd = 950 },
    @{ name = "Private"; yStart = 950; yEnd = 1150 }
)
foreach ($band in $bands) {
    $bMinX = [int]::MaxValue; $bMaxX = [int]::MinValue
    for ($y = $band.yStart; $y -le $band.yEnd; $y++) {
        for ($x = 430; $x -le 2488; $x++) {
            if ($x -lt $w -and $y -lt $h) {
                $c = $bmp.GetPixel($x, $y)
                if (Is-TextPixel $c) {
                    if ($x -lt $bMinX) { $bMinX = $x }
                    if ($x -gt $bMaxX) { $bMaxX = $x }
                }
            }
        }
    }
    Write-Host "$($band.name): minX=$bMinX maxX=$bMaxX"
}

# Looser text detection for edge pixels (anti-aliased)
Write-Host "--- Looser text bounds (anti-alias) ---"
$looseMinX = [int]::MaxValue; $looseMaxX = [int]::MinValue
$looseMinY = [int]::MaxValue; $looseMaxY = [int]::MinValue
for ($y = 220; $y -le 1341; $y++) {
    for ($x = 430; $x -le 2488; $x++) {
        if ($x -lt $w -and $y -lt $h) {
            $c = $bmp.GetPixel($x, $y)
            $r = $c.R; $g = $c.G; $b = $c.B
            # Dark blue text including anti-aliased edges
            $isTextLoose = ($b -gt $r + 20 -and $b -gt $g + 10 -and $b -ge 60 -and $r -lt 120 -and $g -lt 150 -and ($r + $g + $b) -lt 500)
            if ($isTextLoose) {
                if ($x -lt $looseMinX) { $looseMinX = $x }
                if ($x -gt $looseMaxX) { $looseMaxX = $x }
                if ($y -lt $looseMinY) { $looseMinY = $y }
                if ($y -gt $looseMaxY) { $looseMaxY = $y }
            }
        }
    }
}
Write-Host "Loose text: minX=$looseMinX maxX=$looseMaxX minY=$looseMinY maxY=$looseMaxY"

# Compute padded bounds with 4% padding
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

$textPad = Pad-Bounds $textMinX $textMinY $textMaxX $textMaxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY
$iconPad = Pad-Bounds $iconMinX $iconMinY $iconMaxX $iconMaxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY
$loosePad = Pad-Bounds $looseMinX $looseMinY $looseMaxX $looseMaxY 0.04 $clipMinX $clipMinY $clipMaxX $clipMaxY

Write-Host "TEXT padded 4%: x=$($textPad.x) y=$($textPad.y) w=$($textPad.w) h=$($textPad.h) padX=$($textPad.padX) padY=$($textPad.padY)"
Write-Host "ICON padded 4%: x=$($iconPad.x) y=$($iconPad.y) w=$($iconPad.w) h=$($iconPad.h) padX=$($iconPad.padX) padY=$($iconPad.padY)"
Write-Host "Loose text padded 4%: x=$($loosePad.x) y=$($loosePad.y) w=$($loosePad.w) h=$($loosePad.h)"

$bmp.Dispose()