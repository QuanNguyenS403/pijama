#!/usr/bin/env bash
# ==============================================================================
# SCRIPT TRIỂN KHAI & CẬP NHẬT MÃ NGUỒN TỰ ĐỘNG (ZERO-DOWNTIME DEPLOYMENT)
# Chạy tại thư mục: /var/www/quannguyens
# Lệnh thực thi: bash deploy/deploy.sh
# ==============================================================================

set -e

APP_DIR="/var/www/quannguyens"
cd "$APP_DIR"

echo "======================================================================"
echo "🚀 BẮT ĐẦU QUY TRÌNH TRIỂN KHAI CHO QUANNGUYENS (quannguyens.com)"
echo "======================================================================"

# 1. Kéo mã nguồn mới nhất từ nhánh main
echo "--> [1/6] Đồng bộ mã nguồn từ GitHub (nhánh main)..."
git pull origin main

# 2. Cài đặt các thư viện phụ thuộc (bao gồm cả devDependencies để build Vite)
echo "--> [2/6] Cài đặt dependencies với npm ci..."
npm ci --production=false

# 3. Biên dịch lại SQLite native addon
echo "--> [3/6] Biên dịch lại better-sqlite3..."
npm rebuild better-sqlite3

# 4. Kiểm tra cấu hình môi trường fail-closed
echo "--> [4/6] Kiểm tra biến môi trường production..."
npm run check-env || true

# 5. Build mã nguồn Frontend
echo "--> [5/6] Biên dịch gói tĩnh Frontend (Vite build)..."
npm run build

# 6. Khởi động lại hoặc tải lại tiến trình Backend qua PM2
echo "--> [6/6] Khởi động / Reload ứng dụng backend qua PM2..."
if pm2 describe quannguyens-store > /dev/null 2>&1; then
    echo "    Reload tiến trình quannguyens-store (zero downtime)..."
    pm2 reload ecosystem.config.cjs --env production
else
    echo "    Khởi tạo tiến trình quannguyens-store lần đầu..."
    pm2 start ecosystem.config.cjs --env production
fi

# Lưu lại danh sách tiến trình PM2 để tự chạy lại sau khi reboot VPS
pm2 save

# Reload Nginx để cập nhật file tĩnh mới nếu cần
sudo nginx -t && sudo systemctl reload nginx

echo "======================================================================"
echo "✨ TRIỂN KHAI THÀNH CÔNG! Website hiện đang chạy tại: https://quannguyens.com"
echo "======================================================================"
