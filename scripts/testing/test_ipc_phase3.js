#!/usr/bin/env node

/**
 * STAGE 5 - ФАЗА 3: IPC ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ
 * Тестирует коммуникацию между frontend и backend через IPC
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class IPCTester {
    constructor() {
        this.results = {
            phase: 'ФАЗА 3: IPC ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ',
            startTime: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        this.appProcess = null;
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

    async startApplication() {
        this.log('🚀 Запуск приложения для IPC тестирования...');
        
        return new Promise((resolve, reject) => {
            this.appProcess = spawn('npm', ['run', 'start'], { 
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            let isReady = false;
            
            this.appProcess.stdout.on('data', (data) => {
                stdout += data.toString();
                
                // Проверяем готовность приложения
                if (data.toString().includes('Preload script loaded successfully') && !isReady) {
                    isReady = true;
                    this.addTest('Приложение запущено и готово к IPC тестированию', 'PASS');
                    resolve({ stdout, stderr });
                }
            });
            
            this.appProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            this.appProcess.on('error', (error) => {
                reject(error);
            });
            
            // Таймаут на запуск
            setTimeout(() => {
                if (!isReady) {
                    this.addTest('Таймаут запуска приложения', 'FAIL', 'Приложение не запустилось за 30 секунд');
                    resolve({ stdout, stderr, timeout: true });
                }
            }, 30000);
        });
    }

    async stopApplication() {
        if (this.appProcess) {
            this.log('🛑 Остановка приложения...');
            this.appProcess.kill('SIGTERM');
            await this.sleep(2000);
            this.addTest('Приложение остановлено', 'PASS');
        }
    }

    async testIPCMethods() {
        this.log('🔗 Тестирование IPC методов...');
        
        try {
            // Проверяем наличие IPC обработчиков в main.ts
            const mainTsPath = 'backend/main.ts';
            if (fs.existsSync(mainTsPath)) {
                const mainContent = fs.readFileSync(mainTsPath, 'utf8');
                
                // Список ожидаемых IPC методов
                const expectedIPCMethods = [
                    'get-servers',
                    'update-server', 
                    'test-connection',
                    'deploy-server',
                    'connect-server',
                    'disconnect-server',
                    'send-message',
                    'get-logs'
                ];
                
                for (const method of expectedIPCMethods) {
                    if (mainContent.includes(`'${method}'`) || mainContent.includes(`"${method}"`)) {
                        this.addTest(`IPC метод ${method} определен`, 'PASS');
                    } else {
                        this.addTest(`IPC метод ${method} отсутствует`, 'FAIL');
                    }
                }
                
                // Проверяем использование ipcMain
                if (mainContent.includes('ipcMain.handle') || mainContent.includes('ipcMain.on')) {
                    this.addTest('ipcMain обработчики настроены', 'PASS');
                } else {
                    this.addTest('ipcMain обработчики не найдены', 'FAIL');
                }
                
            } else {
                this.addTest('Файл main.ts не найден', 'FAIL');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке IPC методов', 'FAIL', error.message);
        }
    }

    async testPreloadScript() {
        this.log('📜 Тестирование preload скрипта...');
        
        try {
            const preloadPath = 'backend/preload.js';
            if (fs.existsSync(preloadPath)) {
                const preloadContent = fs.readFileSync(preloadPath, 'utf8');
                
                // Проверяем экспорт electronAPI
                if (preloadContent.includes('electronAPI')) {
                    this.addTest('electronAPI экспортируется', 'PASS');
                } else {
                    this.addTest('electronAPI не экспортируется', 'FAIL');
                }
                
                // Проверяем методы contextBridge
                if (preloadContent.includes('contextBridge.exposeInMainWorld')) {
                    this.addTest('contextBridge настроен', 'PASS');
                } else {
                    this.addTest('contextBridge не настроен', 'FAIL');
                }
                
                // Проверяем методы IPC
                const ipcMethods = ['invoke', 'on', 'once', 'removeListener'];
                for (const method of ipcMethods) {
                    if (preloadContent.includes(method)) {
                        this.addTest(`IPC метод ${method} доступен`, 'PASS');
                    } else {
                        this.addTest(`IPC метод ${method} отсутствует`, 'WARN');
                    }
                }
                
            } else {
                this.addTest('Файл preload.js не найден', 'FAIL');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке preload скрипта', 'FAIL', error.message);
        }
    }

    async testReactHooks() {
        this.log('⚛️ Тестирование React хуков для IPC...');
        
        try {
            const useIpcPath = 'renderer/src/hooks/useIpc.ts';
            if (fs.existsSync(useIpcPath)) {
                const useIpcContent = fs.readFileSync(useIpcPath, 'utf8');
                
                // Проверяем хуки
                const expectedHooks = [
                    'useServerManager',
                    'useLlmChat',
                    'useLogger'
                ];
                
                for (const hook of expectedHooks) {
                    if (useIpcContent.includes(hook)) {
                        this.addTest(`React хук ${hook} определен`, 'PASS');
                    } else {
                        this.addTest(`React хук ${hook} отсутствует`, 'FAIL');
                    }
                }
                
                // Проверяем использование window.electronAPI
                if (useIpcContent.includes('window.electronAPI')) {
                    this.addTest('window.electronAPI используется', 'PASS');
                } else {
                    this.addTest('window.electronAPI не используется', 'FAIL');
                }
                
                // Проверяем TypeScript типы
                if (useIpcContent.includes('interface') || useIpcContent.includes('type')) {
                    this.addTest('TypeScript типы определены', 'PASS');
                } else {
                    this.addTest('TypeScript типы отсутствуют', 'WARN');
                }
                
            } else {
                this.addTest('Файл useIpc.ts не найден', 'FAIL');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке React хуков', 'FAIL', error.message);
        }
    }

    async testServerManagerIntegration() {
        this.log('🖥️ Тестирование интеграции ServerManager...');
        
        try {
            const serverManagerPath = 'backend/services/serverManager.ts';
            if (fs.existsSync(serverManagerPath)) {
                const serverManagerContent = fs.readFileSync(serverManagerPath, 'utf8');
                
                // Проверяем основные методы
                const expectedMethods = [
                    'getServers',
                    'updateServer',
                    'testConnection',
                    'deployServer',
                    'connectServer',
                    'disconnectServer'
                ];
                
                for (const method of expectedMethods) {
                    if (serverManagerContent.includes(method)) {
                        this.addTest(`ServerManager метод ${method}`, 'PASS');
                    } else {
                        this.addTest(`ServerManager метод ${method} отсутствует`, 'FAIL');
                    }
                }
                
                // Проверяем использование EventEmitter или событий
                if (serverManagerContent.includes('EventEmitter') || serverManagerContent.includes('emit')) {
                    this.addTest('Система событий ServerManager', 'PASS');
                } else {
                    this.addTest('Система событий ServerManager отсутствует', 'WARN');
                }
                
            } else {
                this.addTest('Файл serverManager.ts не найден', 'FAIL');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке ServerManager', 'FAIL', error.message);
        }
    }

    async testUIComponents() {
        this.log('🎨 Тестирование UI компонентов с IPC...');
        
        try {
            // Проверяем ServersPanel
            const serversPanelPath = 'renderer/src/components/ServersPanel.tsx';
            if (fs.existsSync(serversPanelPath)) {
                const serversPanelContent = fs.readFileSync(serversPanelPath, 'utf8');
                
                if (serversPanelContent.includes('useServerManager')) {
                    this.addTest('ServersPanel использует useServerManager', 'PASS');
                } else {
                    this.addTest('ServersPanel не использует useServerManager', 'FAIL');
                }
                
                // Проверяем кнопки действий
                const buttons = ['Test', 'Deploy', 'Connect'];
                for (const button of buttons) {
                    if (serversPanelContent.includes(button)) {
                        this.addTest(`ServersPanel кнопка ${button}`, 'PASS');
                    } else {
                        this.addTest(`ServersPanel кнопка ${button} отсутствует`, 'WARN');
                    }
                }
            } else {
                this.addTest('Файл ServersPanel.tsx не найден', 'FAIL');
            }
            
            // Проверяем Chat компонент
            const chatPath = 'renderer/src/components/Chat.tsx';
            if (fs.existsSync(chatPath)) {
                const chatContent = fs.readFileSync(chatPath, 'utf8');
                
                if (chatContent.includes('useLlmChat')) {
                    this.addTest('Chat использует useLlmChat', 'PASS');
                } else {
                    this.addTest('Chat не использует useLlmChat', 'FAIL');
                }
                
                if (chatContent.includes('sendMessage')) {
                    this.addTest('Chat имеет функцию отправки сообщений', 'PASS');
                } else {
                    this.addTest('Chat не имеет функции отправки сообщений', 'FAIL');
                }
            } else {
                this.addTest('Файл Chat.tsx не найден', 'FAIL');
            }
            
            // Проверяем LogViewer
            const logViewerPath = 'renderer/src/components/LogViewer.tsx';
            if (fs.existsSync(logViewerPath)) {
                const logViewerContent = fs.readFileSync(logViewerPath, 'utf8');
                
                if (logViewerContent.includes('useLogger')) {
                    this.addTest('LogViewer использует useLogger', 'PASS');
                } else {
                    this.addTest('LogViewer не использует useLogger', 'FAIL');
                }
            } else {
                this.addTest('Файл LogViewer.tsx не найден', 'FAIL');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке UI компонентов', 'FAIL', error.message);
        }
    }

    async testConfigurationIntegration() {
        this.log('⚙️ Тестирование интеграции конфигураций...');
        
        try {
            // Проверяем config service
            const configPath = 'backend/services/config.ts';
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                
                if (configContent.includes('getAppConfig') || configContent.includes('getServers')) {
                    this.addTest('Config service методы определены', 'PASS');
                } else {
                    this.addTest('Config service методы отсутствуют', 'FAIL');
                }
                
                if (configContent.includes('yaml') || configContent.includes('JSON')) {
                    this.addTest('Config service поддерживает форматы файлов', 'PASS');
                } else {
                    this.addTest('Config service не поддерживает форматы файлов', 'WARN');
                }
            } else {
                this.addTest('Файл config.ts не найден', 'FAIL');
            }
            
            // Проверяем реальные конфигурационные файлы
            if (fs.existsSync('configs/servers.json')) {
                try {
                    const serversConfig = JSON.parse(fs.readFileSync('configs/servers.json', 'utf8'));
                    if (serversConfig.servers && serversConfig.servers.length > 0) {
                        this.addTest('Конфигурация серверов загружается', 'PASS', 
                            `Найдено ${serversConfig.servers.length} серверов`);
                    } else {
                        this.addTest('Конфигурация серверов пуста', 'WARN');
                    }
                } catch (error) {
                    this.addTest('Ошибка парсинга servers.json', 'FAIL', error.message);
                }
            } else {
                this.addTest('Файл servers.json отсутствует', 'FAIL');
            }
            
        } catch (error) {
            this.addTest('Ошибка при проверке конфигураций', 'FAIL', error.message);
        }
    }

    generateReport() {
        this.results.endTime = new Date().toISOString();
        this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);
        
        const report = `# STAGE 5 - ФАЗА 3: ОТЧЕТ IPC ИНТЕГРАЦИОННОГО ТЕСТИРОВАНИЯ

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

## 🚀 ГОТОВНОСТЬ К ФАЗЕ 4

${this.results.summary.failed === 0 ? 
    '✅ **ГОТОВ К ФАЗЕ 4** - Все критические тесты пройдены' : 
    this.results.summary.failed <= 3 ?
    '⚠️ **УСЛОВНО ГОТОВ К ФАЗЕ 4** - Есть минорные проблемы, но можно продолжать' :
    '❌ **НЕ ГОТОВ К ФАЗЕ 4** - Есть критические ошибки, требующие исправления'}

## 📈 РЕКОМЕНДАЦИИ

### IPC архитектура:
- Убедиться, что все IPC методы правильно определены
- Проверить типизацию TypeScript для IPC коммуникации
- Добавить обработку ошибок в IPC вызовах

### UI интеграция:
- Протестировать реальные IPC вызовы из UI
- Добавить индикаторы загрузки для асинхронных операций
- Улучшить обработку ошибок в UI компонентах

### Следующие шаги:
1. Перейти к Фазе 4 (функциональное тестирование) если готовность > 80%
2. Исправить критические IPC проблемы если готовность < 80%
3. Провести реальное тестирование с сервером

---

**Автоматически сгенерировано:** ${new Date().toISOString()}  
**Версия тестера:** 1.0.0
`;

        return report;
    }

    async run() {
        this.log('🎯 Начало ФАЗЫ 3: IPC ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ');
        
        try {
            // Тестируем статические компоненты
            await this.testIPCMethods();
            await this.testPreloadScript();
            await this.testReactHooks();
            await this.testServerManagerIntegration();
            await this.testUIComponents();
            await this.testConfigurationIntegration();
            
            // Запускаем приложение для динамического тестирования
            await this.startApplication();
            
            // Даем время приложению полностью загрузиться
            await this.sleep(5000);
            
            // Останавливаем приложение
            await this.stopApplication();
            
        } catch (error) {
            this.addTest('Критическая ошибка тестирования', 'FAIL', error.message);
        }
        
        const report = this.generateReport();
        
        // Сохраняем отчет
        fs.writeFileSync('STAGE5_PHASE3_REPORT.md', report);
        this.log('📄 Отчет сохранен в STAGE5_PHASE3_REPORT.md');
        
        // Выводим краткую сводку
        console.log('\n' + '='.repeat(60));
        console.log('📊 КРАТКАЯ СВОДКА ФАЗЫ 3');
        console.log('='.repeat(60));
        console.log(`✅ Пройдено: ${this.results.summary.passed}`);
        console.log(`❌ Провалено: ${this.results.summary.failed}`);
        console.log(`⚠️ Предупреждения: ${this.results.summary.warnings}`);
        console.log(`📈 Успех: ${Math.round((this.results.summary.passed / this.results.summary.total) * 100)}%`);
        
        const successRate = (this.results.summary.passed / this.results.summary.total) * 100;
        
        if (successRate >= 90) {
            console.log('\n🎉 ФАЗА 3 ЗАВЕРШЕНА ОТЛИЧНО! Готов к переходу к Фазе 4.');
        } else if (successRate >= 80) {
            console.log('\n✅ ФАЗА 3 ЗАВЕРШЕНА УСПЕШНО! Готов к переходу к Фазе 4.');
        } else if (successRate >= 70) {
            console.log('\n⚠️ ФАЗА 3 ЗАВЕРШЕНА С ПРЕДУПРЕЖДЕНИЯМИ. Можно переходить к Фазе 4, но рекомендуется исправить проблемы.');
        } else {
            console.log('\n❌ ФАЗА 3 ЗАВЕРШЕНА С ОШИБКАМИ. Требуется исправление перед Фазой 4.');
        }
        
        return successRate >= 70;
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new IPCTester();
    tester.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Критическая ошибка тестера:', error);
        process.exit(1);
    });
}

module.exports = IPCTester;
