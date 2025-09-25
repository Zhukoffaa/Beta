const { contextBridge, ipcRenderer } = require('electron');

// Безопасный API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Логирование
  log: (level, message) => ipcRenderer.invoke('log', level, message),
  
  // Конфигурация
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  getServers: () => ipcRenderer.invoke('get-servers'),
  updateServer: (server) => ipcRenderer.invoke('update-server', server),
  
  // Управление серверами
  testConnection: (serverId) => ipcRenderer.invoke('test-connection', serverId),
  deployServer: (serverId) => ipcRenderer.invoke('deploy-server', serverId),
  connectServer: (serverId) => ipcRenderer.invoke('connect-server', serverId),
  disconnectServer: (serverId) => ipcRenderer.invoke('disconnect-server', serverId),
  
  // LLM операции
  llmChat: (serverId, messages) => ipcRenderer.invoke('llm-chat', serverId, messages),
  llmGetModels: (serverId) => ipcRenderer.invoke('llm-get-models', serverId),
  
  // Управление окном настроек серверов
  openServerSettings: () => ipcRenderer.invoke('open-server-settings'),
  closeServerSettings: () => ipcRenderer.invoke('close-server-settings'),
  
  // Универсальные методы для IPC событий
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  once: (channel, listener) => ipcRenderer.once(channel, listener),
  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // События от main процесса
  onServerProgress: (callback) => {
    ipcRenderer.on('server-progress', (_, data) => callback(data));
  },
  
  onServerLog: (callback) => {
    ipcRenderer.on('server-log', (_, data) => callback(data));
  },
  
  onServerStatusChange: (callback) => {
    ipcRenderer.on('server-status-change', (_, data) => callback(data));
  },
  
  // Удаление слушателей
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Логирование для отладки
console.log('Preload script loaded successfully');
