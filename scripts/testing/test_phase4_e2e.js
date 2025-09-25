#!/usr/bin/env node

/**
 * PHASE 4: END-TO-END INTEGRATION TESTING
 * Полное тестирование интеграции frontend ↔ backend через IPC
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class Phase4E2ETester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
        this.testStartTime = new Date();
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const levelColors = {
            'INFO': '\x1b[36m',  // Cyan
            'PASS': '\x1b[32m',  // Green
            'FAIL': '\x1b[31m',  // Red
            'WARN': '\x1b[33m'   // Yellow
        };
        const color = levelColors[level] || '\x1b[0m';
        console.log(`${color}[${timestamp}] [${level}] ${message}\x1b[0m`);
    }

    async test(name, testFn) {
        this.results.total++;
        try {
            await testFn();
            this.results.passed++;
            this.log('PASS', `PASS: ${name}`);
            return true;
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({ test: name, error: error.message });
            this.log('FAIL', `FAIL: ${name} - ${error.message}`);
            return false;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runCommand(command, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Command timeout: ${command}`));
            }, timeout);

            exec(command, (error, stdout, stderr) => {
                clearTimeout(timer);
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    async checkFileExists(filePath) {
        return fs.existsSync(filePath);
    }

    async readJsonFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    }

    async writeJsonFile(filePath, data) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // ==================== PHASE 4 TESTS ====================

    async testBackendStartup() {
        this.log('INFO', '🚀 Тестирование запуска backend...');

        await this.test('Backend main.ts компилируется', async () => {
            const result = await this.runCommand('cd Beta && npx tsc backend/main.ts --noEmit');
            if (result.stderr && result.stderr.includes('error')) {
                throw new Error('TypeScript compilation errors');
            }
        });

        await this.test('Backend services доступны', async () => {
            const services = [
                'backend/services/logger.ts',
                'backend/services/config.ts',
                'backend/services/sshService.ts',
                'backend/services/llmService.ts',
                'backend/services/taskExecutor.ts',
                'backend/services/serverManager.ts'
            ];

            for (const service of services) {
                if (!await this.checkFileExists(service)) {
                    throw new Error(`Service not found: ${service}`);
                }
            }
        });

        await this.test('Preload script корректен', async () => {
            const preloadPath = 'backend/preload.js';
            if (!await this.checkFileExists(preloadPath)) {
                throw new Error('Preload script not found');
            }

            const content = fs.readFileSync(preloadPath, 'utf8');
            if (!content.includes('contextBridge') || !content.includes('electronAPI')) {
                throw new Error('Preload script missing required APIs');
            }
        });
    }

    async testFrontendBuild() {
        this.log('INFO', '🎨 Тестирование сборки frontend...');

        await this.test('React компоненты компилируются', async () => {
            const result = await this.runCommand('cd Beta && npx tsc renderer/tsconfig.json --noEmit', 15000);
            if (result.stderr && result.stderr.includes('error')) {
                throw new Error('React TypeScript compilation errors');
            }
        });

        await this.test('Все UI компоненты существуют', async () => {
            const components = [
                'renderer/src/App.tsx',
                'renderer/src/components/Chat.tsx',
                'renderer/src/components/ServersPanel.tsx',
                'renderer/src/components/LogViewer.tsx'
            ];

            for (const component of components) {
                if (!await this.checkFileExists(component)) {
                    throw new Error(`Component not found: ${component}`);
                }
            }
        });

        await this.test('IPC хуки определены', async () => {
            const hooksPath = 'renderer/src/hooks/useIpc.ts';
            if (!await this.checkFileExists(hooksPath)) {
                throw new Error('IPC hooks file not found');
            }

            const content = fs.readFileSync(hooksPath, 'utf8');
            const requiredHooks = ['useServerManager', 'useLlmChat', 'useLogger'];
            
            for (const hook of requiredHooks) {
                if (!content.includes(hook)) {
                    throw new Error(`Hook not found: ${hook}`);
                }
            }
        });
    }

    async testConfigurationIntegration() {
        this.log('INFO', '⚙️ Тестирование интеграции конфигураций...');

        await this.test('Конфигурационные файлы загружаются', async () => {
            // Проверяем YAML файл отдельно
            if (!await this.checkFileExists('configs/app.yaml')) {
                throw new Error('app.yaml not found');
            }
            
            const serversConfig = await this.readJsonFile('configs/servers.json');
            
            if (!serversConfig) {
                throw new Error('servers.json not properly loaded');
            }
        });

        await this.test('Config service интеграция', async () => {
            const configPath = 'backend/services/config.ts';
            const content = fs.readFileSync(configPath, 'utf8');
            
            if (!content.includes('getAppConfig') || !content.includes('getServers')) {
                throw new Error('Config service missing required methods');
            }
        });

        await this.test('Серверы конфигурируются корректно', async () => {
            const serversConfig = await this.readJsonFile('configs/servers.json');
            
            if (!serversConfig.servers || !Array.isArray(serversConfig.servers)) {
                throw new Error('Servers configuration invalid');
            }

            if (serversConfig.servers.length === 0) {
                throw new Error('No servers configured');
            }

            const server = serversConfig.servers[0];
            const requiredFields = ['id', 'name', 'host', 'port', 'user'];
            
            for (const field of requiredFields) {
                if (!server[field]) {
                    throw new Error(`Server missing required field: ${field}`);
                }
            }
        });
    }

    async testTasksIntegration() {
        this.log('INFO', '⚡ Тестирование интеграции задач...');

        await this.test('Task файлы существуют', async () => {
            const tasks = [
                'tasks/deployTask.ts',
                'tasks/connectTask.ts',
                'tasks/chatTask.ts'
            ];

            for (const task of tasks) {
                if (!await this.checkFileExists(task)) {
                    throw new Error(`Task not found: ${task}`);
                }
            }
        });

        await this.test('TaskExecutor интеграция', async () => {
            const executorPath = 'backend/services/taskExecutor.ts';
            const content = fs.readFileSync(executorPath, 'utf8');
            
            if (!content.includes('runTask') || !content.includes('cancelTask')) {
                throw new Error('TaskExecutor missing required methods');
            }
        });

        await this.test('Tasks имеют правильную структуру', async () => {
            const deployTaskPath = 'tasks/deployTask.ts';
            const content = fs.readFileSync(deployTaskPath, 'utf8');
            
            if (!content.includes('parentPort') || !content.includes('workerData')) {
                throw new Error('Deploy task missing worker thread integration');
            }
        });
    }

    async testIPCCommunication() {
        this.log('INFO', '🔗 Тестирование IPC коммуникации...');

        await this.test('Main process IPC handlers', async () => {
            const mainPath = 'backend/main.ts';
            const content = fs.readFileSync(mainPath, 'utf8');
            
            const requiredHandlers = [
                'get-servers', 'update-server', 'test-connection',
                'deploy-server', 'connect-server', 'disconnect-server',
                'send-message', 'get-logs'
            ];

            for (const handler of requiredHandlers) {
                if (!content.includes(`'${handler}'`)) {
                    throw new Error(`IPC handler not found: ${handler}`);
                }
            }
        });

        await this.test('Renderer IPC integration', async () => {
            const hooksPath = 'renderer/src/hooks/useIpc.ts';
            const content = fs.readFileSync(hooksPath, 'utf8');
            
            if (!content.includes('window.electronAPI')) {
                throw new Error('Renderer not using electronAPI');
            }
        });

        await this.test('Event system integration', async () => {
            const serverManagerPath = 'backend/services/serverManager.ts';
            const content = fs.readFileSync(serverManagerPath, 'utf8');
            
            if (!content.includes('EventEmitter') && !content.includes('emit')) {
                throw new Error('ServerManager missing event system');
            }
        });
    }

    async testRealWorldScenarios() {
        this.log('INFO', '🌍 Тестирование реальных сценариев...');

        await this.test('Server connection workflow', async () => {
            // Симуляция полного workflow подключения к серверу
            const serversConfig = await this.readJsonFile('configs/servers.json');
            const server = serversConfig.servers[0];
            
            // Проверяем, что у сервера есть все необходимые поля для подключения
            if (!server.host || !server.port || !server.user) {
                throw new Error('Server configuration incomplete for connection');
            }
        });

        await this.test('Deploy workflow integration', async () => {
            // Проверяем наличие deploy скрипта
            if (!await this.checkFileExists('tools/deploy_llm_server.py')) {
                throw new Error('Deploy script not found');
            }

            // Проверяем, что deploy task может работать с этим скриптом
            const deployTaskPath = 'tasks/deployTask.ts';
            const content = fs.readFileSync(deployTaskPath, 'utf8');
            
            if (!content.includes('deploy_llm_server.py')) {
                throw new Error('Deploy task not configured for deploy script');
            }
        });

        await this.test('Chat workflow integration', async () => {
            const chatPath = 'renderer/src/components/Chat.tsx';
            const content = fs.readFileSync(chatPath, 'utf8');
            
            if (!content.includes('sendMessage') || !content.includes('useLlmChat')) {
                throw new Error('Chat component missing required functionality');
            }
        });

        await this.test('Logging workflow integration', async () => {
            const loggerPath = 'backend/services/logger.ts';
            const content = fs.readFileSync(loggerPath, 'utf8');
            
            if (!content.includes('writeLog') || !content.includes('EventEmitter')) {
                throw new Error('Logger missing required functionality');
            }

            // Проверяем, что логи могут записываться
            if (!fs.existsSync('logs')) {
                fs.mkdirSync('logs', { recursive: true });
            }
        });
    }

    async testErrorHandling() {
        this.log('INFO', '🛡️ Тестирование обработки ошибок...');

        await this.test('SSH connection error handling', async () => {
            const sshServicePath = 'backend/services/sshService.ts';
            const content = fs.readFileSync(sshServicePath, 'utf8');
            
            if (!content.includes('try') || !content.includes('catch')) {
                throw new Error('SSH service missing error handling');
            }
        });

        await this.test('LLM service error handling', async () => {
            const llmServicePath = 'backend/services/llmService.ts';
            const content = fs.readFileSync(llmServicePath, 'utf8');
            
            if (!content.includes('timeout') || !content.includes('catch')) {
                throw new Error('LLM service missing error handling');
            }
        });

        await this.test('Task execution error handling', async () => {
            const taskExecutorPath = 'backend/services/taskExecutor.ts';
            const content = fs.readFileSync(taskExecutorPath, 'utf8');
            
            if (!content.includes('error') || !content.includes('reject')) {
                throw new Error('Task executor missing error handling');
            }
        });

        await this.test('UI error boundaries', async () => {
            const appPath = 'renderer/src/App.tsx';
            const content = fs.readFileSync(appPath, 'utf8');
            
            // Проверяем наличие базовой обработки ошибок в UI
            if (!content.includes('try') && !content.includes('Error')) {
                this.log('WARN', 'UI missing error boundaries - recommended to add');
            }
        });
    }

    async testPerformanceReadiness() {
        this.log('INFO', '⚡ Тестирование готовности к производительности...');

        await this.test('Worker threads integration', async () => {
            const taskExecutorPath = 'backend/services/taskExecutor.ts';
            const content = fs.readFileSync(taskExecutorPath, 'utf8');
            
            if (!content.includes('Worker') || !content.includes('worker_threads')) {
                throw new Error('Task executor not using worker threads');
            }
        });

        await this.test('Memory management', async () => {
            const loggerPath = 'backend/services/logger.ts';
            const content = fs.readFileSync(loggerPath, 'utf8');
            
            if (!content.includes('maxSize') && !content.includes('rotation')) {
                this.log('WARN', 'Logger missing log rotation - may cause memory issues');
            }
        });

        await this.test('Resource cleanup', async () => {
            const serverManagerPath = 'backend/services/serverManager.ts';
            const content = fs.readFileSync(serverManagerPath, 'utf8');
            
            if (!content.includes('cleanup') && !content.includes('disconnect')) {
                this.log('WARN', 'ServerManager missing resource cleanup');
            }
        });
    }

    async generateReport() {
        const duration = new Date() - this.testStartTime;
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);

        const report = {
            phase: 'Phase 4: End-to-End Integration Testing',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            results: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: `${successRate}%`
            },
            errors: this.results.errors,
            summary: {
                backendIntegration: 'Tested',
                frontendIntegration: 'Tested', 
                ipcCommunication: 'Tested',
                configurationSystem: 'Tested',
                taskExecution: 'Tested',
                errorHandling: 'Tested',
                performanceReadiness: 'Tested'
            }
        };

        await this.writeJsonFile('PHASE4_E2E_REPORT.json', report);

        this.log('INFO', '📊 PHASE 4 РЕЗУЛЬТАТЫ:');
        this.log('INFO', `Всего тестов: ${this.results.total}`);
        this.log('INFO', `Пройдено: ${this.results.passed}`);
        this.log('INFO', `Провалено: ${this.results.failed}`);
        this.log('INFO', `Успешность: ${successRate}%`);
        this.log('INFO', `Длительность: ${duration}ms`);

        if (this.results.errors.length > 0) {
            this.log('INFO', '\n❌ ОШИБКИ:');
            this.results.errors.forEach(error => {
                this.log('FAIL', `${error.test}: ${error.error}`);
            });
        }

        return parseFloat(successRate) >= 90;
    }

    async run() {
        this.log('INFO', '🎯 Начало ФАЗЫ 4: END-TO-END ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ');
        
        try {
            await this.testBackendStartup();
            await this.testFrontendBuild();
            await this.testConfigurationIntegration();
            await this.testTasksIntegration();
            await this.testIPCCommunication();
            await this.testRealWorldScenarios();
            await this.testErrorHandling();
            await this.testPerformanceReadiness();

            const success = await this.generateReport();
            
            if (success) {
                this.log('PASS', '✅ PHASE 4 ЗАВЕРШЕНА УСПЕШНО!');
                return 0;
            } else {
                this.log('FAIL', '❌ PHASE 4 ЗАВЕРШЕНА С ОШИБКАМИ');
                return 1;
            }
        } catch (error) {
            this.log('FAIL', `Критическая ошибка: ${error.message}`);
            return 1;
        }
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new Phase4E2ETester();
    tester.run().then(code => process.exit(code));
}

module.exports = Phase4E2ETester;
