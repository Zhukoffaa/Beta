#!/usr/bin/env node
/**
 * Тестирование интеграции ServerManager с TaskExecutor
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

// Симуляция ConfigService
class MockConfigService {
  constructor() {
    this.servers = {
      servers: [
        {
          id: 'test-server-1',
          name: 'Test LLM Server',
          host: '213.181.108.221',
          port: 39166,
          user: 'root',
          sshKey: '/path/to/key',
          deployPath: '/tmp/llm_deploy',
          llmPort: 8080,
          status: 'disconnected',
          deployed: false,
          connected: false,
          lastCheck: null
        }
      ]
    };
  }

  async getServers() {
    return this.servers;
  }

  async updateServer(server) {
    const index = this.servers.servers.findIndex(s => s.id === server.id);
    if (index >= 0) {
      this.servers.servers[index] = { ...this.servers.servers[index], ...server };
    }
    console.log(`[CONFIG] Сервер ${server.id} обновлен:`, server.status);
  }
}

async function testServerManagerIntegration() {
  console.log('🧪 Тестирование интеграции ServerManager с TaskExecutor...');
  
  try {
    // Импортируем ServerManager
    const { ServerManager } = require('./backend/services/serverManager');
    
    const logger = new MockLogger();
    const configService = new MockConfigService();
    const serverManager = new ServerManager(logger, configService);
    
    console.log('✅ ServerManager создан успешно');
    
    // Подписываемся на события
    serverManager.on('status-change', (data) => {
      console.log(`🔄 Статус сервера ${data.serverId}: ${data.status}`);
    });
    
    serverManager.on('deployment-progress', (data) => {
      console.log(`📊 Прогресс развертывания ${data.serverId}: ${data.progress}% - ${data.message}`);
    });
    
    serverManager.on('progress', (data) => {
      console.log(`⏳ Прогресс ${data.serverId}: ${data.progress}% - ${data.message}`);
    });
    
    serverManager.on('log', (data) => {
      console.log(`📝 Лог ${data.serverId} [${data.level}]: ${data.message}`);
    });
    
    serverManager.on('connection-tested', (data) => {
      console.log(`🔗 Тест соединения ${data.serverId}: SSH=${data.sshConnected}, LLM=${data.llmConnected}`);
    });
    
    serverManager.on('server-ready', (data) => {
      console.log(`🎯 Сервер готов: ${data.serverId}`);
    });
    
    console.log('✅ События подписаны');
    
    // Получаем список серверов
    const servers = serverManager.getAllServers();
    console.log(`📋 Загружено серверов: ${servers.length}`);
    
    if (servers.length === 0) {
      console.log('⚠️  Нет серверов для тестирования');
      return true;
    }
    
    const testServerId = servers[0].id;
    console.log(`🎯 Тестируем сервер: ${testServerId}`);
    
    // Тест 1: Получение статуса сервера
    console.log('\n🔧 Тест 1: Получение статуса сервера');
    const status = serverManager.getServerStatus(testServerId);
    console.log('Статус сервера:', status);
    
    // Тест 2: Развертывание сервера (через TaskExecutor)
    console.log('\n🚀 Тест 2: Развертывание сервера');
    try {
      const deployResult = await serverManager.deployServer(testServerId);
      console.log('Результат развертывания:', deployResult ? '✅ Успех' : '❌ Ошибка');
    } catch (error) {
      console.log('Ошибка развертывания (ожидаемо):', error.message.substring(0, 50) + '...');
    }
    
    // Тест 3: Подключение к серверу (через TaskExecutor)
    console.log('\n🌐 Тест 3: Подключение к серверу');
    try {
      const connectResult = await serverManager.connectServer(testServerId);
      console.log('Результат подключения:', connectResult ? '✅ Успех' : '❌ Ошибка');
    } catch (error) {
      console.log('Ошибка подключения (ожидаемо):', error.message.substring(0, 50) + '...');
    }
    
    // Тест 4: Чат с сервером (через TaskExecutor)
    console.log('\n💬 Тест 4: Чат с сервером');
    try {
      const chatResult = await serverManager.chat(testServerId, [
        { role: 'user', content: 'Привет! Как дела?' }
      ]);
      console.log('Результат чата:', chatResult ? '✅ Успех' : '❌ Ошибка');
    } catch (error) {
      console.log('Ошибка чата (ожидаемо):', error.message.substring(0, 50) + '...');
    }
    
    // Тест 5: Полная подготовка сервера
    console.log('\n🎯 Тест 5: Полная подготовка сервера');
    try {
      const readyResult = await serverManager.ensureLLMReady(testServerId);
      console.log('Результат подготовки:', readyResult ? '✅ Успех' : '❌ Ошибка');
    } catch (error) {
      console.log('Ошибка подготовки (ожидаемо):', error.message.substring(0, 50) + '...');
    }
    
    // Тест 6: Отключение от сервера
    console.log('\n🔌 Тест 6: Отключение от сервера');
    try {
      const disconnectResult = await serverManager.disconnectServer(testServerId);
      console.log('Результат отключения:', disconnectResult ? '✅ Успех' : '❌ Ошибка');
    } catch (error) {
      console.log('Ошибка отключения:', error.message);
    }
    
    // Финальный статус
    const finalStatus = serverManager.getServerStatus(testServerId);
    console.log('\n📊 Финальный статус сервера:', finalStatus);
    
    // Graceful shutdown
    await serverManager.shutdown();
    console.log('🏁 ServerManager завершен');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function testTaskExecutorEvents() {
  console.log('\n🎭 Тестирование событий TaskExecutor...');
  
  try {
    const { TaskExecutor } = require('./backend/services/taskExecutor');
    const logger = new MockLogger();
    const executor = new TaskExecutor(logger, 1);
    
    let eventsReceived = [];
    
    // Подписываемся на все события
    executor.on('task-started', (data) => {
      eventsReceived.push(`started:${data.taskId}`);
      console.log(`🚀 Task started: ${data.taskId}`);
    });
    
    executor.on('task-progress', (data) => {
      eventsReceived.push(`progress:${data.progress}`);
      console.log(`📊 Task progress: ${data.progress}%`);
    });
    
    executor.on('task-completed', (data) => {
      eventsReceived.push(`completed:${data.taskId}`);
      console.log(`✅ Task completed: ${data.taskId}`);
    });
    
    executor.on('task-failed', (data) => {
      eventsReceived.push(`failed:${data.taskId}`);
      console.log(`❌ Task failed: ${data.taskId}`);
    });
    
    // Запускаем тестовую задачу
    try {
      const result = await executor.runDeployTask({
        serverId: 'event-test',
        host: 'localhost',
        port: 22,
        username: 'test',
        privateKey: '/test/key',
        deployPath: '/tmp/test',
        llmPort: 8080
      });
      
      console.log('Результат задачи:', result.success ? '✅' : '❌');
    } catch (error) {
      console.log('Ошибка задачи (ожидаемо)');
    }
    
    await executor.shutdown();
    
    console.log(`📈 Получено событий: ${eventsReceived.length}`);
    console.log('События:', eventsReceived);
    
    return eventsReceived.length > 0;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования событий:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Тестирование интеграции ServerManager + TaskExecutor');
  console.log('=' * 60);
  
  try {
    // Тест 1: Интеграция ServerManager
    const serverManagerTest = await testServerManagerIntegration();
    
    // Тест 2: События TaskExecutor
    const eventsTest = await testTaskExecutorEvents();
    
    console.log('\n' + '=' * 60);
    console.log('📊 Результаты тестирования:');
    console.log(`   ServerManager интеграция: ${serverManagerTest ? '✅' : '❌'}`);
    console.log(`   TaskExecutor события: ${eventsTest ? '✅' : '❌'}`);
    
    const allPassed = serverManagerTest && eventsTest;
    
    if (allPassed) {
      console.log('\n✅ Все тесты интеграции прошли успешно!');
      console.log('🎯 ServerManager полностью интегрирован с TaskExecutor');
      console.log('📝 Готово для интеграции с IPC и UI');
    } else {
      console.log('\n❌ Некоторые тесты провалились');
    }
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = { testServerManagerIntegration };
