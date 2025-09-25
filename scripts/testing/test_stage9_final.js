const fs = require('fs');
const path = require('path');

class Stage9FinalTester {
    constructor() {
        this.results = [];
        this.componentsPath = 'renderer/src/components';
    }

    addResult(test, status, details = '') {
        this.results.push({
            test,
            status,
            details,
            timestamp: new Date().toISOString()
        });
        
        const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${statusIcon} ${test}: ${status}${details ? ` - ${details}` : ''}`);
    }

    testComponentExists(componentName) {
        const componentPath = path.join(this.componentsPath, `${componentName}.tsx`);
        if (fs.existsSync(componentPath)) {
            const content = fs.readFileSync(componentPath, 'utf8');
            const hasExport = content.includes(`export default ${componentName}`);
            this.addResult(`${componentName} компонент`, hasExport ? 'PASS' : 'FAIL', 
                hasExport ? 'Найден и экспортирован' : 'Найден но не экспортирован');
            return hasExport;
        } else {
            this.addResult(`${componentName} компонент`, 'FAIL', 'Файл не найден');
            return false;
        }
    }

    testCodeEditor() {
        const componentPath = path.join(this.componentsPath, 'CodeEditor.tsx');
        if (!fs.existsSync(componentPath)) {
            this.addResult('CodeEditor функциональность', 'FAIL', 'Компонент не найден');
            return false;
        }

        const content = fs.readFileSync(componentPath, 'utf8');
        const checks = [
            { name: 'Monaco Editor импорт', pattern: /@monaco-editor\/react/ },
            { name: 'Editor компонент', pattern: /Editor.*from.*@monaco-editor\/react/ },
            { name: 'Темная тема', pattern: /vs-dark/ },
            { name: 'TypeScript язык', pattern: /typescript/ },
            { name: 'Настройки fontSize', pattern: /fontSize/ },
            { name: 'Настройки wordWrap', pattern: /wordWrap/ }
        ];

        let passed = 0;
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                passed++;
                this.addResult(`CodeEditor: ${check.name}`, 'PASS');
            } else {
                this.addResult(`CodeEditor: ${check.name}`, 'FAIL');
            }
        });

        const success = passed >= 4;
        this.addResult('CodeEditor функциональность', success ? 'PASS' : 'FAIL', 
            `${passed}/${checks.length} проверок пройдено`);
        return success;
    }

    testDiffViewer() {
        const componentPath = path.join(this.componentsPath, 'DiffViewer.tsx');
        if (!fs.existsSync(componentPath)) {
            this.addResult('DiffViewer функциональность', 'FAIL', 'Компонент не найден');
            return false;
        }

        const content = fs.readFileSync(componentPath, 'utf8');
        const checks = [
            { name: 'DiffViewer импорт', pattern: /react-diff-viewer-continued/ },
            { name: 'ReactDiffViewer компонент', pattern: /ReactDiffViewer/ },
            { name: 'Split view', pattern: /splitView/ },
            { name: 'Темные стили', pattern: /#1f2937|#374151/ },
            { name: 'Кастомные стили', pattern: /styles.*=.*{/ }
        ];

        let passed = 0;
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                passed++;
                this.addResult(`DiffViewer: ${check.name}`, 'PASS');
            } else {
                this.addResult(`DiffViewer: ${check.name}`, 'FAIL');
            }
        });

        const success = passed >= 3;
        this.addResult('DiffViewer функциональность', success ? 'PASS' : 'FAIL', 
            `${passed}/${checks.length} проверок пройдено`);
        return success;
    }

    testSettingsDialog() {
        const componentPath = path.join(this.componentsPath, 'SettingsDialog.tsx');
        if (!fs.existsSync(componentPath)) {
            this.addResult('SettingsDialog функциональность', 'FAIL', 'Компонент не найден');
            return false;
        }

        const content = fs.readFileSync(componentPath, 'utf8');
        const checks = [
            { name: 'useState хук', pattern: /useState/ },
            { name: 'localStorage', pattern: /localStorage/ },
            { name: 'Модальное окно', pattern: /fixed.*inset-0/ },
            { name: 'Overlay', pattern: /bg-black.*bg-opacity/ },
            { name: 'Настройки fontSize', pattern: /fontSize/ },
            { name: 'Настройки wordWrap', pattern: /wordWrap/ },
            { name: 'Кнопка сохранения', pattern: /Сохранить|Save/ }
        ];

        let passed = 0;
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                passed++;
                this.addResult(`SettingsDialog: ${check.name}`, 'PASS');
            } else {
                this.addResult(`SettingsDialog: ${check.name}`, 'FAIL');
            }
        });

        const success = passed >= 5;
        this.addResult('SettingsDialog функциональность', success ? 'PASS' : 'FAIL', 
            `${passed}/${checks.length} проверок пройдено`);
        return success;
    }

    testPackageJson() {
        const packagePath = 'package.json';
        if (!fs.existsSync(packagePath)) {
            this.addResult('package.json зависимости', 'FAIL', 'package.json не найден');
            return false;
        }

        const content = fs.readFileSync(packagePath, 'utf8');
        const packageJson = JSON.parse(content);
        
        const requiredDeps = [
            '@monaco-editor/react',
            'react-diff-viewer-continued'
        ];

        let found = 0;
        requiredDeps.forEach(dep => {
            const exists = packageJson.dependencies && packageJson.dependencies[dep];
            if (exists) {
                found++;
                this.addResult(`Зависимость: ${dep}`, 'PASS', `v${packageJson.dependencies[dep]}`);
            } else {
                this.addResult(`Зависимость: ${dep}`, 'FAIL', 'Не найдена');
            }
        });

        const success = found === requiredDeps.length;
        this.addResult('package.json зависимости', success ? 'PASS' : 'FAIL', 
            `${found}/${requiredDeps.length} зависимостей найдено`);
        return success;
    }

    testBuildOutput() {
        const buildPaths = [
            'dist/backend',
            'renderer/dist'
        ];

        let buildExists = 0;
        buildPaths.forEach(buildPath => {
            if (fs.existsSync(buildPath)) {
                buildExists++;
                this.addResult(`Сборка: ${buildPath}`, 'PASS', 'Директория существует');
            } else {
                this.addResult(`Сборка: ${buildPath}`, 'FAIL', 'Директория не найдена');
            }
        });

        // Проверяем bundle.js
        const bundlePath = 'renderer/dist/bundle.js';
        if (fs.existsSync(bundlePath)) {
            const stats = fs.statSync(bundlePath);
            const sizeKB = Math.round(stats.size / 1024);
            this.addResult('Bundle размер', 'PASS', `${sizeKB} KB`);
            buildExists++;
        } else {
            this.addResult('Bundle размер', 'FAIL', 'bundle.js не найден');
        }

        const success = buildExists >= 2;
        this.addResult('Сборка приложения', success ? 'PASS' : 'FAIL', 
            `${buildExists}/3 артефактов найдено`);
        return success;
    }

    runAllTests() {
        console.log('🚀 STAGE 9 FINAL TESTING - UI КОМПОНЕНТЫ');
        console.log('=' .repeat(60));

        const components = ['CodeEditor', 'DiffViewer', 'SettingsDialog'];
        let componentsPassed = 0;

        // Тест существования компонентов
        components.forEach(component => {
            if (this.testComponentExists(component)) {
                componentsPassed++;
            }
        });

        // Функциональные тесты
        const functionalTests = [
            () => this.testCodeEditor(),
            () => this.testDiffViewer(), 
            () => this.testSettingsDialog(),
            () => this.testPackageJson(),
            () => this.testBuildOutput()
        ];

        let functionalPassed = 0;
        functionalTests.forEach(test => {
            if (test()) {
                functionalPassed++;
            }
        });

        // Итоговая статистика
        console.log('\n' + '=' .repeat(60));
        console.log('📊 ИТОГОВАЯ СТАТИСТИКА STAGE 9');
        console.log('=' .repeat(60));

        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'PASS').length;
        const failedTests = this.results.filter(r => r.status === 'FAIL').length;
        const warnTests = this.results.filter(r => r.status === 'WARN').length;

        console.log(`✅ Пройдено: ${passedTests}`);
        console.log(`❌ Провалено: ${failedTests}`);
        console.log(`⚠️  Предупреждения: ${warnTests}`);
        console.log(`📈 Общий процент: ${Math.round((passedTests / totalTests) * 100)}%`);

        console.log('\n🎯 КОМПОНЕНТЫ STAGE 9:');
        console.log(`📝 CodeEditor: ${this.testComponentExists('CodeEditor') ? '✅' : '❌'}`);
        console.log(`🔍 DiffViewer: ${this.testComponentExists('DiffViewer') ? '✅' : '❌'}`);
        console.log(`⚙️  SettingsDialog: ${this.testComponentExists('SettingsDialog') ? '✅' : '❌'}`);

        const overallSuccess = passedTests >= (totalTests * 0.8);
        console.log(`\n🏆 STAGE 9 STATUS: ${overallSuccess ? '✅ ЗАВЕРШЕН УСПЕШНО' : '❌ ТРЕБУЕТ ДОРАБОТКИ'}`);

        return {
            success: overallSuccess,
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            percentage: Math.round((passedTests / totalTests) * 100)
        };
    }
}

// Запуск тестирования
const tester = new Stage9FinalTester();
const results = tester.runAllTests();

process.exit(results.success ? 0 : 1);
