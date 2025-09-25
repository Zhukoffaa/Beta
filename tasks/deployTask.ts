/**
 * Deploy Task - Worker для развертывания LLM сервера
 * Выполняется в отдельном потоке для предотвращения блокировки UI
 */

import { parentPort, workerData } from 'worker_threads';
import { Client as SSHClient } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

// Интерфейсы для типизации
interface DeployConfig {
  serverId: string;
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  deployPath: string;
  llmPort: number;
  pythonPath?: string;
}

interface TaskMessage {
  type: 'progress' | 'log' | 'complete' | 'error';
  data: any;
  timestamp: string;
}

interface DeployResult {
  success: boolean;
  serverId: string;
  deployPath: string;
  llmPort: number;
  logs: string[];
  error?: string;
}

// Глобальные переменные
let sshClient: SSHClient | null = null;
let deployConfig: DeployConfig;
let deployLogs: string[] = [];

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
    deployLogs.push(`[${message.timestamp}] ${data.message || data}`);
  }
}

/**
 * Логирование с отправкой в UI
 */
function log(level: 'info' | 'warn' | 'error', message: string) {
  sendMessage('log', {
    level,
    message,
    source: 'deployTask'
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
 * Проверка SSH подключения
 */
async function checkSSHConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    log('info', `Подключение к серверу ${deployConfig.host}:${deployConfig.port}...`);
    
    sshClient = new SSHClient();
    
    sshClient.on('ready', () => {
      log('info', 'SSH подключение установлено');
      resolve();
    });
    
    sshClient.on('error', (err) => {
      log('error', `Ошибка SSH подключения: ${err.message}`);
      reject(err);
    });
    
    // Настройка подключения
    const connectConfig: any = {
      host: deployConfig.host,
      port: deployConfig.port,
      username: deployConfig.username,
      readyTimeout: 30000,
      keepaliveInterval: 10000
    };
    
    // Аутентификация по ключу или паролю
    if (deployConfig.privateKey) {
      if (fs.existsSync(deployConfig.privateKey)) {
        connectConfig.privateKey = fs.readFileSync(deployConfig.privateKey);
        log('info', 'Используется аутентификация по SSH ключу');
      } else {
        reject(new Error(`SSH ключ не найден: ${deployConfig.privateKey}`));
        return;
      }
    } else if (deployConfig.password) {
      connectConfig.password = deployConfig.password;
      log('info', 'Используется аутентификация по паролю');
    } else {
      reject(new Error('Не указан метод аутентификации (ключ или пароль)'));
      return;
    }
    
    sshClient.connect(connectConfig);
  });
}

/**
 * Выполнение команды на удаленном сервере
 */
async function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!sshClient) {
      reject(new Error('SSH клиент не подключен'));
      return;
    }
    
    log('info', `Выполнение команды: ${command}`);
    
    sshClient.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      
      let stdout = '';
      let stderr = '';
      
      stream.on('close', (code: number) => {
        if (code !== 0) {
          log('error', `Команда завершилась с кодом ${code}: ${stderr}`);
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        } else {
          log('info', `Команда выполнена успешно`);
          resolve(stdout);
        }
      });
      
      stream.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        log('info', `STDOUT: ${output.trim()}`);
      });
      
      stream.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        log('warn', `STDERR: ${output.trim()}`);
      });
    });
  });
}

/**
 * Копирование файла на удаленный сервер через SFTP
 */
async function copyFileToServer(localPath: string, remotePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sshClient) {
      reject(new Error('SSH клиент не подключен'));
      return;
    }
    
    log('info', `Копирование файла: ${localPath} -> ${remotePath}`);
    
    sshClient.sftp((err, sftp) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Создаем директорию если не существует
      const remoteDir = path.dirname(remotePath);
      sftp.mkdir(remoteDir, { mode: 0o755 }, (mkdirErr) => {
        // Игнорируем ошибку если директория уже существует
        
        sftp.fastPut(localPath, remotePath, (putErr) => {
          if (putErr) {
            log('error', `Ошибка копирования файла: ${putErr.message}`);
            reject(putErr);
          } else {
            log('info', `Файл успешно скопирован: ${remotePath}`);
            resolve();
          }
        });
      });
    });
  });
}

/**
 * Проверка системных требований на сервере
 */
async function checkSystemRequirements(): Promise<void> {
  log('info', 'Проверка системных требований...');
  
  // Проверка Python
  try {
    const pythonPath = deployConfig.pythonPath || 'python3';
    const pythonVersion = await executeCommand(`${pythonPath} --version`);
    log('info', `Python версия: ${pythonVersion.trim()}`);
  } catch (err) {
    throw new Error('Python 3 не найден на сервере');
  }
  
  // Проверка pip
  try {
    await executeCommand('pip3 --version');
    log('info', 'pip3 доступен');
  } catch (err) {
    log('warn', 'pip3 не найден, попытка установки...');
    await executeCommand('sudo apt-get update && sudo apt-get install -y python3-pip');
  }
  
  // Проверка свободного места (минимум 2GB)
  try {
    const diskSpace = await executeCommand(`df -h ${deployConfig.deployPath} | tail -1 | awk '{print $4}'`);
    log('info', `Свободное место: ${diskSpace.trim()}`);
  } catch (err) {
    log('warn', 'Не удалось проверить свободное место');
  }
  
  // Проверка доступности порта
  try {
    const portCheck = await executeCommand(`netstat -tuln | grep :${deployConfig.llmPort}`);
    if (portCheck.trim()) {
      log('warn', `Порт ${deployConfig.llmPort} уже используется`);
    } else {
      log('info', `Порт ${deployConfig.llmPort} свободен`);
    }
  } catch (err) {
    log('info', `Порт ${deployConfig.llmPort} свободен`);
  }
}

