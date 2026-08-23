Add-Type -AssemblyName System.Drawing

$srcDir = "d:\Pijima\pijama\temp_extracted_pngs"
$outDir = "d:\Pijima\pijama\public\images"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

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

function Save-Jpeg([System.Drawing.Bitmap]$bmp, [string]$path, [long]$quality = 94) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, $quality)
    $bmp.Save($path, $codec, $encoderParams)
}

function Resize-And-Crop-4x5([string]$srcFile, [string]$outPath, [double]$zoom = 1.0, [double]$focusY = 0.5, [double]$focusX = 0.5) {
    $srcImg = [System.Drawing.Bitmap]::FromFile($srcFile)
    $sw = $srcImg.Width
    $sh = $srcImg.Height
    
    $targetW = 1600
    $targetH = 2000 # 4:5 ratio
    
    # Calculate crop rect from source
    $srcAspect = $sw / $sh
    $targetAspect = 4.0 / 5.0
    
    if ($srcAspect -gt $targetAspect) {
        # Source is wider than target
        $cropH = $sh / $zoom
        $cropW = ($cropH * $targetAspect)
    } else {
        # Source is taller than target
        $cropW = $sw / $zoom
        $cropH = ($cropW / $targetAspect)
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
    
    Save-Jpeg $sharpened $outPath 94
    $sharpened.Dispose()
    Write-Host "Processed -> $outPath ($targetW x $targetH)"
}

Write-Host "--- Processing Pink Stripe Set ---"
# 1. Main: Standing full body (1.png)
Resize-And-Crop-4x5 "$srcDir\1.png" "$outDir\classic-set-pink-main.jpg" 1.0 0.45 0.5

# 2. Thumb 1: Sitting on bed (2.png)
Resize-And-Crop-4x5 "$srcDir\2.png" "$outDir\classic-set-pink-thumb-1.jpg" 1.0 0.45 0.5

# 3. Thumb 2: Standing with tulips (3.png)
Resize-And-Crop-4x5 "$srcDir\3.png" "$outDir\classic-set-pink-thumb-2.jpg" 1.0 0.4 0.48

# 4. Thumb 3: Back view (4.png)
Resize-And-Crop-4x5 "$srcDir\4.png" "$outDir\classic-set-pink-thumb-3.jpg" 1.0 0.45 0.5

# 5. Detail: Close up collar & piping from 1.png
Resize-And-Crop-4x5 "$srcDir\1.png" "$outDir\classic-set-pink-detail.jpg" 2.3 0.28 0.52

Write-Host "--- Processing Navy Plaid Set ---"
# 1. Main: Standing touching flowers (6.png)
Resize-And-Crop-4x5 "$srcDir\6.png" "$outDir\classic-set-navy-main.jpg" 1.0 0.45 0.5

# 2. Thumb 1: Sitting on bed touching hair (5.png)
Resize-And-Crop-4x5 "$srcDir\5.png" "$outDir\classic-set-navy-thumb-1.jpg" 1.0 0.45 0.5

# 3. Thumb 2: Standing by door with mug (7.png)
Resize-And-Crop-4x5 "$srcDir\7.png" "$outDir\classic-set-navy-thumb-2.jpg" 1.0 0.45 0.55

# 4. Thumb 3: Sitting on bed with bouquet (8.png)
Resize-And-Crop-4x5 "$srcDir\8.png" "$outDir\classic-set-navy-thumb-3.jpg" 1.0 0.45 0.5

# 5. Detail: Close up collar & piping from 5.png
Resize-And-Crop-4x5 "$srcDir\5.png" "$outDir\classic-set-navy-detail.jpg" 2.3 0.35 0.45

Write-Host "All Classic Set images processed and replaced in public/images!"
