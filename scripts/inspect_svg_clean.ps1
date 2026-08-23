$fileNavy = "D:\Pijima\pijama\temp_pyjama_main_extracted\main navi caro.svg"
$filePink = "D:\Pijima\pijama\temp_pyjama_main_extracted\main s?c h?ng.svg"

function Inspect-Svg([string]$path) {
    Write-Host "=== Inspecting $path ==="
    $content = [System.IO.File]::ReadAllText($path)
    # Print non-base64 parts
    $clean = [regex]::Replace($content, 'data:image/[^"]+', '[BASE64_DATA]')
    Write-Host $clean
}

Inspect-Svg $fileNavy
Inspect-Svg $filePink
