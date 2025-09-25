#!/usr/bin/env node

/**
 * PHASE 5: PERFORMANCE & STRESS TESTING
 * Нагрузочное тестирование и проверка производительности
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { performance } = require('perf_hooks');

class Phase5PerformanceTester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: [],
            metrics: {}
        };
        this.testStartTime = new Date();
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const levelColors = {
            'INFO': '\x1b[36m',  // Cyan
            'PASS': '\x1b[32m',  // Green
            'FAIL': '\x1b[31m',  // Red
            'WARN': '\x1b[33m',  // Yellow
            'PERF': '\x1b[35m'   // Magenta
        };
        const color = levelColors[level] || '\x1b[0m';
        console.log(`${color}[${timestamp}] [${level}] ${message}\x1b[0m`);
    }

    async test(name, testFn) {
        this.results.total++;
        try {
            const startTime = performance.now();
            await testFn();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.results.passed++;
            this.results.metrics[name] = { duration, status: 'PASS' };
            this.log('PASS', `PASS: ${name} (${duration.toFixed(2)}ms)`);
            return true;
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({ test: name, error: error.message });
            this.results.metrics[name] = { status: 'FAIL', error: error.message };
            this.log('FAIL', `FAIL: ${name} - ${error.message}`);
            return false;
        }
    }

    async performanceTest(name, testFn, expectedMaxTime = 1000) {
        this.results.total++;
        try {
            const startTime = performance.now();
            await testFn();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            if (duration > expectedMaxTime) {
                throw new Error(`Performance test failed: ${duration.toFixed(2)}ms > ${expectedMaxTime}ms`);
            }
            
            this.results.passed++;
            this.results.metrics[name] = { duration, status: 'PASS', expectedMaxTime };
            this.log('PERF', `PERF PASS: ${name} (${duration.toFixed(2)}ms < ${expectedMaxTime}ms)`);
            return true;
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({ test: name, error: error.message });
            this.results.metrics[name] = { status: 'FAIL', error: error.message };
            this.log('FAIL', `PERF FAIL: ${name} - ${error.message}`);
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

    async simulateFileOperations(count = 100) {
        const testDir = 'temp_perf_test';
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir);
        }

        for (let i = 0; i < count; i++) {
            const filePath = path.join(testDir, `test_${i}.json`);
            const data = { id: i, timestamp: new Date().toISOString(), data: 'x'.repeat(1000) };
            fs.writeFileSync(filePath, JSON.stringify(data));
        }

        // Cleanup
        for (let i = 0; i < count; i++) {
            const filePath = path.join(testDir, `test_${i}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        fs.rmdirSync(testDir);
    }

    async simulateLogOperations(count = 1000) {
        const logFile = 'temp_perf_log.txt';
        
        for (let i = 0; i < count; i++) {
            const logEntry = `[${new Date().toISOString()}] INFO Test log entry ${i}\n`;
            fs.appendFileSync(logFile, logEntry);
        }

        // Read back
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.length > 0);
        
        if (lines.length !== count) {
            throw new Error(`Expected ${count} log lines, got ${lines.length}`);
        }

        // Cleanup
        if (fs.existsSync(logFile)) {
            fs.unlinkSync(logFile);
        }
    }

    async simulateConfigOperations(count = 50) {
        const configFile = 'temp_perf_config.json';
        
        for (let i = 0; i < count; i++) {
            const config = {
                servers: Array.from({ length: 10 }, (_, j) => ({
                    id: `server_${i}_${j}`,
                    name: `Server ${i}-${j}`,
                    host: `192.168.1.${j + 1}`,
                    port: 22,
                    user: 'admin'
                }))
            };
            
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            
            // Read back
            const readConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            if (readConfig.servers.length !== 10) {
                throw new Error('Config read/write mismatch');
            }
        }

        // Cleanup
        if (fs.existsSync(configFile)) {
            fs.unlinkSync(configFile);
        }
    }

    // ==================== PHASE 5 TESTS ====================

    async testFileSystemPerformance() {
        this.log('INFO', '📁 Тестирование производительности файловой системы...');

        await this.performanceTest('Создание и удаление 100 файлов', async () => {
            await this.simulateFileOperations(100);
        }, 2000);

        await this.performanceTest('Запись 1000 строк в лог', async () => {
            await this.simulateLogOperations(1000);
        }, 1000);

        await this.performanceTest('50 операций чтения/записи конфигурации', async () => {
            await this.simulateConfigOperations(50);
        }, 3000);
    }

    async testMemoryUsage() {
        this.log('INFO', '🧠 Тестирование использования памяти...');

        await this.test('Создание больших объектов в памяти', async () => {
            const largeObjects = [];
            
            // Создаем 1000 объектов по 1KB каждый
            for (let i = 0; i < 1000; i++) {
                largeObjects.push({
                    id: i,
                    data: 'x'.repeat(1024),
                    timestamp: new Date().toISOString(),
                    metadata: {
                        index: i,
                        processed: false,
                        tags: Array.from({ length: 10 }, (_, j) => `tag_${j}`)
                    }
                });
            }

            // Проверяем, что все объекты созданы
            if (largeObjects.length !== 1000) {
                throw new Error('Failed to create large objects');
            }

            // Очищаем память
            largeObjects.length = 0;
        });

        await this.test('Симуляция утечек памяти', async () => {
            const memoryBefore = process.memoryUsage();
            
            // Создаем и освобождаем память несколько раз
            for (let cycle = 0; cycle < 10; cycle++) {
                const tempArray = Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    data: 'x'.repeat(500)
                }));
                
                // Имитируем обработку
                tempArray.forEach(item => {
                    item.processed = true;
                });
                
                // Очищаем
                tempArray.length = 0;
            }

            const memoryAfter = process.memoryUsage();
            
            // Проверяем, что память не выросла критично (допускаем рост до 50MB)
            const memoryGrowth = memoryAfter.heapUsed - memoryBefore.heapUsed;
            if (memoryGrowth > 50 * 1024 * 1024) {
                throw new Error(`Memory growth too high: ${memoryGrowth / 1024 / 1024}MB`);
            }
        });
    }

    async testConcurrentOperations() {
        this.log('INFO', '🔄 Тестирование параллельных операций...');

        await this.performanceTest('10 параллельных файловых операций', async () => {
            const promises = [];
            
            for (let i = 0; i < 10; i++) {
                promises.push(this.simulateFileOperations(10));
            }
            
            await Promise.all(promises);
        }, 5000);

        await this.performanceTest('Параллельное чтение конфигураций', async () => {
            // Создаем тестовый конфиг
            const testConfig = {
                servers: Array.from({ length: 100 }, (_, i) => ({
                    id: `server_${i}`,
                    name: `Server ${i}`,
                    host: `192.168.1.${i % 255}`,
                    port: 22
                }))
            };
            
            fs.writeFileSync('temp_concurrent_config.json', JSON.stringify(testConfig));
            
            // 20 параллельных чтений
            const promises = [];
            for (let i = 0; i < 20; i++) {
                promises.push(this.readJsonFile('temp_concurrent_config.json'));
            }
            
            const results = await Promise.all(promises);
            
            // Проверяем результаты
            results.forEach(config => {
                if (config.servers.length !== 100) {
                    throw new Error('Concurrent read failed');
                }
            });
            
            // Cleanup
            fs.unlinkSync('temp_concurrent_config.json');
        }, 2000);
    }

    async testLargeDataHandling() {
        this.log('INFO', '📊 Тестирование обработки больших данных...');

        await this.performanceTest('Обработка большого JSON (1MB)', async () => {
            const largeData = {
                servers: Array.from({ length: 1000 }, (_, i) => ({
                    id: `server_${i}`,
                    name: `Server ${i}`,
                    host: `192.168.${Math.floor(i / 255)}.${i % 255}`,
                    port: 22,
                    user: 'admin',
                    metadata: {
                        description: 'x'.repeat(500),
                        tags: Array.from({ length: 20 }, (_, j) => `tag_${j}`),
                        config: {
                            timeout: 30000,
                            retries: 3,
                            options: Array.from({ length: 10 }, (_, k) => `option_${k}`)
                        }
                    }
                }))
            };
            
            const jsonString = JSON.stringify(largeData);
            const parsedData = JSON.parse(jsonString);
            
            if (parsedData.servers.length !== 1000) {
                throw new Error('Large JSON processing failed');
            }
        }, 3000);

        await this.performanceTest('Фильтрация большого массива', async () => {
            const largeArray = Array.from({ length: 10000 }, (_, i) => ({
                id: i,
                active: i % 2 === 0,
                category: `category_${i % 10}`,
                value: Math.random() * 1000
            }));
            
            // Несколько операций фильтрации
            const activeItems = largeArray.filter(item => item.active);
            const highValueItems = largeArray.filter(item => item.value > 500);
            const categoryItems = largeArray.filter(item => item.category === 'category_5');
            
            if (activeItems.length === 0 || highValueItems.length === 0) {
                throw new Error('Array filtering failed');
            }
        }, 1000);
    }

    async testErrorRecovery() {
        this.log('INFO', '🛡️ Тестирование восстановления после ошибок...');

        await this.test('Восстановление после ошибок файловой системы', async () => {
            const testFile = 'temp_error_test.json';
            
            try {
                // Попытка записи в несуществующую директорию
                try {
                    fs.writeFileSync('nonexistent/dir/file.json', '{}');
                } catch (error) {
                    // Ожидаемая ошибка
                }
                
                // Успешная запись после ошибки
                fs.writeFileSync(testFile, JSON.stringify({ test: true }));
                
                // Проверяем, что файл создан
                const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));
                if (!data.test) {
                    throw new Error('Recovery failed');
                }
                
                // Cleanup
                fs.unlinkSync(testFile);
            } catch (error) {
                // Cleanup в случае ошибки
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
                throw error;
            }
        });

        await this.test('Обработка некорректных JSON данных', async () => {
            const invalidJsons = [
                '{ invalid json }',
                '{ "unclosed": "string }',
                '{ "trailing": "comma", }',
                'not json at all'
            ];
            
            let errorsHandled = 0;
            
            for (const invalidJson of invalidJsons) {
                try {
                    JSON.parse(invalidJson);
                } catch (error) {
                    errorsHandled++;
                }
            }
            
            if (errorsHandled !== invalidJsons.length) {
                throw new Error('Not all JSON errors were handled');
            }
        });
    }

    async testResourceCleanup() {
        this.log('INFO', '🧹 Тестирование очистки ресурсов...');

        await this.test('Очистка временных файлов', async () => {
            const tempFiles = [];
            
            // Создаем временные файлы
            for (let i = 0; i < 50; i++) {
                const fileName = `temp_cleanup_${i}.json`;
                fs.writeFileSync(fileName, JSON.stringify({ id: i }));
                tempFiles.push(fileName);
            }
            
            // Проверяем, что файлы созданы
            tempFiles.forEach(file => {
                if (!fs.existsSync(file)) {
                    throw new Error(`Temp file not created: ${file}`);
                }
            });
            
            // Очищаем файлы
            tempFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            });
            
            // Проверяем, что файлы удалены
            tempFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    throw new Error(`Temp file not cleaned: ${file}`);
                }
            });
        });

        await this.test('Управление логами с ротацией', async () => {
            const logFile = 'temp_rotation_test.log';
            const maxSize = 1024; // 1KB
            
            let currentSize = 0;
            let rotationCount = 0;
            
            // Записываем логи до превышения размера
            while (currentSize < maxSize * 3) {
                const logEntry = `[${new Date().toISOString()}] Test log entry ${currentSize}\n`;
                fs.appendFileSync(logFile, logEntry);
                currentSize += logEntry.length;
                
                // Симулируем ротацию при превышении размера
                if (fs.existsSync(logFile) && fs.statSync(logFile).size > maxSize) {
                    const rotatedFile = `${logFile}.${rotationCount + 1}`;
                    fs.renameSync(logFile, rotatedFile);
                    rotationCount++;
                }
            }
            
            // Cleanup
            if (fs.existsSync(logFile)) {
                fs.unlinkSync(logFile);
            }
            
            for (let i = 1; i <= rotationCount; i++) {
                const rotatedFile = `${logFile}.${i}`;
                if (fs.existsSync(rotatedFile)) {
                    fs.unlinkSync(rotatedFile);
                }
            }
            
            if (rotationCount === 0) {
                throw new Error('Log rotation did not occur');
            }
        });
    }

    async generateReport() {
        const duration = new Date() - this.testStartTime;
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);

        // Анализ производительности
        const performanceMetrics = {};
        Object.entries(this.results.metrics).forEach(([test, data]) => {
            if (data.duration) {
                performanceMetrics[test] = {
                    duration: `${data.duration.toFixed(2)}ms`,
                    status: data.status,
                    expectedMaxTime: data.expectedMaxTime ? `${data.expectedMaxTime}ms` : 'N/A'
                };
            }
        });

        const report = {
            phase: 'Phase 5: Performance & Stress Testing',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            results: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: `${successRate}%`
            },
            performanceMetrics,
            errors: this.results.errors,
            summary: {
                fileSystemPerformance: 'Tested',
                memoryUsage: 'Tested',
                concurrentOperations: 'Tested',
                largeDataHandling: 'Tested',
                errorRecovery: 'Tested',
                resourceCleanup: 'Tested'
            },
            recommendations: [
                'Добавить мониторинг производительности в production',
                'Реализовать автоматическую очистку временных файлов',
                'Настроить алерты для контроля использования памяти',
                'Добавить метрики производительности в логи'
            ]
        };

        await this.writeJsonFile('PHASE5_PERFORMANCE_REPORT.json', report);

        this.log('INFO', '📊 PHASE 5 РЕЗУЛЬТАТЫ:');
        this.log('INFO', `Всего тестов: ${this.results.total}`);
        this.log('INFO', `Пройдено: ${this.results.passed}`);
        this.log('INFO', `Провалено: ${this.results.failed}`);
        this.log('INFO', `Успешность: ${successRate}%`);
        this.log('INFO', `Длительность: ${duration}ms`);

        if (Object.keys(performanceMetrics).length > 0) {
            this.log('INFO', '\n⚡ МЕТРИКИ ПРОИЗВОДИТЕЛЬНОСТИ:');
            Object.entries(performanceMetrics).forEach(([test, metrics]) => {
                this.log('PERF', `${test}: ${metrics.duration} (лимит: ${metrics.expectedMaxTime})`);
            });
        }

        if (this.results.errors.length > 0) {
            this.log('INFO', '\n❌ ОШИБКИ:');
            this.results.errors.forEach(error => {
                this.log('FAIL', `${error.test}: ${error.error}`);
            });
        }

        return parseFloat(successRate) >= 85; // Немного ниже порог для performance тестов
    }

    async run() {
        this.log('INFO', '🎯 Начало ФАЗЫ 5: PERFORMANCE & STRESS TESTING');
        
        try {
            await this.testFileSystemPerformance();
            await this.testMemoryUsage();
            await this.testConcurrentOperations();
            await this.testLargeDataHandling();
            await this.testErrorRecovery();
            await this.testResourceCleanup();

            const success = await this.generateReport();
            
            if (success) {
                this.log('PASS', '✅ PHASE 5 ЗАВЕРШЕНА УСПЕШНО!');
                return 0;
            } else {
                this.log('FAIL', '❌ PHASE 5 ЗАВЕРШЕНА С ОШИБКАМИ');
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
    const tester = new Phase5PerformanceTester();
    tester.run().then(code => process.exit(code));
}

module.exports = Phase5PerformanceTester;
