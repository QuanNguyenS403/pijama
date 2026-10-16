@echo off
title QuanNguyenS Store Server + Cloudflare Tunnel (quannguyens.com)
echo ======================================================================
echo    KHOI CHAY QUANNGUYENS PIJAMA + CLOUDFLARE TUNNEL
echo    - Domain: https://quannguyens.com
echo    - Local : http://localhost:3000
echo ======================================================================
echo.

REM 1. Khoi chay Web Server Full-Stack o cua so moi
start "QuanNguyenS Web Server" cmd /k "npm run dev:full"

REM 2. Cho server khoi dong 3 giay
timeout /t 3 /nobreak >nul

REM 3. Khoi dong Cloudflare Tunnel ket noi domain quannguyens.com
powershell -ExecutionPolicy Bypass -File scripts\start-tunnel.ps1
pause
