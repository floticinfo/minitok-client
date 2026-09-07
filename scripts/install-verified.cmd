@echo off
setlocal
set "version=%~1"
if "%MINITOK_INSTALL_DRY_RUN%"=="1" (echo installer dry-run: version=%version% & exit /b 0)
if "%version%"=="" set "version=latest"
set "state=%LOCALAPPDATA%\minitok"
if not exist "%state%" mkdir "%state%"
for /f "delims=" %%v in ('node -p "try{require('@flotic/minitok/package.json').version}catch(e){''}" 2^>nul') do echo %%v > "%state%\previous-version"
set "tmp=%TEMP%\minitok-pack-%RANDOM%"
if not exist "%tmp%" mkdir "%tmp%"
for /f "delims=" %%i in ('npm view @flotic/minitok@%version% dist.integrity --json 2^>nul') do set "expected=%%i"
npm pack @flotic/minitok@%version% --pack-destination "%tmp%" >nul
if errorlevel 1 exit /b 1
for %%f in ("%tmp%\*.tgz") do set "archive=%%~f"
node "%~dp0verify-package.mjs" "%archive%" "%expected%"
if errorlevel 1 exit /b 1
call npm install -g "%archive%"
if errorlevel 1 (
  for /f "delims=" %%v in (%state%\previous-version) do if not "%%v"=="" call npm install -g @flotic/minitok@%%v
  exit /b 1
)
node -p "require('@flotic/minitok/package.json').version" > "%state%\installed-version"
rmdir /s /q "%tmp%"
