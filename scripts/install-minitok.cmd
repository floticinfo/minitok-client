@echo off
setlocal
where node >nul 2>nul || (echo Node.js is required.& exit /b 1)
call npm install -g @flotic/minitok@latest
if errorlevel 1 exit /b %errorlevel%
echo minitok installed. Run: minitok gui
