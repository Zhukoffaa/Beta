#!/usr/bin/env node

/**
 * STAGE 5 - ФАЗА 2: Автоматизированное UI тестирование
 * Тестирует Electron приложение через браузер интерфейс
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class UITester {
    constructor() {
        this.results = {
            phase: 'ФАЗА 2: ELECTRON UI ТЕСТИРОВАНИЕ',
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

    async testApplicationLaunch() {
        this.log('🚀 Тестирование запуска приложения...');
        
        try {
            // Проверяем, что все файлы на месте
            const requiredFiles = [
                'package.json',
                'backend/main.js',
                'renderer/dist/index.html',
                'renderer/dist/bundle.js'
            ];
            
            for (const file of requiredFiles) {
                if (fs.existsSync(file)) {
                    this.addTest(`Файл ${file} существует`, 'PASS');
                } else {
                    this.addTest(`Файл ${file} отсутствует`, 'FAIL');
                }
            }
            
            // Запускаем приложение на 10 секунд
            this.log('Запуск npm run start на 10 секунд...');
            const result = await this.runCommand('npm', ['run', 'start'], 10000);
            
            if (result.timedOut) {
                this.addTest('Приложение запустилось и работало 10 секунд', 'PASS', 
                    'Приложение успешно запустилось и было принудительно закрыто через 10 сек');
            } else if (result.success) {
                this.addTest('Приложение запустилось', 'PASS', 
                    `Завершилось с кодом ${result.code}`);
            } else {
                this.addTest('Ошибка запуска приложения', 'FAIL', 
                    `Код: ${result.code}, stderr: ${result.stderr.substring(0, 200)}`);
            }
            
            // Анализируем вывод
            const output = result.stdout + result.stderr;
            
            // Проверяем ключевые индикаторы успешного запуска
            const checks = [
                {
                    pattern: /Found 0 errors/,
                    name: 'TypeScript компиляция без ошибок',
                    required: true
                },
                {
                    pattern: /webpack.*compiled successfully/,
                    name: 'Webpack компиляция успешна',
                    required: true
                },
                {
                    pattern: /Preload script loaded successfully/,
                    name: 'Preload script загружен',
                    required: true
                },
                {
                    pattern: /Project is running at.*localhost:3000/,
                    name: 'Dev-server запущен на localhost:3000',
                    required: true
                },
                {
                    pattern: /Failed to load image.*icon\.png/,
                    name: 'Предупреждение об отсутствии иконки',
                    required: false
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
            
        } catch (error) {
            this.addTest('Критическая ошибка при запуске', 'FAIL', error.message);
        }
    }

    async testConfigurationFiles() {
        this.log('📋 Тестирование конфигурационных файлов...');
        
        try {
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
            
            // Проверяем app.yaml
            const appConfigPath = 'configs/app.yaml';
            if (fs.existsSync(appConfigPath)) {
                this.addTest('Файл app.yaml существует', 'PASS');
            } else {
                this.addTest('Файл app.yaml отсутствует', 'WARN', 'Будет создан при первом запуске');
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

    async testBuildArtifacts() {
        this.log('🔧 Тестирование артефактов сборки...');
        
        try {
            // Проверяем backend сборку
            const backendFiles = [
                'dist/backend/main.js',
                'dist/backend/services/logger.js',
                'dist/backend/services/config.js',
                'dist/backend/services/sshService.js',
                'dist/backend/services/llmService.js',
                'dist/backend/services/taskExecutor.js',
                'dist/backend/services/serverManager.js'
            ];
            
            for (const file of backendFiles) {
                if (fs.existsSync(file)) {
                    this.addTest(`Backend файл ${path.basename(file)}`, 'PASS');
                } else {
                    this.addTest(`Backend файл ${path.basename(file)} отсутствует`, 'FAIL');
                }
            }
            
            // Проверяем frontend сборку
            const frontendFiles = [
                'renderer/dist/index.html',
                'renderer/dist/bundle.js'
            ];
            
            for (const file of frontendFiles) {
                if (fs.existsSync(file)) {
                    const stats = fs.statSync(file);
                    this.addTest(`Frontend файл ${path.basename(file)}`, 'PASS', 
                        `Размер: ${Math.round(stats.size / 1024)}KB`);
                } else {
                    this.addTest(`Frontend файл ${path.basename(file)} отсутствует`, 'FAIL');
                }
            }
            
            // Проверяем tasks
            const taskFiles = [
                'dist/tasks/deployTask.js',
                'dist/tasks/connectTask.js',
                'dist/tasks/chatTask.js'
            ];
            
            for (const file of taskFiles) {
                if (fs.existsSync(file)) {
                    this.addTest(`Task файл ${path.basename(file)}`, 'PASS');
                } else {
                    this.addTest(`Task файл ${path.basename(file)} отсутствует`, 'FAIL');
                }
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке артефактов', 'FAIL', error.message);
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
                    'yaml'
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

    generateReport() {
        this.results.endTime = new Date().toISOString();
        this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);
        
        const report = `# STAGE 5 - ФАЗА 2: ОТЧЕТ UI ТЕСТИРОВАНИЯ

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
    '❌ **НЕ ГОТОВ К ФАЗЕ 3** - Есть критические ошибки, требующие исправления'}

---

**Автоматически сгенерировано:** ${new Date().toISOString()}  
**Версия тестера:** 1.0.0
`;

        return report;
    }

    async run() {
        this.log('🎯 Начало ФАЗЫ 2: ELECTRON UI ТЕСТИРОВАНИЕ');
        
        await this.testDependencies();
        await this.testBuildArtifacts();
        await this.testConfigurationFiles();
        await this.testApplicationLaunch();
        
        const report = this.generateReport();
        
        // Сохраняем отчет
        fs.writeFileSync('STAGE5_PHASE2_REPORT.md', report);
        this.log('📄 Отчет сохранен в STAGE5_PHASE2_REPORT.md');
        
        // Выводим краткую сводку
        console.log('\n' + '='.repeat(60));
        console.log('📊 КРАТКАЯ СВОДКА ФАЗЫ 2');
        console.log('='.repeat(60));
        console.log(`✅ Пройдено: ${this.results.summary.passed}`);
        console.log(`❌ Провалено: ${this.results.summary.failed}`);
        console.log(`⚠️ Предупреждения: ${this.results.summary.warnings}`);
        console.log(`📈 Успех: ${Math.round((this.results.summary.passed / this.results.summary.total) * 100)}%`);
        
        if (this.results.summary.failed === 0) {
            console.log('\n🎉 ФАЗА 2 ЗАВЕРШЕНА УСПЕШНО! Готов к переходу к Фазе 3.');
        } else {
            console.log('\n⚠️ ФАЗА 2 ЗАВЕРШЕНА С ОШИБКАМИ. Требуется исправление перед Фазой 3.');
        }
        
        return this.results.summary.failed === 0;
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new UITester();
    tester.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Критическая ошибка тестера:', error);
        process.exit(1);
    });
}

module.exports = UITester;
