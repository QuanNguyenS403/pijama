Add-Type -AssemblyName System.Drawing
$srcDir = "D:\Pijima\pijama\temp_pyjama_main_extracted"
$allFiles = Get-ChildItem -Path $srcDir
$svgPink = ($allFiles | Where-Object { $_.Name -notmatch 'navi|navy|caro' } | Select-Object -First 1).FullName

$content = [System.IO.File]::ReadAllText($svgPink)
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
$bmp = [System.Drawing.Bitmap]::FromStream($ms)

Write-Host "PixelFormat: $($bmp.PixelFormat)"
Write-Host "Pixel (10, 10): $($bmp.GetPixel(10, 10))"
Write-Host "Pixel (100, 100): $($bmp.GetPixel(100, 100))"
Write-Host "Pixel (1000, 1000): $($bmp.GetPixel(1000, 1000))"
