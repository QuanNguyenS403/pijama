Add-Type -AssemblyName System.Drawing

$outDir = "d:\Pijima\pijama\public\images"
$srcZipDir = "d:\Pijima\pijama\temp_extracted_pngs"
$pinkFlatlaySrc = "C:\Users\ASUS\.gemini\antigravity-ide\brain\3bef190f-d7e0-4618-a1a5-5c9f42455476\.user_uploaded\media_1787218078242.png"

# Find latest generated navy flatlay
$navyFlatlaySrc = (Get-ChildItem -Path "C:\Users\ASUS\.gemini\antigravity-ide\brain\349ba131-7757-49af-9361-16547159dd36\navy_plaid_flatlay_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

function Sharpen-Bitmap([System.Drawing.Bitmap]$source, [float]$amount = 0.35) {
    $width = $source.Width
    $height = $source.Height
    $dest = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $rect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
    $srcData = $source.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $destData = $dest.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $stride = $srcData.Stride
    $bytes = [Math]::Abs($stride) * $height
    $srcBuffer = [byte[]]::new($bytes)
    $destBuffer = [byte[]]::new($bytes)
    
    [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBuffer, 0, $bytes)
    [Array]::Copy($srcBuffer, $destBuffer, $bytes)
    
    for ($y = 1; $y -lt $height - 1; $y++) {
        $rowPrev = ($y - 1) * $stride
        $rowCurr = $y * $stride
        $rowNext = ($y + 1) * $stride
        
        for ($x = 1; $x -lt $width - 1; $x++) {
            $col = $x * 4
            $colPrev = ($x - 1) * 4
            $colNext = ($x + 1) * 4
            
            for ($c = 0; $c -lt 3; $c++) {
                $center = [int]$srcBuffer[$rowCurr + $col + $c]
                $top    = [int]$srcBuffer[$rowPrev + $col + $c]
                $bottom = [int]$srcBuffer[$rowNext + $col + $c]
                $left   = [int]$srcBuffer[$rowCurr + $colPrev + $c]
                $right  = [int]$srcBuffer[$rowCurr + $colNext + $c]
                
                $laplacian = (4 * $center) - ($top + $bottom + $left + $right)
                $val = [int]($center + $amount * $laplacian)
                
                if ($val -lt 0) { $val = 0 }
                if ($val -gt 255) { $val = 255 }
                $destBuffer[$rowCurr + $col + $c] = [byte]$val
            }
            $destBuffer[$rowCurr + $col + 3] = $srcBuffer[$rowCurr + $col + 3]
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($destBuffer, 0, $destData.Scan0, $bytes)
    $source.UnlockBits($srcData)
    $dest.UnlockBits($destData)
    
    return $dest
}

function Save-Jpeg([System.Drawing.Bitmap]$bmp, [string]$path, [long]$quality = 95) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, $quality)
    $bmp.Save($path, $codec, $encoderParams)
}

function Process-Full-Photo([string]$srcFile, [string]$outPath, [double]$focusY = 0.45, [double]$focusX = 0.5) {
    $srcImg = [System.Drawing.Bitmap]::FromFile($srcFile)
    $sw = $srcImg.Width
    $sh = $srcImg.Height
    
    $targetW = 1600
    $targetH = 2000 # 4:5 ratio
    $targetAspect = 4.0 / 5.0
    $srcAspect = $sw / $sh
    
    if ($srcAspect -gt $targetAspect) {
        $cropH = $sh
        $cropW = $sh * $targetAspect
    } else {
        $cropW = $sw
        $cropH = $sw / $targetAspect
    }
    
    $cropX = ($sw - $cropW) * $focusX
    $cropY = ($sh - $cropH) * $focusY
    
    if ($cropX -lt 0) { $cropX = 0 }
    if ($cropY -lt 0) { $cropY = 0 }
    if ($cropX + $cropW -gt $sw) { $cropX = $sw - $cropW }
    if ($cropY + $cropH -gt $sh) { $cropY = $sh - $cropH }
    
    $srcRect = [System.Drawing.Rectangle]::new([int]$cropX, [int]$cropY, [int]$cropW, [int]$cropH)
    
    $canvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $destRect = [System.Drawing.Rectangle]::new(0, 0, $targetW, $targetH)
    $g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $srcImg.Dispose()
    
    $sharpened = Sharpen-Bitmap $canvas 0.35
    $canvas.Dispose()
    
    Save-Jpeg $sharpened $outPath 95
    $sharpened.Dispose()
    Write-Host "Processed Photo -> $outPath"
}

# ═══════════════════════════════════════════════════════════
# 1. PINK STRIPE SET
# ═══════════════════════════════════════════════════════════

# MAIN: Garment flat-lay on pure white background
Write-Host "Creating Pink Stripe Flatlay Main on White Background..."
$pinkFlatSrcBmp = [System.Drawing.Bitmap]::FromFile($pinkFlatlaySrc)
$targetW = 1600
$targetH = 2000
$pinkMainCanvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gPink = [System.Drawing.Graphics]::FromImage($pinkMainCanvas)
$gPink.Clear([System.Drawing.Color]::White)
$gPink.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gPink.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gPink.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$pinkCrop = [System.Drawing.Rectangle]::new(40, 10, 340, 650)
$destH = 1800
$destW = [int]($pinkCrop.Width * ($destH / $pinkCrop.Height))
$destX = [int](($targetW - $destW) / 2)
$destY = [int](($targetH - $destH) / 2)

$gPink.DrawImage($pinkFlatSrcBmp, [System.Drawing.Rectangle]::new($destX, $destY, $destW, $destH), $pinkCrop, [System.Drawing.GraphicsUnit]::Pixel)
$gPink.Dispose()
$pinkFlatSrcBmp.Dispose()

$pinkMainSharp = Sharpen-Bitmap $pinkMainCanvas 0.45
$pinkMainCanvas.Dispose()
Save-Jpeg $pinkMainSharp "$outDir\classic-set-pink-main.jpg" 95
$pinkMainSharp.Dispose()
Write-Host "Saved: classic-set-pink-main.jpg"

# THUMBNAILS (Photos 1 to 4 from Zip at full unzoomed size)
Process-Full-Photo "$srcZipDir\1.png" "$outDir\classic-set-pink-thumb-1.jpg" 0.45 0.50
Process-Full-Photo "$srcZipDir\2.png" "$outDir\classic-set-pink-thumb-2.jpg" 0.45 0.50
Process-Full-Photo "$srcZipDir\3.png" "$outDir\classic-set-pink-thumb-3.jpg" 0.42 0.48
# Thumbnail 4 / Detail -> Photo 4 full size (back view, unzoomed!)
Process-Full-Photo "$srcZipDir\4.png" "$outDir\classic-set-pink-detail.jpg" 0.45 0.50

# ═══════════════════════════════════════════════════════════
# 2. NAVY PLAID SET
# ═══════════════════════════════════════════════════════════

# MAIN: Garment flat-lay on pure white background
Write-Host "Creating Navy Plaid Flatlay Main on White Background..."
$navyFlatSrcBmp = [System.Drawing.Bitmap]::FromFile($navyFlatlaySrc)
$navyMainCanvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gNavy = [System.Drawing.Graphics]::FromImage($navyMainCanvas)
$gNavy.Clear([System.Drawing.Color]::White)
$gNavy.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gNavy.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gNavy.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$navySrcAspect = $navyFlatSrcBmp.Width / $navyFlatSrcBmp.Height
$navyDestH = 1820
$navyDestW = [int]($navyDestH * $navySrcAspect)
$navyDestX = [int](($targetW - $navyDestW) / 2)
$navyDestY = [int](($targetH - $navyDestH) / 2)

$gNavy.DrawImage($navyFlatSrcBmp, [System.Drawing.Rectangle]::new($navyDestX, $navyDestY, $navyDestW, $navyDestH), [System.Drawing.Rectangle]::new(0, 0, $navyFlatSrcBmp.Width, $navyFlatSrcBmp.Height), [System.Drawing.GraphicsUnit]::Pixel)
$gNavy.Dispose()
$navyFlatSrcBmp.Dispose()

$navyMainSharp = Sharpen-Bitmap $navyMainCanvas 0.45
$navyMainCanvas.Dispose()
Save-Jpeg $navyMainSharp "$outDir\classic-set-navy-main.jpg" 95
$navyMainSharp.Dispose()
Write-Host "Saved: classic-set-navy-main.jpg"

# THUMBNAILS (Photos 6, 5, 7, 8 from Zip at full unzoomed size)
Process-Full-Photo "$srcZipDir\6.png" "$outDir\classic-set-navy-thumb-1.jpg" 0.45 0.50
Process-Full-Photo "$srcZipDir\5.png" "$outDir\classic-set-navy-thumb-2.jpg" 0.45 0.50
Process-Full-Photo "$srcZipDir\7.png" "$outDir\classic-set-navy-thumb-3.jpg" 0.45 0.55
# Thumbnail 4 / Detail -> Photo 8 full size (sitting with flowers, unzoomed!)
Process-Full-Photo "$srcZipDir\8.png" "$outDir\classic-set-navy-detail.jpg" 0.45 0.50

Write-Host "ALL IMAGES UPDATED PERFECTLY!"
