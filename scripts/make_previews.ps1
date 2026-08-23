Add-Type -AssemblyName System.Drawing

$pngDir = "d:\Pijima\pijama\temp_extracted_pngs"
$prevDir = "d:\Pijima\pijama\temp_previews"

if (!(Test-Path $prevDir)) {
    New-Item -ItemType Directory -Path $prevDir -Force | Out-Null
}

$files = Get-ChildItem -Path $pngDir -Filter "*.png" | Sort-Object Name

foreach ($f in $files) {
    $img = [System.Drawing.Image]::FromFile($f.FullName)
    $targetW = 600
    $targetH = [int]($img.Height * ($targetW / $img.Width))
    
    $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, 0, 0, $targetW, $targetH)
    $g.Dispose()
    
    $outPath = Join-Path $prevDir ($f.BaseName + "_prev.jpg")
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "Created preview for $($f.Name) -> $($outPath)"
}
