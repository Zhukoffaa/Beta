const fs = require('fs');
const path = require('path');

class Stage8RestructureTest {
  constructor() {
    this.results = [];
    this.basePath = './';
  }

  addTest(name, status, details = '') {
    this.results.push({
      name,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${name}${details ? ': ' + details : ''}`);
  }

  checkFileExists(filePath, description) {
    const fullPath = path.join(this.basePath, filePath);
    if (fs.existsSync(fullPath)) {
      this.addTest(`${description} существует`, 'PASS', filePath);
      return true;
    } else {
      this.addTest(`${description} отсутствует`, 'FAIL', filePath);
      return false;
    }
  }

  checkFileContent(filePath, searchStrings, description) {
    const fullPath = path.join(this.basePath, filePath);
    if (!fs.existsSync(fullPath)) {
      this.addTest(`${description} - файл не найден`, 'FAIL', filePath);
      return false;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const missingStrings = searchStrings.filter(str => !content.includes(str));
      
      if (missingStrings.length === 0) {
        this.addTest(`${description} содержит все необходимые элементы`, 'PASS');
        return true;
      } else {
        this.addTest(`${description} отсутствуют элементы`, 'FAIL', `Отсутствуют: ${missingStrings.join(', ')}`);
        return false;
      }
    } catch (error) {
      this.addTest(`${description} ошибка чтения`, 'FAIL', error.message);
      return false;
    }
  }

  async runTests() {
    console.log('🚀 Запуск тестов Stage 8 Restructure...\n');

    // 1. Проверка Backend файлов
    console.log('📁 Проверка Backend компонентов:');
    this.checkFileExists('backend/services/fileIndexer.ts', 'FileIndexer сервис');
    this.checkFileExists('configs/projects.json', 'Конфигурация проектов');

    // 2. Проверка Frontend компонентов
    console.log('\n🎨 Проверка Frontend компонентов:');
    this.checkFileExists('renderer/src/components/FileTreePanel.tsx', 'FileTreePanel компонент');
    this.checkFileExists('renderer/src/components/ServerSettingsWindow.tsx', 'ServerSettingsWindow компонент');

    // 3. Проверка содержимого FileIndexer
    console.log('\n🔍 Проверка FileIndexer функциональности:');
    this.checkFileContent('backend/services/fileIndexer.ts', [
      'class FileIndexer',
      'scanProject',
      'getProjectIndex',
      'searchFiles',
      'watchProject',
      'EventEmitter'
    ], 'FileIndexer сервис');

    // 4. Проверка содержимого FileTreePanel
    console.log('\n🌳 Проверка FileTreePanel функциональности:');
    this.checkFileContent('renderer/src/components/FileTreePanel.tsx', [
      'interface FileNode',
      'interface ProjectIndex',
      'renderFileNode',
      'handleSearch',
      'getFileIcon',
      'useIpc'
    ], 'FileTreePanel компонент');

    // 5. Проверка содержимого ServerSettingsWindow
    console.log('\n🖥️ Проверка ServerSettingsWindow функциональности:');
    this.checkFileContent('renderer/src/components/ServerSettingsWindow.tsx', [
      'interface ServerSettingsWindowProps',
      'isOpen',
      'onClose',
      'useServerManager',
      'ImageServerParser',
      'backdrop-blur'
    ], 'ServerSettingsWindow компонент');

    // 6. Проверка обновления App.tsx
    console.log('\n📱 Проверка интеграции App.tsx:');
    this.checkFileContent('renderer/src/App.tsx', [
      'FileTreePanel',
      'ServerSettingsWindow',
      'showServerSettings',
      'handleFileSelect',
      'selectedFile'
    ], 'App.tsx интеграция');

    // 7. Проверка IPC обработчиков в main.ts
    console.log('\n🔗 Проверка IPC обработчиков:');
    this.checkFileContent('backend/main.ts', [
      'FileIndexer',
      'scan-project',
      'get-all-projects',
      'search-files',
      'get-project-index'
    ], 'IPC обработчики');

    // 8. Проверка структуры projects.json
    console.log('\n📋 Проверка конфигурации проектов:');
    this.checkFileContent('configs/projects.json', [
      'projects',
      'lastAccessed'
    ], 'Projects.json структура');

    // 9. Проверка TypeScript интерфейсов
    console.log('\n📝 Проверка TypeScript типов:');
    
    // FileTreePanel типы
    this.checkFileContent('renderer/src/components/FileTreePanel.tsx', [
      'interface FileNode',
      'interface ProjectIndex',
      'interface FileTreePanelProps',
      'type: \'file\' | \'directory\'',
      'onFileSelect?: (filePath: string) => void'
    ], 'FileTreePanel типы');

    // ServerSettingsWindow типы
    this.checkFileContent('renderer/src/components/ServerSettingsWindow.tsx', [
      'interface Server',
      'interface ServerSettingsWindowProps',
      'isOpen: boolean',
      'onClose: () => void'
    ], 'ServerSettingsWindow типы');

    // 10. Проверка CSS классов и стилей
    console.log('\n🎨 Проверка стилей:');
    this.checkFileContent('renderer/src/components/FileTreePanel.tsx', [
      'className=',
      'text-gray-',
      'bg-gray-',
      'hover:',
      'transition'
    ], 'FileTreePanel стили');

    this.checkFileContent('renderer/src/components/ServerSettingsWindow.tsx', [
      'fixed inset-0',
      'backdrop-blur',
      'bg-opacity-50',
      'rounded-lg',
      'shadow-2xl'
    ], 'ServerSettingsWindow стили');

    // Генерация отчета
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    const total = this.results.length;

    console.log(`✅ Пройдено: ${passed}`);
    console.log(`❌ Провалено: ${failed}`);
    console.log(`⚠️ Предупреждения: ${warnings}`);
    console.log(`📊 Всего тестов: ${total}`);
    console.log(`📈 Процент успеха: ${Math.round((passed / total) * 100)}%`);

    // Детали провалившихся тестов
    const failedTests = this.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('\n❌ ПРОВАЛИВШИЕСЯ ТЕСТЫ:');
      failedTests.forEach(test => {
        console.log(`  • ${test.name}: ${test.details}`);
      });
    }

    // Сохранение отчета в файл
    const report = {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, warnings, total, successRate: Math.round((passed / total) * 100) },
      tests: this.results
    };

    fs.writeFileSync('STAGE8_TEST_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Отчет сохранен в STAGE8_TEST_REPORT.json');

    // Рекомендации
    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    if (failed === 0) {
      console.log('🎉 Все основные компоненты Stage 8 успешно созданы!');
      console.log('📋 Следующие шаги:');
      console.log('  1. Создать OCR сервис (backend/services/ocrService.ts)');
      console.log('  2. Обновить стили в стиле macOS');
      console.log('  3. Исправить валидацию форм');
      console.log('  4. Провести интеграционное тестирование');
    } else {
      console.log('⚠️ Обнаружены проблемы, требующие исправления');
      console.log('🔧 Исправьте провалившиеся тесты перед продолжением');
    }
  }
}

// Запуск тестов
const tester = new Stage8RestructureTest();
tester.runTests().catch(console.error);
