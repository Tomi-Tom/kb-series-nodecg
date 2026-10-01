@echo off
cd /d "%~dp0"
start "" http://localhost:9090
npm start
pause
