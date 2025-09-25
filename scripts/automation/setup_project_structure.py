#!/usr/bin/env python3
"""
Скрипт для создания структуры каталогов проекта Windows LLM Agent
"""

import os
import json
import yaml
from pathlib import Path

def create_directory_structure():
    """Создает базовую структуру каталогов проекта"""
    
    # Базовые каталоги
    directories = [
        "backend",
        "backend/services", 
        "renderer",
        "renderer/components",
        "renderer/hooks",
        "tasks",
        "tools", 
        "configs",
        "logs",
        "tests",
        "tests/unit",
        "tests/integration",
        "dist",
        "build"
    ]
    
    print("🏗️  Создание структуры каталогов...")
    
    for directory in directories:
        dir_path = Path(directory)
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Создан каталог: {directory}")
    
    print(f"\n📁 Создано {len(directories)} каталогов")

def create_config_files():
    """Создает базовые конфигурационные файлы"""
    
    print("\n⚙️  Создание конфигурационных файлов...")
    
    # app.yaml
    app_config = {
        'app': {
            'name': 'Windows LLM Agent',
            'version': '1.0.0-beta',
            'debug': False,
            'logLevel': 'info',
            'theme': 'dark',
            'language': 'ru'
        },
        'timeouts': {
            'ssh': 30000,
            'llm': 60000,
            'deploy': 300000,
            'health_check': 10000
        },
        'paths': {
            'logs': './logs',
            'tools': './tools',
            'configs': './configs'
        },
        'ui': {
            'window': {
                'width': 1200,
                'height': 800,
                'minWidth': 800,
                'minHeight': 600
            },
            'devTools': False
        }
    }
    
    with open('configs/app.yaml', 'w', encoding='utf-8') as f:
        yaml.dump(app_config, f, default_flow_style=False, allow_unicode=True)
    print("✅ Создан файл: configs/app.yaml")
    
    # servers.json
    servers_config = {
        "servers": [
            {
                "id": "example-server",
                "name": "Example LLM Server",
                "host": "192.168.1.100",
                "port": 22,
                "user": "admin",
                "sshKey": "",
                "deployPath": "/opt/llm",
                "llmPort": 8080,
                "status": "disconnected",
                "deployed": False,
                "connected": False,
                "lastCheck": None,
                "projectPath": "/home/admin/llm-project"
            }
        ],
        "activeServer": None,
        "lastUpdated": None
    }
    
    with open('configs/servers.json', 'w', encoding='utf-8') as f:
        json.dump(servers_config, f, indent=2, ensure_ascii=False)
    print("✅ Создан файл: configs/servers.json")

def create_package_json():
    """Создает package.json для проекта"""
    
    print("\n📦 Создание package.json...")
    
    package_config = {
        "name": "windows-llm-agent",
        "version": "1.0.0-beta",
        "description": "Windows приложение-агент для управления удаленными LLM серверами",
        "main": "backend/main.js",
        "homepage": "./",
        "scripts": {
            "dev": "concurrently \"npm run dev:backend\" \"npm run dev:renderer\"",
            "dev:backend": "tsc -w --project backend/tsconfig.json",
            "dev:renderer": "webpack serve --config renderer/webpack.config.js",
            "build": "npm run build:backend && npm run build:renderer",
            "build:backend": "tsc --project backend/tsconfig.json",
            "build:renderer": "webpack --config renderer/webpack.config.js --mode production",
            "electron": "electron .",
            "electron:dev": "electron . --dev",
            "dist": "electron-builder",
            "dist:win": "electron-builder --win",
            "test": "jest",
            "test:watch": "jest --watch",
            "lint": "eslint . --ext .ts,.tsx",
            "lint:fix": "eslint . --ext .ts,.tsx --fix"
        },
        "keywords": [
            "electron",
            "llm",
            "ssh",
            "agent",
            "windows"
        ],
        "author": "LLM Agent Team",
        "license": "MIT",
        "devDependencies": {
            "@types/node": "^20.0.0",
            "@types/react": "^18.0.0",
            "@types/react-dom": "^18.0.0",
            "@typescript-eslint/eslint-plugin": "^6.0.0",
            "@typescript-eslint/parser": "^6.0.0",
            "concurrently": "^8.0.0",
            "electron": "^27.0.0",
            "electron-builder": "^24.0.0",
            "eslint": "^8.0.0",
            "eslint-plugin-react": "^7.0.0",
            "jest": "^29.0.0",
            "typescript": "^5.0.0",
            "webpack": "^5.0.0",
            "webpack-cli": "^5.0.0",
            "webpack-dev-server": "^4.0.0"
        },
        "dependencies": {
            "react": "^18.0.0",
            "react-dom": "^18.0.0",
            "ssh2": "^1.15.0",
            "yaml": "^2.3.0",
            "axios": "^1.6.0",
            "monaco-editor": "^0.44.0",
            "diff2html": "^3.4.0"
        },
        "build": {
            "appId": "com.llmagent.windows",
            "productName": "Windows LLM Agent",
            "directories": {
                "output": "dist"
            },
            "files": [
                "backend/**/*",
                "renderer/dist/**/*",
                "tools/**/*",
                "configs/**/*",
                "package.json"
            ],
            "extraResources": [
                {
                    "from": "tools/",
                    "to": "tools/"
                },
                {
                    "from": "configs/",
                    "to": "configs/"
                }
            ],
            "win": {
                "target": "nsis",
                "icon": "assets/icon.ico"
            },
            "nsis": {
                "oneClick": False,
                "allowToChangeInstallationDirectory": True
            }
        }
    }
    
    with open('package.json', 'w', encoding='utf-8') as f:
        json.dump(package_config, f, indent=2, ensure_ascii=False)
    print("✅ Создан файл: package.json")

