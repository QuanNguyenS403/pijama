Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\ASUS\.gemini\antigravity-ide\brain\3bef190f-d7e0-4618-a1a5-5c9f42455476\.user_uploaded\media_1787218078242.png"
$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Source width: $($srcBmp.Width), height: $($srcBmp.Height)"

# The pink garment is on the left side
# Let's find the bounding box of the garment (where pixels are not white)
$minX = $srcBmp.Width; $minY = $srcBmp.Height; $maxX = 0; $maxY = 0

# Scan left 40% of image
$scanW = [int]($srcBmp.Width * 0.4)
for ($x = 0; $x -lt $scanW; $x++) {
    for ($y = 0; $y -lt $srcBmp.Height; $y++) {
        $pixel = $srcBmp.GetPixel($x, $y)
        # Check if not pure white (R < 250 or G < 250 or B < 250)
        if ($pixel.R -lt 248 -or $pixel.G -lt 248 -or $pixel.B -lt 248) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Pajama bounds: X=$minX..$maxX (W=$($maxX-$minX)), Y=$minY..$maxY (H=$($maxY-$minY))"
$srcBmp.Dispose()
