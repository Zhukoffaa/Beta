@echo off
echo Git Commit and Push Script
echo ==========================

git add .
git commit -m "Auto commit: %date% %time%"
git push origin master

echo Done!
pause
