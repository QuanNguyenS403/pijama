#!/usr/bin/env bash
# ==============================================================================
# SCRIPT CÀI ĐẶT MÔI TRƯỜNG VPS CHO WEBSITE QUANNGUYENS (quannguyens.com)
# Hệ điều hành khuyến nghị: Ubuntu 22.04 LTS / 24.04 LTS
# Chạy với quyền root: sudo bash deploy/setup-vps.sh
# ==============================================================================

set -e

echo "======================================================================"
echo "   BẮT ĐẦU CÀI ĐẶT HẠ TẦNG VPS CHO DOMAIN: quannguyens.com"
echo "======================================================================"

# 1. Cập nhật hệ thống
echo "--> [1/7] Cập nhật danh sách gói hệ thống apt..."
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt các công cụ biên dịch (cần thiết cho better-sqlite3 native addon)
echo "--> [2/7] Cài đặt công cụ nền tảng build-essential, curl, git..."
sudo apt install -y curl git ufw build-essential python3 make g++

# 3. Cài đặt Node.js 20.x LTS và npm
echo "--> [3/7] Cài đặt Node.js LTS (v20.x)..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "    Node version: $(node -v)"
echo "    NPM version : $(npm -v)"

# 4. Cài đặt PM2 Process Manager toàn cục
echo "--> [4/7] Cài đặt PM2 Process Manager..."
sudo npm install -g pm2

# 5. Cài đặt Nginx & Certbot Let's Encrypt
echo "--> [5/7] Cài đặt Nginx và Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

# 6. Thiết lập tường lửa UFW
echo "--> [6/7] Cấu hình tường lửa UFW (SSH, HTTP, HTTPS)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 7. Chuẩn bị thư mục ứng dụng /var/www/quannguyens
echo "--> [7/7] Khởi tạo thư mục /var/www/quannguyens..."
sudo mkdir -p /var/www/quannguyens
sudo chown -R $USER:$USER /var/www/quannguyens

echo "======================================================================"
echo "✅ HOÀN TẤT CÀI ĐẶT CƠ BẢN CHO VPS!"
echo "Bước tiếp theo:"
echo "1. Đảm bảo bản ghi DNS A (@ và www) của domain quannguyens.com đã trỏ về IP của VPS này."
echo "2. Clone mã nguồn vào /var/www/quannguyens:"
echo "   git clone <REPO_URL> /var/www/quannguyens"
echo "3. Copy file cấu hình Nginx:"
echo "   sudo cp /var/www/quannguyens/deploy/nginx/quannguyens.conf /etc/nginx/sites-available/"
echo "   sudo ln -sf /etc/nginx/sites-available/quannguyens.conf /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "4. Cấp chứng chỉ SSL HTTPS miễn phí:"
echo "   sudo certbot --nginx -d quannguyens.com -d www.quannguyens.com"
echo "5. Chạy deploy script:"
echo "   cd /var/www/quannguyens && bash deploy/deploy.sh"
echo "======================================================================"
