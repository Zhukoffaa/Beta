const { LLMService } = require('../../backend/services/llmService');

function runLLMTests() {
  console.log('Запуск тестов LLMService...');
  
  const llmService = new LLMService();
  
  console.log('✓ LLMService создан');
  
  llmService.healthCheck('http://localhost:99999', 1000)
    .then(() => {
      console.log('✗ Health check к несуществующему серверу прошел (ошибка)');
    })
    .catch(() => {
      console.log('✓ Health check к несуществующему серверу отклонен');
    });
  
  llmService.getModels('http://localhost:99999', 1000)
    .then(() => {
      console.log('✗ Получение моделей с несуществующего сервера прошло (ошибка)');
    })
    .catch(() => {
      console.log('✓ Получение моделей с несуществующего сервера отклонено');
    });
  
  const testMessages = [
    { role: 'user', content: 'Test message' }
  ];
  
  llmService.chat('http://localhost:99999', testMessages, 1000)
    .then(() => {
      console.log('✗ Чат с несуществующим сервером прошел (ошибка)');
    })
    .catch(() => {
      console.log('✓ Чат с несуществующим сервером отклонен');
    });
  
  const validUrl = llmService.validateUrl('http://localhost:8080');
  if (validUrl) {
    console.log('✓ Валидация URL работает');
  } else {
    console.log('✗ Валидация URL не работает');
  }
  
  const invalidUrl = llmService.validateUrl('invalid-url');
  if (!invalidUrl) {
    console.log('✓ Валидация отклоняет неверные URL');
  } else {
    console.log('✗ Валидация пропускает неверные URL');
  }
  
  const stats = llmService.getStats();
  if (stats && typeof stats.totalRequests === 'number') {
    console.log('✓ Статистика работает');
  } else {
    console.log('✗ Статистика не работает');
  }
  
  setTimeout(() => {
    console.log('Тесты LLMService завершены\n');
  }, 2000);
}

if (require.main === module) {
  runLLMTests();
}

module.exports = { runLLMTests };
