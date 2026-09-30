@echo off
title Decathlon - Multiimplantaciones y Ventas
cd /d "%~dp0"
echo =================================================================
echo   Iniciando Decathlon - Sistema de Multiimplantaciones y Ventas
echo =================================================================
echo.
start http://localhost:8000
python server.py
pause
