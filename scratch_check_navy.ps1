Add-Type -AssemblyName System.Drawing

Get-ChildItem "d:\Pijima\pijama\public\images\classic-set-navy-*.jpg" | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    Write-Host "$($_.Name) -> $($img.Width) x $($img.Height) (ratio: $([math]::Round($img.Width / $img.Height, 3)))"
    $img.Dispose()
}
