@echo off
chcp 65001 >nul
echo ===================================================
echo     DANG NHAP LAI TAI KHOAN GITHUB (RE-AUTHENTICATE)
echo ===================================================
echo.
echo 1. Dang xoa thong tin dang nhap GitHub cu tren Windows Credential...
cmdkey /delete:git:https://github.com >nul 2>&1
echo Da xoa phien cu.
echo.
echo 2. Dang bat trinh xac thuc dang nhap GitHub...
echo (Cua so trinh duyet se tu dong mo ra. Vui long chon 'Sign in with your browser' de dang nhap)
echo.
cd /d "%~dp0"
git ls-remote https://github.com/o936315009/clb.git >nul

echo.
if %ERRORLEVEL% EQU 0 (
    echo ===================================================
    echo    XAC THUC TAI KHOAN GITHUB THANH CONG!
    echo    Bay gio ban hay chay lai 'day-code-len-github.bat'.
    echo ===================================================
) else (
    echo ===================================================
    echo    Chua hoan tat dang nhap hoac bi huy. Vui long thu lai.
    echo ===================================================
)
echo.
pause
