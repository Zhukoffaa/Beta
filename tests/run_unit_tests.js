const { runLoggerTests } = require('./unit/test_logger');
const { runConfigTests } = require('./unit/test_config');
const { runSSHTests } = require('./unit/test_ssh');
const { runLLMTests } = require('./unit/test_llm');
const { runTaskExecutorTests } = require('./unit/test_taskexecutor');

function runAllUnitTests() {
  console.log('=== ЗАПУСК ВСЕХ ЮНИТ-ТЕСТОВ ===\n');
  
  runLoggerTests();
  runConfigTests();
  runSSHTests();
  runLLMTests();
  runTaskExecutorTests();
  
  setTimeout(() => {
    console.log('=== ВСЕ ЮНИТ-ТЕСТЫ ЗАВЕРШЕНЫ ===');
  }, 3000);
}

if (require.main === module) {
  runAllUnitTests();
}

module.exports = { runAllUnitTests };
