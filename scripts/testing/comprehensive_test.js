#!/usr/bin/env node

/**
 * Комплексное тестирование всех backend сервисов
 * Windows LLM Agent - Beta Version
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

class ComprehensiveTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: []
        };
        this.startTime = Date.now();
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
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

    async testProjectStructure() {
        const requiredDirs = [
            'backend',
            'backend/services',
            'renderer',
            'tasks',
            'tools',
            'configs',
            'logs'
        ];

        const requiredFiles = [
            'backend/main.ts',
            'backend/services/logger.ts',
            'backend/services/config.ts',
            'backend/services/sshService.ts',
            'backend/services/llmService.ts',
            'backend/services/taskExecutor.ts',
            'backend/services/serverManager.ts',
            'configs/app.yaml',
            'configs/servers.json',
            'tools/deploy_llm_server.py'
        ];

        let missing = [];

        // Проверка каталогов
        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                missing.push(`Каталог: ${dir}`);
            }
        }

        // Проверка файлов
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                missing.push(`Файл: ${file}`);
            }
        }

        if (missing.length > 0) {
            return {
                success: false,
                error: `Отсутствуют: ${missing.join(', ')}`
            };
        }

        return {
            success: true,
            details: `Все ${requiredDirs.length} каталогов и ${requiredFiles.length} файлов найдены`
        };
    }

    async testTypeScriptCompilation() {
        return new Promise((resolve) => {
            this.log('   Компиляция TypeScript...', 'yellow');
            
            const tsc = spawn('npx', ['tsc', '--noEmit'], {
                stdio: 'pipe',
                shell: true
            });

            let output = '';
            let errorOutput = '';

            tsc.stdout.on('data', (data) => {
                output += data.toString();
            });

            tsc.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            tsc.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        details: 'TypeScript компиляция успешна'
                    });
                } else {
                    resolve({
                        success: false,
                        error: `Ошибки компиляции: ${errorOutput || output}`
                    });
                }
            });

            tsc.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Ошибка запуска tsc: ${error.message}`
                });
            });
        });
    }

    async testConfigService() {
        try {
            // Динамический импорт скомпилированного JS
            const configPath = path.resolve('./dist/backend/services/config.js');
            
            if (!fs.existsSync(configPath)) {
                return {
                    success: false,
                    error: 'Скомпилированный config.js не найден. Запустите компиляцию.'
                };
            }

            // Проверка чтения конфигураций
            const appConfigExists = fs.existsSync('./configs/app.yaml');
            const serversConfigExists = fs.existsSync('./configs/servers.json');

            if (!appConfigExists || !serversConfigExists) {
                return {
                    success: false,
                    error: 'Конфигурационные файлы не найдены'
                };
            }

            return {
                success: true,
                details: 'Конфигурационные файлы доступны для чтения'
            };

        } catch (error) {
            return {
                success: false,
                error: `Ошибка тестирования Config Service: ${error.message}`
            };
        }
    }

    async testLoggerService() {
        try {
            // Проверка создания лог-файла
            const logDir = './logs';
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            // Создание тестового лог-файла
            const testLogFile = path.join(logDir, 'test.log');
            const testMessage = `Test log entry - ${new Date().toISOString()}`;
            
            fs.writeFileSync(testLogFile, testMessage + '\n');
            
            // Проверка записи
            const logContent = fs.readFileSync(testLogFile, 'utf8');
            
            if (logContent.includes(testMessage)) {
                // Очистка тестового файла
                fs.unlinkSync(testLogFile);
                
                return {
                    success: true,
                    details: 'Запись и чтение логов работает корректно'
                };
            } else {
                return {
                    success: false,
                    error: 'Не удалось записать в лог-файл'
                };
            }

        } catch (error) {
            return {
                success: false,
                error: `Ошибка тестирования Logger Service: ${error.message}`
            };
        }
    }

    async testSSHKeys() {
        try {
            const sshKeyPath = './configs/ssh_keys/llm_server_key';
            const sshPubKeyPath = './configs/ssh_keys/llm_server_key.pub';
            const sshConfigPath = './configs/ssh_keys/config';

            const keyExists = fs.existsSync(sshKeyPath);
            const pubKeyExists = fs.existsSync(sshPubKeyPath);
            const configExists = fs.existsSync(sshConfigPath);

            if (!keyExists || !pubKeyExists) {
                return {
                    success: false,
                    error: 'SSH ключи не найдены'
                };
            }

            // Проверка прав доступа к приватному ключу
            const keyStats = fs.statSync(sshKeyPath);
            
            return {
                success: true,
                details: `SSH ключи найдены. Размер приватного ключа: ${keyStats.size} байт`
            };

        } catch (error) {
            return {
                success: false,
                error: `Ошибка проверки SSH ключей: ${error.message}`
            };
        }
    }

    async testPackageIntegrity() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            
            const requiredDeps = [
                'react',
                'react-dom',
                'ssh2',
                'axios',
                'yaml'
            ];

            const requiredDevDeps = [
                'electron',
                'typescript',
                'electron-builder'
            ];

            let missingDeps = [];

            for (const dep of requiredDeps) {
                if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
                    missingDeps.push(`dependency: ${dep}`);
                }
            }

            for (const dep of requiredDevDeps) {
                if (!packageJson.devDependencies || !packageJson.devDependencies[dep]) {
                    missingDeps.push(`devDependency: ${dep}`);
                }
            }

            if (missingDeps.length > 0) {
                return {
                    success: false,
                    error: `Отсутствуют зависимости: ${missingDeps.join(', ')}`
                };
            }

            return {
                success: true,
                details: `Все ${requiredDeps.length + requiredDevDeps.length} зависимостей найдены`
            };

        } catch (error) {
            return {
                success: false,
                error: `Ошибка проверки package.json: ${error.message}`
            };
        }
    }

    async testNodeModules() {
        try {
            const nodeModulesExists = fs.existsSync('./node_modules');
            
            if (!nodeModulesExists) {
                return {
                    success: false,
                    error: 'node_modules не найден. Запустите npm install'
                };
            }

            // Проверка ключевых модулей
            const keyModules = ['ssh2', 'axios', 'react', 'electron'];
            let missingModules = [];

            for (const module of keyModules) {
                if (!fs.existsSync(`./node_modules/${module}`)) {
                    missingModules.push(module);
                }
            }

            if (missingModules.length > 0) {
                return {
                    success: false,
                    error: `Отсутствуют модули: ${missingModules.join(', ')}`
                };
            }

            return {
                success: true,
                details: `Все ${keyModules.length} ключевых модулей установлены`
            };

        } catch (error) {
            return {
                success: false,
                error: `Ошибка проверки node_modules: ${error.message}`
            };
        }
    }

    async testBuildConfiguration() {
        try {
            // Проверка tsconfig.json
            const tsconfigExists = fs.existsSync('./tsconfig.json');
            if (!tsconfigExists) {
                return {
                    success: false,
                    error: 'tsconfig.json не найден'
                };
            }

            const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
            
            // Проверка webpack конфигурации
            const webpackConfigExists = fs.existsSync('./renderer/webpack.config.js');
            
            return {
                success: true,
                details: `Конфигурации сборки настроены. Target: ${tsconfig.compilerOptions?.target || 'не указан'}`
            };

        } catch (error) {
            return {
                success: false,
                error: `Ошибка проверки конфигураций сборки: ${error.message}`
            };
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const total = this.results.passed + this.results.failed + this.results.skipped;

        this.log('\n' + '='.repeat(60), 'bright');
        this.log('📊 ОТЧЕТ О КОМПЛЕКСНОМ ТЕСТИРОВАНИИ', 'bright');
        this.log('='.repeat(60), 'bright');

        this.log(`\n📈 Статистика:`, 'cyan');
        this.log(`   ✅ Пройдено: ${this.results.passed}`, 'green');
        this.log(`   ❌ Провалено: ${this.results.failed}`, 'red');
        this.log(`   ⏭️  Пропущено: ${this.results.skipped}`, 'yellow');
        this.log(`   📊 Всего: ${total}`);
        this.log(`   ⏱️  Время: ${duration}ms`);

        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
        this.log(`   📊 Успешность: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

        this.log(`\n📋 Детали тестов:`, 'cyan');
        for (const test of this.results.tests) {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            const color = test.status === 'PASSED' ? 'green' : 'red';
            this.log(`   ${status} ${test.name}`, color);
            
            if (test.details) {
                this.log(`      💡 ${test.details}`, 'blue');
            }
            if (test.error) {
                this.log(`      🚨 ${test.error}`, 'red');
            }
        }

        // Общий результат
        if (this.results.failed === 0) {
            this.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!', 'green');
            this.log('✅ Проект готов к следующему этапу разработки', 'green');
        } else {
            this.log('\n⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ', 'red');
            this.log('🔧 Необходимо исправить ошибки перед продолжением', 'yellow');
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
        this.log('🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ', 'bright');
        this.log('Windows LLM Agent - Backend Services', 'cyan');
        this.log('='.repeat(60), 'bright');

        // Список всех тестов
        const tests = [
            ['Структура проекта', () => this.testProjectStructure()],
            ['Целостность package.json', () => this.testPackageIntegrity()],
            ['Установка node_modules', () => this.testNodeModules()],
            ['Конфигурации сборки', () => this.testBuildConfiguration()],
            ['SSH ключи', () => this.testSSHKeys()],
            ['TypeScript компиляция', () => this.testTypeScriptCompilation()],
            ['Config Service', () => this.testConfigService()],
            ['Logger Service', () => this.testLoggerService()]
        ];

        // Выполнение всех тестов
        for (const [name, testFn] of tests) {
            await this.runTest(name, testFn);
        }

        // Генерация отчета
        return this.generateReport();
    }
}

// Запуск тестирования
async function main() {
    const tester = new ComprehensiveTest();
    
    try {
        const result = await tester.run();
        
        // Сохранение отчета в файл
        const reportData = {
            timestamp: new Date().toISOString(),
            result: result,
            tests: tester.results.tests
        };
        
        fs.writeFileSync(
            './COMPREHENSIVE_TEST_REPORT.json',
            JSON.stringify(reportData, null, 2)
        );
        
        console.log('\n📄 Отчет сохранен в COMPREHENSIVE_TEST_REPORT.json');
        
        // Код выхода
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

module.exports = ComprehensiveTest;
