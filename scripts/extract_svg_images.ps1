$inputDir = "d:\Pijima\pijama\temp_pyjama_extracted"
$outputDir = "d:\Pijima\pijama\temp_extracted_pngs"

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$files = Get-ChildItem -Path $inputDir -Filter "*.svg"

foreach ($file in $files) {
    Write-Host "Processing $($file.Name)..."
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    # Regex to find base64 image data
    if ($content -match 'href="data:image/(?<ext>[^;]+);base64,(?<data>[^"]+)"') {
        $ext = $Matches['ext']
        if ($ext -eq "jpeg") { $ext = "jpg" }
        $base64 = $Matches['data']
        $bytes = [System.Convert]::FromBase64String($base64)
        $outName = $file.BaseName + "." + $ext
        $outPath = Join-Path $outputDir $outName
        [System.IO.File]::WriteAllBytes($outPath, $bytes)
        Write-Host "Saved $outName ($([math]::Round($bytes.Length / 1MB, 2)) MB)"
    } else {
        Write-Warning "No base64 image found in $($file.Name)"
    }
}
