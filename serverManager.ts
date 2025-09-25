import { EventEmitter } from 'events';
import { Logger } from './logger';
import { ConfigService, ServerConfig } from './config';
import { SSHService, SSHConfig, SSHTunnelConfig } from './sshService';
import { LLMService, LLMConfig } from './llmService';
import { TaskExecutor, TaskConfig } from './taskExecutor';
import * as path from 'path';

export interface ServerStatus {
  id: string;
  name: string;
  status: string;
  sshConnected: boolean;
  llmConnected: boolean;
  deployed: boolean;
  lastCheck: string | null;
  error?: string;
}

export interface DeploymentProgress {
  serverId: string;
  stage: string;
  progress: number;
  message: string;
  error?: string;
}

export interface ServerManagerEvents {
  progress: (data: { serverId: string; progress: number; message: string }) => void;
  log: (data: { serverId: string; level: string; message: string }) => void;
  'status-change': (data: { serverId: string; status: string }) => void;
  'deployment-progress': (data: DeploymentProgress) => void;
  'connection-tested': (data: { serverId: string; sshConnected: boolean; llmConnected: boolean }) => void;
  'server-ready': (data: { serverId: string }) => void;
}

export class ServerManager extends EventEmitter {
  private logger: Logger;
  private configService: ConfigService;
  private sshService: SSHService;
  private taskExecutor: TaskExecutor;
  private servers: Map<string, ServerConfig> = new Map();
  private llmServices: Map<string, LLMService> = new Map();
  private activeTunnels: Map<string, string> = new Map(); // serverId -> tunnelId

  constructor(logger: Logger, configService: ConfigService) {
    super();
    this.logger = logger;
    this.configService = configService;
    this.sshService = new SSHService(logger);
    this.taskExecutor = new TaskExecutor(logger);
    
    this.setupEventHandlers();
    this.loadServers();
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventHandlers(): void {
    // SSH события
    this.sshService.on('transfer-progress', (progress) => {
      this.emit('progress', {
        serverId: 'current', // TODO: связать с конкретным сервером
        progress: progress.percentage,
        message: `Передача файла: ${progress.percentage}%`
      });
    });

    this.sshService.on('command-output', (output) => {
      this.emit('log', {
        serverId: 'current', // TODO: связать с конкретным сервером
        level: output.type === 'stderr' ? 'error' : 'info',
        message: output.data
      });
    });

    this.sshService.on('tunnel-closed', (tunnelId) => {
      // Находим сервер по tunnelId и обновляем статус
      for (const [serverId, activeTunnelId] of this.activeTunnels.entries()) {
        if (activeTunnelId === tunnelId) {
          this.updateServerStatus(serverId, { connected: false, status: 'disconnected' });
          this.activeTunnels.delete(serverId);
          this.emit('status-change', { serverId, status: 'disconnected' });
          break;
        }
      }
    });

    // Task Executor события
    this.taskExecutor.on('task-progress', (progress) => {
      this.emit('deployment-progress', {
        serverId: progress.taskId, // Используем taskId как serverId
        stage: 'deployment',
        progress: progress.progress,
        message: progress.message || 'Развертывание...'
      });
    });

    this.taskExecutor.on('task-completed', (result) => {
      this.emit('log', {
        serverId: result.taskId,
        level: 'info',
        message: `Задача завершена успешно за ${result.duration}ms`
      });
    });

    this.taskExecutor.on('task-failed', (result) => {
      this.emit('log', {
        serverId: result.taskId,
        level: 'error',
        message: `Задача завершена с ошибкой: ${result.error}`
      });
    });
  }

  /**
   * Загрузка серверов из конфигурации
   */
  private async loadServers(): Promise<void> {
    try {
      const serversConfig = await this.configService.getServers();
      serversConfig.servers.forEach((server: ServerConfig) => {
        this.servers.set(server.id, server);
      });
      this.logger.info(`Загружено ${this.servers.size} серверов`);
    } catch (error) {
      this.logger.error('Ошибка загрузки серверов:', error);
    }
  }

  /**
   * Тестирование соединения с сервером
   */
  public async testConnection(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      this.logger.error(`Сервер не найден: ${serverId}`);
      return false;
    }

    this.logger.info(`Тестирование соединения с сервером: ${server.name}`);
    this.emit('progress', {
      serverId,
      progress: 0,
      message: 'Начало тестирования соединения'
    });

    await this.updateServerStatus(serverId, { status: 'connecting' });

    try {
      // Тестируем SSH соединение
      const sshConfig: SSHConfig = {
        host: server.host,
        port: server.port,
        username: server.user,
        privateKey: server.sshKey,
        timeout: 10000
      };

      this.emit('progress', {
        serverId,
        progress: 25,
        message: 'Проверка SSH соединения...'
      });

      const sshConnected = await this.sshService.checkConnection(sshConfig);
      
      if (!sshConnected) {
        await this.updateServerStatus(serverId, { 
          status: 'error', 
          connected: false 
        });
        this.emit('status-change', { serverId, status: 'error' });
        return false;
      }

      this.emit('progress', {
        serverId,
        progress: 50,
        message: 'SSH соединение установлено'
      });

      // Проверяем системную информацию
      const systemInfo = await this.sshService.getSystemInfo(sshConfig);
      this.logger.info(`Системная информация сервера ${server.name}:`, systemInfo);

      this.emit('progress', {
        serverId,
        progress: 75,
        message: 'Получена системная информация'
      });

      // Проверяем LLM сервер если развернут
      let llmConnected = false;
      if (server.deployed) {
        llmConnected = await this.testLLMConnection(serverId);
      }

      this.emit('progress', {
        serverId,
        progress: 100,
        message: 'Тестирование завершено'
      });

      await this.updateServerStatus(serverId, { 
        status: llmConnected ? 'connected' : 'disconnected',
        connected: llmConnected,
        lastCheck: new Date().toISOString()
      });

      this.emit('connection-tested', {
        serverId,
        sshConnected,
        llmConnected
      });

      this.emit('status-change', { 
        serverId, 
        status: llmConnected ? 'connected' : 'disconnected' 
      });

      return sshConnected;

    } catch (error) {
      this.logger.error(`Ошибка тестирования соединения ${server.name}:`, error);
      await this.updateServerStatus(serverId, { 
        status: 'error', 
        connected: false 
      });
      this.emit('status-change', { serverId, status: 'error' });
      return false;
    }
  }

