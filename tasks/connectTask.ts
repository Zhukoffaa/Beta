/**
 * Connect Task - Worker для подключения к LLM серверу
 * Создает SSH туннель и проверяет доступность LLM API
 */

import { parentPort } from 'worker_threads';
import { Client as SSHClient } from 'ssh2';
import * as net from 'net';
import * as fs from 'fs';
import axios from 'axios';

// Интерфейсы для типизации
interface ConnectConfig {
  serverId: string;
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  llmPort: number;
  localPort?: number;
  healthCheckUrl?: string;
}

interface TaskMessage {
  type: 'progress' | 'log' | 'complete' | 'error';
  data: any;
  timestamp: string;
}

interface ConnectResult {
  success: boolean;
  serverId: string;
  localPort: number;
  remotePort: number;
  tunnelActive: boolean;
  llmHealthy: boolean;
  logs: string[];
  error?: string;
}

// Глобальные переменные
let sshClient: SSHClient | null = null;
let connectConfig: ConnectConfig;
let connectLogs: string[] = [];
let tunnelActive = false;
let healthCheckInterval: NodeJS.Timeout | null = null;

/**
 * Отправка сообщения в главный поток
 */
function sendMessage(type: TaskMessage['type'], data: any) {
  const message: TaskMessage = {
    type,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (parentPort) {
    parentPort.postMessage(message);
  }
  
  // Также сохраняем в локальные логи
  if (type === 'log') {
    connectLogs.push(`[${message.timestamp}] ${data.message || data}`);
  }
}

/**
 * Логирование с отправкой в UI
 */
function log(level: 'info' | 'warn' | 'error', message: string) {
  sendMessage('log', {
    level,
    message,
    source: 'connectTask'
  });
}

/**
 * Отправка прогресса выполнения
 */
function sendProgress(step: string, progress: number, total: number) {
  sendMessage('progress', {
    step,
    progress,
    total,
    percentage: Math.round((progress / total) * 100)
  });
}

/**
 * Проверка доступности локального порта
 */
async function checkLocalPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        log('info', `Локальный порт ${port} свободен`);
        resolve(true);
      });
    });
    
    server.on('error', () => {
      log('warn', `Локальный порт ${port} занят`);
      resolve(false);
    });
  });
}

/**
 * Поиск свободного локального порта
 */
async function findFreeLocalPort(startPort: number = 8080): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await checkLocalPort(port)) {
      return port;
    }
  }
  throw new Error('Не удалось найти свободный локальный порт');
}

/**
 * Установка SSH подключения
 */
async function establishSSHConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    log('info', `Подключение к серверу ${connectConfig.host}:${connectConfig.port}...`);
    
    sshClient = new SSHClient();
    
    sshClient.on('ready', () => {
      log('info', 'SSH подключение установлено');
      resolve();
    });
    
    sshClient.on('error', (err) => {
      log('error', `Ошибка SSH подключения: ${err.message}`);
      reject(err);
    });
    
    sshClient.on('close', () => {
      log('warn', 'SSH подключение закрыто');
      tunnelActive = false;
    });
    
    // Настройка подключения
    const connectOptions: any = {
      host: connectConfig.host,
      port: connectConfig.port,
      username: connectConfig.username,
      readyTimeout: 30000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3
    };
    
    // Аутентификация по ключу или паролю
    if (connectConfig.privateKey) {
      if (fs.existsSync(connectConfig.privateKey)) {
        connectOptions.privateKey = fs.readFileSync(connectConfig.privateKey);
        log('info', 'Используется аутентификация по SSH ключу');
      } else {
        reject(new Error(`SSH ключ не найден: ${connectConfig.privateKey}`));
        return;
      }
    } else if (connectConfig.password) {
      connectOptions.password = connectConfig.password;
      log('info', 'Используется аутентификация по паролю');
    } else {
      reject(new Error('Не указан метод аутентификации (ключ или пароль)'));
      return;
    }
    
    sshClient.connect(connectOptions);
  });
}

