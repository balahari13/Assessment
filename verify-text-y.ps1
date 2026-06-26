Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("C:\Users\balah\workspace\trinitas\logo-source.jpg")

function Is-TextPixel($c) {
    return ($c.R -lt 60 -and $c.G -lt 100 -and $c.B -ge 90 -and $c.B -le 180)
}

# Full canvas text scan per user spec
$minX=[int]::MaxValue;$maxX=[int]::MinValue;$minY=[int]::MaxValue;$maxY=[int]::MinValue
for ($y=220;$y -le 1341;$y++) {
  for ($x=430;$x -le 2488;$x++) {
    if (Is-TextPixel ($bmp.GetPixel($x,$y))) {
      if ($x -lt $minX) {$minX=$x}
      if ($x -gt $maxX) {$maxX=$x}
      if ($y -lt $minY) {$minY=$y}
      if ($y -gt $maxY) {$maxY=$y}
    }
  }
}
Write-Host "Full canvas TEXT: $minX $minY $maxX $maxY"

# Text top: first row with text pixels in lower half (y>=550)
for ($y=550;$y -le 1341;$y++) {
  $found=$false
  for ($x=430;$x -le 2488;$x++) {
    if (Is-TextPixel ($bmp.GetPixel($x,$y))) { $found=$true; break }
  }
  if ($found) { Write-Host "First text row y>=550: $y"; break }
}

# Left edge text top (x=839..900)
$minY2=[int]::MaxValue
for ($y=220;$y -le 1341;$y++) {
  for ($x=839;$x -le 900;$x++) {
    if (Is-TextPixel ($bmp.GetPixel($x,$y))) {
      if ($y -lt $minY2) {$minY2=$y}
    }
  }
}
Write-Host "Left-edge text (x 839-900) minY: $minY2"

$bmp.Dispose()