  /**
   * Развертывание LLM сервера через TaskExecutor
   */
  public async deployServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      this.logger.error(`Сервер не найден: ${serverId}`);
      return false;
    }

    this.logger.info(`Начало развертывания LLM на сервере: ${server.name}`);
    await this.updateServerStatus(serverId, { status: 'deploying' });
    this.emit('status-change', { serverId, status: 'deploying' });

    try {
      // Используем TaskExecutor для развертывания
      const deployConfig = {
        serverId,
        host: server.host,
        port: server.port,
        username: server.user,
        privateKey: server.sshKey,
        deployPath: server.deployPath,
        llmPort: server.llmPort
      };

      const result = await this.taskExecutor.runDeployTask(deployConfig);

      if (result.success) {
        await this.updateServerStatus(serverId, { 
          status: 'deployed',
          deployed: true,
          lastCheck: new Date().toISOString()
        });

        this.logger.info(`LLM сервер успешно развернут: ${server.name}`);
        this.emit('status-change', { serverId, status: 'deployed' });
        return true;
      } else {
        throw new Error(result.error || 'Ошибка развертывания');
      }

    } catch (error) {
      await this.updateServerStatus(serverId, { 
        status: 'error',
        deployed: false
      });

      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.logger.error(`Ошибка развертывания LLM сервера ${server.name}:`, errorMessage);
      
      this.emit('status-change', { serverId, status: 'error' });
      return false;
    }
  }

  /**
   * Подключение к серверу через TaskExecutor
   */
  public async connectServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      this.logger.error(`Сервер не найден: ${serverId}`);
      return false;
    }

    this.logger.info(`Подключение к серверу: ${server.name}`);
    await this.updateServerStatus(serverId, { status: 'connecting' });
    this.emit('status-change', { serverId, status: 'connecting' });

    try {
      // Используем TaskExecutor для подключения
      const connectConfig = {
        serverId,
        host: server.host,
        port: server.port,
        username: server.user,
        privateKey: server.sshKey,
        llmPort: server.llmPort,
        localPort: server.llmPort + 1000 // Локальный порт отличается от удаленного
      };

      const result = await this.taskExecutor.runConnectTask(connectConfig);

      if (result.success) {
        // Сохраняем информацию о туннеле
        const tunnelId = `${server.host}:${server.port}->${connectConfig.localPort}:${server.llmPort}`;
        this.activeTunnels.set(serverId, tunnelId);

        // Создаем LLM сервис для локального порта
        const llmConfig: LLMConfig = {
          baseUrl: `http://localhost:${connectConfig.localPort}`,
          timeout: 10000
        };
        const llmService = new LLMService(this.logger, llmConfig);
        this.llmServices.set(serverId, llmService);

        await this.updateServerStatus(serverId, { 
          status: 'connected',
          connected: true,
          lastCheck: new Date().toISOString()
        });

        this.logger.info(`Успешно подключен к серверу: ${server.name}`);
        this.emit('status-change', { serverId, status: 'connected' });
        return true;
      } else {
        throw new Error(result.error || 'Ошибка подключения');
      }

    } catch (error) {
      await this.updateServerStatus(serverId, { 
        status: 'error',
        connected: false
      });

      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.logger.error(`Ошибка подключения к серверу ${server.name}:`, errorMessage);
      
      this.emit('status-change', { serverId, status: 'error' });
      return false;
    }
  }

  /**
   * Отключение от сервера
   */
  public async disconnectServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }

    this.logger.info(`Отключение от сервера: ${server.name}`);

    try {
      // Закрываем SSH туннель
      const tunnelId = this.activeTunnels.get(serverId);
      if (tunnelId) {
        await this.sshService.closeTunnel(tunnelId);
        this.activeTunnels.delete(serverId);
      }

      // Удаляем LLM сервис
      this.llmServices.delete(serverId);

      await this.updateServerStatus(serverId, { 
        status: 'disconnected',
        connected: false
      });

      this.emit('status-change', { serverId, status: 'disconnected' });
      return true;

    } catch (error) {
      this.logger.error(`Ошибка отключения от сервера ${server.name}:`, error);
      return false;
    }
  }

  /**
   * Чат с LLM сервером через TaskExecutor
   */
  public async chat(serverId: string, messages: any[]): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server || !server.connected) {
      throw new Error(`Сервер ${serverId} не подключен`);
    }

    this.logger.info(`Отправка сообщения на сервер ${serverId}`);

    try {
      // Используем TaskExecutor для чата
      const chatConfig = {
        serverId,
        baseUrl: `http://localhost:${server.llmPort + 1000}`, // Используем локальный порт туннеля
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        timeout: 30000
      };

      const result = await this.taskExecutor.runChatTask(chatConfig);

      if (result.success) {
        return {
          response: result.data.response.content,
          timestamp: new Date().toISOString(),
          usage: result.data.usage
        };
      } else {
        throw new Error(result.error || 'Ошибка чата');
      }

    } catch (error) {
      this.logger.error(`Ошибка чата с сервером ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Получение списка моделей
   */
  public async getModels(serverId: string): Promise<string[]> {
    const llmService = this.llmServices.get(serverId);
    if (!llmService) {
      throw new Error(`LLM сервис не найден для сервера ${serverId}`);
    }

    this.logger.info(`Получение списка моделей с сервера ${serverId}`);

    try {
      const models = await llmService.getModels();
      return models.map(model => model.id);
    } catch (error) {
      this.logger.error(`Ошибка получения моделей с сервера ${serverId}:`, error);
      return [];
    }
  }

  /**
   * Полная подготовка сервера (развертывание + подключение)
   */
  public async ensureLLMReady(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }

    this.logger.info(`Подготовка LLM сервера: ${server.name}`);

    try {
      // Проверяем SSH соединение
      const sshConnected = await this.testConnection(serverId);
      if (!sshConnected) {
        return false;
      }

      // Развертываем если не развернут
      if (!server.deployed) {
        const deployed = await this.deployServer(serverId);
        if (!deployed) {
          return false;
        }
      }

      // Подключаемся если не подключены
      if (!server.connected) {
        const connected = await this.connectServer(serverId);
        if (!connected) {
          return false;
        }
      }

      this.logger.info(`LLM сервер готов: ${server.name}`);
      this.emit('server-ready', { serverId });
      return true;

    } catch (error) {
      this.logger.error(`Ошибка подготовки LLM сервера ${server.name}:`, error);
      return false;
    }
  }

  /**
   * Тестирование LLM соединения
   */
  private async testLLMConnection(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }

    try {
      // Создаем или получаем LLM сервис
      let llmService = this.llmServices.get(serverId);
      if (!llmService) {
        const llmConfig: LLMConfig = {
          baseUrl: `http://localhost:${server.llmPort}`,
          timeout: 10000
        };
        llmService = new LLMService(this.logger, llmConfig);
        this.llmServices.set(serverId, llmService);
      }

      // Тестируем соединение
      const connected = await llmService.testConnection();
      return connected;

    } catch (error) {
      this.logger.error(`Ошибка тестирования LLM соединения ${server.name}:`, error);
      return false;
    }
  }

  /**
   * Получение статуса сервера
   */
  public getServerStatus(serverId: string): ServerStatus | null {
    const server = this.servers.get(serverId);
    if (!server) {
      return null;
    }

    return {
      id: server.id,
      name: server.name,
      status: server.status,
      sshConnected: server.status !== 'disconnected' && server.status !== 'error',
      llmConnected: server.connected,
      deployed: server.deployed,
      lastCheck: server.lastCheck || null
    };
  }

  /**
   * Получение всех серверов
   */
  public getAllServers(): ServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * Обновление статуса сервера
   */
  private async updateServerStatus(serverId: string, updates: Partial<ServerConfig>): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      return;
    }

    Object.assign(server, updates);
    await this.saveServers();
  }

  /**
   * Сохранение серверов в конфигурацию
   */
  private async saveServers(): Promise<void> {
    try {
      const serversConfig = {
        servers: Array.from(this.servers.values()),
        lastUpdated: new Date().toISOString()
      };
      
      // Сохраняем каждый сервер отдельно
      for (const server of serversConfig.servers) {
        await this.configService.updateServer(server);
      }
    } catch (error) {
      this.logger.error('Ошибка сохранения серверов:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Завершение работы Server Manager...');

    // Отключаемся от всех серверов
    const disconnectPromises = Array.from(this.servers.keys()).map(
      serverId => this.disconnectServer(serverId)
    );
    await Promise.all(disconnectPromises);

    // Закрываем все SSH соединения
    await this.sshService.closeAllConnections();

    // Завершаем Task Executor
    await this.taskExecutor.shutdown();

    this.logger.info('Server Manager завершен');
  }
}
