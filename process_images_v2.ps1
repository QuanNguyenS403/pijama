Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\ASUS\.gemini\antigravity-ide\brain\3bef190f-d7e0-4618-a1a5-5c9f42455476\.user_uploaded\media_1787218078242.png"
$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)

function Sharpen-Bitmap([System.Drawing.Bitmap]$source, [float]$amount = 0.55) {
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

$outDir = "d:\Pijima\pijama\public\images"

# --- 1. MAIN FLAT-LAY IMAGE ---
# Target aspect ratio: 4:5 (e.g. 1200 x 1500)
# Pajama garment is in crop rect (40, 15, 335, 645) in original
$targetW = 1200
$targetH = 1500
$mainCanvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gMain = [System.Drawing.Graphics]::FromImage($mainCanvas)
$gMain.Clear([System.Drawing.Color]::White)
$gMain.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMain.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gMain.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$pajamaCrop = [System.Drawing.Rectangle]::new(40, 15, 335, 645)
# Scale pajama to fit comfortably in 1200x1500 with elegant padding (height ~ 1380, width ~ 717)
$pajamaH = 1380
$pajamaW = [int]($pajamaCrop.Width * ($pajamaH / $pajamaCrop.Height))
$destX = [int](($targetW - $pajamaW) / 2)
$destY = [int](($targetH - $pajamaH) / 2)

$gMain.DrawImage($srcBmp, [System.Drawing.Rectangle]::new($destX, $destY, $pajamaW, $pajamaH), $pajamaCrop, [System.Drawing.GraphicsUnit]::Pixel)
$gMain.Dispose()

$mainSharpened = Sharpen-Bitmap $mainCanvas 0.55
$mainCanvas.Dispose()
Save-Jpeg $mainSharpened "$outDir\classic-set-pink-main.jpg" 95
$mainSharpened.Dispose()
Write-Host "Saved main flatlay 4:5 (1200x1500)"

# --- 2. THUMBNAIL 1: Sitting on bed (Top middle) ---
# Original rect: (375, 0, 309, 341) -> target 1000x1100 (4:5 / ~1:1)
$crop1 = [System.Drawing.Rectangle]::new(375, 0, 309, 341)
$t1 = [System.Drawing.Bitmap]::new(1000, 1100, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g1 = [System.Drawing.Graphics]::FromImage($t1)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.DrawImage($srcBmp, [System.Drawing.Rectangle]::new(0, 0, 1000, 1100), $crop1, [System.Drawing.GraphicsUnit]::Pixel)
$g1.Dispose()
$t1Sharp = Sharpen-Bitmap $t1 0.6
$t1.Dispose()
Save-Jpeg $t1Sharp "$outDir\classic-set-pink-thumb-1.jpg" 95
$t1Sharp.Dispose()
Write-Host "Saved thumb 1 (1000x1100)"

# --- 3. THUMBNAIL 2: Standing walking (Top right) ---
# Original rect: (687, 0, 337, 341) -> target 1000x1100
$crop2 = [System.Drawing.Rectangle]::new(687, 0, 337, 341)
$t2 = [System.Drawing.Bitmap]::new(1000, 1100, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($t2)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.DrawImage($srcBmp, [System.Drawing.Rectangle]::new(0, 0, 1000, 1100), $crop2, [System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()
$t2Sharp = Sharpen-Bitmap $t2 0.6
$t2.Dispose()
Save-Jpeg $t2Sharp "$outDir\classic-set-pink-thumb-2.jpg" 95
$t2Sharp.Dispose()
Write-Host "Saved thumb 2 (1000x1100)"

# --- 4. THUMBNAIL 3: Back view (Bottom middle) ---
# Original rect: (375, 344, 309, 339) -> target 1000x1100
$crop3 = [System.Drawing.Rectangle]::new(375, 344, 309, 339)
$t3 = [System.Drawing.Bitmap]::new(1000, 1100, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g3 = [System.Drawing.Graphics]::FromImage($t3)
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g3.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g3.DrawImage($srcBmp, [System.Drawing.Rectangle]::new(0, 0, 1000, 1100), $crop3, [System.Drawing.GraphicsUnit]::Pixel)
$g3.Dispose()
$t3Sharp = Sharpen-Bitmap $t3 0.6
$t3.Dispose()
Save-Jpeg $t3Sharp "$outDir\classic-set-pink-thumb-3.jpg" 95
$t3Sharp.Dispose()
Write-Host "Saved thumb 3 (1000x1100)"

# --- 5. THUMBNAIL 4 / DETAIL: Front view smiling (Bottom right) ---
# Original rect: (687, 344, 337, 339) -> target 1000x1100
$crop4 = [System.Drawing.Rectangle]::new(687, 344, 337, 339)
$t4 = [System.Drawing.Bitmap]::new(1000, 1100, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g4 = [System.Drawing.Graphics]::FromImage($t4)
$g4.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g4.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g4.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g4.DrawImage($srcBmp, [System.Drawing.Rectangle]::new(0, 0, 1000, 1100), $crop4, [System.Drawing.GraphicsUnit]::Pixel)
$g4.Dispose()
$t4Sharp = Sharpen-Bitmap $t4 0.6
$t4.Dispose()
Save-Jpeg $t4Sharp "$outDir\classic-set-pink-detail.jpg" 95
$t4Sharp.Dispose()
Write-Host "Saved detail (1000x1100)"

$srcBmp.Dispose()
Write-Host "DONE: All 5 images updated with matching 4:5 ratios & sharpened high quality."
