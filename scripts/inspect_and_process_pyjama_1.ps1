Add-Type -AssemblyName System.Drawing

$navyRaw = "d:\Pijima\pijama\temp_pyjama_1\extracted\extracted_navy_main.png"
$pinkRaw = "d:\Pijima\pijama\temp_pyjama_1\extracted\extracted_pink_main.png"

$imgNavy = [System.Drawing.Image]::FromFile($navyRaw)
Write-Host "Navy Raw Image: $($imgNavy.Width) x $($imgNavy.Height), Format: $($imgNavy.PixelFormat)"
$imgNavy.Dispose()

$imgPink = [System.Drawing.Image]::FromFile($pinkRaw)
Write-Host "Pink Raw Image: $($imgPink.Width) x $($imgPink.Height), Format: $($imgPink.PixelFormat)"
$imgPink.Dispose()
