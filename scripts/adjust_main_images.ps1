[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$dir = "d:\QNS Clothes\pijama\public\images"
$distDir = "d:\QNS Clothes\pijama\dist\images"

# Backup originals if not already backed up
$pinkBackup = Join-Path $dir "classic-set-pink-main.original.jpg"
$navyBackup = Join-Path $dir "classic-set-navy-main.original.jpg"

if (-not (Test-Path $pinkBackup)) {
    Copy-Item (Join-Path $dir "classic-set-pink-main.jpg") $pinkBackup -Force
    Write-Host "Created pink original backup: $pinkBackup"
}
if (-not (Test-Path $navyBackup)) {
    Copy-Item (Join-Path $dir "classic-set-navy-main.jpg") $navyBackup -Force
    Write-Host "Created navy original backup: $navyBackup"
}

function Save-HighQualityJpeg([System.Drawing.Bitmap]$bmp, [string]$path, [long]$quality = 98) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, $quality)
    $bmp.Save($path, $codec, $encoderParams)
}

# ══════════════════════════════════════════════════════════════════
# 1. ADJUST PINK MAIN (Ảnh 1)
# Yêu cầu: "chỉnh cho kích thước khung của sản phẩm nhỏ đi một chút"
# Scale down garment size proportionally by ~7.5% (scale = 0.925)
# ══════════════════════════════════════════════════════════════════
Write-Host "Processing Pink Main (Ảnh 1)..."
$pinkSrcBmp = [System.Drawing.Bitmap]::FromFile($pinkBackup)
$w = $pinkSrcBmp.Width   # 2110
$h = $pinkSrcBmp.Height  # 2982

# True garment crop in pink: X=42..2086 (W=2044), Y=334..2746 (H=2412)
$pinkSrcRect = [System.Drawing.Rectangle]::new(40, 330, 2048, 2420)

# Sizing: Scale size down proportionally (kích thước nhỏ đi một chút: ~7.5%)
$pinkScale = 0.925
$pinkDestW = [int]($pinkSrcRect.Width * $pinkScale)    # ~1894
$pinkDestH = [int]($pinkSrcRect.Height * $pinkScale)   # ~2238

# Center horizontally and place vertically with elegant margin
$pinkDestX = [int](($w - $pinkDestW) / 2)
$pinkDestY = [int](($h - $pinkDestH) / 2)

$pinkCanvas = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gP = [System.Drawing.Graphics]::FromImage($pinkCanvas)
$gP.Clear([System.Drawing.Color]::White)
$gP.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gP.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gP.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gP.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$pinkDestRect = [System.Drawing.Rectangle]::new($pinkDestX, $pinkDestY, $pinkDestW, $pinkDestH)
$gP.DrawImage($pinkSrcBmp, $pinkDestRect, $pinkSrcRect, [System.Drawing.GraphicsUnit]::Pixel)
$gP.Dispose()
$pinkSrcBmp.Dispose()

$pinkOut = Join-Path $dir "classic-set-pink-main.jpg"
Save-HighQualityJpeg $pinkCanvas $pinkOut 98
if (Test-Path $distDir) {
    Copy-Item $pinkOut (Join-Path $distDir "classic-set-pink-main.jpg") -Force
}
$pinkCanvas.Dispose()
Write-Host "Ảnh 1 (Pink) saved: Garment scaled to ${pinkDestW}x${pinkDestH} (scale: $pinkScale) at ($pinkDestX, $pinkDestY)"

# ══════════════════════════════════════════════════════════════════
# 2. ADJUST NAVY MAIN (Ảnh 2)
# Yêu cầu: "chỉnh cho chiều dài của khung sản phẩm ngắn đi một chút xíu thôi, lưu ý là chỉ một chút xíu"
# Width kept intact (or virtually same), Length (height) shortened by just 3.0% (heightScale = 0.970)
# ══════════════════════════════════════════════════════════════════
Write-Host "Processing Navy Main (Ảnh 2)..."
$navySrcBmp = [System.Drawing.Bitmap]::FromFile($navyBackup)
$w = $navySrcBmp.Width   # 2110
$h = $navySrcBmp.Height  # 2982

# True garment crop in navy: X=30..2082 (W=2052), Y=306..2686 (H=2380)
$navySrcRect = [System.Drawing.Rectangle]::new(28, 304, 2056, 2384)

# Width kept intact (scale 1.0), Length (height) shortened by 3% (scale 0.970)
$navyScaleW = 1.0
$navyScaleH = 0.970  # 3% shorter length

$navyDestW = [int]($navySrcRect.Width * $navyScaleW)   # 2056
$navyDestH = [int]($navySrcRect.Height * $navyScaleH)  # ~2312 (~72px shorter)

# Keep horizontal alignment centered, and position vertically so top collar stays aligned
$navyDestX = [int](($w - $navyDestW) / 2)
# Shift top down slightly to 325 so collar stays balanced and bottom hem raises by ~50px
$navyDestY = 325

$navyCanvas = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gN = [System.Drawing.Graphics]::FromImage($navyCanvas)
$gN.Clear([System.Drawing.Color]::White)
$gN.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gN.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gN.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gN.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$navyDestRect = [System.Drawing.Rectangle]::new($navyDestX, $navyDestY, $navyDestW, $navyDestH)
$gN.DrawImage($navySrcBmp, $navyDestRect, $navySrcRect, [System.Drawing.GraphicsUnit]::Pixel)
$gN.Dispose()
$navySrcBmp.Dispose()

$navyOut = Join-Path $dir "classic-set-navy-main.jpg"
Save-HighQualityJpeg $navyCanvas $navyOut 98
if (Test-Path $distDir) {
    Copy-Item $navyOut (Join-Path $distDir "classic-set-navy-main.jpg") -Force
}
$navyCanvas.Dispose()
Write-Host "Ảnh 2 (Navy) saved: Length shortened to $navyDestH (scale: $navyScaleH, was $($navySrcRect.Height)) at ($navyDestX, $navyDestY)"

Write-Host "ALL IMAGES SUCCESSFULLY ADJUSTED!"
