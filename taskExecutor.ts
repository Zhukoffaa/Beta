import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';

// Импортируем интерфейсы из Tasks
export interface DeployTaskConfig {
  serverId: string;
  host: string;
  port: number;
  username: string;
  privateKey: string;
  deployPath: string;
  llmPort: number;
}

export interface ConnectTaskConfig {
  serverId: string;
  host: string;
  port: number;
  username: string;
  privateKey: string;
  llmPort: number;
  localPort: number;
}

export interface ChatTaskConfig {
  serverId: string;
  baseUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  messages: Array<{ role: string; content: string }>;
}

export interface TaskConfig {
  name: 'deployTask' | 'connectTask' | 'chatTask';
  args: DeployTaskConfig | ConnectTaskConfig | ChatTaskConfig;
  timeout?: number;
  retries?: number;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  taskId: string;
}

export interface TaskProgress {
  taskId: string;
  progress: number;
  message?: string;
  data?: any;
}

export interface TaskStatus {
  taskId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  progress: number;
  error?: string;
}

interface ActiveTask {
  id: string;
  name: string;
  worker: Worker;
  config: TaskConfig;
  startTime: Date;
  timeout?: NodeJS.Timeout;
  resolve: (result: TaskResult) => void;
  reject: (error: Error) => void;
}

export class TaskExecutor extends EventEmitter {
  private logger: Logger;
  private activeTasks: Map<string, ActiveTask> = new Map();
  private taskCounter: number = 0;
  private maxConcurrentTasks: number;
  private taskQueue: Array<() => void> = [];

  constructor(logger: Logger, maxConcurrentTasks: number = 4) {
    super();
    this.logger = logger;
    this.maxConcurrentTasks = maxConcurrentTasks;
  }

  /**
   * Запуск задачи в worker потоке
   */
  async runTask(config: TaskConfig): Promise<TaskResult> {
    const taskId = this.generateTaskId();
    this.logger.info(`Запуск задачи: ${config.name} (ID: ${taskId})`);

    return new Promise((resolve, reject) => {
      const taskRunner = async () => {
        await this.executeTask(taskId, config, resolve, reject);
      };

      // Проверяем лимит одновременных задач
      if (this.activeTasks.size >= this.maxConcurrentTasks) {
        this.logger.info(`Задача ${taskId} добавлена в очередь (активных: ${this.activeTasks.size})`);
        this.taskQueue.push(taskRunner);
        this.emit('task-queued', { taskId, name: config.name });
      } else {
        taskRunner().catch(reject);
      }
    });
  }

  /**
   * Удобные методы для запуска конкретных задач
   */
  async runDeployTask(config: DeployTaskConfig): Promise<TaskResult> {
    return this.runTask({
      name: 'deployTask',
      args: config,
      timeout: 300000 // 5 минут для развертывания
    });
  }

  async runConnectTask(config: ConnectTaskConfig): Promise<TaskResult> {
    return this.runTask({
      name: 'connectTask',
      args: config,
      timeout: 60000 // 1 минута для подключения
    });
  }

  async runChatTask(config: ChatTaskConfig): Promise<TaskResult> {
    return this.runTask({
      name: 'chatTask',
      args: config,
      timeout: config.timeout || 30000 // 30 секунд для чата
    });
  }

  /**
   * Получение пути к скрипту задачи
   */
  private getTaskScriptPath(taskName: string): string {
    const tasksDir = path.resolve(__dirname, '../../tasks');
    return path.join(tasksDir, `${taskName}.js`); // Используем .js файлы (скомпилированные)
  }

  /**
   * Компиляция TypeScript задачи в JavaScript (если необходимо)
   */
  private async ensureTaskCompiled(taskName: string): Promise<string> {
    const tsPath = path.resolve(__dirname, '../../tasks', `${taskName}.ts`);
    const jsPath = path.resolve(__dirname, '../../tasks', `${taskName}.js`);
    
    // Проверяем существование TS файла
    if (!fs.existsSync(tsPath)) {
      throw new Error(`Task файл не найден: ${tsPath}`);
    }

    // Для простоты пока используем существующие JS файлы или компилируем через tsc
    // В production версии здесь будет динамическая компиляция
    if (!fs.existsSync(jsPath)) {
      this.logger.warn(`JS файл не найден для ${taskName}, используем TS напрямую`);
      return tsPath; // Временно возвращаем TS файл
    }

    return jsPath;
  }

