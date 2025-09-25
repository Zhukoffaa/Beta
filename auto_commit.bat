@echo off
chcp 65001 >nul
echo ========================================
echo   АВТОМАТИЧЕСКИЙ GIT COMMIT И PUSH
echo ========================================
echo.

:: Получаем текущую дату и время
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%"
set "timestamp=%HH%:%Min%:%Sec%"

echo Дата: %datestamp%
echo Время: %timestamp%
echo.

:: Проверяем статус Git
echo Проверяем статус Git...
git status --porcelain > temp_status.txt 2>nul
if exist temp_status.txt (
    set /p git_status=<temp_status.txt
    del temp_status.txt
) else (
    set "git_status="
)

if "%git_status%"=="" (
    echo ✅ Нет изменений для коммита
    echo.
    pause
    exit /b 0
)

:: Показываем изменения
echo 📋 Найдены изменения:
git status --short
echo.

:: Добавляем все файлы
echo 📁 Добавляем все файлы...
git add .
if %errorlevel% neq 0 (
    echo ❌ Ошибка при добавлении файлов
    pause
    exit /b 1
)

:: Создаем коммит с автоматическим сообщением
set "commit_msg=Auto commit: %datestamp% %timestamp%"
echo 💾 Создаем коммит: "%commit_msg%"
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ❌ Ошибка при создании коммита
    pause
    exit /b 1
)

:: Пушим на GitHub
echo 🚀 Загружаем на GitHub...
git push origin master
if %errorlevel% neq 0 (
    echo ❌ Ошибка при загрузке на GitHub
    echo Попробуем принудительную загрузку...
    git push --force origin master
    if %errorlevel% neq 0 (
        echo ❌ Принудительная загрузка не удалась
        pause
        exit /b 1
    )
)

echo.
echo ✅ УСПЕШНО ЗАВЕРШЕНО!
echo 📊 Коммит: "%commit_msg%"
echo 🌐 Загружено на: https://github.com/Zhukoffaa/Beta
echo.
pause
