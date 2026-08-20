Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\ASUS\.gemini\antigravity-ide\brain\3bef190f-d7e0-4618-a1a5-5c9f42455476\.user_uploaded\media_1787218078242.png"
$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# Function to sharpen a bitmap using unsharp mask / 3x3 convolution
function Sharpen-Bitmap([System.Drawing.Bitmap]$source, [float]$amount = 0.5) {
    $width = $source.Width
    $height = $source.Height
    $dest = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    # Kernel for sharpening:
    #  0  -1   0
    # -1   5  -1
    #  0  -1   0
    # Blend between original and sharpened based on $amount
    
    $rect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
    $srcData = $source.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $destData = $dest.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $stride = $srcData.Stride
    $bytes = [Math]::Abs($stride) * $height
    $srcBuffer = [byte[]]::new($bytes)
    $destBuffer = [byte[]]::new($bytes)
    
    [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBuffer, 0, $bytes)
    
    # Copy borders directly
    [Array]::Copy($srcBuffer, $destBuffer, $bytes)
    
    for ($y = 1; $y -lt $height - 1; $y++) {
        $rowPrev = ($y - 1) * $stride
        $rowCurr = $y * $stride
        $rowNext = ($y + 1) * $stride
        
        for ($x = 1; $x -lt $width - 1; $x++) {
            $col = $x * 4
            $colPrev = ($x - 1) * 4
            $colNext = ($x + 1) * 4
            
            # BGRA
            for ($c = 0; $c -lt 3; $c++) {
                $center = [int]$srcBuffer[$rowCurr + $col + $c]
                $top    = [int]$srcBuffer[$rowPrev + $col + $c]
                $bottom = [int]$srcBuffer[$rowNext + $col + $c]
                $left   = [int]$srcBuffer[$rowCurr + $colPrev + $c]
                $right  = [int]$srcBuffer[$rowCurr + $colNext + $c]
                
                # Sharpen formula: center + amount * (4*center - top - bottom - left - right)
                $laplacian = (4 * $center) - ($top + $bottom + $left + $right)
                $val = [int]($center + $amount * $laplacian)
                
                if ($val -lt 0) { $val = 0 }
                if ($val -gt 255) { $val = 255 }
                $destBuffer[$rowCurr + $col + $c] = [byte]$val
            }
            # Alpha
            $destBuffer[$rowCurr + $col + 3] = $srcBuffer[$rowCurr + $col + 3]
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($destBuffer, 0, $destData.Scan0, $bytes)
    $source.UnlockBits($srcData)
    $dest.UnlockBits($destData)
    
    return $dest
}

# Function to crop, upscale with high-quality bicubic, and sharpen
function Process-And-Save([System.Drawing.Bitmap]$source, [System.Drawing.Rectangle]$cropRect, [string]$outPath, [int]$targetHeight = 1200, [float]$sharpness = 0.55) {
    # 1. Crop
    $cropped = [System.Drawing.Bitmap]::new($cropRect.Width, $cropRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gCrop = [System.Drawing.Graphics]::FromImage($cropped)
    $gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gCrop.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gCrop.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $cropRect.Width, $cropRect.Height), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    $gCrop.Dispose()
    
    # 2. Scale up smoothly
    $scale = $targetHeight / $cropRect.Height
    $targetWidth = [int]($cropRect.Width * $scale)
    $scaled = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gScale = [System.Drawing.Graphics]::FromImage($scaled)
    $gScale.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gScale.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gScale.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gScale.DrawImage($cropped, [System.Drawing.Rectangle]::new(0, 0, $targetWidth, $targetHeight), 0, 0, $cropRect.Width, $cropRect.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $gScale.Dispose()
    $cropped.Dispose()
    
    # 3. Sharpen
    $sharpened = Sharpen-Bitmap $scaled $sharpness
    $scaled.Dispose()
    
    # 4. Save with JPEG Quality 95
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]95)
    
    $sharpened.Save($outPath, $codec, $encoderParams)
    $sharpened.Dispose()
    Write-Host "Saved: $outPath ($targetWidth x $targetHeight)"
}

$outDir = "d:\Pijima\pijama\public\images"

# Coordinates based on analysis:
# 1. Main flat lay (pajama set on left)
# Left image is in x: 0..374, y: 0..683
# Let's crop clean X=0..374, Y=0..683 (width: 374, height: 683)
$cropMain = [System.Drawing.Rectangle]::new(0, 0, 374, 683)
Process-And-Save $srcBmp $cropMain "$outDir\classic-set-pink-main.jpg" 1400 0.5

# 2. Thumbnail 1: Sitting on bed (top middle)
# X: 375..683 (W: 309), Y: 0..340 (H: 341)
$cropThumb1 = [System.Drawing.Rectangle]::new(375, 0, 309, 341)
Process-And-Save $srcBmp $cropThumb1 "$outDir\classic-set-pink-thumb-1.jpg" 1000 0.55

# 3. Thumbnail 2: Standing in room walking (top right)
# X: 687..1023 (W: 337), Y: 0..340 (H: 341)
$cropThumb2 = [System.Drawing.Rectangle]::new(687, 0, 337, 341)
Process-And-Save $srcBmp $cropThumb2 "$outDir\classic-set-pink-thumb-2.jpg" 1000 0.55

# 4. Thumbnail 3: Standing back view (bottom middle)
# X: 375..683 (W: 309), Y: 344..682 (H: 339)
$cropThumb3 = [System.Drawing.Rectangle]::new(375, 344, 309, 339)
Process-And-Save $srcBmp $cropThumb3 "$outDir\classic-set-pink-thumb-3.jpg" 1000 0.55

# 5. Thumbnail 4 / Detail: Standing front view smiling (bottom right)
# X: 687..1023 (W: 337), Y: 344..682 (H: 339)
$cropDetail = [System.Drawing.Rectangle]::new(687, 344, 337, 339)
Process-And-Save $srcBmp $cropDetail "$outDir\classic-set-pink-detail.jpg" 1000 0.55

$srcBmp.Dispose()
Write-Host "All images processed successfully!"
