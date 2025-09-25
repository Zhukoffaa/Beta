param(
  [string]$UserName = "Zhukoffaa",
  [string]$UserEmail = "zhukoffaa@gmail.com",
  [string]$RepoUrl = "https://github.com/Zhukoffaa/Beta.git",
  [string]$MainBranch = "master"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ИНИЦИАЛИЗАЦИЯ GIT РЕПОЗИТОРИЯ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (!(Get-Command git -ErrorAction SilentlyContinue)) { 
    throw "Git не найден! Установите Git и перезапустите скрипт." 
}

if (!(Test-Path ".git")) { 
    Write-Host "Инициализация Git репозитория..." -ForegroundColor Yellow
    git init 
}

if ($UserName) { 
    Write-Host "Настройка пользователя: $UserName" -ForegroundColor Yellow
    git config user.name $UserName 
}

if ($UserEmail) { 
    Write-Host "Настройка email: $UserEmail" -ForegroundColor Yellow
    git config user.email $UserEmail 
}

if (Test-Path ".gitignore") { 
    Write-Host "✅ .gitignore уже существует" -ForegroundColor Green
} else { 
    Write-Host "Создание .gitignore..." -ForegroundColor Yellow
    New-Item -Path ".gitignore" -ItemType File | Out-Null 
}

if (Test-Path ".vscode") { 
    Write-Host "✅ .vscode уже существует" -ForegroundColor Green
} else { 
    Write-Host "Создание .vscode..." -ForegroundColor Yellow
    New-Item -Path ".vscode" -ItemType Directory | Out-Null 
}

if (Test-Path ".vscode/settings.json") { 
    Write-Host "✅ .vscode/settings.json уже существует" -ForegroundColor Green
} else { 
    Write-Host "Создание .vscode/settings.json..." -ForegroundColor Yellow
    New-Item -Path ".vscode/settings.json" -ItemType File | Out-Null 
}

$branch = git rev-parse --abbrev-ref HEAD 2>$null
if ($branch -ne $MainBranch) { 
    Write-Host "Переключение на ветку $MainBranch..." -ForegroundColor Yellow
    git checkout -B $MainBranch 
}

Write-Host "Добавление всех файлов..." -ForegroundColor Yellow
git add -A

Write-Host "Создание начального коммита..." -ForegroundColor Yellow
git commit -m "Initial commit" 2>$null

if ($RepoUrl -ne "") {
    $hasRemote = git remote 2>$null
    if (-not ($hasRemote -match "origin")) { 
        Write-Host "Добавление удаленного репозитория..." -ForegroundColor Yellow
        git remote add origin $RepoUrl 
    }
    
    Write-Host "Синхронизация с удаленным репозиторием..." -ForegroundColor Yellow
    git pull origin $MainBranch --rebase 2>$null
    
    Write-Host "Загрузка на GitHub..." -ForegroundColor Yellow
    git push -u origin $MainBranch
}

Write-Host ""
Write-Host "✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА!" -ForegroundColor Green
Write-Host ""
git status
