@echo off
title QuanNguyenS Store Server
echo ===================================================
echo     DANG KHOI CHAY QUANNGUYENS PIJAMA STORE...
echo ===================================================
echo.
echo Website dang duoc mo tren trinh duyet...
echo Dia chi: http://localhost:3000
echo.
echo (Nhan Ctrl+C de dung server khi khong dung nua)
echo ===================================================
echo.

start http://localhost:3000
npm run dev
pause