/**
 * Создание директории развертывания
 */
async function createDeployDirectory(): Promise<void> {
  log('info', `Создание директории развертывания: ${deployConfig.deployPath}`);
  
  try {
    await executeCommand(`mkdir -p ${deployConfig.deployPath}`);
    await executeCommand(`chmod 755 ${deployConfig.deployPath}`);
    log('info', 'Директория развертывания создана');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    throw new Error(`Не удалось создать директорию: ${errorMessage}`);
  }
}

/**
 * Копирование скрипта развертывания
 */
async function copyDeployScript(): Promise<void> {
  const localScriptPath = path.join(process.cwd(), 'tools', 'deploy_llm_server.py');
  const remoteScriptPath = path.join(deployConfig.deployPath, 'deploy_llm_server.py');
  
  if (!fs.existsSync(localScriptPath)) {
    throw new Error(`Скрипт развертывания не найден: ${localScriptPath}`);
  }
  
  await copyFileToServer(localScriptPath, remoteScriptPath);
  
  // Делаем скрипт исполняемым
  await executeCommand(`chmod +x ${remoteScriptPath}`);
}

/**
 * Запуск скрипта развертывания LLM
 */
async function runDeployScript(): Promise<void> {
  const scriptPath = path.join(deployConfig.deployPath, 'deploy_llm_server.py');
  const pythonPath = deployConfig.pythonPath || 'python3';
  
  log('info', 'Запуск скрипта развертывания LLM сервера...');
  
  // Команда запуска с параметрами
  const command = `cd ${deployConfig.deployPath} && ${pythonPath} deploy_llm_server.py --port ${deployConfig.llmPort} --host 0.0.0.0`;
  
  try {
    const output = await executeCommand(command);
    log('info', 'Скрипт развертывания выполнен успешно');
    log('info', `Вывод скрипта: ${output}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    throw new Error(`Ошибка выполнения скрипта развертывания: ${errorMessage}`);
  }
}

/**
 * Проверка успешности развертывания
 */
async function verifyDeployment(): Promise<void> {
  log('info', 'Проверка успешности развертывания...');
  
  // Проверяем, что процесс LLM запущен
  try {
    const processes = await executeCommand(`ps aux | grep -v grep | grep ${deployConfig.llmPort}`);
    if (processes.trim()) {
      log('info', 'LLM сервер успешно запущен');
    } else {
      throw new Error('LLM сервер не запущен');
    }
  } catch (err) {
    log('warn', 'Не удалось проверить статус процесса LLM');
  }
  
  // Проверяем доступность порта
  try {
    const portCheck = await executeCommand(`netstat -tuln | grep :${deployConfig.llmPort}`);
    if (portCheck.trim()) {
      log('info', `LLM сервер слушает порт ${deployConfig.llmPort}`);
    } else {
      throw new Error(`Порт ${deployConfig.llmPort} не прослушивается`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    throw new Error(`Ошибка проверки порта: ${errorMessage}`);
  }
}

/**
 * Очистка ресурсов
 */
function cleanup() {
  if (sshClient) {
    sshClient.end();
    sshClient = null;
  }
}

/**
 * Главная функция развертывания
 */
async function deployLLMServer(): Promise<DeployResult> {
  const totalSteps = 7;
  let currentStep = 0;
  
  try {
    // Шаг 1: Подключение к серверу
    sendProgress('Подключение к серверу', ++currentStep, totalSteps);
    await checkSSHConnection();
    
    // Шаг 2: Проверка системных требований
    sendProgress('Проверка системных требований', ++currentStep, totalSteps);
    await checkSystemRequirements();
    
    // Шаг 3: Создание директории
    sendProgress('Создание директории развертывания', ++currentStep, totalSteps);
    await createDeployDirectory();
    
    // Шаг 4: Копирование скрипта
    sendProgress('Копирование скрипта развертывания', ++currentStep, totalSteps);
    await copyDeployScript();
    
    // Шаг 5: Запуск развертывания
    sendProgress('Запуск развертывания LLM', ++currentStep, totalSteps);
    await runDeployScript();
    
    // Шаг 6: Проверка развертывания
    sendProgress('Проверка развертывания', ++currentStep, totalSteps);
    await verifyDeployment();
    
    // Шаг 7: Завершение
    sendProgress('Развертывание завершено', ++currentStep, totalSteps);
    
    const result: DeployResult = {
      success: true,
      serverId: deployConfig.serverId,
      deployPath: deployConfig.deployPath,
      llmPort: deployConfig.llmPort,
      logs: deployLogs
    };
    
    log('info', 'Развертывание LLM сервера завершено успешно!');
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    log('error', `Ошибка развертывания: ${errorMessage}`);
    
    return {
      success: false,
      serverId: deployConfig.serverId,
      deployPath: deployConfig.deployPath,
      llmPort: deployConfig.llmPort,
      logs: deployLogs,
      error: errorMessage
    };
  } finally {
    cleanup();
  }
}

// Обработка сообщений от главного потока
if (parentPort) {
  parentPort.on('message', async (message) => {
    if (message.type === 'start' && message.config) {
      deployConfig = message.config;
      
      log('info', `Начало развертывания LLM сервера на ${deployConfig.host}`);
      
      try {
        const result = await deployLLMServer();
        sendMessage('complete', result);
      } catch (error) {
        sendMessage('error', {
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
          serverId: deployConfig.serverId
        });
      }
    }
  });
}

// Обработка завершения процесса
process.on('SIGTERM', () => {
  log('info', 'Получен сигнал завершения, очистка ресурсов...');
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'Получен сигнал прерывания, очистка ресурсов...');
  cleanup();
  process.exit(0);
});

// Экспорт для тестирования
export { deployLLMServer, DeployConfig, DeployResult };
