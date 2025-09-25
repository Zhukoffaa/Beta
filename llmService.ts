import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { Logger } from './logger';

export interface LLMConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: ChatMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  capabilities?: string[];
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  version?: string;
  uptime?: number;
  models?: string[];
  memory?: {
    used: number;
    total: number;
  };
  gpu?: {
    name: string;
    memory: {
      used: number;
      total: number;
    };
  };
}

export class LLMService extends EventEmitter {
  private logger: Logger;
  private client: AxiosInstance;
  private config: LLMConfig;
  private isConnected: boolean = false;
  private lastHealthCheck: Date | null = null;

  constructor(logger: Logger, config: LLMConfig) {
    super();
    this.logger = logger;
    this.config = config;
    this.client = this.createHttpClient();
  }

  /**
   * Создание HTTP клиента с настройками
   */
  private createHttpClient(): AxiosInstance {
    const clientConfig: AxiosRequestConfig = {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.config.headers
      }
    };

    // Добавляем API ключ если есть
    if (this.config.apiKey) {
      clientConfig.headers!['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const client = axios.create(clientConfig);

    // Интерцептор для логирования запросов
    client.interceptors.request.use(
      (config) => {
        this.logger.info(`LLM HTTP запрос: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('LLM HTTP ошибка запроса:', error);
        return Promise.reject(error);
      }
    );

    // Интерцептор для логирования ответов
    client.interceptors.response.use(
      (response) => {
        this.logger.info(`LLM HTTP ответ: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const status = error.response?.status || 'unknown';
        const url = error.config?.url || 'unknown';
        this.logger.error(`LLM HTTP ошибка ответа: ${status} ${url}`, error.message);
        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Проверка здоровья LLM сервера
   */
  async healthCheck(): Promise<HealthStatus> {
    this.logger.info(`Проверка здоровья LLM сервера: ${this.config.baseUrl}`);

    try {
      const response: AxiosResponse<any> = await this.client.get('/health');
      
      const healthStatus: HealthStatus = {
        status: 'healthy',
        version: response.data.version,
        uptime: response.data.uptime,
        models: response.data.models,
        memory: response.data.memory,
        gpu: response.data.gpu
      };

      this.isConnected = true;
      this.lastHealthCheck = new Date();
      
      this.logger.info('LLM сервер здоров');
      this.emit('health-check', healthStatus);
      
      return healthStatus;

    } catch (error) {
      this.isConnected = false;
      
      const healthStatus: HealthStatus = {
        status: 'unhealthy'
      };

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          this.logger.warn('LLM сервер недоступен (соединение отклонено)');
        } else if (error.code === 'ETIMEDOUT') {
          this.logger.warn('LLM сервер недоступен (таймаут)');
        } else {
          this.logger.error('LLM сервер ошибка:', error.message);
        }
      } else {
        this.logger.error('LLM сервер неизвестная ошибка:', error);
      }

      this.emit('health-check', healthStatus);
      return healthStatus;
    }
  }

  /**
   * Получение списка доступных моделей
   */
  async getModels(): Promise<ModelInfo[]> {
    this.logger.info('Получение списка моделей LLM');

    try {
      const response: AxiosResponse<any> = await this.client.get('/models');
      
      const models: ModelInfo[] = response.data.data?.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description,
        contextLength: model.context_length,
        capabilities: model.capabilities
      })) || [];

      this.logger.info(`Получено ${models.length} моделей LLM`);
      this.emit('models-loaded', models);
      
      return models;

    } catch (error) {
      this.logger.error('Ошибка получения моделей LLM:', error);
      this.emit('models-error', error);
      throw error;
    }
  }