/**
 * Создание SSH туннеля
 */
async function createSSHTunnel(localPort: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sshClient) {
      reject(new Error('SSH клиент не подключен'));
      return;
    }
    
    log('info', `Создание SSH туннеля: localhost:${localPort} -> ${connectConfig.host}:${connectConfig.llmPort}`);
    
    // Создаем локальный сервер для туннеля
    const server = net.createServer((clientSocket) => {
      log('info', 'Новое подключение к туннелю');
      
      sshClient!.forwardOut(
        '127.0.0.1',
        localPort,
        '127.0.0.1',
        connectConfig.llmPort,
        (err, serverSocket) => {
          if (err) {
            log('error', `Ошибка создания туннеля: ${err.message}`);
            clientSocket.end();
            return;
          }
          
          // Проксируем данные между клиентом и сервером
          clientSocket.pipe(serverSocket);
          serverSocket.pipe(clientSocket);
          
          clientSocket.on('close', () => {
            log('info', 'Подключение к туннелю закрыто');
          });
          
          serverSocket.on('close', () => {
            clientSocket.end();
          });
        }
      );
    });
    
    server.listen(localPort, '127.0.0.1', () => {
      log('info', `SSH туннель активен на порту ${localPort}`);
      tunnelActive = true;
      resolve();
    });
    
    server.on('error', (err) => {
      log('error', `Ошибка сервера туннеля: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Проверка здоровья LLM сервера
 */
async function checkLLMHealth(localPort: number): Promise<boolean> {
  const healthUrl = connectConfig.healthCheckUrl || `http://localhost:${localPort}/health`;
  
  try {
    log('info', `Проверка здоровья LLM: ${healthUrl}`);
    
    const response = await axios.get(healthUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Windows-LLM-Agent/1.0'
      }
    });
    
    if (response.status === 200) {
      log('info', 'LLM сервер здоров и готов к работе');
      log('info', `Ответ сервера: ${JSON.stringify(response.data)}`);
      return true;
    } else {
      log('warn', `LLM сервер вернул статус ${response.status}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    log('warn', `Ошибка проверки здоровья LLM: ${errorMessage}`);
    return false;
  }
}

/**
 * Проверка доступности API эндпоинтов
 */
async function checkLLMEndpoints(localPort: number): Promise<void> {
  const baseUrl = `http://localhost:${localPort}`;
  
  // Список эндпоинтов для проверки
  const endpoints = [
    '/health',
    '/v1/models',
    '/v1/chat/completions'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      log('info', `Проверка эндпоинта: ${endpoint}`);
      
      if (endpoint === '/v1/chat/completions') {
        // Для chat/completions делаем POST запрос
        await axios.post(url, {
          model: 'test',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Принимаем любой статус кроме 5xx
        });
      } else {
        // Для остальных делаем GET запрос
        await axios.get(url, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
      }
      
      log('info', `Эндпоинт ${endpoint} доступен`);
    } catch (error) {
      log('warn', `Эндпоинт ${endpoint} недоступен или вернул ошибку`);
    }
  }
}

/**
 * Запуск периодической проверки здоровья
 */
function startHealthMonitoring(localPort: number) {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  healthCheckInterval = setInterval(async () => {
    if (tunnelActive) {
      const isHealthy = await checkLLMHealth(localPort);
      
      sendMessage('progress', {
        step: 'Мониторинг здоровья LLM',
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      });
      
      if (!isHealthy) {
        log('warn', 'LLM сервер недоступен, проверьте подключение');
      }
    }
  }, 30000); // Проверяем каждые 30 секунд
  
  log('info', 'Запущен мониторинг здоровья LLM сервера');
}

/**
 * Очистка ресурсов
 */
function cleanup() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  
  if (sshClient) {
    sshClient.end();
    sshClient = null;
  }
  
  tunnelActive = false;
  log('info', 'Ресурсы подключения очищены');
}

/**
 * Главная функция подключения
 */
async function connectToLLMServer(): Promise<ConnectResult> {
  const totalSteps = 6;
  let currentStep = 0;
  let localPort = connectConfig.localPort || 8080;
  
  try {
    // Шаг 1: Поиск свободного локального порта
    sendProgress('Поиск свободного порта', ++currentStep, totalSteps);
    if (!connectConfig.localPort) {
      localPort = await findFreeLocalPort(8080);
    } else {
      const isPortFree = await checkLocalPort(connectConfig.localPort);
      if (!isPortFree) {
        localPort = await findFreeLocalPort(connectConfig.localPort + 1);
        log('warn', `Указанный порт ${connectConfig.localPort} занят, используется ${localPort}`);
      }
    }
    
    // Шаг 2: Установка SSH подключения
    sendProgress('Установка SSH подключения', ++currentStep, totalSteps);
    await establishSSHConnection();
    
    // Шаг 3: Создание SSH туннеля
    sendProgress('Создание SSH туннеля', ++currentStep, totalSteps);
    await createSSHTunnel(localPort);
    
    // Шаг 4: Проверка здоровья LLM
    sendProgress('Проверка здоровья LLM', ++currentStep, totalSteps);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды для стабилизации туннеля
    const isHealthy = await checkLLMHealth(localPort);
    
    // Шаг 5: Проверка API эндпоинтов
    sendProgress('Проверка API эндпоинтов', ++currentStep, totalSteps);
    if (isHealthy) {
      await checkLLMEndpoints(localPort);
    }
    
    // Шаг 6: Запуск мониторинга
    sendProgress('Запуск мониторинга', ++currentStep, totalSteps);
    startHealthMonitoring(localPort);
    
    const result: ConnectResult = {
      success: true,
      serverId: connectConfig.serverId,
      localPort,
      remotePort: connectConfig.llmPort,
      tunnelActive,
      llmHealthy: isHealthy,
      logs: connectLogs
    };
    
    log('info', `Подключение к LLM серверу завершено успешно! Локальный порт: ${localPort}`);
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    log('error', `Ошибка подключения: ${errorMessage}`);
    
    cleanup();
    
    return {
      success: false,
      serverId: connectConfig.serverId,
      localPort,
      remotePort: connectConfig.llmPort,
      tunnelActive: false,
      llmHealthy: false,
      logs: connectLogs,
      error: errorMessage
    };
  }
}

/**
 * Отключение от LLM сервера
 */
async function disconnectFromLLMServer(): Promise<void> {
  log('info', 'Отключение от LLM сервера...');
  cleanup();
  
  sendMessage('complete', {
    disconnected: true,
    serverId: connectConfig.serverId
  });
}

// Обработка сообщений от главного потока
if (parentPort) {
  parentPort.on('message', async (message) => {
    if (message.type === 'connect' && message.config) {
      connectConfig = message.config;
      
      log('info', `Начало подключения к LLM серверу на ${connectConfig.host}:${connectConfig.llmPort}`);
      
      try {
        const result = await connectToLLMServer();
        sendMessage('complete', result);
      } catch (error) {
        sendMessage('error', {
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
          serverId: connectConfig.serverId
        });
      }
    } else if (message.type === 'disconnect') {
      await disconnectFromLLMServer();
    } else if (message.type === 'healthCheck') {
      if (tunnelActive && connectConfig) {
        const localPort = message.localPort || 8080;
        const isHealthy = await checkLLMHealth(localPort);
        
        sendMessage('progress', {
          step: 'Проверка здоровья',
          healthy: isHealthy,
          serverId: connectConfig.serverId
        });
      }
    }
  });
}

// Обработка завершения процесса
process.on('SIGTERM', () => {
  log('info', 'Получен сигнал завершения, отключение...');
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'Получен сигнал прерывания, отключение...');
  cleanup();
  process.exit(0);
});

// Экспорт для тестирования
export { connectToLLMServer, ConnectConfig, ConnectResult };
