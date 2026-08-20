Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\ASUS\.gemini\antigravity-ide\brain\3bef190f-d7e0-4618-a1a5-5c9f42455476\.user_uploaded\media_1787218078242.png"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

Write-Host "Width: $($bmp.Width), Height: $($bmp.Height)"

# Check columns for vertical divider 1 (between left flat lay and middle column)
# Check columns around 330-390
$sep1 = @()
for ($x = 330; $x -lt 400; $x++) {
    $isWhite = $true
    for ($y = 0; $y -lt $bmp.Height; $y += 5) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
            $isWhite = $false
            break
        }
    }
    if ($isWhite) {
        $sep1 += $x
    }
}
Write-Host "Vertical Sep 1 (flatlay / middle): $($sep1 -join ', ')"

# Check vertical divider 2 (between middle column and right column)
$sep2 = @()
for ($x = 650; $x -lt 720; $x++) {
    $isWhite = $true
    for ($y = 0; $y -lt $bmp.Height; $y += 5) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
            $isWhite = $false
            break
        }
    }
    if ($isWhite) {
        $sep2 += $x
    }
}
Write-Host "Vertical Sep 2 (middle / right): $($sep2 -join ', ')"

# Check horizontal divider in middle and right columns
$hsep = @()
for ($y = 300; $y -lt 380; $y++) {
    $isWhite = $true
    for ($x = 400; $x -lt $bmp.Width; $x += 5) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) {
            $isWhite = $false
            break
        }
    }
    if ($isWhite) {
        $hsep += $y
    }
}
Write-Host "Horizontal Sep (top / bottom for col 2 & 3): $($hsep -join ', ')"

$bmp.Dispose()
