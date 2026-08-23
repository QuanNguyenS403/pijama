$inputDir = "d:\Pijima\pijama\temp_pyjama_main_extracted"
$outDir = "d:\Pijima\pijama\public\images"

$files = Get-ChildItem -Path $inputDir

foreach ($file in $files) {
    Write-Host "File: $($file.Name) ($($file.Length) bytes)"
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    if ($content -match 'href="data:image/(?<ext>[^;]+);base64,(?<data>[^"]+)"') {
        $ext = $Matches['ext']
        if ($ext -eq "jpeg") { $ext = "jpg" }
        $base64 = $Matches['data']
        $bytes = [System.Convert]::FromBase64String($base64)
        
        Write-Host "Found embedded image: type=$ext, size=$([math]::Round($bytes.Length / 1MB, 2)) MB"
        
        # Determine whether it's pink or navy based on filename
        if ($file.Name -match 'navi|navy|caro') {
            # Navy Plaid main
            $targetPathJpg = Join-Path $outDir "classic-set-navy-main.jpg"
            $targetPathPng = Join-Path $outDir "classic-set-navy-main.png"
            $targetPathSvg = Join-Path $outDir "classic-set-navy-main.svg"
            [System.IO.File]::WriteAllBytes($targetPathJpg, $bytes)
            [System.IO.File]::WriteAllBytes($targetPathPng, $bytes)
            Copy-Item -Path $file.FullName -Destination $targetPathSvg -Force
            Write-Host "Extracted Navy Main -> $targetPathJpg & $targetPathPng & $targetPathSvg"
        } else {
            # Pink Stripe main
            $targetPathJpg = Join-Path $outDir "classic-set-pink-main.jpg"
            $targetPathPng = Join-Path $outDir "classic-set-pink-main.png"
            $targetPathSvg = Join-Path $outDir "classic-set-pink-main.svg"
            [System.IO.File]::WriteAllBytes($targetPathJpg, $bytes)
            [System.IO.File]::WriteAllBytes($targetPathPng, $bytes)
            Copy-Item -Path $file.FullName -Destination $targetPathSvg -Force
            Write-Host "Extracted Pink Main -> $targetPathJpg & $targetPathPng & $targetPathSvg"
        }
    } else {
        Write-Host "No base64 image found, checking direct SVG..."
    }
}
