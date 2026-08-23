@echo off
title QuanNguyenS Store Server (Full-Stack)
echo ===================================================
echo     DANG KHOI CHAY QUANNGUYENS PIJAMA FULL-STACK...
echo     - Frontend: http://localhost:3000
echo     - Backend : http://localhost:3001
echo ===================================================
echo.
echo Website dang duoc mo tren trinh duyet...
echo.
echo (Nhan Ctrl+C de dung server khi khong dung nua)
echo ===================================================
echo.

start http://localhost:3000
npm run dev:full
pause
