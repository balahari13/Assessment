Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("C:\Users\balah\workspace\trinitas\logo-source.jpg")

function Is-TextPixel($c) {
    return ($c.R -lt 60 -and $c.G -lt 100 -and $c.B -ge 90 -and $c.B -le 180)
}

# Trinitas line region (from per-line scan)
$minY=[int]::MaxValue;$maxY=0;$minX=[int]::MaxValue;$maxX=0
for ($y=580;$y -le 850;$y++) {
  for ($x=1080;$x -le 1680;$x++) {
    if (Is-TextPixel ($bmp.GetPixel($x,$y))) {
      if ($y -lt $minY) {$minY=$y}
      if ($y -gt $maxY) {$maxY=$y}
      if ($x -lt $minX) {$minX=$x}
      if ($x -gt $maxX) {$maxX=$x}
    }
  }
}
Write-Host "Trinitas region: $minX $minY $maxX $maxY"

# Full text block: all text pixels with y>=580
$minY2=[int]::MaxValue;$maxY2=0;$minX2=[int]::MaxValue;$maxX2=0
for ($y=580;$y -le 1341;$y++) {
  for ($x=430;$x -le 2488;$x++) {
    if (Is-TextPixel ($bmp.GetPixel($x,$y))) {
      if ($y -lt $minY2) {$minY2=$y}
      if ($y -gt $maxY2) {$maxY2=$y}
      if ($x -lt $minX2) {$minX2=$x}
      if ($x -gt $maxX2) {$maxX2=$x}
    }
  }
}
Write-Host "Text y>=580: $minX2 $minY2 $maxX2 $maxY2"

$bmp.Dispose()