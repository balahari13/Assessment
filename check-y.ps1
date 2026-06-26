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
for ($y=885;$y -le 930;$y++) {
  $ic=0;$tx=0;$bg=0
  for ($x=900;$x -le 2000;$x++) {
    $c=$bmp.GetPixel($x,$y)
    if (Is-Background $c) {$bg++} elseif (Is-TextPixel $c) {$tx++} elseif (Is-IconPixel $c) {$ic++}
  }
  Write-Host "y=$y icon=$ic text=$tx bg=$bg"
}
$bmp.Dispose()