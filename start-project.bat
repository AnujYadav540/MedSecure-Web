@echo off
echo Starting MedSecure Project...
echo.
echo Backend server will be available at: http://localhost:5000
echo Frontend client will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the project
echo.

powershell -ExecutionPolicy Bypass -File start-project.ps1

pause

