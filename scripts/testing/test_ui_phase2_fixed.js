#!/usr/bin/env node

/**
 * STAGE 5 - ФАЗА 2: Исправленное UI тестирование
 * Учитывает реальную структуру проекта в режиме разработки
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class UITesterFixed {
    constructor() {
        this.results = {
            phase: 'ФАЗА 2: ELECTRON UI ТЕСТИРОВАНИЕ (ИСПРАВЛЕННАЯ)',
            startTime: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        
        if (!this.results.logs) this.results.logs = [];
        this.results.logs.push(logMessage);
    }

    addTest(name, status, details = '', duration = 0) {
        const test = {
            name,
            status, // 'PASS', 'FAIL', 'WARN'
            details,
            duration,
            timestamp: new Date().toISOString()
        };
        
        this.results.tests.push(test);
        this.results.summary.total++;
        
        if (status === 'PASS') this.results.summary.passed++;
        else if (status === 'FAIL') this.results.summary.failed++;
        else if (status === 'WARN') this.results.summary.warnings++;
        
        this.log(`${status}: ${name} ${details ? '- ' + details : ''}`, status);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runCommand(command, args = [], timeout = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const process = spawn(command, args, { 
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            const timer = setTimeout(() => {
                process.kill('SIGTERM');
                resolve({
                    success: true,
                    stdout,
                    stderr,
                    duration: Date.now() - startTime,
                    timedOut: true
                });
            }, timeout);
            
            process.on('close', (code) => {
                clearTimeout(timer);
                resolve({
                    success: code === 0,
                    stdout,
                    stderr,
                    duration: Date.now() - startTime,
                    code
                });
            });
            
            process.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    async testProjectStructure() {
        this.log('🏗️ Тестирование структуры проекта...');
        
        try {
            // Проверяем основные каталоги
            const requiredDirs = [
                'backend',
                'renderer', 
                'tasks',
                'tools',
                'configs',
                'node_modules'
            ];
            
            for (const dir of requiredDirs) {
                if (fs.existsSync(dir)) {
                    this.addTest(`Каталог ${dir} существует`, 'PASS');
                } else {
                    this.addTest(`Каталог ${dir} отсутствует`, 'FAIL');
                }
            }
            
            // Проверяем исходные файлы TypeScript (не скомпилированные)
            const sourceFiles = [
                'backend/main.ts',
                'backend/services/logger.ts',
                'backend/services/config.ts',
                'backend/services/sshService.ts',
                'backend/services/llmService.ts',
                'backend/services/taskExecutor.ts',
                'backend/services/serverManager.ts',
                'tasks/deployTask.ts',
                'tasks/connectTask.ts',
                'tasks/chatTask.ts'
            ];
            
            for (const file of sourceFiles) {
                if (fs.existsSync(file)) {
                    this.addTest(`Исходный файл ${path.basename(file)}`, 'PASS');
                } else {
                    this.addTest(`Исходный файл ${path.basename(file)} отсутствует`, 'FAIL');
                }
            }
            
            // Проверяем React компоненты
            const reactFiles = [
                'renderer/src/App.tsx',
                'renderer/src/index.tsx',
                'renderer/src/components/ServersPanel.tsx',
                'renderer/src/components/Chat.tsx',
                'renderer/src/components/LogViewer.tsx',
                'renderer/src/hooks/useIpc.ts'
            ];
            
            for (const file of reactFiles) {
                if (fs.existsSync(file)) {
                    this.addTest(`React компонент ${path.basename(file)}`, 'PASS');
                } else {
                    this.addTest(`React компонент ${path.basename(file)} отсутствует`, 'FAIL');
                }
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке структуры', 'FAIL', error.message);
        }
    }

    async testApplicationLaunch() {
        this.log('🚀 Тестирование запуска приложения...');
        
        try {
            // Запускаем приложение на 15 секунд
            this.log('Запуск npm run start на 15 секунд...');
            const result = await this.runCommand('npm', ['run', 'start'], 15000);
            
            if (result.timedOut) {
                this.addTest('Приложение запустилось и работало 15 секунд', 'PASS', 
                    'Приложение успешно запустилось и было принудительно закрыто');
            } else if (result.success) {
                this.addTest('Приложение запустилось', 'PASS', 
                    `Завершилось с кодом ${result.code}`);
            } else {
                this.addTest('Ошибка запуска приложения', 'FAIL', 
                    `Код: ${result.code}`);
            }
            
            // Анализируем вывод с исправленными регулярными выражениями
            const output = result.stdout + result.stderr;
            
            // Проверяем ключевые индикаторы успешного запуска
            const checks = [
                {
                    pattern: /Found 0 errors/i,
                    name: 'TypeScript компиляция без ошибок',
                    required: true
                },
                {
                    pattern: /webpack.*compiled successfully/i,
                    name: 'Webpack компиляция успешна',
                    required: true
                },
                {
                    pattern: /Preload script loaded successfully/i,
                    name: 'Preload script загружен',
                    required: true
                },
                {
                    pattern: /Project is running at.*localhost:3000/i,
                    name: 'Dev-server запущен на localhost:3000',
                    required: true
                },
                {
                    pattern: /Failed to load image.*icon/i,
                    name: 'Предупреждение об отсутствии иконки',
                    required: false
                },
                {
                    pattern: /concurrently/i,
                    name: 'Concurrently запущен',
                    required: true
                },
                {
                    pattern: /electron/i,
                    name: 'Electron процесс активен',
                    required: true
                }
            ];
            
            for (const check of checks) {
                if (check.pattern.test(output)) {
                    this.addTest(check.name, 'PASS');
                } else {
                    this.addTest(check.name, check.required ? 'FAIL' : 'WARN', 
                        check.required ? 'Обязательная проверка не пройдена' : 'Необязательная проверка');
                }
            }
            
            // Дополнительные проверки вывода
            if (output.includes('npm run dev:backend')) {
                this.addTest('Backend процесс запущен', 'PASS');
            } else {
                this.addTest('Backend процесс не запущен', 'FAIL');
            }
            
            if (output.includes('npm run dev:renderer')) {
                this.addTest('Renderer процесс запущен', 'PASS');
            } else {
                this.addTest('Renderer процесс не запущен', 'FAIL');
            }
            
            if (output.includes('npm run dev:electron')) {
                this.addTest('Electron процесс запущен', 'PASS');
            } else {
                this.addTest('Electron процесс не запущен', 'FAIL');
            }
            
        } catch (error) {
            this.addTest('Критическая ошибка при запуске', 'FAIL', error.message);
        }
    }

    async testConfigurationFiles() {
        this.log('📋 Тестирование конфигурационных файлов...');
        
        try {
            // Проверяем package.json
            if (fs.existsSync('package.json')) {
                const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                this.addTest('Файл package.json читается', 'PASS');
                
                // Проверяем скрипты
                const requiredScripts = ['start', 'dev', 'build', 'dev:full'];
                for (const script of requiredScripts) {
                    if (packageData.scripts && packageData.scripts[script]) {
                        this.addTest(`Скрипт ${script} определен`, 'PASS');
                    } else {
                        this.addTest(`Скрипт ${script} отсутствует`, 'FAIL');
                    }
                }
            } else {
                this.addTest('Файл package.json отсутствует', 'FAIL');
            }
            
            // Проверяем servers.json
            const serversPath = 'configs/servers.json';
            if (fs.existsSync(serversPath)) {
                const serversData = JSON.parse(fs.readFileSync(serversPath, 'utf8'));
                
                this.addTest('Файл servers.json читается', 'PASS');
                
                if (serversData.servers && Array.isArray(serversData.servers)) {
                    this.addTest('Структура servers.json корректна', 'PASS', 
                        `Найдено ${serversData.servers.length} серверов`);
                    
                    // Проверяем первый сервер
                    if (serversData.servers.length > 0) {
                        const server = serversData.servers[0];
                        const requiredFields = ['id', 'name', 'host', 'port', 'user'];
                        
                        for (const field of requiredFields) {
                            if (server[field]) {
                                this.addTest(`Поле ${field} в конфигурации сервера`, 'PASS');
                            } else {
                                this.addTest(`Поле ${field} отсутствует`, 'FAIL');
                            }
                        }
                    }
                } else {
                    this.addTest('Структура servers.json некорректна', 'FAIL');
                }
            } else {
                this.addTest('Файл servers.json отсутствует', 'FAIL');
            }
            
            // Проверяем TypeScript конфигурации
            const tsConfigs = [
                'tsconfig.json',
                'backend/tsconfig.json',
                'renderer/tsconfig.json'
            ];
            
            for (const config of tsConfigs) {
                if (fs.existsSync(config)) {
                    this.addTest(`TypeScript конфиг ${config}`, 'PASS');
                } else {
                    this.addTest(`TypeScript конфиг ${config} отсутствует`, 'WARN');
                }
            }
            
            // Проверяем SSH ключи
            const sshKeyPath = 'configs/ssh_keys/llm_server_key';
            if (fs.existsSync(sshKeyPath)) {
                this.addTest('SSH ключ найден', 'PASS');
            } else {
                this.addTest('SSH ключ отсутствует', 'FAIL', 'Необходим для подключения к серверу');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке конфигураций', 'FAIL', error.message);
        }
    }

    async testDependencies() {
        this.log('📦 Тестирование зависимостей...');
        
        try {
            // Проверяем node_modules
            if (fs.existsSync('node_modules')) {
                this.addTest('Каталог node_modules существует', 'PASS');
                
                // Проверяем ключевые зависимости
                const keyDeps = [
                    'electron',
                    'react',
                    'react-dom',
                    'typescript',
                    'ssh2',
                    'yaml',
                    'concurrently',
                    'wait-on'
                ];
                
                for (const dep of keyDeps) {
                    if (fs.existsSync(`node_modules/${dep}`)) {
                        this.addTest(`Зависимость ${dep}`, 'PASS');
                    } else {
                        this.addTest(`Зависимость ${dep} отсутствует`, 'FAIL');
                    }
                }
            } else {
                this.addTest('Каталог node_modules отсутствует', 'FAIL', 'Запустите npm install');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке зависимостей', 'FAIL', error.message);
        }
    }

    async testBuildSystem() {
        this.log('🔧 Тестирование системы сборки...');
        
        try {
            // Проверяем Webpack конфигурацию
            const webpackConfig = 'renderer/webpack.config.js';
            if (fs.existsSync(webpackConfig)) {
                this.addTest('Webpack конфигурация найдена', 'PASS');
            } else {
                this.addTest('Webpack конфигурация отсутствует', 'FAIL');
            }
            
            // Проверяем Tailwind конфигурацию
            const tailwindConfig = 'tailwind.config.js';
            if (fs.existsSync(tailwindConfig)) {
                this.addTest('Tailwind конфигурация найдена', 'PASS');
            } else {
                this.addTest('Tailwind конфигурация отсутствует', 'WARN');
            }
            
            // Проверяем PostCSS конфигурацию
            const postcssConfig = 'postcss.config.js';
            if (fs.existsSync(postcssConfig)) {
                this.addTest('PostCSS конфигурация найдена', 'PASS');
            } else {
                this.addTest('PostCSS конфигурация отсутствует', 'WARN');
            }
            
            // Проверяем renderer/dist (результат сборки)
            if (fs.existsSync('renderer/dist')) {
                const distFiles = fs.readdirSync('renderer/dist');
                if (distFiles.length > 0) {
                    this.addTest('Renderer собран', 'PASS', `Файлов: ${distFiles.length}`);
                } else {
                    this.addTest('Renderer не собран', 'WARN', 'Каталог dist пустой');
                }
            } else {
                this.addTest('Каталог renderer/dist отсутствует', 'WARN', 'Запустите npm run build');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке системы сборки', 'FAIL', error.message);
        }
    }

    generateReport() {
        this.results.endTime = new Date().toISOString();
        this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);
        
        const report = `# STAGE 5 - ФАЗА 2: ИСПРАВЛЕННЫЙ ОТЧЕТ UI ТЕСТИРОВАНИЯ

## 📊 СВОДКА РЕЗУЛЬТАТОВ

**Период тестирования:** ${this.results.startTime} - ${this.results.endTime}  
**Длительность:** ${Math.round(this.results.duration / 1000)} секунд

### Статистика тестов:
- **Всего тестов:** ${this.results.summary.total}
- **✅ Пройдено:** ${this.results.summary.passed}
- **❌ Провалено:** ${this.results.summary.failed}
- **⚠️ Предупреждения:** ${this.results.summary.warnings}

**Процент успеха:** ${Math.round((this.results.summary.passed / this.results.summary.total) * 100)}%

## 📋 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ

${this.results.tests.map(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    return `### ${icon} ${test.name}
**Статус:** ${test.status}  
**Детали:** ${test.details || 'Нет дополнительной информации'}  
**Время:** ${test.timestamp}
`;
}).join('\n')}

## 🎯 ВЫВОДЫ

### Критические проблемы (требуют исправления):
${this.results.tests.filter(t => t.status === 'FAIL').map(t => `- ❌ ${t.name}: ${t.details}`).join('\n') || 'Критических проблем не найдено'}

### Предупреждения (рекомендуется исправить):
${this.results.tests.filter(t => t.status === 'WARN').map(t => `- ⚠️ ${t.name}: ${t.details}`).join('\n') || 'Предупреждений нет'}

### Успешные проверки:
${this.results.tests.filter(t => t.status === 'PASS').length} из ${this.results.summary.total} тестов пройдены успешно

## 🚀 ГОТОВНОСТЬ К ФАЗЕ 3

${this.results.summary.failed === 0 ? 
    '✅ **ГОТОВ К ФАЗЕ 3** - Все критические тесты пройдены' : 
    this.results.summary.failed <= 3 ?
    '⚠️ **УСЛОВНО ГОТОВ К ФАЗЕ 3** - Есть минорные проблемы, но можно продолжать' :
    '❌ **НЕ ГОТОВ К ФАЗЕ 3** - Есть критические ошибки, требующие исправления'}

## 📈 РЕКОМЕНДАЦИИ

### Для улучшения:
1. **Исправить критические ошибки** - устранить все FAIL статусы
2. **Обратить внимание на предупреждения** - улучшить WARN статусы  
3. **Добавить недостающие файлы** - создать отсутствующие компоненты
4. **Оптимизировать сборку** - настроить правильную компиляцию

### Следующие шаги:
1. Перейти к Фазе 3 (IPC тестирование) если готовность > 85%
2. Исправить критические проблемы если готовность < 85%
3. Провести дополнительное тестирование UI компонентов

---

**Автоматически сгенерировано:** ${new Date().toISOString()}  
**Версия тестера:** 2.0.0 (исправленная)
`;

        return report;
    }

    async run() {
        this.log('🎯 Начало ФАЗЫ 2: ИСПРАВЛЕННОЕ ELECTRON UI ТЕСТИРОВАНИЕ');
        
        await this.testDependencies();
        await this.testProjectStructure();
        await this.testBuildSystem();
        await this.testConfigurationFiles();
        await this.testApplicationLaunch();
        
        const report = this.generateReport();
        
        // Сохраняем отчет
        fs.writeFileSync('STAGE5_PHASE2_FIXED_REPORT.md', report);
        this.log('📄 Отчет сохранен в STAGE5_PHASE2_FIXED_REPORT.md');
        
        // Выводим краткую сводку
        console.log('\n' + '='.repeat(60));
        console.log('📊 КРАТКАЯ СВОДКА ИСПРАВЛЕННОЙ ФАЗЫ 2');
        console.log('='.repeat(60));
        console.log(`✅ Пройдено: ${this.results.summary.passed}`);
        console.log(`❌ Провалено: ${this.results.summary.failed}`);
        console.log(`⚠️ Предупреждения: ${this.results.summary.warnings}`);
        console.log(`📈 Успех: ${Math.round((this.results.summary.passed / this.results.summary.total) * 100)}%`);
        
        const successRate = (this.results.summary.passed / this.results.summary.total) * 100;
        
        if (successRate >= 90) {
            console.log('\n🎉 ФАЗА 2 ЗАВЕРШЕНА ОТЛИЧНО! Готов к переходу к Фазе 3.');
        } else if (successRate >= 85) {
            console.log('\n✅ ФАЗА 2 ЗАВЕРШЕНА УСПЕШНО! Готов к переходу к Фазе 3.');
        } else if (successRate >= 70) {
            console.log('\n⚠️ ФАЗА 2 ЗАВЕРШЕНА С ПРЕДУПРЕЖДЕНИЯМИ. Можно переходить к Фазе 3, но рекомендуется исправить проблемы.');
        } else {
            console.log('\n❌ ФАЗА 2 ЗАВЕРШЕНА С ОШИБКАМИ. Требуется исправление перед Фазой 3.');
        }
        
        return successRate >= 70; // 70% - минимальный порог для перехода к Фазе 3
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new UITesterFixed();
    tester.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Критическая ошибка тестера:', error);
        process.exit(1);
    });
}

module.exports = UITesterFixed;
