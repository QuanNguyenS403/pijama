$inputDir = "D:\Pijima\pijama\temp_pyjama_main_extracted"
$outDir = "d:\Pijima\pijama\public\images"

$files = Get-ChildItem -Path $inputDir -Filter "*.svg"

foreach ($file in $files) {
    Write-Host "Analyzing $($file.Name)..."
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
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
    
    if ($bestMatch) {
        $ext = $bestMatch.Groups['ext'].Value
        if ($ext -eq "jpeg") { $ext = "jpg" }
        $base64 = $bestMatch.Groups['data'].Value
        $bytes = [System.Convert]::FromBase64String($base64)
        
        $isNavy = ($file.Name -match 'navi|navy|caro')
        $targetPrefix = if ($isNavy) { "classic-set-navy-main" } else { "classic-set-pink-main" }
        
        # Save exact file as JPG and PNG without modifications
        $outJpg = Join-Path $outDir "$targetPrefix.jpg"
        $outPng = Join-Path $outDir "$targetPrefix.png"
        [System.IO.File]::WriteAllBytes($outJpg, $bytes)
        [System.IO.File]::WriteAllBytes($outPng, $bytes)
        
        Write-Host "Successfully saved EXACT HIGH-RES ($([math]::Round($bytes.Length / 1MB, 2)) MB) -> $outJpg"
    }
}
