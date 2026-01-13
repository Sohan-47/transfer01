@echo off
echo Attempting to switch Network Profile to Private...
echo This fixes issues where Windows blocks phone connections.
echo.
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
echo.
echo Done! checking status...
powershell -Command "Get-NetConnectionProfile"
echo.
echo If you see 'NetworkCategory : Private' above, try connecting with your phone now!
pause
