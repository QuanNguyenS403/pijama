# ==============================================================================
# SCRIPT KẾT NỐI CLOUDFLARE TUNNEL CHO WEBSITE QUANNGUYENS (quannguyens.com)
# ==============================================================================

$binDir = Join-Path $PSScriptRoot "..\bin"
$exePath = Join-Path $binDir "cloudflared.exe"

$cloudflaredCmd = ""
if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    $cloudflaredCmd = "cloudflared"
} elseif (Test-Path $exePath) {
    $cloudflaredCmd = $exePath
} else {
    Write-Host "⚠️ Chưa tìm thấy cloudflared.exe. Đang tự động tải về..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "install-cloudflared.ps1")
    if (Test-Path $exePath) {
        $cloudflaredCmd = $exePath
    } else {
        Write-Host "❌ Không thể khởi động Tunnel do thiếu cloudflared.exe." -ForegroundColor Red
        exit 1
    }
}

# Đọc token từ .env
$envFile = Join-Path $PSScriptRoot "..\.env"
$tunnelToken = ""

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*CLOUDFLARE_TUNNEL_TOKEN\s*=\s*(.*)$") {
            $tunnelToken = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🌐 CLOUDFLARE TUNNEL CHO DOMAIN: https://quannguyens.com" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if ($tunnelToken -and $tunnelToken -ne "" -and -not ($tunnelToken -match "^\[")) {
    Write-Host "🚀 Đã tìm thấy CLOUDFLARE_TUNNEL_TOKEN trong .env!" -ForegroundColor Green
    Write-Host "Đang kết nối tên miền https://quannguyens.com về máy của bạn (localhost:3000)..." -ForegroundColor Yellow
    Write-Host "Bấm Ctrl+C để dừng Tunnel khi không dùng nữa." -ForegroundColor Gray
    Write-Host "----------------------------------------------------------------------"
    & $cloudflaredCmd tunnel run --token $tunnelToken
} else {
    Write-Host "ℹ️ Bạn chưa điền CLOUDFLARE_TUNNEL_TOKEN trong file .env." -ForegroundColor Yellow
    Write-Host "Cách lấy token kết nối tên miền quannguyens.com (chỉ mất 1 phút):" -ForegroundColor White
    Write-Host "1. Vào: https://one.dash.cloudflare.com (Cloudflare Zero Trust)" -ForegroundColor White
    Write-Host "2. Chọn Networks -> Tunnels -> Add a tunnel (chọn Cloudflared)" -ForegroundColor White
    Write-Host "3. Đặt tên: quannguyens-tunnel" -ForegroundColor White
    Write-Host "4. Sao chép Token (chuỗi ký tự dài sau --token)" -ForegroundColor White
    Write-Host "5. Dán vào biến CLOUDFLARE_TUNNEL_TOKEN trong file .env" -ForegroundColor White
    Write-Host "6. Tại tab Public Hostnames trên Cloudflare, chọn:" -ForegroundColor White
    Write-Host "   - Domain: quannguyens.com" -ForegroundColor Green
    Write-Host "   - Service: HTTP -> localhost:3000" -ForegroundColor Green
    Write-Host "----------------------------------------------------------------------"
    Write-Host "👉 Bạn có muốn chạy thử một Quick Tunnel tạm thời để kiểm tra kết nối ngay bây giờ không? (Y/N): " -NoNewline -ForegroundColor Cyan
    $choice = Read-Host
    if ($choice -eq 'Y' -or $choice -eq 'y') {
        Write-Host "🚀 Đang mở Quick Tunnel tới http://localhost:3000..." -ForegroundColor Green
        & $cloudflaredCmd tunnel --url http://localhost:3000
    }
}
