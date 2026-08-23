Add-Type -AssemblyName System.Drawing

$outDir = "d:\Pijima\pijama\public\images"
$pinkFlatlaySrc = "C:\Users\ASUS\.gemini\antigravity-ide\brain\3bef190f-d7e0-4618-a1a5-5c9f42455476\.user_uploaded\media_1787218078242.png"

function Sharpen-Bitmap([System.Drawing.Bitmap]$source, [float]$amount = 0.4) {
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

$pinkFlatSrcBmp = [System.Drawing.Bitmap]::FromFile($pinkFlatlaySrc)
$targetW = 1600
$targetH = 2000
$pinkMainCanvas = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gPink = [System.Drawing.Graphics]::FromImage($pinkMainCanvas)
$gPink.Clear([System.Drawing.Color]::White)
$gPink.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gPink.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gPink.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$pinkCrop = [System.Drawing.Rectangle]::new(40, 15, 320, 650)
$destH = 1800
$destW = [int]($pinkCrop.Width * ($destH / $pinkCrop.Height))
$destX = [int](($targetW - $destW) / 2)
$destY = [int](($targetH - $destH) / 2)

$gPink.DrawImage($pinkFlatSrcBmp, [System.Drawing.Rectangle]::new($destX, $destY, $destW, $destH), $pinkCrop, [System.Drawing.GraphicsUnit]::Pixel)
$gPink.Dispose()
$pinkFlatSrcBmp.Dispose()

$pinkMainSharp = Sharpen-Bitmap $pinkMainCanvas 0.4
$pinkMainCanvas.Dispose()
Save-Jpeg $pinkMainSharp "$outDir\classic-set-pink-main.jpg" 95
$pinkMainSharp.Dispose()
Write-Host "Fixed: classic-set-pink-main.jpg"
