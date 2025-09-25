/**
 * Chat Task - Worker для обработки чат-запросов к LLM
 * Выполняется в отдельном потоке для предотвращения блокировки UI при длительных запросах
 */

import { parentPort } from 'worker_threads';
import axios, { AxiosResponse } from 'axios';

// Интерфейсы для типизации
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface ChatConfig {
  serverId: string;
  baseUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  streaming?: boolean;
}

interface ChatRequest {
  messages: ChatMessage[];
  config: ChatConfig;
  requestId: string;
}

interface TaskMessage {
  type: 'progress' | 'log' | 'complete' | 'error' | 'chunk';
  data: any;
  timestamp: string;
  requestId?: string;
}

interface ChatResult {
  success: boolean;
  requestId: string;
  serverId: string;
  response?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
  logs: string[];
  error?: string;
  duration?: number;
}

// Глобальные переменные
let chatLogs: string[] = [];
let activeRequests = new Map<string, AbortController>();

/**
 * Отправка сообщения в главный поток
 */
function sendMessage(type: TaskMessage['type'], data: any, requestId?: string) {
  const message: TaskMessage = {
    type,
    data,
    timestamp: new Date().toISOString(),
    requestId
  };
  
  if (parentPort) {
    parentPort.postMessage(message);
  }
  
  // Также сохраняем в локальные логи
  if (type === 'log') {
    chatLogs.push(`[${message.timestamp}] ${data.message || data}`);
  }
}

/**
 * Логирование с отправкой в UI
 */
function log(level: 'info' | 'warn' | 'error', message: string, requestId?: string) {
  sendMessage('log', {
    level,
    message,
    source: 'chatTask'
  }, requestId);
}

/**
 * Отправка прогресса выполнения
 */
function sendProgress(step: string, requestId: string) {
  sendMessage('progress', {
    step,
    requestId
  }, requestId);
}

/**
 * Валидация конфигурации чата
 */
function validateChatConfig(config: ChatConfig): void {
  if (!config.baseUrl) {
    throw new Error('Не указан базовый URL для LLM API');
  }
  
  if (!config.serverId) {
    throw new Error('Не указан ID сервера');
  }
  
  // Проверяем формат URL
  try {
    new URL(config.baseUrl);
  } catch (error) {
    throw new Error(`Некорректный URL: ${config.baseUrl}`);
  }
}

/**
 * Валидация сообщений чата
 */
function validateChatMessages(messages: ChatMessage[]): void {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Список сообщений пуст или некорректен');
  }
  
  for (const message of messages) {
    if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
      throw new Error(`Некорректная роль сообщения: ${message.role}`);
    }
    
    if (!message.content || typeof message.content !== 'string') {
      throw new Error('Содержимое сообщения должно быть непустой строкой');
    }
    
    if (message.content.length > 32000) {
      throw new Error('Сообщение слишком длинное (максимум 32000 символов)');
    }
  }
}

/**
 * Подготовка запроса к LLM API
 */
function prepareApiRequest(messages: ChatMessage[], config: ChatConfig) {
  const requestBody = {
    model: config.model || 'gpt-3.5-turbo',
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    temperature: config.temperature || 0.7,
    max_tokens: config.maxTokens || 2000,
    stream: config.streaming || false
  };
  
  const requestConfig = {
    timeout: config.timeout || 60000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Windows-LLM-Agent/1.0'
    }
  };
  
  return { requestBody, requestConfig };
}

/**
 * Обработка потокового ответа от LLM
 */
