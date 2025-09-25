import { useEffect, useCallback, useState } from 'react';

// Типы для IPC сообщений
export interface IpcMessage {
  type: string;
  data?: any;
  error?: string;
}

export interface ServerStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'deploying' | 'error';
  deployed: boolean;
  connected: boolean;
  lastCheck?: string;
  error?: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  source?: string;
}

export interface ProgressUpdate {
  taskId: string;
  progress: number;
  message: string;
  completed: boolean;
  error?: string;
}

// Основной хук для IPC коммуникации
export const useIpc = () => {
  const [isConnected, setIsConnected] = useState(false);

  // Проверяем доступность Electron API
  useEffect(() => {
    if (window.electronAPI) {
      setIsConnected(true);
    }
  }, []);

  // Отправка сообщения в main процесс
  const sendMessage = useCallback((channel: string, data?: any) => {
    if (!window.electronAPI) {
      console.warn('Electron API not available');
      return Promise.reject(new Error('Electron API not available'));
    }

    return window.electronAPI.invoke(channel, data);
  }, []);

  // Подписка на события от main процесса
  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    if (!window.electronAPI) {
      console.warn('Electron API not available');
      return () => {};
    }

    window.electronAPI.on(channel, callback);
    
    // Возвращаем функцию отписки
    return () => {
      window.electronAPI.removeListener(channel, callback);
    };
  }, []);

  return {
    isConnected,
    sendMessage,
    subscribe
  };
};

