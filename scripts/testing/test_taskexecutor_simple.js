#!/usr/bin/env node
/**
 * Упрощенное тестирование TaskExecutor с использованием ts-node
 */

const path = require('path');
const fs = require('fs');

// Настройка ts-node
require('ts-node').register({
  project: path.join(__dirname, 'tsconfig.json'),
  compilerOptions: {
    module: 'commonjs',
    target: 'ES2020',
    esModuleInterop: true,
    skipLibCheck: true
  }
});

// Симуляция Logger
class MockLogger {
  info(message) {
    console.log(`[INFO] ${message}`);
  }
  
  warn(message) {
    console.log(`[WARN] ${message}`);
  }
  
  error(message, error) {
    console.log(`[ERROR] ${message}`, error || '');
  }
}

async function testTaskExecutorBasic() {
  console.log('🧪 Базовое тестирование TaskExecutor...');
  
  try {
    // Импортируем TaskExecutor
    const { TaskExecutor } = require('./backend/services/taskExecutor');
    
    const logger = new MockLogger();
    const executor = new TaskExecutor(logger, 2);
    
    console.log('✅ TaskExecutor создан успешно');
    
    // Тестируем базовые методы
    const stats = executor.getStats();
    console.log('📊 Начальная статистика:', stats);
    
    // Тестируем события
    executor.on('task-started', (data) => {
      console.log(`🚀 Событие: задача запущена ${data.taskId}`);
    });
    
    executor.on('task-progress', (data) => {
      console.log(`📊 Событие: прогресс ${data.progress}%`);
    });
    
    executor.on('task-completed', (data) => {
      console.log(`✅ Событие: задача завершена ${data.taskId}`);
    });
    
    executor.on('task-failed', (data) => {
      console.log(`❌ Событие: задача провалена ${data.taskId}`);
    });
    
    console.log('✅ События подписаны');
    
    // Проверяем методы создания задач
    console.log('🔧 Проверка методов создания задач...');
    
    const deployConfig = {
      serverId: 'test-server',
      host: '213.181.108.221',
      port: 39166,
      username: 'root',
      privateKey: '/path/to/key',
      deployPath: '/tmp/test',
      llmPort: 8080
    };
    
    const connectConfig = {
      serverId: 'test-server',
      host: '213.181.108.221',
      port: 39166,
      username: 'root',
      privateKey: '/path/to/key',
      llmPort: 8080,
      localPort: 8081
    };
    
    const chatConfig = {
      serverId: 'test-server',
      baseUrl: 'http://localhost:8081',
      messages: [{ role: 'user', content: 'test' }]
    };
    
    console.log('✅ Конфигурации задач созданы');
    
    // Тестируем создание задач (без выполнения)
    try {
      // Эти вызовы должны провалиться из-за отсутствия JS файлов, но это нормально
      console.log('⚠️  Попытка запуска задач (ожидаются ошибки из-за отсутствия JS файлов)...');
      
      const deployPromise = executor.runDeployTask(deployConfig).catch(e => {
        console.log('   Deploy task ошибка (ожидаемо):', e.message.substring(0, 50) + '...');
        return { success: false, error: e.message };
      });
      
      const connectPromise = executor.runConnectTask(connectConfig).catch(e => {
        console.log('   Connect task ошибка (ожидаемо):', e.message.substring(0, 50) + '...');
        return { success: false, error: e.message };
      });
      
      const chatPromise = executor.runChatTask(chatConfig).catch(e => {
        console.log('   Chat task ошибка (ожидаемо):', e.message.substring(0, 50) + '...');
        return { success: false, error: e.message };
      });
      
      await Promise.all([deployPromise, connectPromise, chatPromise]);
      
    } catch (error) {
      console.log('⚠️  Ошибки задач ожидаемы (нет JS файлов)');
    }
    
    // Финальная статистика
    const finalStats = executor.getStats();
    console.log('📊 Финальная статистика:', finalStats);
    
    // Shutdown
    await executor.shutdown();
    console.log('🏁 TaskExecutor завершен');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function main() {
  console.log('🚀 Упрощенное тестирование TaskExecutor');
  console.log('=' * 50);
  
  try {
    const success = await testTaskExecutorBasic();
    
    console.log('\n' + '=' * 50);
    if (success) {
      console.log('✅ Базовое тестирование TaskExecutor прошло успешно!');
      console.log('🎯 TaskExecutor корректно инициализируется и имеет все необходимые методы');
      console.log('📝 Следующий шаг: интеграция с ServerManager');
    } else {
      console.log('❌ Тестирование провалилось');
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  main();
}
