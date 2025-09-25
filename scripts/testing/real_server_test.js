#!/usr/bin/env node

/**
 * Тестирование реального SSH подключения к серверу
 * Windows LLM Agent - Beta Version
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class RealServerTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.startTime = Date.now();
        this.sshClient = null;
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async loadServerConfig() {
        try {
            const configPath = './configs/servers.json';
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            const activeServer = config.servers.find(s => s.id === config.activeServer);
            if (!activeServer) {
                throw new Error('Активный сервер не найден в конфигурации');
            }

            return activeServer;
        } catch (error) {
            throw new Error(`Ошибка загрузки конфигурации: ${error.message}`);
        }
    }

    async testSSHConnection(serverConfig) {
        return new Promise((resolve) => {
            this.log('   Подключение к SSH серверу...', 'yellow');
            
            const conn = new Client();
            let connected = false;

            const timeout = setTimeout(() => {
                if (!connected) {
                    conn.end();
                    resolve({
                        success: false,
                        error: 'Таймаут подключения (30 секунд)'
                    });
                }
            }, 30000);

            conn.on('ready', () => {
                connected = true;
                clearTimeout(timeout);
                this.sshClient = conn;
                
                resolve({
                    success: true,
                    details: `Успешное подключение к ${serverConfig.host}:${serverConfig.port}`
                });
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                resolve({
                    success: false,
                    error: `Ошибка SSH: ${err.message}`
                });
            });

            // Подключение
            try {
                const privateKey = fs.readFileSync(serverConfig.sshKey);
                
                conn.connect({
                    host: serverConfig.host,
                    port: serverConfig.port,
                    username: serverConfig.user,
                    privateKey: privateKey,
                    readyTimeout: 30000,
                    keepaliveInterval: 10000
                });
            } catch (error) {
                clearTimeout(timeout);
                resolve({
                    success: false,
                    error: `Ошибка чтения SSH ключа: ${error.message}`
                });
            }
        });
    }

    async testRemoteCommand(command, description) {
        if (!this.sshClient) {
            return {
                success: false,
                error: 'SSH соединение не установлено'
            };
        }

        return new Promise((resolve) => {
            this.log(`   Выполнение команды: ${command}`, 'yellow');
            
            this.sshClient.exec(command, (err, stream) => {
                if (err) {
                    resolve({
                        success: false,
                        error: `Ошибка выполнения команды: ${err.message}`
                    });
                    return;
                }

                let stdout = '';
                let stderr = '';

                stream.on('close', (code, signal) => {
                    const output = stdout.trim();
                    const errorOutput = stderr.trim();
                    
                    if (code === 0) {
                        resolve({
                            success: true,
                            details: `${description}. Вывод: ${output || 'команда выполнена успешно'}`
                        });
                    } else {
                        resolve({
                            success: false,
                            error: `Команда завершилась с кодом ${code}. Ошибка: ${errorOutput || 'неизвестная ошибка'}`
                        });
                    }
                });

                stream.on('data', (data) => {
                    stdout += data;
                });

                stream.stderr.on('data', (data) => {
                    stderr += data;
                });
            });
        });
    }

    async testSystemInfo() {
        const commands = [
            ['uname -a', 'Информация о системе'],
            ['whoami', 'Текущий пользователь'],
            ['pwd', 'Текущая директория'],
            ['df -h', 'Свободное место на диске'],
            ['free -h', 'Использование памяти'],
            ['python3 --version', 'Версия Python'],
            ['which python3', 'Путь к Python']
        ];

        let allSuccess = true;
        let details = [];

        for (const [command, description] of commands) {
            const result = await this.testRemoteCommand(command, description);
            if (result.success) {
                details.push(`✅ ${description}: ${result.details.split(': ')[1] || 'OK'}`);
            } else {
                details.push(`❌ ${description}: ${result.error}`);
                allSuccess = false;
            }
        }

        return {
            success: allSuccess,
            details: details.join('\n      '),
            error: allSuccess ? null : 'Некоторые команды завершились с ошибками'
        };
    }

    async testDirectoryOperations(serverConfig) {
        const testDir = '/tmp/llm_agent_test';
        const testFile = `${testDir}/test_file.txt`;
        
        const operations = [
            [`mkdir -p ${testDir}`, 'Создание тестовой директории'],
            [`echo "Test content $(date)" > ${testFile}`, 'Создание тестового файла'],
            [`cat ${testFile}`, 'Чтение тестового файла'],
            [`ls -la ${testDir}`, 'Список файлов в директории'],
            [`rm -rf ${testDir}`, 'Удаление тестовой директории']
        ];

        let allSuccess = true;
        let details = [];

        for (const [command, description] of operations) {
            const result = await this.testRemoteCommand(command, description);
            if (result.success) {
                details.push(`✅ ${description}`);
            } else {
                details.push(`❌ ${description}: ${result.error}`);
                allSuccess = false;
            }
        }

        return {
            success: allSuccess,
            details: details.join('\n      '),
            error: allSuccess ? null : 'Некоторые файловые операции завершились с ошибками'
        };
    }

    async testNetworkConnectivity() {
        const commands = [
            ['curl -I --connect-timeout 10 https://google.com', 'Проверка интернет соединения'],
            ['netstat -tuln | head -10', 'Активные сетевые соединения'],
            ['ss -tuln | head -5', 'Сокеты (альтернативная проверка)']
        ];

        let details = [];
        let successCount = 0;

        for (const [command, description] of commands) {
            const result = await this.testRemoteCommand(command, description);
            if (result.success) {
                details.push(`✅ ${description}`);
                successCount++;
            } else {
                details.push(`❌ ${description}: ${result.error}`);
            }
        }

        return {
            success: successCount >= 1, // Хотя бы одна команда должна работать
            details: details.join('\n      '),
            error: successCount === 0 ? 'Все сетевые команды завершились с ошибками' : null
        };
    }

    async testPythonEnvironment() {
        const commands = [
            ['python3 -c "import sys; print(sys.version)"', 'Версия Python'],
            ['python3 -c "import os; print(os.getcwd())"', 'Рабочая директория Python'],
            ['python3 -c "import json; print(json.dumps({\'test\': True}))"', 'Тест модуля JSON'],
            ['pip3 --version', 'Версия pip'],
            ['python3 -c "import subprocess; print(\'subprocess works\')"', 'Тест модуля subprocess']
        ];

        let details = [];
        let successCount = 0;

        for (const [command, description] of commands) {
            const result = await this.testRemoteCommand(command, description);
            if (result.success) {
                details.push(`✅ ${description}: ${result.details.split(': ')[1] || 'OK'}`);
                successCount++;
            } else {
                details.push(`❌ ${description}: ${result.error}`);
            }
        }

        return {
            success: successCount >= 3, // Большинство команд должны работать
            details: details.join('\n      '),
            error: successCount < 3 ? 'Python окружение не полностью функционально' : null
        };
    }

    async runTest(testName, testFunction) {
        this.log(`\n🧪 Тестирование: ${testName}`, 'cyan');
        
        try {
            const result = await testFunction();
            if (result.success) {
                this.log(`✅ ${testName}: ПРОЙДЕН`, 'green');
                this.results.passed++;
                this.results.tests.push({ name: testName, status: 'PASSED', details: result.details });
            } else {
                this.log(`❌ ${testName}: ПРОВАЛЕН - ${result.error}`, 'red');
                this.results.failed++;
                this.results.tests.push({ name: testName, status: 'FAILED', error: result.error });
            }
        } catch (error) {
            this.log(`💥 ${testName}: ОШИБКА - ${error.message}`, 'red');
            this.results.failed++;
            this.results.tests.push({ name: testName, status: 'ERROR', error: error.message });
        }
    }

    async cleanup() {
        if (this.sshClient) {
            this.log('\n🔌 Закрытие SSH соединения...', 'yellow');
            this.sshClient.end();
            this.sshClient = null;
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const total = this.results.passed + this.results.failed;

        this.log('\n' + '='.repeat(60), 'bright');
        this.log('📊 ОТЧЕТ О ТЕСТИРОВАНИИ РЕАЛЬНОГО СЕРВЕРА', 'bright');
        this.log('='.repeat(60), 'bright');

        this.log(`\n📈 Статистика:`, 'cyan');
        this.log(`   ✅ Пройдено: ${this.results.passed}`, 'green');
        this.log(`   ❌ Провалено: ${this.results.failed}`, 'red');
        this.log(`   📊 Всего: ${total}`);
        this.log(`   ⏱️  Время: ${(duration / 1000).toFixed(1)}s`);

        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
        this.log(`   📊 Успешность: ${successRate}%`, successRate >= 70 ? 'green' : 'red');

        this.log(`\n📋 Детали тестов:`, 'cyan');
        for (const test of this.results.tests) {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            const color = test.status === 'PASSED' ? 'green' : 'red';
            this.log(`   ${status} ${test.name}`, color);
            
            if (test.details) {
                // Разбиваем длинные детали на строки
                const details = test.details.split('\n');
                for (const detail of details) {
                    this.log(`      ${detail}`, 'blue');
                }
            }
            if (test.error) {
                this.log(`      🚨 ${test.error}`, 'red');
            }
        }

        // Общий результат
        if (this.results.failed === 0) {
            this.log('\n🎉 ВСЕ ТЕСТЫ СЕРВЕРА ПРОЙДЕНЫ!', 'green');
            this.log('✅ SSH подключение и базовые операции работают корректно', 'green');
        } else if (successRate >= 70) {
            this.log('\n⚠️  ЧАСТИЧНЫЙ УСПЕХ', 'yellow');
            this.log('🔧 Основные функции работают, но есть проблемы', 'yellow');
        } else {
            this.log('\n❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ С СЕРВЕРОМ', 'red');
            this.log('🔧 Необходимо исправить проблемы подключения', 'red');
        }

        this.log('\n' + '='.repeat(60), 'bright');

        return {
            success: this.results.failed === 0,
            stats: this.results,
            duration,
            successRate: parseFloat(successRate)
        };
    }

    async run() {
        this.log('🚀 ТЕСТИРОВАНИЕ РЕАЛЬНОГО SSH СЕРВЕРА', 'bright');
        this.log('Windows LLM Agent - Server Connectivity Test', 'cyan');
        this.log('='.repeat(60), 'bright');

        let serverConfig;
        
        try {
            // Загрузка конфигурации сервера
            this.log('\n📋 Загрузка конфигурации сервера...', 'cyan');
            serverConfig = await this.loadServerConfig();
            this.log(`   Сервер: ${serverConfig.name}`, 'blue');
            this.log(`   Хост: ${serverConfig.host}:${serverConfig.port}`, 'blue');
            this.log(`   Пользователь: ${serverConfig.user}`, 'blue');
            this.log(`   SSH ключ: ${serverConfig.sshKey}`, 'blue');

            // Проверка SSH ключа
            if (!fs.existsSync(serverConfig.sshKey)) {
                throw new Error(`SSH ключ не найден: ${serverConfig.sshKey}`);
            }

            // Список тестов
            const tests = [
                ['SSH подключение', () => this.testSSHConnection(serverConfig)],
                ['Системная информация', () => this.testSystemInfo()],
                ['Файловые операции', () => this.testDirectoryOperations(serverConfig)],
                ['Сетевая связность', () => this.testNetworkConnectivity()],
                ['Python окружение', () => this.testPythonEnvironment()]
            ];

            // Выполнение всех тестов
            for (const [name, testFn] of tests) {
                await this.runTest(name, testFn);
                
                // Небольшая пауза между тестами
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            this.log(`💥 Критическая ошибка: ${error.message}`, 'red');
            this.results.failed++;
            this.results.tests.push({ 
                name: 'Инициализация', 
                status: 'ERROR', 
                error: error.message 
            });
        } finally {
            // Очистка ресурсов
            await this.cleanup();
        }

        // Генерация отчета
        const result = this.generateReport();
        
        // Сохранение отчета
        const reportData = {
            timestamp: new Date().toISOString(),
            serverConfig: serverConfig ? {
                name: serverConfig.name,
                host: serverConfig.host,
                port: serverConfig.port,
                user: serverConfig.user
            } : null,
            result: result,
            tests: this.results.tests
        };
        
        fs.writeFileSync(
            './REAL_SERVER_TEST_REPORT.json',
            JSON.stringify(reportData, null, 2)
        );
        
        this.log('\n📄 Отчет сохранен в REAL_SERVER_TEST_REPORT.json', 'cyan');
        
        return result;
    }
}

// Запуск тестирования
async function main() {
    const tester = new RealServerTest();
    
    try {
        const result = await tester.run();
        process.exit(result.success ? 0 : 1);
        
    } catch (error) {
        console.error('💥 Критическая ошибка тестирования:', error.message);
        process.exit(1);
    }
}

// Запуск только если файл выполняется напрямую
if (require.main === module) {
    main();
}

module.exports = RealServerTest;
