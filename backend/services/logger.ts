import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
}

export class Logger extends EventEmitter {
  private logPath: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;

  constructor(logPath?: string) {
    super();
    this.logPath = logPath || path.join(process.cwd(), 'logs', 'app.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\n`;
  }

  private async writeToFile(content: string): Promise<void> {
    try {
      // Проверка размера файла
      if (fs.existsSync(this.logPath)) {
        const stats = fs.statSync(this.logPath);
        if (stats.size > this.maxFileSize) {
          await this.rotateLogFile();
        }
      }

      // Запись в файл
      fs.appendFileSync(this.logPath, content, 'utf8');
    } catch (error) {
      console.error('Ошибка записи в лог файл:', error);
    }
  }

  private async rotateLogFile(): Promise<void> {
    try {
      // Сдвигаем существующие файлы
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${this.logPath}.${i}`;
        const newFile = `${this.logPath}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Удаляем самый старый
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Переименовываем текущий файл
      if (fs.existsSync(this.logPath)) {
        fs.renameSync(this.logPath, `${this.logPath}.1`);
      }
    } catch (error) {
      console.error('Ошибка ротации лог файла:', error);
    }
  }

  public writeLog(level: LogLevel, message: string, metadata?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };

    // Форматирование и запись в файл
    const formattedMessage = this.formatMessage(level, message, metadata);
    this.writeToFile(formattedMessage);

    // Вывод в консоль в режиме разработки
    if (process.env.NODE_ENV === 'development') {
      console.log(formattedMessage.trim());
    }

    // Отправка события для UI
    this.emit('log', logEntry);
  }

  public log(level: LogLevel, message: string, metadata?: any): void {
    this.writeLog(level, message, metadata);
  }

  public debug(message: string, metadata?: any): void {
    this.log('debug', message, metadata);
  }

  public info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  public warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  public error(message: string, metadata?: any): void {
    this.log('error', message, metadata);
  }

  public getLogPath(): string {
    return this.logPath;
  }

  public async getRecentLogs(lines: number = 100): Promise<LogEntry[]> {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const content = fs.readFileSync(this.logPath, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      
      return logLines.map(line => {
        try {
          // Парсинг строки лога
          const match = line.match(/\[(.*?)\] (\w+): (.*)/);
          if (match) {
            return {
              timestamp: match[1],
              level: match[2].toLowerCase() as LogLevel,
              message: match[3]
            };
          }
          return null;
        } catch {
          return null;
        }
      }).filter(Boolean) as LogEntry[];
    } catch (error) {
      this.error('Ошибка чтения логов', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  public async clearLogs(): Promise<void> {
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath);
      }
      
      // Удаляем ротированные файлы
      for (let i = 1; i <= this.maxFiles; i++) {
        const rotatedFile = `${this.logPath}.${i}`;
        if (fs.existsSync(rotatedFile)) {
          fs.unlinkSync(rotatedFile);
        }
      }
      
      this.info('Логи очищены');
    } catch (error) {
      this.error('Ошибка очистки логов', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
