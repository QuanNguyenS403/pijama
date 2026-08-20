Add-Type -AssemblyName System.Drawing

Get-ChildItem "d:\Pijima\pijama\public\images\classic-set-pink-*.jpg" | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    Write-Host "$($_.Name) -> $($img.Width) x $($img.Height) (Size: $([math]::Round($_.Length / 1KB, 1)) KB)"
    $img.Dispose()
}
