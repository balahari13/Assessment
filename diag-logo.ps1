Add-Type -AssemblyName System.Drawing

function Is-Background($c) {
    return ($c.R -gt 238 -and $c.G -gt 238 -and $c.B -gt 238)
}

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
$x1=900; $x2=2000

Write-Host "Row analysis x=$x1..$x2"
Write-Host "Y    icon  text  bg   dominant"
for ($y = 220; $y -le 900; $y += 5) {
    $ic=0; $tx=0; $bg=0
    for ($x = $x1; $x -le $x2; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (Is-Background $c) { $bg++ }
        elseif (Is-TextPixel $c) { $tx++ }
        elseif (Is-IconPixel $c) { $ic++ }
    }
    $dom = "mixed"
    if ($ic -gt $tx -and $ic -gt 100) { $dom = "ICON" }
    elseif ($tx -gt $ic -and $tx -gt 100) { $dom = "TEXT" }
    elseif ($bg -gt 900) { $dom = "gap" }
    if ($ic -gt 0 -or $tx -gt 50) {
        Write-Host ("{0,4} {1,5} {2,5} {3,5} {4}" -f $y, $ic, $tx, $bg, $dom)
    }
}

# Icon bounds using icon pixels only in full vertical range
$minX=9999;$minY=9999;$maxX=0;$maxY=0
for ($y=220;$y -le 750;$y++) {
  for ($x=900;$x -le 2000;$x++) {
    if (Is-IconPixel ($bmp.GetPixel($x,$y))) {
      if ($x -lt $minX) {$minX=$x}
      if ($y -lt $minY) {$minY=$y}
      if ($x -gt $maxX) {$maxX=$x}
      if ($y -gt $maxY) {$maxY=$y}
    }
  }
}
Write-Host ""
Write-Host "Icon-only bbox (y 220-750): $minX $minY $maxX $maxY"

# Text bounds in lower region only (y>=700)
$minX=9999;$minY=9999;$maxX=0;$maxY=0
for ($y=700;$y -le 1340;$y++) {
  for ($x=900;$x -le 2000;$x++) {
    if (Is-TextPixel ($bmp.GetPixel($x,$y))) {
      if ($x -lt $minX) {$minX=$x}
      if ($y -lt $minY) {$minY=$y}
      if ($x -gt $maxX) {$maxX=$x}
      if ($y -gt $maxY) {$maxY=$y}
    }
  }
}
Write-Host "Text-only bbox (y 700-1340): $minX $minY $maxX $maxY"

# Find widest white gap row between icon and text
$bestGapY = -1; $bestGapW = 0
for ($y=500;$y -le 900;$y++) {
  $bg=0
  for ($x=900;$x -le 2000;$x++) {
    if (Is-Background ($bmp.GetPixel($x,$y))) { $bg++ }
  }
  if ($bg -gt $bestGapW) { $bestGapW=$bg; $bestGapY=$y }
}
Write-Host "Widest gap row: y=$bestGapY bg=$bestGapW / 1101"

$bmp.Dispose()