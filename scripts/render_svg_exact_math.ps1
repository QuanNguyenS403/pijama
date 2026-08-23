Add-Type -AssemblyName System.Drawing

$outDir = "d:\Pijima\pijama\public\images"
$srcDir = "D:\Pijima\pijama\temp_pyjama_main_extracted"

# 1. Extract raw master PNG bytes from SVGs
$allFiles = Get-ChildItem -Path $srcDir

$svgNavy = ($allFiles | Where-Object { $_.Name -match 'navi|navy|caro' } | Select-Object -First 1).FullName
$svgPink = ($allFiles | Where-Object { $_.Name -notmatch 'navi|navy|caro' } | Select-Object -First 1).FullName

function Get-Largest-Image-From-Svg([string]$svgPath) {
    $content = [System.IO.File]::ReadAllText($svgPath)
    $matches = [regex]::Matches($content, 'href="data:image/(?<ext>[^;]+);base64,(?<data>[^"]+)"')
    $bestMatch = $null
    $maxLen = 0
    foreach ($m in $matches) {
        $len = $m.Groups['data'].Value.Length
        if ($len -gt $maxLen) {
            $maxLen = $len
            $bestMatch = $m
        }
    }
    $bytes = [System.Convert]::FromBase64String($bestMatch.Groups['data'].Value)
    $ms = [System.IO.MemoryStream]::new($bytes)
    return [System.Drawing.Bitmap]::FromStream($ms)
}

$bmpNavyMaster = Get-Largest-Image-From-Svg $svgNavy
$bmpPinkMaster = Get-Largest-Image-From-Svg $svgPink

Write-Host "Navy Master size: $($bmpNavyMaster.Width) x $($bmpNavyMaster.Height)"
Write-Host "Pink Master size: $($bmpPinkMaster.Width) x $($bmpPinkMaster.Height)"

# SVG viewBox: 0 0 594.95996 842.24997
$svgW = 594.95996
$svgH = 842.24997

# Render target at high resolution (1600 x 2265)
$targetW = 1600
$targetH = [int][Math]::Round($targetW * ($svgH / $svgW))
$scale = $targetW / $svgW

Write-Host "Target canvas: $targetW x $targetH (scale: $scale)"

function Render-Svg-Page([System.Drawing.Bitmap]$masterBmp, [double]$tx, [double]$ty, [double]$sx, [double]$sy, [double]$clipX, [double]$clipY, [double]$clipW, [double]$clipH, [string]$outJpg, [string]$outPng) {
    $canvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    
    # 1. Solid pure white background
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # 2. Set clipping rectangle matching the SVG clipPath
    $pixelClipX = [float]($clipX * $scale)
    $pixelClipY = [float]($clipY * $scale)
    $pixelClipW = [float]($clipW * $scale)
    $pixelClipH = [float]($clipH * $scale)
    $clipRegion = [System.Drawing.RectangleF]::new($pixelClipX, $pixelClipY, $pixelClipW, $pixelClipH)
    $g.SetClip($clipRegion)
    
    # 3. Draw image at transformed position
    $destX = [float]($tx * $scale)
    $destY = [float]($ty * $scale)
    $destW = [float]($masterBmp.Width * $sx * $scale)
    $destH = [float]($masterBmp.Height * $sy * $scale)
    
    $destRect = [System.Drawing.RectangleF]::new($destX, $destY, $destW, $destH)
    $srcRect = [System.Drawing.RectangleF]::new(0, 0, $masterBmp.Width, $masterBmp.Height)
    
    $g.DrawImage($masterBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.ResetClip()
    $g.Dispose()
    
    # Save PNG
    $canvas.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Save high quality JPEG (quality 98)
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 98)
    $canvas.Save($outJpg, $codec, $encoderParams)
    $canvas.Dispose()
    
    Write-Host "Saved -> $outJpg & $outPng"
}

# 1. Render Pink Stripe
# matrix(0.231297, 0, 0, 0.231239, 117.517547, -65.581956)
# clip: 118 0 468.207 841.5
Render-Svg-Page $bmpPinkMaster 117.517547 -65.581956 0.231297 0.231239 118.0 0.0 (468.207031 - 118.0) 841.5 "$outDir\classic-set-pink-main.jpg" "$outDir\classic-set-pink-main.png"

# 2. Render Navy Plaid
# matrix(0.23496, 0, 0, 0.234898, -245.581644, -55.460929)
# clip: 116.507812 0 474.6875 841.5
Render-Svg-Page $bmpNavyMaster -245.581644 -55.460929 0.23496 0.234898 116.507812 0.0 (474.6875 - 116.507812) 841.5 "$outDir\classic-set-navy-main.jpg" "$outDir\classic-set-navy-main.png"

$bmpPinkMaster.Dispose()
$bmpNavyMaster.Dispose()

Write-Host "SUCCESSFULLY RENDERED BOTH MAIN IMAGES FROM USER SVGS!"
