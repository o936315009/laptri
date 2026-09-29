@echo off
chcp 65001 >nul
echo ===================================================
echo     DANG DAY CODE LEN GITHUB: o936315009/laptri
echo ===================================================
echo.
cd /d "%~dp0"

echo 1. Dang kiem tra nhanh thay doi (git add .) ...
git add .

echo.
echo 2. Dang tao ban commit moi ...
git commit -m "feat: cap nhat CLB hoat dong voi du lieu nhap moi va dong bo thoi gian thuc"

echo.
echo 3. Dang day code len GitHub (git push) ...
git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [THONG BAO] Dang dong bo ban moi nhat len nhanh main tren GitHub...
    git push -u origin main --force
)

echo.
if %ERRORLEVEL% EQU 0 (
    echo ===================================================
    echo    CHUC MUNG! CODE DA DUOC DAY LEN GITHUB THANH CONG!
    echo    Vercel se tu dong cap nhat website sau 1-2 phut.
    echo ===================================================
) else (
    echo ===================================================
    echo [THONG BAO] Neu can dang nhap lai tai khoan GitHub:
    echo Hay chay file 'dang-nhap-lai-github.bat' trong thu muc.
    echo ===================================================
)
echo.
pause