// Хук для управления серверами
export const useServerManager = () => {
  const { sendMessage, subscribe } = useIpc();
  const [servers, setServers] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState<string | null>(null);
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});

  // Загрузка списка серверов
  const loadServers = useCallback(async () => {
    try {
      const servers = await sendMessage('get-all-servers');
      setServers(servers || []);
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  }, [sendMessage]);

  // Получение статуса сервера
  const getServerStatus = useCallback(async (serverId: string) => {
    try {
      return await sendMessage('get-server-status', serverId);
    } catch (error) {
      console.error('Failed to get server status:', error);
      throw error;
    }
  }, [sendMessage]);

  // Тестирование подключения к серверу
  const testConnection = useCallback(async (serverId: string) => {
    try {
      return await sendMessage('test-connection', serverId);
    } catch (error) {
      console.error('Failed to test connection:', error);
      throw error;
    }
  }, [sendMessage]);

  // Развертывание сервера
  const deployServer = useCallback(async (serverId: string) => {
    try {
      return await sendMessage('deploy-server', serverId);
    } catch (error) {
      console.error('Failed to deploy server:', error);
      throw error;
    }
  }, [sendMessage]);

  // Подключение к серверу
  const connectServer = useCallback(async (serverId: string) => {
    try {
      return await sendMessage('connect-server', serverId);
    } catch (error) {
      console.error('Failed to connect to server:', error);
      throw error;
    }
  }, [sendMessage]);

  // Отключение от сервера
  const disconnectServer = useCallback(async (serverId: string) => {
    try {
      return await sendMessage('disconnect-server', serverId);
    } catch (error) {
      console.error('Failed to disconnect from server:', error);
      throw error;
    }
  }, [sendMessage]);

  // Полная подготовка сервера
  const ensureLLMReady = useCallback(async (serverId: string) => {
    try {
      return await sendMessage('ensure-llm-ready', serverId);
    } catch (error) {
      console.error('Failed to ensure LLM ready:', error);
      throw error;
    }
  }, [sendMessage]);

  // Обновление конфигурации сервера
  const updateServer = useCallback(async (server: any) => {
    try {
      const result = await sendMessage('update-server', server);
      await loadServers(); // Перезагружаем список
      return result;
    } catch (error) {
      console.error('Failed to update server:', error);
      throw error;
    }
  }, [sendMessage, loadServers]);

  // Подписка на обновления статуса серверов
  useEffect(() => {
    const unsubscribeStatus = subscribe('server-status-change', (data: any) => {
      setServerStatuses(prev => ({
        ...prev,
        [data.serverId]: { ...prev[data.serverId], status: data.status }
      }));
    });

    const unsubscribeProgress = subscribe('server-progress', (data: any) => {
      console.log('Server progress:', data);
    });

    const unsubscribeLog = subscribe('server-log', (data: any) => {
      console.log('Server log:', data);
    });

    const unsubscribeDeployment = subscribe('deployment-progress', (data: any) => {
      console.log('Deployment progress:', data);
    });

    const unsubscribeConnection = subscribe('connection-tested', (data: any) => {
      console.log('Connection tested:', data);
    });

    const unsubscribeReady = subscribe('server-ready', (data: any) => {
      console.log('Server ready:', data);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
      unsubscribeLog();
      unsubscribeDeployment();
      unsubscribeConnection();
      unsubscribeReady();
    };
  }, [subscribe]);

  // Загрузка серверов при монтировании
  useEffect(() => {
    loadServers();
  }, [loadServers]);

  return {
    servers,
    activeServer,
    serverStatuses,
    loadServers,
    getServerStatus,
    testConnection,
    deployServer,
    connectServer,
    disconnectServer,
    ensureLLMReady,
    updateServer,
    setActiveServer
  };
};

// Хук для работы с LLM чатом
export const useLlmChat = () => {
  const { sendMessage, subscribe } = useIpc();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Отправка сообщения в чат
  const sendChatMessage = useCallback(async (message: string, serverId: string) => {
    if (!message.trim() || !serverId) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Формируем историю сообщений для отправки
      const chatHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await sendMessage('llm-chat', { serverId, messages: chatHistory });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
        usage: response.usage
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage, messages]);

  // Получение списка моделей
  const getModels = useCallback(async (serverId: string) => {
    try {
      return await sendMessage('llm-get-models', serverId);
    } catch (error) {
      console.error('Failed to get models:', error);
      throw error;
    }
  }, [sendMessage]);

  // Очистка истории чата
  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Проверка подключения к LLM (через статус сервера)
  const checkLlmConnection = useCallback(async (serverId: string) => {
    try {
      const status = await sendMessage('get-server-status', serverId);
      const connected = status?.connected || false;
      setIsConnected(connected);
      return connected;
    } catch (error) {
      setIsConnected(false);
      throw error;
    }
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    isConnected,
    sendChatMessage,
    getModels,
    clearChat,
    checkLlmConnection
  };
};

// Хук для работы с логами
export const useLogs = () => {
  const { subscribe } = useIpc();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [maxLogs] = useState(1000); // Максимальное количество логов в памяти

  // Добавление нового лога
  const addLog = useCallback((log: LogEntry) => {
    setLogs(prev => {
      const newLogs = [...prev, log];
      // Ограничиваем количество логов
      if (newLogs.length > maxLogs) {
        return newLogs.slice(-maxLogs);
      }
      return newLogs;
    });
  }, [maxLogs]);

  // Очистка логов
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Фильтрация логов по уровню
  const filterLogs = useCallback((level?: string) => {
    if (!level) return logs;
    return logs.filter(log => log.level === level);
  }, [logs]);

  // Подписка на новые логи
  useEffect(() => {
    const unsubscribe = subscribe('log:entry', addLog);
    return unsubscribe;
  }, [subscribe, addLog]);

  return {
    logs,
    addLog,
    clearLogs,
    filterLogs
  };
};

// Хук для отслеживания прогресса задач
export const useTaskProgress = () => {
  const { subscribe } = useIpc();
  const [tasks, setTasks] = useState<Record<string, ProgressUpdate>>({});

  // Подписка на обновления прогресса
  useEffect(() => {
    const unsubscribe = subscribe('task:progress', (data: ProgressUpdate) => {
      setTasks(prev => ({
        ...prev,
        [data.taskId]: data
      }));

      // Удаляем завершенные задачи через 5 секунд
      if (data.completed) {
        setTimeout(() => {
          setTasks(prev => {
            const { [data.taskId]: removed, ...rest } = prev;
            return rest;
          });
        }, 5000);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  return {
    tasks,
    getTask: (taskId: string) => tasks[taskId],
    clearTask: (taskId: string) => {
      setTasks(prev => {
        const { [taskId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };
};

// Алиас для совместимости с тестами
export const useLogger = useLogs;

// Типы для window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, data?: any) => Promise<any>;
      on: (channel: string, callback: (data: any) => void) => void;
      removeListener: (channel: string, callback: (data: any) => void) => void;
    };
  }
}
