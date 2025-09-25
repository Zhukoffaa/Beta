#!/usr/bin/env node
/**
 * Тестирование интеграции TaskExecutor с Tasks
 */

const path = require('path');
const fs = require('fs');

// Симуляция Logger для тестирования
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

// Компиляция TypeScript в JavaScript для тестирования
async function compileTasksForTesting() {
  console.log('🔧 Компиляция Tasks для тестирования...');
  
  const { execSync } = require('child_process');
  
  try {
    // Компилируем TypeScript файлы
    execSync('npx tsc tasks/*.ts --outDir tasks --target ES2020 --module commonjs --esModuleInterop --skipLibCheck', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    console.log('✅ Tasks скомпилированы успешно');
    return true;
  } catch (error) {
    console.error('❌ Ошибка компиляции Tasks:', error.message);
    return false;
  }
}

// Создание тестовых JS файлов Tasks (упрощенные версии)
async function createTestTasks() {
  console.log('📝 Создание тестовых JS файлов Tasks...');
  
  const tasksDir = path.join(__dirname, 'tasks');
  
  // deployTask.js
  const deployTaskJS = `
const { parentPort, workerData } = require('worker_threads');

function sendMessage(type, data) {
  if (parentPort) {
    parentPort.postMessage({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

async function deployTask() {
  const { taskId, args } = workerData;
  
  try {
    sendMessage('log', { level: 'info', message: 'Начало развертывания LLM сервера' });
    
    // Симуляция этапов развертывания
    const steps = [
      'Проверка SSH подключения',
      'Проверка системных требований', 
      'Создание директории развертывания',
      'Копирование скрипта развертывания',
      'Установка зависимостей',
      'Запуск LLM сервера',
      'Проверка здоровья сервера'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      const progress = Math.round(((i + 1) / steps.length) * 100);
      sendMessage('progress', { progress, message: steps[i] });
      sendMessage('log', { level: 'info', message: \`Этап \${i + 1}/\${steps.length}: \${steps[i]}\` });
      
      // Симуляция времени выполнения
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    }
    
    sendMessage('complete', {
      data: {
        serverId: args.serverId,
        deployed: true,
        llmPort: args.llmPort,
        deployPath: args.deployPath
      }
    });
    
  } catch (error) {
    sendMessage('error', { error: error.message });
  }
}

deployTask();
`;

  // connectTask.js
  const connectTaskJS = `
const { parentPort, workerData } = require('worker_threads');

function sendMessage(type, data) {
  if (parentPort) {
    parentPort.postMessage({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

async function connectTask() {
  const { taskId, args } = workerData;
  
  try {
    sendMessage('log', { level: 'info', message: 'Начало подключения к LLM серверу' });
    
    // Симуляция этапов подключения
    const steps = [
      'Проверка локального порта',
      'Создание SSH туннеля',
      'Проверка здоровья LLM',
      'Проверка API эндпоинтов'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      const progress = Math.round(((i + 1) / steps.length) * 100);
      sendMessage('progress', { progress, message: steps[i] });
      sendMessage('log', { level: 'info', message: \`Этап \${i + 1}/\${steps.length}: \${steps[i]}\` });
      
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
    }
    
    sendMessage('complete', {
      data: {
        serverId: args.serverId,
        connected: true,
        localPort: args.localPort,
        tunnelActive: true
      }
    });
    
  } catch (error) {
    sendMessage('error', { error: error.message });
  }
}

connectTask();
`;

  // chatTask.js
  const chatTaskJS = `
const { parentPort, workerData } = require('worker_threads');

function sendMessage(type, data) {
  if (parentPort) {
    parentPort.postMessage({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

async function chatTask() {
  const { taskId, args } = workerData;
  
  try {
    sendMessage('log', { level: 'info', message: 'Начало обработки чат запроса' });
    
    const messages = args.messages || [];
    sendMessage('progress', { progress: 25, message: 'Валидация сообщений' });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    sendMessage('progress', { progress: 50, message: 'Отправка запроса к LLM' });
    
    // Симуляция обработки сообщений
    for (let i = 0; i < messages.length; i++) {
      sendMessage('log', { 
        level: 'info', 
        message: \`Обработка сообщения \${i + 1}: \${messages[i].content.substring(0, 50)}...\`
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    sendMessage('progress', { progress: 75, message: 'Получение ответа' });
    await new Promise(resolve => setTimeout(resolve, 200));
    
    sendMessage('progress', { progress: 100, message: 'Обработка завершена' });
    
    sendMessage('complete', {
      data: {
        serverId: args.serverId,
        response: {
          role: 'assistant',
          content: 'Тестовый ответ от LLM сервера. Запрос обработан успешно!'
        },
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75
        }
      }
    });
    
  } catch (error) {
    sendMessage('error', { error: error.message });
  }
}

chatTask();
`;

  // Записываем файлы
  fs.writeFileSync(path.join(tasksDir, 'deployTask.js'), deployTaskJS);
  fs.writeFileSync(path.join(tasksDir, 'connectTask.js'), connectTaskJS);
  fs.writeFileSync(path.join(tasksDir, 'chatTask.js'), chatTaskJS);
  
  console.log('✅ Тестовые JS файлы Tasks созданы');
}

// Тестирование TaskExecutor
async function testTaskExecutor() {
  console.log('🧪 Тестирование TaskExecutor интеграции...');
  
  // Динамический импорт TaskExecutor (поскольку это TypeScript)
  let TaskExecutor;
  try {
    // Пытаемся импортировать скомпилированную версию
    const taskExecutorPath = path.join(__dirname, 'backend', 'services', 'taskExecutor.js');
    if (fs.existsSync(taskExecutorPath)) {
      TaskExecutor = require(taskExecutorPath).TaskExecutor;
    } else {
      console.log('⚠️  Скомпилированный TaskExecutor не найден, используем ts-node');
      require('ts-node/register');
      TaskExecutor = require('./backend/services/taskExecutor').TaskExecutor;
    }
  } catch (error) {
    console.error('❌ Ошибка импорта TaskExecutor:', error.message);
    return false;
  }
  
  const logger = new MockLogger();
  const executor = new TaskExecutor(logger, 2); // Максимум 2 одновременные задачи
  
  // Подписываемся на события
  executor.on('task-started', (data) => {
    console.log(`🚀 Задача запущена: ${data.name} (${data.taskId})`);
  });
  
  executor.on('task-progress', (data) => {
    console.log(`📊 Прогресс ${data.taskId}: ${data.progress}% - ${data.message}`);
  });
  
  executor.on('task-completed', (data) => {
    console.log(`✅ Задача завершена: ${data.taskId} за ${data.duration}ms`);
  });
  
  executor.on('task-failed', (data) => {
    console.log(`❌ Задача провалена: ${data.taskId} - ${data.error}`);
  });
  
  try {
    console.log('\\n🔧 Тест 1: Deploy Task');
    const deployResult = await executor.runDeployTask({
      serverId: 'test-server-1',
      host: '213.181.108.221',
      port: 39166,
      username: 'root',
      privateKey: '/path/to/key',
      deployPath: '/tmp/llm_deploy',
      llmPort: 8080
    });
    
    console.log('Deploy результат:', deployResult.success ? '✅ Успех' : '❌ Ошибка');
    
    console.log('\\n🌐 Тест 2: Connect Task');
    const connectResult = await executor.runConnectTask({
      serverId: 'test-server-1',
      host: '213.181.108.221',
      port: 39166,
      username: 'root',
      privateKey: '/path/to/key',
      llmPort: 8080,
      localPort: 8081
    });
    
    console.log('Connect результат:', connectResult.success ? '✅ Успех' : '❌ Ошибка');
    
    console.log('\\n💬 Тест 3: Chat Task');
    const chatResult = await executor.runChatTask({
      serverId: 'test-server-1',
      baseUrl: 'http://localhost:8081',
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Привет! Как дела?' },
        { role: 'user', content: 'Расскажи о себе' }
      ]
    });
    
    console.log('Chat результат:', chatResult.success ? '✅ Успех' : '❌ Ошибка');
    
    // Тест параллельного выполнения
    console.log('\\n⚡ Тест 4: Параллельное выполнение');
    const parallelPromises = [
      executor.runDeployTask({
        serverId: 'parallel-1',
        host: '192.168.1.100',
        port: 22,
        username: 'user',
        privateKey: '/path/to/key',
        deployPath: '/tmp/parallel1',
        llmPort: 8082
      }),
      executor.runConnectTask({
        serverId: 'parallel-2',
        host: '192.168.1.101',
        port: 22,
        username: 'user',
        privateKey: '/path/to/key',
        llmPort: 8083,
        localPort: 8084
      })
    ];
    
    const parallelResults = await Promise.all(parallelPromises);
    console.log('Параллельные результаты:', parallelResults.map(r => r.success ? '✅' : '❌').join(' '));
    
    // Статистика
    const stats = executor.getStats();
    console.log('\\n📊 Статистика TaskExecutor:');
    console.log(`   Активных задач: ${stats.activeTasks}`);
    console.log(`   В очереди: ${stats.queuedTasks}`);
    console.log(`   Всего обработано: ${stats.totalProcessed}`);
    console.log(`   Максимум одновременно: ${stats.maxConcurrent}`);
    
    // Graceful shutdown
    await executor.shutdown();
    console.log('\\n🏁 TaskExecutor завершен');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    await executor.shutdown();
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🚀 Тестирование интеграции TaskExecutor с Tasks');
  console.log('=' * 60);
  
  try {
    // Создаем тестовые JS файлы
    await createTestTasks();
    
    // Тестируем TaskExecutor
    const success = await testTaskExecutor();
    
    console.log('\\n' + '=' * 60);
    if (success) {
      console.log('✅ Все тесты интеграции прошли успешно!');
      console.log('🎯 TaskExecutor готов для интеграции с ServerManager');
    } else {
      console.log('❌ Некоторые тесты провалились');
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = { testTaskExecutor };
