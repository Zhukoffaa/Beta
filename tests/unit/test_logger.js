const fs = require('fs');
const path = require('path');
const { Logger } = require('../../backend/services/logger');

const testLogDir = path.join(__dirname, 'temp_logs');
const testLogPath = path.join(testLogDir, 'test.log');

function cleanup() {
  if (fs.existsSync(testLogDir)) {
    fs.rmSync(testLogDir, { recursive: true, force: true });
  }
}

function runLoggerTests() {
  console.log('Запуск тестов Logger...');
  
  cleanup();
  
  const logger = new Logger(testLogPath);
  
  logger.info('Test message 1');
  logger.warn('Test warning', { key: 'value' });
  logger.error('Test error');
  
  setTimeout(() => {
    if (fs.existsSync(testLogPath)) {
      const content = fs.readFileSync(testLogPath, 'utf8');
      const lines = content.trim().split('\n');
      
      if (lines.length === 3) {
        console.log('✓ Logger записал все сообщения');
      } else {
        console.log('✗ Неверное количество записей:', lines.length);
      }
      
      if (content.includes('INFO: Test message 1')) {
        console.log('✓ INFO сообщение записано');
      } else {
        console.log('✗ INFO сообщение не найдено');
      }
      
      if (content.includes('WARN: Test warning')) {
        console.log('✓ WARN сообщение записано');
      } else {
        console.log('✗ WARN сообщение не найдено');
      }
      
      if (content.includes('ERROR: Test error')) {
        console.log('✓ ERROR сообщение записано');
      } else {
        console.log('✗ ERROR сообщение не найдено');
      }
      
      if (content.includes('{"key":"value"}')) {
        console.log('✓ Metadata записана');
      } else {
        console.log('✗ Metadata не найдена');
      }
    } else {
      console.log('✗ Лог файл не создан');
    }
    
    logger.getRecentLogs(10).then(logs => {
      if (logs.length === 3) {
        console.log('✓ getRecentLogs работает');
      } else {
        console.log('✗ getRecentLogs вернул неверное количество:', logs.length);
      }
      
      cleanup();
      console.log('Тесты Logger завершены\n');
    });
  }, 100);
}

if (require.main === module) {
  runLoggerTests();
}

module.exports = { runLoggerTests };