  /**
   * Отправка сообщения в чат
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.logger.info(`Отправка сообщения в LLM чат (${request.messages.length} сообщений)`);

    try {
      // Подготавливаем запрос в формате OpenAI API
      const requestData = {
        model: request.model || 'default',
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
        stream: request.stream || false
      };

      const response: AxiosResponse<ChatResponse> = await this.client.post('/chat/completions', requestData);
      
      // Добавляем временные метки к сообщениям
      const chatResponse: ChatResponse = {
        ...response.data,
        choices: response.data.choices.map(choice => ({
          ...choice,
          message: {
            ...choice.message,
            timestamp: new Date()
          }
        }))
      };

      this.logger.info(`LLM ответ получен (${chatResponse.usage?.totalTokens || 0} токенов)`);
      this.emit('chat-response', chatResponse);
      
      return chatResponse;

    } catch (error) {
      this.logger.error('Ошибка LLM чата:', error);
      this.emit('chat-error', error);
      throw error;
    }
  }

  /**
   * Потоковый чат (Server-Sent Events)
   */
  async chatStream(request: ChatRequest, onChunk: (chunk: string) => void): Promise<void> {
    this.logger.info('Начало потокового LLM чата');

    try {
      const requestData = {
        model: request.model || 'default',
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
        stream: true
      };

      const response = await this.client.post('/chat/completions', requestData, {
        responseType: 'stream'
      });

      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        
        // Обрабатываем строки, разделенные \n
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Сохраняем неполную строку

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              this.logger.info('Потоковый LLM чат завершен');
              this.emit('chat-stream-complete');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                onChunk(content);
                this.emit('chat-stream-chunk', content);
              }
            } catch (parseError) {
              this.logger.warn('Ошибка парсинга потокового ответа:', parseError);
            }
          }
        }
      });

      response.data.on('end', () => {
        this.logger.info('Потоковый LLM чат завершен');
        this.emit('chat-stream-complete');
      });

      response.data.on('error', (error: Error) => {
        this.logger.error('Ошибка потокового LLM чата:', error);
        this.emit('chat-stream-error', error);
        throw error;
      });

    } catch (error) {
      this.logger.error('Ошибка запуска потокового LLM чата:', error);
      this.emit('chat-stream-error', error);
      throw error;
    }
  }

  /**
   * Получение информации о сервере
   */
  async getServerInfo(): Promise<any> {
    this.logger.info('Получение информации о LLM сервере');

    try {
      const response: AxiosResponse<any> = await this.client.get('/info');
      
      this.logger.info('Информация о LLM сервере получена');
      return response.data;

    } catch (error) {
      this.logger.error('Ошибка получения информации о LLM сервере:', error);
      throw error;
    }
  }

  /**
   * Проверка доступности конкретной модели
   */
  async checkModel(modelId: string): Promise<boolean> {
    this.logger.info(`Проверка доступности модели: ${modelId}`);

    try {
      const models = await this.getModels();
      const modelExists = models.some(model => model.id === modelId);
      
      this.logger.info(`Модель ${modelId} ${modelExists ? 'доступна' : 'недоступна'}`);
      return modelExists;

    } catch (error) {
      this.logger.error(`Ошибка проверки модели ${modelId}:`, error);
      return false;
    }
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.logger.info('Обновление конфигурации LLM сервиса');
    
    this.config = { ...this.config, ...newConfig };
    this.client = this.createHttpClient();
    this.isConnected = false;
    this.lastHealthCheck = null;
    
    this.emit('config-updated', this.config);
  }

  /**
   * Получение текущего статуса подключения
   */
  getConnectionStatus(): {
    connected: boolean;
    lastHealthCheck: Date | null;
    baseUrl: string;
  } {
    return {
      connected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      baseUrl: this.config.baseUrl
    };
  }

  /**
   * Периодическая проверка здоровья
   */
  startHealthMonitoring(intervalMs: number = 30000): void {
    this.logger.info(`Запуск мониторинга здоровья LLM (интервал: ${intervalMs}ms)`);
    
    const interval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        // Ошибки уже логируются в healthCheck
      }
    }, intervalMs);

    // Сохраняем интервал для возможности остановки
    this.emit('monitoring-started', interval);
  }

  /**
   * Остановка мониторинга
   */
  stopHealthMonitoring(interval: NodeJS.Timeout): void {
    this.logger.info('Остановка мониторинга здоровья LLM');
    clearInterval(interval);
    this.emit('monitoring-stopped');
  }

  /**
   * Тестирование подключения с простым запросом
   */
  async testConnection(): Promise<boolean> {
    this.logger.info('Тестирование подключения к LLM серверу');

    try {
      // Сначала проверяем здоровье
      const health = await this.healthCheck();
      
      if (health.status !== 'healthy') {
        return false;
      }

      // Затем пробуем простой чат-запрос
      const testRequest: ChatRequest = {
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test. Please respond with "OK".'
          }
        ],
        maxTokens: 10
      };

      const response = await this.chat(testRequest);
      const success = response.choices.length > 0;
      
      this.logger.info(`Тест подключения к LLM: ${success ? 'успешно' : 'неудачно'}`);
      return success;

    } catch (error) {
      this.logger.error('Ошибка тестирования подключения к LLM:', error);
      return false;
    }
  }

  /**
   * Получение статистики использования
   */
  async getUsageStats(): Promise<any> {
    this.logger.info('Получение статистики использования LLM');

    try {
      const response: AxiosResponse<any> = await this.client.get('/usage');
      
      this.logger.info('Статистика использования LLM получена');
      return response.data;

    } catch (error) {
      this.logger.warn('Статистика использования недоступна:', error);
      return null;
    }
  }
}
