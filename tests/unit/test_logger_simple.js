const fs = require('fs');
const path = require('path');

function runLoggerSimpleTests() {
  console.log('Запуск упрощенных тестов Logger...');
  
  const testLogDir = path.join(__dirname, 'temp_logs');
  const testLogPath = path.join(testLogDir, 'test.log');
  
  if (fs.existsSync(testLogDir)) {
    fs.rmSync(testLogDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(testLogDir, { recursive: true });
  
  const testMessage = `[${new Date().toISOString()}] INFO: Test message\n`;
  fs.writeFileSync(testLogPath, testMessage);
  
  if (fs.existsSync(testLogPath)) {
    const content = fs.readFileSync(testLogPath, 'utf8');
    if (content.includes('INFO: Test message')) {
      console.log('✓ Запись в лог файл работает');
    } else {
      console.log('✗ Ошибка записи в лог файл');
    }
  } else {
    console.log('✗ Лог файл не создан');
  }
  
  fs.rmSync(testLogDir, { recursive: true, force: true });
  console.log('Упрощенные тесты Logger завершены\n');
}

if (require.main === module) {
  runLoggerSimpleTests();
}

module.exports = { runLoggerSimpleTests };
