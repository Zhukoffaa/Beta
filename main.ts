import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { Logger } from './services/logger';
import { ConfigService } from './services/config';
import { ServerManager } from './services/serverManager';
import { OCRService } from './services/ocrService';
import { FileIndexer } from './services/fileIndexer';

// GPU crash fix - disable hardware acceleration to prevent STATUS_STACK_BUFFER_OVERRUN
app.disableHardwareAcceleration();

// Alternative GPU settings for stability
app.commandLine.appendSwitch('use-angle', 'd3d11');
app.commandLine.appendSwitch('enable-logging');
app.commandLine.appendSwitch('v', '1');

class ElectronApp {
  private mainWindow: BrowserWindow | null = null;
  private serverSettingsWindow: BrowserWindow | null = null;
  private logger: Logger;
  private configService: ConfigService;
  private serverManager: ServerManager;
  private ocrService: OCRService;
  private fileIndexer: FileIndexer;

  constructor() {
    this.logger = new Logger();
    this.configService = new ConfigService();
    this.serverManager = new ServerManager(this.logger, this.configService);
    this.ocrService = new OCRService(this.logger);
    this.fileIndexer = new FileIndexer(this.logger);
    
    this.initializeApp();
  }

  private initializeApp(): void {
    // Готовность Electron
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIPC();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    // Закрытие приложения
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Безопасность
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });
    });
  }

  private createWindow(): void {
    const config = this.configService.getAppConfig();
    
    this.mainWindow = new BrowserWindow({
      width: config.ui.window.width,
      height: config.ui.window.height,
      minWidth: config.ui.window.minWidth,
      minHeight: config.ui.window.minHeight,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../backend/preload.js'),
        webSecurity: false, // Отключаем веб-безопасность для разработки
      },
      titleBarStyle: 'default',
      show: false,
    });

    const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
    const isDebug = config.app.debug || config.ui.devTools;
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
      this.logger.info('Запуск в режиме разработки с dev-сервером на http://localhost:3000');
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
      this.logger.info('Запуск в продакшн режиме с локальными файлами');
    }
    
    if (isDebug && !isDev) {
      this.mainWindow.webContents.openDevTools();
      this.logger.info('Developer Tools открыты (режим отладки включен в конфигурации)');
    }

    // События окна
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      this.logger.info('Главное окно отображено');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Логирование
    this.logger.info('Electron приложение запущено');
  }

  private setupIPC(): void {
    // Логирование
    ipcMain.handle('log', async (_, level: string, message: string) => {
      this.logger.log(level as any, message);
    });

    // Конфигурация
    ipcMain.handle('get-app-config', async () => {
      return this.configService.getAppConfig();
    });

    ipcMain.handle('get-servers', async () => {
      return this.configService.getServers();
    });

    ipcMain.handle('update-server', async (_, server: any) => {
      return this.configService.updateServer(server);
    });

    // Управление серверами
    ipcMain.handle('test-connection', async (_, serverId: string) => {
      return this.serverManager.testConnection(serverId);
    });

    ipcMain.handle('deploy-server', async (_, serverId: string) => {
      return this.serverManager.deployServer(serverId);
    });

    ipcMain.handle('connect-server', async (_, serverId: string) => {
      return this.serverManager.connectServer(serverId);
    });

    ipcMain.handle('disconnect-server', async (_, serverId: string) => {
      return this.serverManager.disconnectServer(serverId);
    });

    // LLM операции
    ipcMain.handle('llm-chat', async (_, serverId: string, messages: any[]) => {
      return this.serverManager.chat(serverId, messages);
    });

    ipcMain.handle('llm-get-models', async (_, serverId: string) => {
      return this.serverManager.getModels(serverId);
    });

    // Полная подготовка сервера
    ipcMain.handle('ensure-llm-ready', async (_, serverId: string) => {
      return this.serverManager.ensureLLMReady(serverId);
    });

    // Получение статуса серверов
    ipcMain.handle('get-server-status', async (_, serverId: string) => {
      return this.serverManager.getServerStatus(serverId);
    });

    ipcMain.handle('get-all-servers', async () => {
      return this.serverManager.getAllServers();
    });

    // События прогресса и статуса
    this.serverManager.on('progress', (data: any) => {
      this.mainWindow?.webContents.send('server-progress', data);
    });

    this.serverManager.on('log', (data: any) => {
      this.mainWindow?.webContents.send('server-log', data);
    });

    this.serverManager.on('status-change', (data: any) => {
      this.mainWindow?.webContents.send('server-status-change', data);
    });

    this.serverManager.on('deployment-progress', (data: any) => {
      this.mainWindow?.webContents.send('deployment-progress', data);
    });

    this.serverManager.on('connection-tested', (data: any) => {
      this.mainWindow?.webContents.send('connection-tested', data);
    });

    this.serverManager.on('server-ready', (data: any) => {
      this.mainWindow?.webContents.send('server-ready', data);
    });

    // File Indexer операции
    ipcMain.handle('scan-project', async (_, projectPath: string) => {
      return this.fileIndexer.scanProject(projectPath);
    });

    ipcMain.handle('get-project-index', async (_, projectPath: string) => {
      return this.fileIndexer.getProjectIndex(projectPath);
    });

    ipcMain.handle('get-all-projects', async () => {
      return this.fileIndexer.getAllProjects();
    });

    ipcMain.handle('search-files', async (_, params: { projectPath: string, query: string }) => {
      return this.fileIndexer.searchFiles(params.projectPath, params.query);
    });

    ipcMain.handle('remove-project', async (_, projectPath: string) => {
      return this.fileIndexer.removeProject(projectPath);
    });

    ipcMain.handle('get-file-icon', async (_, node: any) => {
      return this.fileIndexer.getFileIcon(node);
    });

    // File Indexer события
    this.fileIndexer.on('scan-complete', (data: any) => {
      this.mainWindow?.webContents.send('project-scan-complete', data);
    });

    this.fileIndexer.on('file-change', (data: any) => {
      this.mainWindow?.webContents.send('project-file-change', data);
    });

    this.fileIndexer.on('rescan-complete', (data: any) => {
      this.mainWindow?.webContents.send('project-rescan-complete', data);
    });

    // Дополнительные IPC методы для тестов
    ipcMain.handle('send-message', async (_, message: string) => {
      try {
        this.logger.info(`Sending message: ${message}`);
        // Используем существующий llm-chat метод
        const servers = this.configService.getServers();
        const activeServer = servers.servers.find(s => s.connected);
        
        if (!activeServer) {
          throw new Error('No active server connection');
        }
        
        return this.serverManager.chat(activeServer.id, [{ role: 'user', content: message }]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Send message error: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    });

    ipcMain.handle('get-logs', async (_, options?: { level?: string, limit?: number }) => {
      try {
        this.logger.info('Retrieving application logs');
        
        // Простая заглушка для логов (пока метод getLogs не реализован)
        const logs = [
          { timestamp: new Date().toISOString(), level: 'info', message: 'Application started' },
          { timestamp: new Date().toISOString(), level: 'info', message: 'IPC handlers configured' }
        ];
        
        return { success: true, logs };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error retrieving logs: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    });

    // OCR обработчики
    ipcMain.handle('ocr-process-images', async (_, imagePaths: string[]) => {
      try {
        this.logger.info(`Processing ${imagePaths.length} images for OCR`);
        const result = await this.ocrService.processMultipleImages(imagePaths);
        return { success: true, data: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`OCR processing error: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    });

    // LLM настройки
    ipcMain.handle('update-llm-settings', async (_, llmSettings: any) => {
      try {
        this.logger.info('Updating LLM settings');
        const currentConfig = this.configService.getAppConfig();
        
        // Обновляем настройки LLM в конфигурации
        const updatedConfig = {
          ...currentConfig,
          llm: {
            ...currentConfig.llm,
            ...llmSettings
          }
        };
        
        // Сохраняем обновленную конфигурацию
        await this.configService.updateAppConfig(updatedConfig);
        
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`LLM settings update error: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    });

    ipcMain.handle('get-llm-settings', async () => {
      try {
        const config = this.configService.getAppConfig();
        return { success: true, data: config.llm || {} };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Get LLM settings error: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    });

    // Управление окном настроек серверов
    ipcMain.handle('open-server-settings', async () => {
      return this.openServerSettingsWindow();
    });

    ipcMain.handle('close-server-settings', async () => {
      if (this.serverSettingsWindow) {
        this.serverSettingsWindow.close();
        return true;
      }
      return false;
    });

    this.logger.info('IPC обработчики настроены');
  }

  private openServerSettingsWindow(): boolean {
    if (this.serverSettingsWindow) {
      this.serverSettingsWindow.focus();
      return true;
    }

    this.serverSettingsWindow = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 600,
      minHeight: 400,
      modal: false,
      frame: true,
      transparent: false,
      title: "Серверы",
      parent: this.mainWindow || undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../backend/preload.js'),
      },
      show: false,
    });

    const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.serverSettingsWindow.loadURL('http://localhost:3000#/servers');
    } else {
      this.serverSettingsWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'), {
        hash: 'servers'
      });
    }

    this.serverSettingsWindow.once('ready-to-show', () => {
      this.serverSettingsWindow?.show();
      this.logger.info('Окно настроек серверов открыто');
    });

    this.serverSettingsWindow.on('closed', () => {
      this.serverSettingsWindow = null;
      this.logger.info('Окно настроек серверов закрыто');
    });

    return true;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public getServerSettingsWindow(): BrowserWindow | null {
    return this.serverSettingsWindow;
  }
}

// Создание экземпляра приложения
const electronApp = new ElectronApp();

// Экспорт для тестирования
export default electronApp;
