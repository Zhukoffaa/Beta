@echo off
echo ========================================
echo   GIT PUSH С PERSONAL ACCESS TOKEN
echo ========================================
echo.

set TOKEN=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

echo Настраиваем Git с токеном...
git remote set-url origin https://%TOKEN%@github.com/Zhukoffaa/Beta.git

echo Проверяем статус...
git status

echo Добавляем все файлы...
git add .

echo Создаем коммит...
git commit -m "Token push: %date% %time%"

echo Загружаем на GitHub с токеном...
git push origin master

echo.
echo ✅ ГОТОВО! Проверьте: https://github.com/Zhukoffaa/Beta
echo.

echo Возвращаем обычный URL...
git remote set-url origin https://github.com/Zhukoffaa/Beta.git

pause
