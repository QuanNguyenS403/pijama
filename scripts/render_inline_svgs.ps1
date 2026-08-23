$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "d:\Pijima\pijama\public\images"
$srcDir = "D:\Pijima\pijama\temp_pyjama_main_extracted"

$allFiles = Get-ChildItem -Path $srcDir

$svgNavy = ($allFiles | Where-Object { $_.Name -match 'navi|navy|caro' } | Select-Object -First 1).FullName
$svgPink = ($allFiles | Where-Object { $_.Name -notmatch 'navi|navy|caro' } | Select-Object -First 1).FullName

Write-Host "Navy SVG: $svgNavy"
Write-Host "Pink SVG: $svgPink"

$contentNavy = [System.IO.File]::ReadAllText($svgNavy)
$contentPink = [System.IO.File]::ReadAllText($svgPink)

$htmlNavy = @"
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 1698px; overflow: hidden; background: #ffffff; }
  svg { width: 1200px; height: 1698px; display: block; }
</style>
</head>
<body>
$contentNavy
</body>
</html>
"@
[System.IO.File]::WriteAllText("d:\Pijima\pijama\inline_navy.html", $htmlNavy, [System.Text.Encoding]::UTF8)

$htmlPink = @"
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 1698px; overflow: hidden; background: #ffffff; }
  svg { width: 1200px; height: 1698px; display: block; }
</style>
</head>
<body>
$contentPink
</body>
</html>
"@
[System.IO.File]::WriteAllText("d:\Pijima\pijama\inline_pink.html", $htmlPink, [System.Text.Encoding]::UTF8)

# Render with Edge
& $edgePath --headless --disable-gpu --screenshot="d:\Pijima\pijama\public\images\classic-set-pink-main.png" --window-size=1200,1698 "file:///d:/Pijima/pijama/inline_pink.html"
& $edgePath --headless --disable-gpu --screenshot="d:\Pijima\pijama\public\images\classic-set-navy-main.png" --window-size=1200,1698 "file:///d:/Pijima/pijama/inline_navy.html"

# Convert to JPG
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

Write-Host "Done inline render successfully!"
