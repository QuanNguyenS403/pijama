Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\ASUS\.gemini\antigravity-ide\brain\3bef190f-d7e0-4618-a1a5-5c9f42455476\.user_uploaded\media_1787218078242.png"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

Write-Host "Total size: $($bmp.Width) x $($bmp.Height)"

# Find bounding box for flatlay (Left section: x from 0 to 374, y from 0 to 683)
$minX = 374; $maxX = 0; $minY = 683; $maxY = 0
for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt 374; $x++) {
        $c = $bmp.GetPixel($x, $y)
        # Check non-white pixel
        if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
Write-Host "Flatlay non-white bounding box: X=[$minX, $maxX] (W=$($maxX - $minX + 1)), Y=[$minY, $maxY] (H=$($maxY - $minY + 1))"

# Check sub-image 1 (Top-Mid: sitting on bed):
# X: 374 to 683, Y: 0 to 340
Write-Host "Sub 1 (Sitting): X=374..683 (W=$((683-374)+1)), Y=0..340 (H=$((340-0)+1)) -> Aspect Ratio: $(( (683-374)+1 ) / (341.0))"

# Check sub-image 2 (Top-Right: walking):
# X: 687 to 1024, Y: 0 to 340
Write-Host "Sub 2 (Standing right): X=687..1023 (W=$((1023-687)+1)), Y=0..340 (H=$((340-0)+1)) -> Aspect Ratio: $(( (1023-687)+1 ) / (341.0))"

# Check sub-image 3 (Bottom-Mid: back view):
# X: 374 to 683, Y: 344 to 682
Write-Host "Sub 3 (Back view): X=374..683 (W=$((683-374)+1)), Y=344..682 (H=$((682-344)+1)) -> Aspect Ratio: $(( (683-374)+1 ) / (339.0))"

# Check sub-image 4 (Bottom-Right: front smiling):
# X: 687 to 1023, Y: 344 to 682
Write-Host "Sub 4 (Front smiling): X=687..1023 (W=$((1023-687)+1)), Y=344..682 (H=$((682-344)+1)) -> Aspect Ratio: $(( (1023-687)+1 ) / (339.0))"

$bmp.Dispose()
