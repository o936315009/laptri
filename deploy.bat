@echo off
chcp 65001 >nul
echo ========================================================
echo   CLB CAU LONG LAP TRI - TU DONG CAP NHAT GITHUB PAGES
echo ========================================================
cd /d "%~dp0"

echo.
echo [1/4] Dang them cac tap tin da sua (index.html, app.js, database.rules.json)...
git add index.html app.js database.rules.json deploy.bat

echo.
echo [2/4] Dang tao ban ghi commit...
git commit -m "feat: chuyen trang chu khi dang nhap, bat buoc doi mk lan dau, ghi nho dang nhap"

echo.
echo [3/4] Dang day len nhanh chinh (main)...
git push origin main

echo.
echo [4/4] Dang day len nhanh web GitHub Pages (gh-pages)...
git push origin main:gh-pages --force

echo.
echo ========================================================
echo   THANH CONG! He thong da day ma moi len GitHub Pages.
echo   Trang web: https://o936315009.github.io/laptri/
echo ========================================================
echo.
if "%~1"=="" pause
