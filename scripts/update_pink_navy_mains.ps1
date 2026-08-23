[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$publicImages = "d:\Pijima\pijama\public\images"
$navyRaw = "d:\Pijima\pijama\temp_pyjama_1\extracted\extracted_navy_main.png"
$pinkRaw = "d:\Pijima\pijama\temp_pyjama_1\extracted\extracted_pink_main.png"

$tempFiles = Get-ChildItem "d:\Pijima\pijama\temp_pyjama_1\*.svg"
$navySvg = ($tempFiles | Where-Object { $_.Name -like "*navi*" }).FullName
$pinkSvg = ($tempFiles | Where-Object { $_.Name -notlike "*navi*" }).FullName

function Save-HighQualityJpeg([System.Drawing.Bitmap]$bmp, [string]$path, [long]$quality = 95) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, $quality)
    $bmp.Save($path, $codec, $encoderParams)
    $len = (Get-Item $path).Length
    Write-Host "Saved JPEG: $path ($len bytes)"
}

function Process-Main-Image([string]$srcPng, [string]$outBaseName) {
    $srcImg = [System.Drawing.Bitmap]::FromFile($srcPng)
    $sw = $srcImg.Width
    $sh = $srcImg.Height
    Write-Host "Processing $outBaseName ($sw x $sh)..."

    $targetW = [int]($sw * 2)
    $targetH = [int]($sh * 2)

    $canvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $destRect = [System.Drawing.Rectangle]::new(0, 0, $targetW, $targetH)
    $srcRect = [System.Drawing.Rectangle]::new(0, 0, $sw, $sh)
    $g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $srcImg.Dispose()

    # Save 24-bit JPEG
    $jpgPath = Join-Path $publicImages ($outBaseName + ".jpg")
    Save-HighQualityJpeg $canvas $jpgPath 95

    # Save 24-bit PNG
    $pngPath = Join-Path $publicImages ($outBaseName + ".png")
    $canvas.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngLen = (Get-Item $pngPath).Length
    Write-Host "Saved PNG: $pngPath ($pngLen bytes)"

    $canvas.Dispose()
}

# 1. Process Pink Stripe Main
Process-Main-Image $pinkRaw "classic-set-pink-main"
Copy-Item $pinkSvg (Join-Path $publicImages "classic-set-pink-main.svg") -Force
Write-Host "Updated classic-set-pink-main.svg"

# 2. Process Navy Plaid Main
Process-Main-Image $navyRaw "classic-set-navy-main"
Copy-Item $navySvg (Join-Path $publicImages "classic-set-navy-main.svg") -Force
Write-Host "Updated classic-set-navy-main.svg"

Write-Host "All Main Images for Pink Stripe and Navy Plaid have been successfully replaced!"
