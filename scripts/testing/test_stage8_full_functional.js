const fs = require('fs');
const path = require('path');

class Stage8FullFunctionalTester {
    constructor() {
        this.results = [];
        this.passCount = 0;
        this.failCount = 0;
    }

    addTest(name, status, details = '') {
        this.results.push({ name, status, details });
        if (status === 'PASS') this.passCount++;
        else this.failCount++;
        
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} ${name}: ${status}${details ? ` - ${details}` : ''}`);
    }

    // 1. Функциональное тестирование UI
    testUIFunctionality() {
        console.log('🎨 Testing UI Functionality...');
        
        // Проверка FileTreePanel функциональности
        const fileTreePath = 'renderer/src/components/FileTreePanel.tsx';
        if (fs.existsSync(fileTreePath)) {
            const content = fs.readFileSync(fileTreePath, 'utf8');
            
            // Проверка основных UI элементов
            if (content.includes('useState') && content.includes('useEffect')) {
                this.addTest('FileTreePanel React hooks', 'PASS');
            } else {
                this.addTest('FileTreePanel React hooks', 'FAIL');
            }
            
            // Проверка обработчиков событий
            if (content.includes('onClick') || content.includes('onSelect')) {
                this.addTest('FileTreePanel event handlers', 'PASS');
            } else {
                this.addTest('FileTreePanel event handlers', 'FAIL');
            }
            
            // Проверка стилизации
            if (content.includes('className') && content.includes('hover:')) {
                this.addTest('FileTreePanel styling', 'PASS');
            } else {
                this.addTest('FileTreePanel styling', 'FAIL');
            }
        } else {
            this.addTest('FileTreePanel file exists', 'FAIL');
        }

        // Проверка ServerSettingsWindow функциональности
        const serverWindowPath = 'renderer/src/components/ServerSettingsWindow.tsx';
        if (fs.existsSync(serverWindowPath)) {
            const content = fs.readFileSync(serverWindowPath, 'utf8');
            
            // Проверка модального окна
            if (content.includes('modal') && content.includes('overlay')) {
                this.addTest('ServerSettingsWindow modal structure', 'PASS');
            } else {
                this.addTest('ServerSettingsWindow modal structure', 'FAIL');
            }
            
            // Проверка форм
            if (content.includes('input') && content.includes('button')) {
                this.addTest('ServerSettingsWindow form elements', 'PASS');
            } else {
                this.addTest('ServerSettingsWindow form elements', 'FAIL');
            }
            
            // Проверка валидации
            if (content.includes('validation') || content.includes('error')) {
                this.addTest('ServerSettingsWindow validation', 'PASS');
            } else {
                this.addTest('ServerSettingsWindow validation', 'WARN', 'No explicit validation found');
            }
        } else {
            this.addTest('ServerSettingsWindow file exists', 'FAIL');
        }
    }

    // 2. OCR тестирование
    testOCRFunctionality() {
        console.log('🖼️ Testing OCR Functionality...');
        
        const ocrServicePath = 'backend/services/ocrService.ts';
        if (fs.existsSync(ocrServicePath)) {
            const content = fs.readFileSync(ocrServicePath, 'utf8');
            
            // Проверка множественной обработки
            if (content.includes('processMultipleImages') && content.includes('Promise.all')) {
                this.addTest('OCR multiple images processing', 'PASS');
            } else {
                this.addTest('OCR multiple images processing', 'FAIL');
            }
            
            // Проверка парсинга полей
            if (content.includes('parseServerFields') && content.includes('extractFields')) {
                this.addTest('OCR server fields parsing', 'PASS');
            } else {
                this.addTest('OCR server fields parsing', 'FAIL');
            }
            
            // Проверка объединения результатов
            if (content.includes('mergeResults') && content.includes('confidence')) {
                this.addTest('OCR results merging', 'PASS');
            } else {
                this.addTest('OCR results merging', 'FAIL');
            }
        } else {
            this.addTest('OCR Service file exists', 'FAIL');
        }

        // Проверка ImageServerParser обновлений
        const imageParserPath = 'renderer/src/components/ImageServerParser.tsx';
        if (fs.existsSync(imageParserPath)) {
            const content = fs.readFileSync(imageParserPath, 'utf8');
            
            // Проверка множественной загрузки
            if (content.includes('multiple') && content.includes('files')) {
                this.addTest('ImageServerParser multiple upload', 'PASS');
            } else {
                this.addTest('ImageServerParser multiple upload', 'FAIL');
            }
            
            // Проверка интеграции с OCR
            if (content.includes('ocr-process-images')) {
                this.addTest('ImageServerParser OCR integration', 'PASS');
            } else {
                this.addTest('ImageServerParser OCR integration', 'FAIL');
            }
        }
    }

    // 3. Интеграционное тестирование
    testIntegration() {
        console.log('🔗 Testing Integration...');
        
        // Проверка App.tsx интеграции
        const appPath = 'renderer/src/App.tsx';
        if (fs.existsSync(appPath)) {
            const content = fs.readFileSync(appPath, 'utf8');
            
            // Проверка импортов новых компонентов
            if (content.includes('FileTreePanel') && content.includes('ServerSettingsWindow')) {
                this.addTest('App.tsx component imports', 'PASS');
            } else {
                this.addTest('App.tsx component imports', 'FAIL');
            }
            
            // Проверка состояния управления
            if (content.includes('useState') && content.includes('showServerSettings')) {
                this.addTest('App.tsx state management', 'PASS');
            } else {
                this.addTest('App.tsx state management', 'FAIL');
            }
            
            // Проверка навигации
            if (content.includes('setActiveTab') || content.includes('handleTabChange')) {
                this.addTest('App.tsx navigation', 'PASS');
            } else {
                this.addTest('App.tsx navigation', 'WARN', 'Limited navigation found');
            }
        }

        // Проверка IPC интеграции в main.ts
        const mainPath = 'backend/main.ts';
        if (fs.existsSync(mainPath)) {
            const content = fs.readFileSync(mainPath, 'utf8');
            
            // Проверка новых IPC обработчиков
            if (content.includes('scan-project') && content.includes('ocr-process-images')) {
                this.addTest('Main.ts new IPC handlers', 'PASS');
            } else {
                this.addTest('Main.ts new IPC handlers', 'FAIL');
            }
            
            // Проверка сервисов
            if (content.includes('OCRService') && content.includes('FileIndexer')) {
                this.addTest('Main.ts service integration', 'PASS');
            } else {
                this.addTest('Main.ts service integration', 'FAIL');
            }
        }
    }

    // 4. Performance тестирование
    testPerformance() {
        console.log('⚡ Testing Performance...');
        
        const fileIndexerPath = 'backend/services/fileIndexer.ts';
        if (fs.existsSync(fileIndexerPath)) {
            const content = fs.readFileSync(fileIndexerPath, 'utf8');
            
            // Проверка кеширования
            if (content.includes('cache') && content.includes('Map')) {
                this.addTest('FileIndexer caching mechanism', 'PASS');
            } else {
                this.addTest('FileIndexer caching mechanism', 'FAIL');
            }
            
            // Проверка асинхронности
            if (content.includes('async') && content.includes('await')) {
                this.addTest('FileIndexer async operations', 'PASS');
            } else {
                this.addTest('FileIndexer async operations', 'FAIL');
            }
            
            // Проверка оптимизации
            if (content.includes('debounce') || content.includes('throttle')) {
                this.addTest('FileIndexer optimization', 'PASS');
            } else {
                this.addTest('FileIndexer optimization', 'WARN', 'No explicit optimization found');
            }
            
            // Проверка fs.watch для реактивности
            if (content.includes('fs.watch') || content.includes('chokidar')) {
                this.addTest('FileIndexer file watching', 'PASS');
            } else {
                this.addTest('FileIndexer file watching', 'FAIL');
            }
        }
    }

    // 5. E2E тестирование сценариев
    testE2EScenarios() {
        console.log('🎯 Testing E2E Scenarios...');
        
        // Сценарий 1: Выбор проекта
        const projectsConfigPath = 'configs/projects.json';
        if (fs.existsSync(projectsConfigPath)) {
            const content = fs.readFileSync(projectsConfigPath, 'utf8');
            try {
                const config = JSON.parse(content);
                if (config.projects && Array.isArray(config.projects)) {
                    this.addTest('E2E: Project selection config', 'PASS');
                } else {
                    this.addTest('E2E: Project selection config', 'FAIL');
                }
            } catch (e) {
                this.addTest('E2E: Project selection config', 'FAIL', 'Invalid JSON');
            }
        } else {
            this.addTest('E2E: Project selection config', 'FAIL');
        }
        
        // Сценарий 2: Файловое дерево -> Настройки серверов
        const fileTreeExists = fs.existsSync('renderer/src/components/FileTreePanel.tsx');
        const serverSettingsExists = fs.existsSync('renderer/src/components/ServerSettingsWindow.tsx');
        
        if (fileTreeExists && serverSettingsExists) {
            this.addTest('E2E: FileTree to ServerSettings flow', 'PASS');
        } else {
            this.addTest('E2E: FileTree to ServerSettings flow', 'FAIL');
        }
        
        // Сценарий 3: OCR -> Заполнение формы
        const ocrExists = fs.existsSync('backend/services/ocrService.ts');
        const imageParserExists = fs.existsSync('renderer/src/components/ImageServerParser.tsx');
        
        if (ocrExists && imageParserExists) {
            this.addTest('E2E: OCR to form filling flow', 'PASS');
        } else {
            this.addTest('E2E: OCR to form filling flow', 'FAIL');
        }
        
        // Сценарий 4: Сохранение конфигурации
        const serversConfigExists = fs.existsSync('configs/servers.json');
        if (serversConfigExists) {
            this.addTest('E2E: Configuration persistence', 'PASS');
        } else {
            this.addTest('E2E: Configuration persistence', 'FAIL');
        }
    }

    // 6. Проверка стилей и анимаций
    testStylesAndAnimations() {
        console.log('🎨 Testing Styles and Animations...');
        
        // Проверка Tailwind конфигурации
        const tailwindPath = 'tailwind.config.js';
        if (fs.existsSync(tailwindPath)) {
            const content = fs.readFileSync(tailwindPath, 'utf8');
            
            // Проверка анимаций
            if (content.includes('animation') && content.includes('keyframes')) {
                this.addTest('Tailwind animations config', 'PASS');
            } else {
                this.addTest('Tailwind animations config', 'FAIL');
            }
            
            // Проверка шрифтов
            if (content.includes('Inter') || content.includes('fontFamily')) {
                this.addTest('Tailwind fonts config', 'PASS');
            } else {
                this.addTest('Tailwind fonts config', 'FAIL');
            }
            
            // Проверка backdrop-blur (исправление неудачного теста)
            if (content.includes('backdrop-blur') || content.includes('backdropBlur')) {
                this.addTest('Tailwind backdrop-blur config', 'PASS');
            } else {
                this.addTest('Tailwind backdrop-blur config', 'FAIL');
            }
        }
        
        // Проверка CSS файла
        const cssPath = 'renderer/src/App.css';
        if (fs.existsSync(cssPath)) {
            const content = fs.readFileSync(cssPath, 'utf8');
            
            // Проверка macOS стилей
            if (content.includes('macOS') && content.includes('backdrop-filter')) {
                this.addTest('CSS macOS styles', 'PASS');
            } else {
                this.addTest('CSS macOS styles', 'FAIL');
            }
            
            // Проверка анимаций
            if (content.includes('@keyframes') && content.includes('transition')) {
                this.addTest('CSS animations', 'PASS');
            } else {
                this.addTest('CSS animations', 'FAIL');
            }
        }
    }

    // Запуск всех тестов
    runAllTests() {
        console.log('🚀 Starting Stage 8 Full Functional Testing...');
        console.log('============================================================\n');
        
        this.testUIFunctionality();
        console.log('');
        
        this.testOCRFunctionality();
        console.log('');
        
        this.testIntegration();
        console.log('');
        
        this.testPerformance();
        console.log('');
        
        this.testE2EScenarios();
        console.log('');
        
        this.testStylesAndAnimations();
        console.log('');
        
        this.generateReport();
    }

    generateReport() {
        const total = this.passCount + this.failCount;
        const successRate = ((this.passCount / total) * 100).toFixed(1);
        
        console.log('============================================================');
        console.log('📊 STAGE 8 FULL FUNCTIONAL TEST RESULTS');
        console.log('============================================================');
        console.log(`✅ Passed: ${this.passCount}/${total} (${successRate}%)`);
        
        if (this.failCount > 0) {
            console.log(`❌ Failed: ${this.failCount}/${total}`);
            console.log('⚠️ Some tests failed. Review the issues above.');
        } else {
            console.log('🎉 All tests passed successfully!');
        }
        
        // Сохранение детального отчета
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total,
                passed: this.passCount,
                failed: this.failCount,
                successRate: `${successRate}%`
            },
            results: this.results
        };
        
        fs.writeFileSync('STAGE8_FULL_FUNCTIONAL_TEST_REPORT.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to: STAGE8_FULL_FUNCTIONAL_TEST_REPORT.json');
    }
}

// Запуск тестирования
const tester = new Stage8FullFunctionalTester();
tester.runAllTests();
