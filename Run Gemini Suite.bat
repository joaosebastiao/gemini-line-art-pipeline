@echo off
title Gemini Suite Server
echo ===================================================
echo             Starting Gemini Suite...
echo ===================================================
echo.
echo Launching Google Chrome...
start chrome "http://localhost:3000"
echo.
echo Starting Local Node Server...
node server.js
pause
