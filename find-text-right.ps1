Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile("C:\Users\balah\workspace\trinitas\logo-source.jpg")
$maxX = 0; $minX = 9999
for ($y = 550; $y -le 1312; $y++) {
    for ($x = 430; $x -le 2488; $x++) {
        $c = $b.GetPixel($x, $y)
        if ($c.R -lt 120 -and $c.G -lt 150 -and $c.B -gt 60 -and -not ($c.R -gt 235 -and $c.G -gt 235 -and $c.B -gt 235)) {
            if ($x -gt $maxX) { $maxX = $x }
            if ($x -lt $minX) { $minX = $x }
        }
    }
}
Write-Host "text minX=$minX maxX=$maxX"
$b.Dispose()