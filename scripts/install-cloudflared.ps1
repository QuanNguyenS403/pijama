# ==============================================================================
# SCRIPT TỰ ĐỘNG TẢI & CÀI ĐẶT CLOUDFLARED CHO WINDOWS (quannguyens.com)
# ==============================================================================

$binDir = Join-Path $PSScriptRoot "..\bin"
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

$exePath = Join-Path $binDir "cloudflared.exe"

# 1. Kiểm tra xem cloudflared đã có sẵn trong PATH chưa
$systemCloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($systemCloudflared) {
    Write-Host "✅ Đã tìm thấy cloudflared trong hệ thống tại: $($systemCloudflared.Source)" -ForegroundColor Green
    & cloudflared --version
    exit 0
}

# 2. Kiểm tra xem file cloudflared.exe đã tải trong bin/ chưa
if (Test-Path $exePath) {
    Write-Host "✅ Đã có sẵn cloudflared.exe tại: $exePath" -ForegroundColor Green
    & $exePath --version
    exit 0
}

# 3. Tải từ GitHub Release chính thức của Cloudflare
Write-Host "⬇️ Đang tải Cloudflare Tunnel (cloudflared-windows-amd64.exe) từ Cloudflare..." -ForegroundColor Cyan
$downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -UseBasicParsing
    Write-Host "✅ Tải thành công cloudflared.exe vào: $exePath" -ForegroundColor Green
    & $exePath --version
} catch {
    Write-Host "❌ Lỗi khi tải cloudflared: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Bạn có thể cài đặt thủ công bằng lệnh: winget install --id Cloudflare.cloudflared" -ForegroundColor Yellow
}
