@echo off
setlocal
if "%1"=="update" npm install -g @flotic/minitok@latest
if "%1"=="uninstall" npm uninstall -g @flotic/minitok
if "%1"=="rollback" if not "%2"=="" npm install -g @flotic/minitok@%2
if "%1"=="update" goto :eof
if "%1"=="uninstall" goto :eof
if "%1"=="rollback" goto :eof
echo Usage: minitok-maintain update ^| uninstall ^| rollback VERSION
