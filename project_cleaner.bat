@echo off
title Ultimate Project Cleaner
color 0E

:: Safety Check: Prevent running directly on drive root or Windows directories
if "%~dp0"=="C:\" goto :root_warning
if "%~dp0"=="C:\Windows\" goto :root_warning
if "%~dp0"=="C:\Program Files\" goto :root_warning
if "%~dp0"=="C:\Program Files (x86)\" goto :root_warning

echo ===================================================
echo        ULTIMATE PROJECT CLEAN-UP UTILITY
echo ===================================================
echo.
echo Current Directory: %~dp0
echo.
echo This utility will scan this directory recursively and delete:
echo  [1] Python caches (__pycache__, .pytest_cache, *.pyc, *.pyo)
echo  [2] Node/Web builds (.next, dist, out, build, .cache)
echo  [3] IDE/Editor settings (.vs, bin, obj, .idea, .vscode, *.suo, *.user)
echo  [4] Temporary files (*.log, *.tmp, Thumbs.db, .DS_Store)
echo.
echo ===================================================
choice /C YN /M "Are you sure you want to clean this project directory?"
if errorlevel 2 goto :cancel

echo.
choice /C YN /M "Do you also want to delete heavy folders (node_modules, .venv, venv)?"
if errorlevel 2 (
    set "CLEAN_HEAVY=N"
) else (
    set "CLEAN_HEAVY=Y"
)

echo.
echo ---------------------------------------------------
echo  CLEANING IN PROGRESS...
echo ---------------------------------------------------
echo.

:: --- [1] Python Caches & Compiled files ---
for /d /r "%~dp0" %%d in (__pycache__ .pytest_cache) do (
    if exist "%%d" (
        rd /s /q "%%d"
        echo  [CLEANED] %%d
    )
)
del /s /f /q "%~dp0*.pyc" >nul 2>&1
del /s /f /q "%~dp0*.pyo" >nul 2>&1

:: --- [2] JS/Web Builds & Caches ---
for /d /r "%~dp0" %%d in (.next dist out build .cache) do (
    if exist "%%d" (
        rd /s /q "%%d"
        echo  [CLEANED] %%d
    )
)

:: --- [3] IDEs & Compiler outputs ---
for /d /r "%~dp0" %%d in (.vs bin obj .idea .vscode) do (
    if exist "%%d" (
        rd /s /q "%%d"
        echo  [CLEANED] %%d
    )
)
del /s /f /q "%~dp0*.suo" >nul 2>&1
del /s /f /q "%~dp0*.user" >nul 2>&1

:: --- [4] System Junk & Logs ---
del /s /f /q "%~dp0*.log" >nul 2>&1
del /s /f /q "%~dp0*.tmp" >nul 2>&1
del /s /f /q "%~dp0Thumbs.db" >nul 2>&1
del /s /f /q "%~dp0.DS_Store" >nul 2>&1

:: --- [5] Optional Heavy Folders (node_modules, virtual envs) ---
if "%CLEAN_HEAVY%"=="Y" (
    echo.
    echo Cleaning heavy modules and environments...
    for /d /r "%~dp0" %%d in (node_modules .venv venv) do (
        if exist "%%d" (
            rd /s /q "%%d"
            echo  [CLEANED HEAVY] %%d
        )
    )
)

echo.
echo ===================================================
echo  PROJECT CLEANING COMPLETE!
echo ===================================================
echo.
pause
exit

:root_warning
echo.
echo [CRITICAL ERROR] This script is placed in a system directory.
echo To protect your operating system, cleaning has been blocked.
echo Please move this file inside your specific project folder.
echo.
pause
exit

:cancel
echo.
echo [CANCELLED] Cleaning cancelled by user.
echo.
pause
exit
