$filePink = (Get-ChildItem -Path "D:\Pijima\pijama\temp_pyjama_main_extracted" -Filter "*.svg" | Where-Object { $_.Name -notmatch 'navi|navy|caro' } | Select-Object -First 1).FullName

$content = [System.IO.File]::ReadAllText($filePink)
$clean = [regex]::Replace($content, 'data:image/[^"]+', '[BASE64_DATA]')
Write-Host "=== Pink SVG clean ==="
Write-Host $clean