  /**
   * Выполнение задачи
   */
  private async executeTask(
    taskId: string,
    config: TaskConfig,
    resolve: (result: TaskResult) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    const startTime = new Date();
    
    try {
      // Получаем путь к скрипту задачи
      const scriptPath = await this.ensureTaskCompiled(config.name);
      
      this.logger.info(`Запуск задачи ${config.name} из файла: ${scriptPath}`);
      
      // Создаем worker
      const worker = new Worker(scriptPath, {
        workerData: {
          taskId,
          args: config.args,
          config: {
            name: config.name,
            timeout: config.timeout || 300000, // 5 минут по умолчанию
            retries: config.retries || 0
          }
        }
      });

      const activeTask: ActiveTask = {
        id: taskId,
        name: config.name,
        worker,
        config,
        startTime,
        resolve,
        reject
      };

      // Настраиваем таймаут
      if (config.timeout) {
        activeTask.timeout = setTimeout(() => {
          this.cancelTask(taskId, 'Превышен таймаут выполнения');
        }, config.timeout);
      }

      this.activeTasks.set(taskId, activeTask);

      // Обработчики событий worker'а
      worker.on('message', (message) => {
        this.handleWorkerMessage(taskId, message);
      });

      worker.on('error', (error) => {
        this.handleWorkerError(taskId, error);
      });

      worker.on('exit', (code) => {
        this.handleWorkerExit(taskId, code);
      });

      this.emit('task-started', {
        taskId,
        name: config.name,
        startTime
      });

      this.logger.info(`Задача ${taskId} запущена в worker потоке`);

    } catch (error) {
      this.logger.error(`Ошибка запуска задачи ${taskId}:`, error);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Обработка сообщений от worker'а
   */
  private handleWorkerMessage(taskId: string, message: any): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    try {
      switch (message.type) {
        case 'progress':
          this.handleTaskProgress(taskId, message);
          break;

        case 'log':
          this.handleTaskLog(taskId, message);
          break;

        case 'complete':
          this.handleTaskComplete(taskId, message);
          break;

        case 'error':
          this.handleTaskError(taskId, message);
          break;

        default:
          this.logger.warn(`Неизвестный тип сообщения от задачи ${taskId}:`, message.type);
      }
    } catch (error) {
      this.logger.error(`Ошибка обработки сообщения от задачи ${taskId}:`, error);
    }
  }

  /**
   * Обработка прогресса задачи
   */
  private handleTaskProgress(taskId: string, message: any): void {
    const progress: TaskProgress = {
      taskId,
      progress: message.progress || 0,
      message: message.message,
      data: message.data
    };

    this.emit('task-progress', progress);
    this.logger.info(`Задача ${taskId} прогресс: ${progress.progress}%`);
  }

  /**
   * Обработка логов задачи
   */
  private handleTaskLog(taskId: string, message: any): void {
    const logMessage = `[Task ${taskId}] ${message.message}`;
    
    switch (message.level) {
      case 'error':
        this.logger.error(logMessage);
        break;
      case 'warn':
        this.logger.warn(logMessage);
        break;
      case 'info':
      default:
        this.logger.info(logMessage);
        break;
    }

    this.emit('task-log', {
      taskId,
      level: message.level,
      message: message.message,
      timestamp: new Date()
    });
  }

  /**
   * Обработка завершения задачи
   */
  private handleTaskComplete(taskId: string, message: any): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    const duration = Date.now() - task.startTime.getTime();
    
    const result: TaskResult = {
      success: true,
      data: message.data,
      duration,
      taskId
    };

    this.cleanupTask(taskId);
    task.resolve(result);

    this.logger.info(`Задача ${taskId} завершена успешно (${duration}ms)`);
    this.emit('task-completed', result);
    
    this.processQueue();
  }

  /**
   * Обработка ошибки задачи
   */
  private handleTaskError(taskId: string, message: any): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    const duration = Date.now() - task.startTime.getTime();
    
