@echo off
setlocal
title LoanEx - Dev Launcher
cd /d "%~dp0"

echo ============================================
echo  LoanEx Dev Launcher
echo ============================================
echo.

rem ---------- Install dependencies ----------
set /p DO_INSTALL=Install/reinstall all node packages first? (Y/N): 
if /i "%DO_INSTALL%"=="Y" goto install
if /i "%DO_INSTALL%"=="yes" goto install
if /i "%DO_INSTALL%"=="n" goto launchmenu
if /i "%DO_INSTALL%"=="no" goto launchmenu

:install
echo.
echo [1/4] Installing backend  (npm install + prisma generate)...
pushd "%~dp0backend"
call npm install
call npx prisma generate
popd
echo.

echo [2/4] Installing admin app (npm install)...
pushd "%~dp0admin-app"
call npm install
popd
echo.

echo [3/4] Installing customer web (npm install)...
pushd "%~dp0customer-web"
call npm install
popd
echo.

echo [4/4] Installing customer mobile (pnpm install)...
pushd "%~dp0apps\customer-mobile"
where pnpm >nul 2>&1
if %errorlevel%==0 (
  call pnpm install
) else (
  echo pnpm not found, falling back to npm install...
  call npm install
)
echo.
if exist server\package.json (
  echo Installing customer mobile server deps (npm install)...
  pushd server
  call npm install
  popd
)
popd
echo.
echo ============================================
echo  All packages installed.
echo ============================================
echo.

:launchmenu
echo  What do you want to start?
echo    [1] Backend + Admin App + Customer Web
echo    [2] Backend + Admin App + Customer Web + Customer Mobile
echo    [3] Backend only
echo    [4] Exit
echo.
set /p choice=Choose an option (1-4): 

if "%choice%"=="1" goto trio
if "%choice%"=="2" goto all
if "%choice%"=="3" goto backendonly
echo.
echo Invalid option. Exiting.
goto end

:backendonly
echo [1/1] Starting Backend on port 4000...
start "LoanEx Backend" cmd /k "cd /d %~dp0backend && npm run dev"
goto summary

:trio
set RUN_MOBILE=0
goto launch

:all
set RUN_MOBILE=1
goto launch

:launch
echo Stopping stale servers on ports 4000, 4200, 8081, 8082...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000 :4200 :8081 :8082" ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/4] Starting Backend on port 4000...
start "LoanEx Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo [2/4] Starting Admin App (Expo) on port 8081...
start "LoanEx Admin App" cmd /k "cd /d %~dp0admin-app && npm start"

echo [3/4] Starting Customer Web on port 4200...
start "LoanEx Customer Web" cmd /k "cd /d %~dp0customer-web && npm start"

if "%RUN_MOBILE%"=="1" (
  echo [4/4] Starting Customer Mobile (Expo) on port 8082...
  start "LoanEx Customer Mobile" cmd /k "cd /d %~dp0apps\customer-mobile && npm start -- --port 8082"
)

echo.
echo ============================================
echo  Servers starting:
echo    Backend         - http://localhost:4000
echo    Admin App       - http://localhost:8081
echo    Customer Web    - http://localhost:4200
if "%RUN_MOBILE%"=="1" echo    Customer Mobile - Expo on port 8082
echo.
echo  Keep the windows open. Close a window to stop that server.
echo ============================================
echo.
:end
endlocal