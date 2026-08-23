Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem "d:\Pijima\pijama\public\images\classic-set-*-main.*"
foreach ($f in $files) {
    $img = [System.Drawing.Image]::FromFile($f.FullName)
    Write-Host "$($f.Name) : $($img.Width) x $($img.Height)"
    $img.Dispose()
}
