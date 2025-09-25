import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export interface LLMPreset {
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  presets: LLMPreset[];
}

export interface AppConfig {
  app: {
    name: string;
    version: string;
    debug: boolean;
    logLevel: string;
    theme: string;
    language: string;
  };
  llm?: LLMConfig;
  timeouts: {
    ssh: number;
    llm: number;
    deploy: number;
    health_check: number;
  };
  paths: {
    logs: string;
    tools: string;
    configs: string;
  };
  ui: {
    window: {
      width: number;
      height: number;
      minWidth: number;
      minHeight: number;
    };
    devTools: boolean;
  };
}

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  sshKey: string;
  deployPath: string;
  llmPort: number;
  status: 'disconnected' | 'connecting' | 'connected' | 'deploying' | 'deployed' | 'error';
  deployed: boolean;
  connected: boolean;
  lastCheck?: string;
  projectPath: string;
}

export interface ServersConfig {
  servers: ServerConfig[];
  activeServer?: string;
  lastUpdated?: string;
}

export class ConfigService {
  private appConfigPath: string;
  private serversConfigPath: string;
  private appConfig: AppConfig | null = null;
  private serversConfig: ServersConfig | null = null;

  constructor(configDir?: string) {
    const baseDir = configDir || path.join(process.cwd(), 'configs');
    this.appConfigPath = path.join(baseDir, 'app.yaml');
    this.serversConfigPath = path.join(baseDir, 'servers.json');
    
    this.ensureConfigDirectory();
    this.loadConfigs();
  }