async function handleStreamingResponse(
  response: AxiosResponse,
  requestId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullResponse = '';
    let buffer = '';
    
    response.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Сохраняем неполную строку
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            resolve(fullResponse);
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              fullResponse += content;
              
              // Отправляем чанк в UI
              sendMessage('chunk', {
                content,
                fullResponse,
                requestId
              }, requestId);
            }
            
            // Проверяем причину завершения
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason) {
              resolve(fullResponse);
              return;
            }
          } catch (error) {
            log('warn', `Ошибка парсинга SSE данных: ${error}`, requestId);
          }
        }
      }
    });
    
    response.data.on('end', () => {
      resolve(fullResponse);
    });
    
    response.data.on('error', (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Отправка запроса к LLM API
 */
async function sendChatRequest(
  messages: ChatMessage[],
  config: ChatConfig,
  requestId: string
): Promise<ChatResult> {
  const startTime = Date.now();
  
  try {
    log('info', `Отправка запроса к LLM: ${config.baseUrl}`, requestId);
    sendProgress('Отправка запроса к LLM', requestId);
    
    // Валидация
    validateChatConfig(config);
    validateChatMessages(messages);
    
    // Подготовка запроса
    const { requestBody, requestConfig } = prepareApiRequest(messages, config);
    
    // Создаем AbortController для возможности отмены
    const abortController = new AbortController();
    activeRequests.set(requestId, abortController);
    
    const finalConfig = {
      ...requestConfig,
      signal: abortController.signal,
      responseType: config.streaming ? 'stream' : 'json' as any
    };
    
    log('info', `Модель: ${requestBody.model}, Сообщений: ${messages.length}`, requestId);
    
    // Отправляем запрос
    const url = `${config.baseUrl}/v1/chat/completions`;
    const response = await axios.post(url, requestBody, finalConfig);
    
    let responseText = '';
    let usage = undefined;
    let model = requestBody.model;
    let finishReason = 'stop';
    
    if (config.streaming) {
      sendProgress('Получение потокового ответа', requestId);
      responseText = await handleStreamingResponse(response, requestId);
    } else {
      sendProgress('Обработка ответа', requestId);
      
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const choice = response.data.choices[0];
        responseText = choice.message?.content || '';
        finishReason = choice.finish_reason || 'stop';
      }
      
      // Извлекаем информацию об использовании токенов
      if (response.data.usage) {
        usage = {
          promptTokens: response.data.usage.prompt_tokens || 0,
          completionTokens: response.data.usage.completion_tokens || 0,
          totalTokens: response.data.usage.total_tokens || 0
        };
      }
      
      if (response.data.model) {
        model = response.data.model;
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Удаляем из активных запросов
    activeRequests.delete(requestId);
    
    log('info', `Ответ получен за ${duration}мс, символов: ${responseText.length}`, requestId);
    
    return {
      success: true,
      requestId,
      serverId: config.serverId,
      response: responseText,
      usage,
      model,
      finishReason,
      logs: chatLogs,
      duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    activeRequests.delete(requestId);
    
    let errorMessage = 'Неизвестная ошибка';
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Превышено время ожидания ответа';
      } else if (error.response) {
        errorMessage = `HTTP ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'Нет ответа от сервера';
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    log('error', `Ошибка запроса: ${errorMessage}`, requestId);
    
    return {
      success: false,
      requestId,
      serverId: config.serverId,
      logs: chatLogs,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Отмена активного запроса
 */
function cancelChatRequest(requestId: string): void {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
    log('info', `Запрос ${requestId} отменен`, requestId);
  }
}

/**
 * Получение статистики активных запросов
 */
function getActiveRequestsStats() {
  return {
    activeCount: activeRequests.size,
    activeRequestIds: Array.from(activeRequests.keys())
  };
}

// Обработка сообщений от главного потока
if (parentPort) {
  parentPort.on('message', async (message) => {
    const { type, data } = message;
    
    switch (type) {
      case 'chat':
        {
          const chatRequest: ChatRequest = data;
          
          try {
            const result = await sendChatRequest(
              chatRequest.messages,
              chatRequest.config,
              chatRequest.requestId
            );
            
            sendMessage('complete', result, chatRequest.requestId);
          } catch (error) {
            sendMessage('error', {
              message: error instanceof Error ? error.message : 'Неизвестная ошибка',
              requestId: chatRequest.requestId,
              serverId: chatRequest.config.serverId
            }, chatRequest.requestId);
          }
        }
        break;
        
      case 'cancel':
        {
          const { requestId } = data;
          cancelChatRequest(requestId);
          
          sendMessage('complete', {
            cancelled: true,
            requestId
          }, requestId);
        }
        break;
        
      case 'stats':
        {
          const stats = getActiveRequestsStats();
          sendMessage('complete', stats);
        }
        break;
        
      default:
        log('warn', `Неизвестный тип сообщения: ${type}`);
    }
  });
}

// Обработка завершения процесса
process.on('SIGTERM', () => {
  log('info', 'Получен сигнал завершения, отмена активных запросов...');
  
  // Отменяем все активные запросы
  for (const [requestId, controller] of activeRequests) {
    controller.abort();
    log('info', `Запрос ${requestId} отменен при завершении`);
  }
  
  activeRequests.clear();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'Получен сигнал прерывания, отмена активных запросов...');
  
  for (const [requestId, controller] of activeRequests) {
    controller.abort();
  }
  
  activeRequests.clear();
  process.exit(0);
});

// Экспорт для тестирования
export { 
  sendChatRequest, 
  cancelChatRequest, 
  getActiveRequestsStats,
  ChatConfig, 
  ChatMessage, 
  ChatResult 
};
