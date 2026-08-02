@echo off
title Ali Electronics - Lokal Server
echo ========================================================
echo   Ali Electronics - Anbar Idareetme Sistemi (Lokal)
echo ========================================================
echo.
echo Server basladilir: http://localhost:8000
echo Brauzer avtomatik acilir...
echo.
start http://localhost:8000
python -m http.server 8000
pause
