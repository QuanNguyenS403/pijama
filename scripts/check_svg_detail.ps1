$file = "D:\Pijima\pijama\temp_pyjama_main_extracted\main navi caro.svg"
$content = [System.IO.File]::ReadAllText($file)

# Find all matches of data:image
$matches = [regex]::Matches($content, 'href="data:image/(?<ext>[^;]+);base64,(?<data>[^"]+)"')
Write-Host "Total image href matches: $($matches.Count)"

for ($i = 0; $i -lt $matches.Count; $i++) {
    $ext = $matches[$i].Groups['ext'].Value
    $data = $matches[$i].Groups['data'].Value
    Write-Host "Image $i : format=$ext, base64 length=$($data.Length) characters ($([math]::Round($data.Length * 3 / 4 / 1MB, 2)) MB)"
}

# Also check xlink:href
$xmatches = [regex]::Matches($content, 'xlink:href="data:image/(?<ext>[^;]+);base64,(?<data>[^"]+)"')
Write-Host "Total xlink:href matches: $($xmatches.Count)"
for ($i = 0; $i -lt $xmatches.Count; $i++) {
    $ext = $xmatches[$i].Groups['ext'].Value
    $data = $xmatches[$i].Groups['data'].Value
    Write-Host "XLink Image $i : format=$ext, base64 length=$($data.Length) characters ($([math]::Round($data.Length * 3 / 4 / 1MB, 2)) MB)"
}
