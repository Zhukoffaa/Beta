param(
  [string]$Message = "update",
  [string]$MainBranch = "master",
  [string]$Token = "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"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   GIT COMMIT И PUSH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (!(Get-Command git -ErrorAction SilentlyContinue)) { 
    throw "Git не найден!" 
}

# Настройка URL с токеном для push
$repoUrl = "https://$Token@github.com/Zhukoffaa/Beta.git"
git remote set-url origin $repoUrl

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne $MainBranch) { 
    Write-Host "Переключение на ветку $MainBranch..." -ForegroundColor Yellow
    git checkout $MainBranch 
}

Write-Host "Добавление всех изменений..." -ForegroundColor Yellow
git add -A

Write-Host "Создание коммита: '$Message'..." -ForegroundColor Yellow
git commit -m $Message

Write-Host "Синхронизация с удаленным репозиторием..." -ForegroundColor Yellow
git pull origin $MainBranch --rebase

Write-Host "Загрузка изменений на GitHub..." -ForegroundColor Yellow
git push origin $MainBranch

# Возвращаем обычный URL
git remote set-url origin "https://github.com/Zhukoffaa/Beta.git"

Write-Host ""
Write-Host "✅ УСПЕШНО ЗАГРУЖЕНО!" -ForegroundColor Green
Write-Host "🌐 Проверьте: https://github.com/Zhukoffaa/Beta" -ForegroundColor Cyan
Write-Host ""
git status
