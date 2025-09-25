import { Client as SSHClient, ConnectConfig, ClientChannel, SFTPWrapper } from 'ssh2';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  timeout?: number;
}

export interface SSHTunnelConfig extends SSHConfig {
  localPort: number;
  remotePort: number;
  remoteHost?: string;
}

export interface SSHCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SSHFileTransferProgress {
  transferred: number;
  total: number;
  percentage: number;
}

export class SSHService extends EventEmitter {
  private logger: Logger;
  private activeConnections: Map<string, SSHClient> = new Map();
  private activeTunnels: Map<string, any> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  /**
   * Проверка SSH соединения с таймаутом
   */
  async checkConnection(config: SSHConfig): Promise<boolean> {
    const connectionId = `${config.host}:${config.port}`;
    this.logger.info(`Проверка SSH соединения: ${connectionId}`);

    return new Promise((resolve) => {
      const client = new SSHClient();
      const timeout = config.timeout || 10000;

      // Таймаут для соединения
      const timeoutId = setTimeout(() => {
        client.destroy();
        this.logger.warn(`SSH соединение превысило таймаут: ${connectionId}`);
        resolve(false);
      }, timeout);

      client.on('ready', () => {
        clearTimeout(timeoutId);
        this.logger.info(`SSH соединение успешно: ${connectionId}`);
        client.end();
        resolve(true);
      });

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        this.logger.error(`SSH ошибка соединения: ${connectionId}`, err);
        resolve(false);
      });

      try {
        const connectConfig = this.buildConnectConfig(config);
        client.connect(connectConfig);
      } catch (error) {
        clearTimeout(timeoutId);
        this.logger.error(`SSH ошибка конфигурации: ${connectionId}`, error);
        resolve(false);
      }
    });
  }

  /**
   * Копирование файла через SFTP
   */
  async copyFile(
    config: SSHConfig, 
    localPath: string, 
    remotePath: string
  ): Promise<boolean> {
    const connectionId = `${config.host}:${config.port}`;
    this.logger.info(`Копирование файла через SFTP: ${localPath} -> ${remotePath}`);

    return new Promise((resolve) => {
      const client = new SSHClient();

      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) {
            this.logger.error(`SFTP ошибка: ${connectionId}`, err);
            client.end();
            resolve(false);
            return;
          }

          // Проверяем существование локального файла
          if (!fs.existsSync(localPath)) {
            this.logger.error(`Локальный файл не найден: ${localPath}`);
            client.end();
            resolve(false);
            return;
          }

          // Получаем размер файла для прогресса
          const stats = fs.statSync(localPath);
          const totalSize = stats.size;
          let transferred = 0;

          // Создаем поток чтения
          const readStream = fs.createReadStream(localPath);
          const writeStream = sftp.createWriteStream(remotePath);

          // Отслеживание прогресса
          readStream.on('data', (chunk) => {
            transferred += chunk.length;
            const progress: SSHFileTransferProgress = {
              transferred,
              total: totalSize,
              percentage: Math.round((transferred / totalSize) * 100)
            };
            this.emit('transfer-progress', progress);
          });

          writeStream.on('close', () => {
            this.logger.info(`Файл успешно скопирован: ${remotePath}`);
            client.end();
            resolve(true);
          });

          writeStream.on('error', (err: Error) => {
            this.logger.error(`SFTP ошибка записи: ${remotePath}`, err);
            client.end();
            resolve(false);
          });

          readStream.on('error', (err: Error) => {
            this.logger.error(`Ошибка чтения файла: ${localPath}`, err);
            client.end();
            resolve(false);
          });

          // Начинаем копирование
          readStream.pipe(writeStream);
        });
      });

      client.on('error', (err) => {
        this.logger.error(`SSH ошибка при копировании: ${connectionId}`, err);
        resolve(false);
      });

      try {
        const connectConfig = this.buildConnectConfig(config);
        client.connect(connectConfig);
      } catch (error) {
        this.logger.error(`SSH ошибка конфигурации при копировании: ${connectionId}`, error);
        resolve(false);
      }
    });
  }

  /**
   * Выполнение команды на удаленном сервере
   */
  async runCommand(config: SSHConfig, command: string): Promise<SSHCommandResult> {
    const connectionId = `${config.host}:${config.port}`;
    this.logger.info(`Выполнение SSH команды: ${command} на ${connectionId}`);

    return new Promise((resolve) => {
      const client = new SSHClient();

      client.on('ready', () => {
        client.exec(command, (err, stream) => {
          if (err) {
            this.logger.error(`SSH ошибка выполнения команды: ${connectionId}`, err);
            client.end();
            resolve({
              success: false,
              stdout: '',
              stderr: err.message,
              exitCode: -1
            });
            return;
          }

          let stdout = '';
          let stderr = '';
          let exitCode = 0;

          stream.on('close', (code: number) => {
            exitCode = code;
            client.end();
            
            const result: SSHCommandResult = {
              success: code === 0,
              stdout,
              stderr,
              exitCode
            };

            this.logger.info(`SSH команда завершена с кодом ${code}: ${command}`);
            resolve(result);
          });

          stream.on('data', (data: Buffer) => {
            const output = data.toString();
            stdout += output;
            this.emit('command-output', { type: 'stdout', data: output });
          });

          stream.stderr.on('data', (data: Buffer) => {
            const output = data.toString();
            stderr += output;
            this.emit('command-output', { type: 'stderr', data: output });
          });

          stream.on('error', (err: Error) => {
            this.logger.error(`SSH поток ошибка: ${connectionId}`, err);
            client.end();
            resolve({
              success: false,
              stdout,
              stderr: stderr + err.message,
              exitCode: -1
            });
          });
        });
      });

      client.on('error', (err) => {
        this.logger.error(`SSH ошибка при выполнении команды: ${connectionId}`, err);
        resolve({
          success: false,
          stdout: '',
          stderr: err.message,
          exitCode: -1
        });
      });

      try {
        const connectConfig = this.buildConnectConfig(config);
        client.connect(connectConfig);
      } catch (error) {
        this.logger.error(`SSH ошибка конфигурации при выполнении команды: ${connectionId}`, error);
        resolve({
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Unknown error',
          exitCode: -1
        });
      }
    });
  }

  /**
   * Создание SSH туннеля
   */
  async setupTunnel(config: SSHTunnelConfig): Promise<boolean> {
    const tunnelId = `${config.host}:${config.port}->${config.localPort}:${config.remotePort}`;
    this.logger.info(`Создание SSH туннеля: ${tunnelId}`);

    return new Promise((resolve) => {
      const client = new SSHClient();

      client.on('ready', () => {
        const remoteHost = config.remoteHost || 'localhost';
        
        client.forwardIn('localhost', config.localPort, (err) => {
          if (err) {
            this.logger.error(`SSH туннель ошибка: ${tunnelId}`, err);
            client.end();
            resolve(false);
            return;
          }

          this.logger.info(`SSH туннель создан: ${tunnelId}`);
          
          // Сохраняем активное соединение
          this.activeTunnels.set(tunnelId, {
            client,
            config,
            createdAt: new Date()
          });

          resolve(true);
        });

        client.on('tcp connection', (info, accept, reject) => {
          this.logger.info(`SSH туннель входящее соединение: ${info.srcIP}:${info.srcPort}`);
          
          const stream = accept();
          
          client.forwardOut(
            info.destIP,
            info.destPort,
            remoteHost,
            config.remotePort,
            (err, upstream) => {
              if (err) {
                this.logger.error(`SSH туннель ошибка перенаправления: ${tunnelId}`, err);
                stream.end();
                return;
              }

              stream.pipe(upstream).pipe(stream);
            }
          );
        });
      });

      client.on('error', (err) => {
        this.logger.error(`SSH туннель ошибка соединения: ${tunnelId}`, err);
        resolve(false);
      });

      client.on('end', () => {
        this.logger.info(`SSH туннель закрыт: ${tunnelId}`);
        this.activeTunnels.delete(tunnelId);
        this.emit('tunnel-closed', tunnelId);
      });

      try {
        const connectConfig = this.buildConnectConfig(config);
        client.connect(connectConfig);
      } catch (error) {
        this.logger.error(`SSH туннель ошибка конфигурации: ${tunnelId}`, error);
        resolve(false);
      }
    });
  }

  /**
   * Закрытие SSH туннеля
   */
  async closeTunnel(tunnelId: string): Promise<boolean> {
    const tunnel = this.activeTunnels.get(tunnelId);
    
    if (!tunnel) {
      this.logger.warn(`SSH туннель не найден для закрытия: ${tunnelId}`);
      return false;
    }

    try {
      tunnel.client.end();
      this.activeTunnels.delete(tunnelId);
      this.logger.info(`SSH туннель закрыт: ${tunnelId}`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка закрытия SSH туннеля: ${tunnelId}`, error);
      return false;
    }
  }

  /**
   * Получение списка активных туннелей
   */
  getActiveTunnels(): string[] {
    return Array.from(this.activeTunnels.keys());
  }

  /**
   * Закрытие всех активных соединений
   */
  async closeAllConnections(): Promise<void> {
    this.logger.info('Закрытие всех SSH соединений...');

    // Закрываем все туннели
    const tunnelPromises = Array.from(this.activeTunnels.keys()).map(
      tunnelId => this.closeTunnel(tunnelId)
    );

    // Закрываем все обычные соединения
    const connectionPromises = Array.from(this.activeConnections.values()).map(
      client => new Promise<void>((resolve) => {
        client.end();
        client.on('end', () => resolve());
        // Принудительное закрытие через 5 секунд
        setTimeout(() => {
          client.destroy();
          resolve();
        }, 5000);
      })
    );

    await Promise.all([...tunnelPromises, ...connectionPromises]);
    
    this.activeConnections.clear();
    this.activeTunnels.clear();
    
    this.logger.info('Все SSH соединения закрыты');
  }

  /**
   * Построение конфигурации для SSH соединения
   */
  private buildConnectConfig(config: SSHConfig): ConnectConfig {
    const connectConfig: ConnectConfig = {
      host: config.host,
      port: config.port,
      username: config.username,
      readyTimeout: config.timeout || 10000,
      keepaliveInterval: 30000,
      keepaliveCountMax: 3
    };

    // Аутентификация по ключу
    if (config.privateKey) {
      if (fs.existsSync(config.privateKey)) {
        connectConfig.privateKey = fs.readFileSync(config.privateKey);
      } else {
        // Возможно, это содержимое ключа, а не путь
        connectConfig.privateKey = Buffer.from(config.privateKey);
      }
    }

    // Аутентификация по паролю
    if (config.password) {
      connectConfig.password = config.password;
    }

    return connectConfig;
  }

  /**
   * Проверка доступности порта на удаленном сервере
   */
  async checkRemotePort(config: SSHConfig, port: number): Promise<boolean> {
    const command = `netstat -tuln | grep :${port} || ss -tuln | grep :${port}`;
    const result = await this.runCommand(config, command);
    
    return result.success && result.stdout.includes(`:${port}`);
  }

  /**
   * Получение информации о системе
   */
  async getSystemInfo(config: SSHConfig): Promise<any> {
    const commands = {
      os: 'uname -a',
      memory: 'free -h',
      disk: 'df -h',
      processes: 'ps aux | head -10',
      python: 'python3 --version || python --version'
    };

    const results: any = {};

    for (const [key, command] of Object.entries(commands)) {
      try {
        const result = await this.runCommand(config, command);
        results[key] = {
          success: result.success,
          output: result.stdout,
          error: result.stderr
        };
      } catch (error) {
        results[key] = {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }
}
