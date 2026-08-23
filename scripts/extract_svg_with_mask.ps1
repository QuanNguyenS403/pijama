Add-Type -AssemblyName System.Drawing

$srcDir = "D:\Pijima\pijama\temp_pyjama_main_extracted"
$outDir = "d:\Pijima\pijama\public\images"

$allFiles = Get-ChildItem -Path $srcDir
$svgNavy = ($allFiles | Where-Object { $_.Name -match 'navi|navy|caro' } | Select-Object -First 1).FullName
$svgPink = ($allFiles | Where-Object { $_.Name -notmatch 'navi|navy|caro' } | Select-Object -First 1).FullName

function Extract-Mask-And-Color([string]$svgPath) {
    $content = [System.IO.File]::ReadAllText($svgPath)
    $matches = [regex]::Matches($content, 'href="data:image/(?<ext>[^;]+);base64,(?<data>[^"]+)"')
    
    Write-Host "Found $($matches.Count) images in $svgPath"
    
    # Sort by length: smaller is mask, larger is RGB
    $sorted = $matches | Sort-Object { $_.Groups['data'].Value.Length }
    
    $maskBytes = [System.Convert]::FromBase64String($sorted[0].Groups['data'].Value)
    $colorBytes = [System.Convert]::FromBase64String($sorted[1].Groups['data'].Value)
    
    $maskBmp = [System.Drawing.Bitmap]::FromStream([System.IO.MemoryStream]::new($maskBytes))
    $colorBmp = [System.Drawing.Bitmap]::FromStream([System.IO.MemoryStream]::new($colorBytes))
    
    Write-Host "Mask size: $($maskBmp.Width) x $($maskBmp.Height)"
    Write-Host "Color size: $($colorBmp.Width) x $($colorBmp.Height)"
    
    $w = $colorBmp.Width
    $h = $colorBmp.Height
    
    # Combine into true 32bpp ARGB Bitmap
    $combined = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    # Lock bits for high speed processing
    $rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
    $colorData = $colorBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $combinedData = $combined.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    # If mask is same size or needs scaling
    $scaledMask = if ($maskBmp.Width -eq $w -and $maskBmp.Height -eq $h) {
        $maskBmp
    } else {
        $sm = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $gm = [System.Drawing.Graphics]::FromImage($sm)
        $gm.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gm.DrawImage($maskBmp, 0, 0, $w, $h)
        $gm.Dispose()
        $sm
    }
    $maskData = $scaledMask.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    
    $colorStride = $colorData.Stride
    $maskStride = $maskData.Stride
    $combStride = $combinedData.Stride
    
    $colorBuf = [byte[]]::new($colorStride * $h)
    $maskBuf = [byte[]]::new($maskStride * $h)
    $combBuf = [byte[]]::new($combStride * $h)
    
    [System.Runtime.InteropServices.Marshal]::Copy($colorData.Scan0, $colorBuf, 0, $colorBuf.Length)
    [System.Runtime.InteropServices.Marshal]::Copy($maskData.Scan0, $maskBuf, 0, $maskBuf.Length)
    
    for ($y = 0; $y -lt $h; $y++) {
        $rowC = $y * $colorStride
        $rowM = $y * $maskStride
        $rowComb = $y * $combStride
        
        for ($x = 0; $x -lt $w; $x++) {
            $colC = $x * 3
            $colM = $x * 3
            $colComb = $x * 4
            
            $b = $colorBuf[$rowC + $colC]
            $g = $colorBuf[$rowC + $colC + 1]
            $r = $colorBuf[$rowC + $colC + 2]
            
            # Mask luminance
            $mb = $maskBuf[$rowM + $colM]
            $mg = $maskBuf[$rowM + $colM + 1]
            $mr = $maskBuf[$rowM + $colM + 2]
            # Standard luminance
            $alpha = [int]($mr * 0.299 + $mg * 0.587 + $mb * 0.114)
            if ($alpha -gt 255) { $alpha = 255 }
            
            $combBuf[$rowComb + $colComb] = $b
            $combBuf[$rowComb + $colComb + 1] = $g
            $combBuf[$rowComb + $colComb + 2] = $r
            $combBuf[$rowComb + $colComb + 3] = [byte]$alpha
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($combBuf, 0, $combinedData.Scan0, $combBuf.Length)
    
    $colorBmp.UnlockBits($colorData)
    $scaledMask.UnlockBits($maskData)
    $combined.UnlockBits($combinedData)
    
    $colorBmp.Dispose()
    $maskBmp.Dispose()
    if ($scaledMask -ne $maskBmp) { $scaledMask.Dispose() }
    
    return $combined
}

$cutoutPink = Extract-Mask-And-Color $svgPink
$cutoutNavy = Extract-Mask-And-Color $svgNavy

# Now render each cutout onto the white page using the SVG coordinates
$svgW = 594.95996
$svgH = 842.24997

$targetW = 1600
$targetH = [int][Math]::Round($targetW * ($svgH / $svgW))
$scale = $targetW / $svgW

function Render-Cutout-To-Page([System.Drawing.Bitmap]$cutoutBmp, [double]$tx, [double]$ty, [double]$sx, [double]$sy, [double]$clipX, [double]$clipY, [double]$clipW, [double]$clipH, [string]$outJpg, [string]$outPng) {
    $canvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    
    # Solid pure white background
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    
    # Clip matching SVG
    $pixelClipX = [float]($clipX * $scale)
    $pixelClipY = [float]($clipY * $scale)
    $pixelClipW = [float]($clipW * $scale)
    $pixelClipH = [float]($clipH * $scale)
    $clipRegion = [System.Drawing.RectangleF]::new($pixelClipX, $pixelClipY, $pixelClipW, $pixelClipH)
    $g.SetClip($clipRegion)
    
    $destX = [float]($tx * $scale)
    $destY = [float]($ty * $scale)
    $destW = [float]($cutoutBmp.Width * $sx * $scale)
    $destH = [float]($cutoutBmp.Height * $sy * $scale)
    
    $destRect = [System.Drawing.RectangleF]::new($destX, $destY, $destW, $destH)
    $srcRect = [System.Drawing.RectangleF]::new(0, 0, $cutoutBmp.Width, $cutoutBmp.Height)
    
    $g.DrawImage($cutoutBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.ResetClip()
    $g.Dispose()
    
    $canvas.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 98)
    $canvas.Save($outJpg, $codec, $encoderParams)
    $canvas.Dispose()
    
    Write-Host "Saved perfect white background main -> $outJpg & $outPng"
}

# 1. Pink Stripe
Render-Cutout-To-Page $cutoutPink 117.517547 -65.581956 0.231297 0.231239 118.0 0.0 (468.207031 - 118.0) 841.5 "$outDir\classic-set-pink-main.jpg" "$outDir\classic-set-pink-main.png"

# 2. Navy Plaid
Render-Cutout-To-Page $cutoutNavy -245.581644 -55.460929 0.23496 0.234898 116.507812 0.0 (474.6875 - 116.507812) 841.5 "$outDir\classic-set-navy-main.jpg" "$outDir\classic-set-navy-main.png"

$cutoutPink.Dispose()
$cutoutNavy.Dispose()

Write-Host "COMPLETED PERFECT EXTRACTION AND COMPOSITING!"
