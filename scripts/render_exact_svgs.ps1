$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "d:\Pijima\pijama\public\images"
$srcDir = "d:\Pijima\pijama\temp_pyjama_main_extracted"

# Copy SVG files to ASCII safe filenames in public
Get-ChildItem -Path $srcDir -Filter "*.svg" | ForEach-Object {
    if ($_.Name -match 'navi|navy|caro') {
        Copy-Item -Path $_.FullName -Destination "$outDir\classic-set-navy-main.svg" -Force
        Copy-Item -Path $_.FullName -Destination "d:\Pijima\pijama\temp_navy.svg" -Force
    } else {
        Copy-Item -Path $_.FullName -Destination "$outDir\classic-set-pink-main.svg" -Force
        Copy-Item -Path $_.FullName -Destination "d:\Pijima\pijama\temp_pink.svg" -Force
    }
}

# Create HTML wrappers for pixel-perfect rendering with zero margin and white background
$htmlNavy = @"
<!DOCTYPE html>
<html>
<head>
<style>
  html, body { margin: 0; padding: 0; width: 1600px; height: 2265px; overflow: hidden; background: #ffffff; }
  img, svg { width: 1600px; height: 2265px; display: block; }
</style>
</head>
<body>
  <img src="file:///d:/Pijima/pijama/temp_navy.svg" />
</body>
</html>
"@
[System.IO.File]::WriteAllText("d:\Pijima\pijama\temp_navy.html", $htmlNavy)

$htmlPink = @"
<!DOCTYPE html>
<html>
<head>
<style>
  html, body { margin: 0; padding: 0; width: 1600px; height: 2265px; overflow: hidden; background: #ffffff; }
  img, svg { width: 1600px; height: 2265px; display: block; }
</style>
</head>
<body>
  <img src="file:///d:/Pijima/pijama/temp_pink.svg" />
</body>
</html>
"@
[System.IO.File]::WriteAllText("d:\Pijima\pijama\temp_pink.html", $htmlPink)

# Render Pink
& $edgePath --headless --disable-gpu --screenshot="d:\Pijima\pijama\public\images\classic-set-pink-main.png" --window-size=1600,2265 "file:///d:/Pijima/pijama/temp_pink.html"
# Render Navy
& $edgePath --headless --disable-gpu --screenshot="d:\Pijima\pijama\public\images\classic-set-navy-main.png" --window-size=1600,2265 "file:///d:/Pijima/pijama/temp_navy.html"

# Also convert the rendered PNGs to JPG for maximum compatibility
Add-Type -AssemblyName System.Drawing

function Convert-To-Jpg([string]$pngPath, [string]$jpgPath) {
    $bmp = [System.Drawing.Bitmap]::FromFile($pngPath)
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 98)
    $bmp.Save($jpgPath, $codec, $encoderParams)
    $bmp.Dispose()
}

Convert-To-Jpg "$outDir\classic-set-pink-main.png" "$outDir\classic-set-pink-main.jpg"
Convert-To-Jpg "$outDir\classic-set-navy-main.png" "$outDir\classic-set-navy-main.jpg"

Write-Host "Both main images rendered and saved to public/images!"
