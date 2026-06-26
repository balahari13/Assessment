Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile("C:\Users\balah\workspace\trinitas\logo-source.jpg")
$minX=9999; $maxX=0; $minY=9999; $maxY=0
for ($y = 220; $y -le 750; $y++) {
    for ($x = 900; $x -le 2000; $x++) {
        $c = $b.GetPixel($x, $y)
        if ($c.R -gt 235 -and $c.G -gt 235 -and $c.B -gt 235) { continue }
        if ($c.R -lt 60 -and $c.G -lt 100 -and $c.B -gt 90 -and $c.B -lt 180) { continue }
        if ($c.B -ge 45 -and ($c.B -gt $c.R -or $c.G -gt 90)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
Write-Host "icon minX=$minX maxX=$maxX minY=$minY maxY=$maxY"
$b.Dispose()