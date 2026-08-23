Add-Type -AssemblyName System.Drawing

$pngDir = "d:\Pijima\pijama\temp_extracted_pngs"
$files = Get-ChildItem -Path $pngDir -Filter "*.png" | Sort-Object Name

foreach ($f in $files) {
    $img = [System.Drawing.Image]::FromFile($f.FullName)
    $w = $img.Width
    $h = $img.Height
    
    # Sample a few pixels to find dominant color
    $bmp = New-Object System.Drawing.Bitmap($img)
    $rTotal = 0; $gTotal = 0; $bTotal = 0; $samples = 0
    
    for ($x = 100; $x -lt $w - 100; $x += [int]($w / 20)) {
        for ($y = 100; $y -lt $h - 100; $y += [int]($h / 20)) {
            $pixel = $bmp.GetPixel($x, $y)
            $rTotal += $pixel.R
            $gTotal += $pixel.G
            $bTotal += $pixel.B
            $samples++
        }
    }
    
    $rAvg = [int]($rTotal / $samples)
    $gAvg = [int]($gTotal / $samples)
    $bAvg = [int]($bTotal / $samples)
    
    $colorType = "Unknown"
    if ($rAvg -gt $bAvg + 15) {
        $colorType = "PINK/RED tone (Pink Stripe?)"
    } elseif ($bAvg -gt $rAvg - 5 -and $bAvg -gt $gAvg) {
        $colorType = "NAVY/BLUE tone (Navy Plaid?)"
    } else {
        $colorType = "Neutral/Mixed (R:$rAvg G:$gAvg B:$bAvg)"
    }
    
    Write-Host "$($f.Name): Size=${w}x${h} | AvgRGB=($rAvg, $gAvg, $bAvg) | Likely: $colorType"
    
    $bmp.Dispose()
    $img.Dispose()
}
