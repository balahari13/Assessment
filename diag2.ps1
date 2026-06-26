Add-Type -AssemblyName System.Drawing

function Is-Background($c) { return ($c.R -gt 238 -and $c.G -gt 238 -and $c.B -gt 238) }
function Is-TextPixel($c) {
    if (Is-Background $c) { return $false }
    return ($c.R -lt 55 -and $c.G -lt 95 -and $c.B -gt 95 -and $c.B -lt 175)
}
function Is-IconPixel($c) {
    if (Is-Background $c) { return $false }
    if (Is-TextPixel $c) { return $false }
    if ($c.R -lt 20 -and $c.G -lt 20 -and $c.B -lt 20) { return $false }
    if ($c.G -gt 105 -and $c.B -gt 120 -and $c.R -lt 210) { return $true }
    if ($c.B -gt 70 -and ($c.B - $c.R) -gt 18 -and $c.G -gt 40) { return $true }
    return $false
}

$bmp = [System.Drawing.Bitmap]::FromFile("C:\Users\balah\workspace\trinitas\logo-source.jpg")

foreach ($startY in @(850, 860, 870, 880)) {
  $minX=9999;$minY=9999;$maxX=0;$maxY=0;$cnt=0
  for ($y=$startY;$y -le 1340;$y++) {
    for ($x=900;$x -le 2000;$x++) {
      if (Is-TextPixel ($bmp.GetPixel($x,$y))) {
        $cnt++
        if ($x -lt $minX) {$minX=$x}
        if ($y -lt $minY) {$minY=$y}
        if ($x -gt $maxX) {$maxX=$x}
        if ($y -gt $maxY) {$maxY=$y}
      }
    }
  }
  Write-Host "Text bbox y>=$startY : $minX $minY $maxX $maxY count=$cnt"
}

# Icon in user region 900-2000, 220-700
$minX=9999;$minY=9999;$maxX=0;$maxY=0;$cnt=0
for ($y=220;$y -le 700;$y++) {
  for ($x=900;$x -le 2000;$x++) {
    if (Is-IconPixel ($bmp.GetPixel($x,$y))) {
      $cnt++
      if ($x -lt $minX) {$minX=$x}
      if ($y -lt $minY) {$minY=$y}
      if ($x -gt $maxX) {$maxX=$x}
      if ($y -gt $maxY) {$maxY=$y}
    }
  }
}
Write-Host "Icon bbox (900-2000,220-700): $minX $minY $maxX $maxY count=$cnt"

# Icon extended to y=750 within x range
$minX=9999;$minY=9999;$maxX=0;$maxY=0;$cnt=0
for ($y=220;$y -le 750;$y++) {
  for ($x=900;$x -le 2000;$x++) {
    if (Is-IconPixel ($bmp.GetPixel($x,$y))) {
      $cnt++
      if ($x -lt $minX) {$minX=$x}
      if ($y -lt $minY) {$minY=$y}
      if ($x -gt $maxX) {$maxX=$x}
      if ($y -gt $maxY) {$maxY=$y}
    }
  }
}
Write-Host "Icon bbox (900-2000,220-750): $minX $minY $maxX $maxY count=$cnt"

$bmp.Dispose()