  private ensureConfigDirectory(): void {
    const configDir = path.dirname(this.appConfigPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  private getDefaultAppConfig(): AppConfig {
    return {
      app: {
        name: 'Windows LLM Agent',
        version: '1.0.0-beta',
        debug: false,
        logLevel: 'info',
        theme: 'dark',
        language: 'ru'
      },
      timeouts: {
        ssh: 30000,
        llm: 60000,
        deploy: 300000,
        health_check: 10000
      },
      paths: {
        logs: './logs',
        tools: './tools',
        configs: './configs'
      },
      ui: {
        window: {
          width: 1200,
          height: 800,
          minWidth: 800,
          minHeight: 600
        },
        devTools: false
      }
    };
  }

  private getDefaultServersConfig(): ServersConfig {
    return {
      servers: [
        {
          id: 'example-server',
          name: 'Example LLM Server',
          host: '192.168.1.100',
          port: 22,
          user: 'admin',
          sshKey: '',
          deployPath: '/opt/llm',
          llmPort: 8080,
          status: 'disconnected',
          deployed: false,
          connected: false,
          projectPath: '/home/admin/llm-project'
        }
      ],
      activeServer: undefined,
      lastUpdated: new Date().toISOString()
    };
  }

  private loadConfigs(): void {
    try {
      // Загрузка app.yaml
      if (fs.existsSync(this.appConfigPath)) {
        const appConfigContent = fs.readFileSync(this.appConfigPath, 'utf8');
        this.appConfig = yaml.parse(appConfigContent) as AppConfig;
      } else {
        this.appConfig = this.getDefaultAppConfig();
        this.saveAppConfig();
      }

      // Загрузка servers.json
      if (fs.existsSync(this.serversConfigPath)) {
        const serversConfigContent = fs.readFileSync(this.serversConfigPath, 'utf8');
        this.serversConfig = JSON.parse(serversConfigContent) as ServersConfig;
      } else {
        this.serversConfig = this.getDefaultServersConfig();
        this.saveServersConfig();
      }
    } catch (error) {
      console.error('Ошибка загрузки конфигураций:', error);
      // Использовать дефолтные конфигурации в случае ошибки
      this.appConfig = this.getDefaultAppConfig();
      this.serversConfig = this.getDefaultServersConfig();
    }
  }

  public getAppConfig(): AppConfig {
    if (!this.appConfig) {
      this.loadConfigs();
    }
    return this.appConfig!;
  }

  public getServers(): ServersConfig {
    if (!this.serversConfig) {
      this.loadConfigs();
    }
    return this.serversConfig!;
  }

  public getServer(serverId: string): ServerConfig | undefined {
    const servers = this.getServers();
    return servers.servers.find(server => server.id === serverId);
  }

  public updateAppConfig(config: Partial<AppConfig>): void {
    this.appConfig = { ...this.getAppConfig(), ...config };
    this.saveAppConfig();
  }

  public updateServer(serverConfig: ServerConfig): void {
    const servers = this.getServers();
    const index = servers.servers.findIndex(s => s.id === serverConfig.id);
    
    if (index !== -1) {
      servers.servers[index] = serverConfig;
    } else {
      servers.servers.push(serverConfig);
    }
    
    servers.lastUpdated = new Date().toISOString();
    this.serversConfig = servers;
    this.saveServersConfig();
  }

  public addServer(serverConfig: Omit<ServerConfig, 'id'>): string {
    const servers = this.getServers();
    const id = `server-${Date.now()}`;
    const newServer: ServerConfig = {
      ...serverConfig,
      id
    };
    
    servers.servers.push(newServer);
    servers.lastUpdated = new Date().toISOString();
    this.serversConfig = servers;
    this.saveServersConfig();
    
    return id;
  }

  public removeServer(serverId: string): boolean {
    const servers = this.getServers();
    const index = servers.servers.findIndex(s => s.id === serverId);
    
    if (index !== -1) {
      servers.servers.splice(index, 1);
      
      // Если удаляемый сервер был активным, сбросить активный сервер
      if (servers.activeServer === serverId) {
        servers.activeServer = undefined;
      }
      
      servers.lastUpdated = new Date().toISOString();
      this.serversConfig = servers;
      this.saveServersConfig();
      return true;
    }
    
    return false;
  }

  public setActiveServer(serverId: string): void {
    const servers = this.getServers();
    const server = servers.servers.find(s => s.id === serverId);
    
    if (server) {
      servers.activeServer = serverId;
      servers.lastUpdated = new Date().toISOString();
      this.serversConfig = servers;
      this.saveServersConfig();
    }
  }

  public getActiveServer(): ServerConfig | undefined {
    const servers = this.getServers();
    if (servers.activeServer) {
      return this.getServer(servers.activeServer);
    }
    return undefined;
  }

  private saveAppConfig(): void {
    try {
      const yamlContent = yaml.stringify(this.appConfig);
      fs.writeFileSync(this.appConfigPath, yamlContent, 'utf8');
    } catch (error) {
      console.error('Ошибка сохранения app.yaml:', error);
    }
  }

  private saveServersConfig(): void {
    try {
      const jsonContent = JSON.stringify(this.serversConfig, null, 2);
      fs.writeFileSync(this.serversConfigPath, jsonContent, 'utf8');
    } catch (error) {
      console.error('Ошибка сохранения servers.json:', error);
    }
  }

  public reloadConfigs(): void {
    this.loadConfigs();
  }

  public validateServerConfig(config: Partial<ServerConfig>): string[] {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Имя сервера не может быть пустым');
    }

    if (!config.host || config.host.trim().length === 0) {
      errors.push('Хост сервера не может быть пустым');
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('Порт должен быть в диапазоне 1-65535');
    }

    if (!config.user || config.user.trim().length === 0) {
      errors.push('Имя пользователя не может быть пустым');
    }

    if (!config.deployPath || config.deployPath.trim().length === 0) {
      errors.push('Путь развертывания не может быть пустым');
    }

    if (!config.llmPort || config.llmPort < 1 || config.llmPort > 65535) {
      errors.push('Порт LLM должен быть в диапазоне 1-65535');
    }

    return errors;
  }

  public exportConfig(): { app: AppConfig; servers: ServersConfig } {
    return {
      app: this.getAppConfig(),
      servers: this.getServers()
    };
  }

  public importConfig(config: { app?: AppConfig; servers?: ServersConfig }): void {
    if (config.app) {
      this.appConfig = config.app;
      this.saveAppConfig();
    }

    if (config.servers) {
      this.serversConfig = config.servers;
      this.saveServersConfig();
    }
  }
}