    const result: TaskResult = {
      success: false,
      error: message.error || 'Неизвестная ошибка',
      duration,
      taskId
    };

    this.cleanupTask(taskId);
    task.reject(new Error(result.error));

    this.logger.error(`Задача ${taskId} завершена с ошибкой: ${result.error}`);
    this.emit('task-failed', result);
    
    this.processQueue();
  }

  /**
   * Обработка ошибки worker'а
   */
  private handleWorkerError(taskId: string, error: Error): void {
    this.logger.error(`Worker ошибка для задачи ${taskId}:`, error);
    this.handleTaskError(taskId, { error: error.message });
  }

  /**
   * Обработка завершения worker'а
   */
  private handleWorkerExit(taskId: string, code: number): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    if (code !== 0) {
      this.logger.error(`Worker для задачи ${taskId} завершился с кодом ${code}`);
      this.handleTaskError(taskId, { error: `Worker завершился с кодом ${code}` });
    }
  }

  /**
   * Отмена задачи
   */
  async cancelTask(taskId: string, reason?: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      this.logger.warn(`Попытка отмены несуществующей задачи: ${taskId}`);
      return false;
    }

    this.logger.info(`Отмена задачи ${taskId}: ${reason || 'По запросу пользователя'}`);

    try {
      // Завершаем worker
      await task.worker.terminate();
      
      const duration = Date.now() - task.startTime.getTime();
      
      const result: TaskResult = {
        success: false,
        error: reason || 'Задача отменена',
        duration,
        taskId
      };

      this.cleanupTask(taskId);
      task.reject(new Error(result.error));

      this.emit('task-cancelled', result);
      this.processQueue();
      
      return true;

    } catch (error) {
      this.logger.error(`Ошибка отмены задачи ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Получение статуса задачи
   */
  getTaskStatus(taskId: string): TaskStatus | null {
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      return null;
    }

    return {
      taskId,
      name: task.name,
      status: 'running',
      startTime: task.startTime,
      progress: 0 // Прогресс обновляется через события
    };
  }

  /**
   * Получение списка активных задач
   */
  getActiveTasks(): TaskStatus[] {
    return Array.from(this.activeTasks.values()).map(task => ({
      taskId: task.id,
      name: task.name,
      status: 'running' as const,
      startTime: task.startTime,
      progress: 0
    }));
  }

  /**
   * Отмена всех активных задач
   */
  async cancelAllTasks(reason?: string): Promise<void> {
    this.logger.info(`Отмена всех активных задач (${this.activeTasks.size})`);

    const cancelPromises = Array.from(this.activeTasks.keys()).map(
      taskId => this.cancelTask(taskId, reason)
    );

    await Promise.all(cancelPromises);
    
    // Очищаем очередь
    this.taskQueue.length = 0;
    
    this.logger.info('Все задачи отменены');
  }

  /**
   * Очистка ресурсов задачи
   */
  private cleanupTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    
    if (task) {
      if (task.timeout) {
        clearTimeout(task.timeout);
      }
      
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Обработка очереди задач
   */
  private processQueue(): void {
    if (this.taskQueue.length > 0 && this.activeTasks.size < this.maxConcurrentTasks) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        nextTask();
      }
    }
  }

  /**
   * Генерация уникального ID задачи
   */
  private generateTaskId(): string {
    return `task_${++this.taskCounter}_${Date.now()}`;
  }

  /**
   * Получение статистики
   */
  getStats(): {
    activeTasks: number;
    queuedTasks: number;
    maxConcurrent: number;
    totalProcessed: number;
  } {
    return {
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      maxConcurrent: this.maxConcurrentTasks,
      totalProcessed: this.taskCounter
    };
  }

  /**
   * Изменение лимита одновременных задач
   */
  setMaxConcurrentTasks(limit: number): void {
    this.logger.info(`Изменение лимита одновременных задач: ${this.maxConcurrentTasks} → ${limit}`);
    this.maxConcurrentTasks = limit;
    
    // Обрабатываем очередь если лимит увеличился
    this.processQueue();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Завершение работы Task Executor...');
    
    await this.cancelAllTasks('Завершение работы приложения');
    
    this.logger.info('Task Executor завершен');
  }
}