def create_gitignore():
    """Создает .gitignore файл"""
    
    print("\n🚫 Создание .gitignore...")
    
    gitignore_content = """# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.js
*.js.map
!webpack.config.js
!jest.config.js

# Logs
logs/*.log
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Electron
out/
dist_electron/

# Local configuration overrides
configs/local.*
configs/*.local.*

# SSH keys (security)
*.pem
*.key
id_rsa*

# Temporary files
tmp/
temp/
*.tmp
"""
    
    with open('.gitignore', 'w', encoding='utf-8') as f:
        f.write(gitignore_content)
    print("✅ Создан файл: .gitignore")

def create_typescript_configs():
    """Создает конфигурационные файлы TypeScript"""
    
    print("\n📝 Создание конфигураций TypeScript...")
    
    # Основной tsconfig.json
    main_tsconfig = {
        "compilerOptions": {
            "target": "ES2020",
            "module": "commonjs",
            "lib": ["ES2020", "DOM"],
            "outDir": "./dist",
            "rootDir": "./",
            "strict": True,
            "esModuleInterop": True,
            "skipLibCheck": True,
            "forceConsistentCasingInFileNames": True,
            "resolveJsonModule": True,
            "declaration": True,
            "declarationMap": True,
            "sourceMap": True
        },
        "include": [
            "backend/**/*",
            "tasks/**/*"
        ],
        "exclude": [
            "node_modules",
            "dist",
            "renderer"
        ]
    }
    
    with open('tsconfig.json', 'w', encoding='utf-8') as f:
        json.dump(main_tsconfig, f, indent=2)
    print("✅ Создан файл: tsconfig.json")
    
    # Backend tsconfig
    backend_tsconfig = {
        "extends": "../tsconfig.json",
        "compilerOptions": {
            "outDir": "../dist/backend",
            "rootDir": "."
        },
        "include": [
            "**/*"
        ]
    }
    
    with open('backend/tsconfig.json', 'w', encoding='utf-8') as f:
        json.dump(backend_tsconfig, f, indent=2)
    print("✅ Создан файл: backend/tsconfig.json")

def create_readme_files():
    """Создает README файлы для каждого каталога"""
    
    print("\n📖 Создание README файлов...")
    
    readme_contents = {
        "backend/README.md": """# Backend Services

Этот каталог содержит backend службы приложения:

- `main.ts` - точка входа Electron приложения
- `services/` - основные службы (SSH, LLM, Config, Logger, etc.)

## Структура

- `services/logger.ts` - система логирования
- `services/config.ts` - управление конфигурациями  
- `services/sshService.ts` - SSH/SFTP операции
- `services/llmService.ts` - HTTP клиент для LLM API
- `services/taskExecutor.ts` - менеджер worker потоков
- `services/serverManager.ts` - управление серверами
""",
        
        "renderer/README.md": """# Frontend UI

React приложение для пользовательского интерфейса:

- `App.tsx` - главный компонент
- `components/` - UI компоненты
- `hooks/` - React хуки для IPC

## Компоненты

- `Chat.tsx` - интерфейс чата с LLM
- `CodeEditor.tsx` - Monaco Editor
- `DiffViewer.tsx` - просмотр различий
- `FileExplorer.tsx` - файловый проводник
- `ServersPanel.tsx` - панель серверов
- `SettingsDialog.tsx` - настройки
""",
        
        "tasks/README.md": """# Worker Tasks

Задачи, выполняемые в отдельных процессах:

- `deployTask.ts` - развертывание LLM сервера
- `connectTask.ts` - подключение и туннели
- `chatTask.ts` - обработка чат запросов

Все задачи используют JSONL формат для коммуникации.
""",
        
        "tools/README.md": """# Tools

Вспомогательные скрипты и инструменты:

- `deploy_llm_server.py` - скрипт развертывания LLM
- Другие утилиты для работы с серверами

Эти файлы копируются на удаленные серверы.
""",
        
        "configs/README.md": """# Configurations

Конфигурационные файлы приложения:

- `app.yaml` - основные настройки приложения
- `servers.json` - конфигурация серверов

Файлы автоматически создаются при первом запуске.
"""
    }
    
    for file_path, content in readme_contents.items():
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Создан файл: {file_path}")

def main():
    """Главная функция скрипта"""
    
    print("🚀 Настройка структуры проекта Windows LLM Agent")
    print("=" * 50)
    
    try:
        create_directory_structure()
        create_config_files()
        create_package_json()
        create_gitignore()
        create_typescript_configs()
        create_readme_files()
        
        print("\n" + "=" * 50)
        print("✅ Структура проекта успешно создана!")
        print("\n📋 Следующие шаги:")
        print("1. Запустите: npm install")
        print("2. Начните разработку с Этапа 1 из PROJECT_MASTER_CHECKLIST.md")
        print("3. Создайте основные файлы backend и frontend")
        
    except Exception as e:
        print(f"\n❌ Ошибка при создании структуры: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
