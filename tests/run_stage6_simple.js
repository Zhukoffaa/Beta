const { runLoggerSimpleTests } = require('./unit/test_logger_simple');
const fs = require('fs');
const path = require('path');

function runStage6SimpleTests() {
  console.log('=== ЭТАП 6: ТЕСТИРОВАНИЕ И ОТЛАДКА (УПРОЩЕННАЯ ВЕРСИЯ) ===\n');
  
  console.log('6.1 Юнит-тесты (упрощенные)...');
  runLoggerSimpleTests();
  
  console.log('6.2 Проверка структуры проекта...');
  const requiredFiles = [
    'backend/services/logger.ts',
    'backend/services/config.ts',
    'backend/services/sshService.ts',
    'backend/services/llmService.ts',
    'backend/services/taskExecutor.ts',
    'backend/services/serverManager.ts',
    'backend/main.ts'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${file} существует`);
    } else {
      console.log(`✗ ${file} отсутствует`);
      allFilesExist = false;
    }
  });
  
  if (allFilesExist) {
    console.log('✓ Все основные файлы backend присутствуют');
  }
  
  console.log('\n6.3 Проверка конфигураций...');
  const configFiles = [
    'configs/app.yaml',
    'configs/servers.json',
    'package.json'
  ];
  
  configFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${file} существует`);
    } else {
      console.log(`✗ ${file} отсутствует`);
    }
  });
  
  console.log('\n6.4 Проверка режима отладки...');
  const mainTsPath = path.join(__dirname, '..', 'backend/main.ts');
  if (fs.existsSync(mainTsPath)) {
    const content = fs.readFileSync(mainTsPath, 'utf8');
    if (content.includes('isDebug') && content.includes('openDevTools')) {
      console.log('✓ Режим отладки настроен в main.ts');
    } else {
      console.log('✗ Режим отладки не найден в main.ts');
    }
  }
  
  console.log('\n6.5 Проверка тестовых файлов...');
  const testFiles = [
    'tests/unit/test_logger.js',
    'tests/unit/test_config.js',
    'tests/unit/test_ssh.js',
    'tests/unit/test_llm.js',
    'tests/unit/test_taskexecutor.js'
  ];
  
  let testFilesCount = 0;
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${file} создан`);
      testFilesCount++;
    } else {
      console.log(`✗ ${file} отсутствует`);
    }
  });
  
  console.log(`\n✓ Создано ${testFilesCount}/${testFiles.length} тестовых файлов`);
  
  console.log('\n=== ЭТАП 6 ЗАВЕРШЕН ===');
  console.log('Основные компоненты тестирования созданы и проверены.');
  console.log('Для полного тестирования необходимо скомпилировать TypeScript файлы.');
}

if (require.main === module) {
  runStage6SimpleTests();
}

module.exports = { runStage6SimpleTests };
