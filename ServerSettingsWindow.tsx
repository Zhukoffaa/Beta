import React, { useState, useEffect } from 'react';
import { useServerManager, useTaskProgress } from '../hooks/useIpc';
import ImageServerParser from './ImageServerParser';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  sshKey: string;
  deployPath: string;
  llmPort: number;
  status: string;
  deployed: boolean;
  connected: boolean;
  lastCheck?: string;
  projectPath: string;
  instanceId?: string;
  machineCopyPort?: number;
  publicIP?: string;
  instancePortRange?: string;
  ipAddressType?: string;
  localIPAddresses?: string;
  proxyCommand?: string;
}

interface ServerSettingsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const ServerSettingsWindow: React.FC<ServerSettingsWindowProps> = ({ isOpen, onClose }) => {
  const {
    servers,
    serverStatuses,
    loadServers,
    testConnection,
    deployServer,
    connectServer,
    updateServer
  } = useServerManager();

  const { tasks } = useTaskProgress();

  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImageParser, setShowImageParser] = useState(false);
  const [formData, setFormData] = useState<Partial<Server>>({
    name: '',
    host: '',
    port: 22,
    user: '',
    sshKey: '',
    deployPath: '/opt/llm',
    llmPort: 8080,
    projectPath: '/home/admin/llm-project'
  });

  useEffect(() => {
    if (isOpen) {
      loadServers();
    }
  }, [isOpen, loadServers]);

  useEffect(() => {
    if (servers.length > 0 && !selectedServer) {
      setSelectedServer(servers[0]);
    }
  }, [servers, selectedServer]);

  const handleServerSelect = (server: Server) => {
    setSelectedServer(server);
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof Server, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveServer = async () => {
    if (!formData.name || !formData.host || !formData.user) {
      alert('Пожалуйста, заполните все обязательные поля:\n- Название сервера\n- Хост\n- Пользователь');
      return;
    }

    try {
      const serverData = {
        ...formData,
        id: selectedServer?.id || `server-${Date.now()}`,
        status: 'disconnected',
        deployed: false,
        connected: false
      };

      await updateServer(serverData);
      setIsEditing(false);
      setShowAddForm(false);
      setFormData({
        name: '',
        host: '',
        port: 22,
        user: '',
        sshKey: '',
        deployPath: '/opt/llm',
        llmPort: 8080,
        projectPath: '/home/admin/llm-project'
      });
      alert('Сервер успешно сохранен!');
    } catch (error) {
      console.error('Failed to save server:', error);
      alert('Ошибка при сохранении сервера: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleTestConnection = async (serverId: string) => {
    try {
      await testConnection(serverId);
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  const handleDeploy = async (serverId: string) => {
    try {
      await deployServer(serverId);
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  };

  const handleConnect = async (serverId: string) => {
    try {
      await connectServer(serverId);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const getStatusBadge = (server: Server) => {
    const status = serverStatuses[server.id];
    if (!status) {
      return <span className="status-disconnected">Отключен</span>;
    }

    switch (status.status) {
      case 'connected':
        return <span className="status-connected">Подключен</span>;
      case 'connecting':
        return <span className="status-connecting">Подключение...</span>;
      case 'deploying':
        return <span className="status-deploying">Развертывание...</span>;
      case 'error':
        return <span className="status-disconnected">Ошибка</span>;
      default:
        return <span className="status-disconnected">Отключен</span>;
    }
  };

  const handleImageDataParsed = (parsedData: any) => {
    setFormData(prev => ({
      ...prev,
      ...parsedData
    }));
    setShowImageParser(false);
  };

  const getTaskProgress = (serverId: string) => {
    const serverTasks = Object.values(tasks).filter(task => 
      task.taskId.includes(serverId)
    );
    
    if (serverTasks.length === 0) return null;
    
    const activeTask = serverTasks.find(task => !task.completed);
    if (!activeTask) return null;

    return (
      <div className="mt-2">
        <div className="text-xs text-gray-400 mb-1">{activeTask.message}</div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${activeTask.progress}%` }}
          />
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      {/* Modal */}
      <div className="modal-content w-full max-w-6xl h-5/6 flex overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 px-5 py-3 border-b border-macos-dark-border z-10 bg-macos-dark-surface backdrop-filter backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <h2 className="text-base font-medium text-white ml-2">Настройки серверов</h2>
            </div>
            <button
              onClick={onClose}
              className="text-macos-dark-secondary hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-macos-dark-hover transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex w-full pt-16">
          {/* Left Panel - Server List */}
          <div className="w-1/3 bg-gray-900 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-100">Серверы</h3>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
              >
                <span className="text-xs">+</span>
                <span>Добавить</span>
              </button>
            </div>

            <div className="space-y-2">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className={`card cursor-pointer transition-all duration-200 ${
                    selectedServer?.id === server.id ? 'ring-2 ring-blue-500 bg-gray-700' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => handleServerSelect(server)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-100">{server.name}</h4>
                    {getStatusBadge(server)}
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    <div>{server.user}@{server.host}:{server.port}</div>
                    <div>LLM: :{server.llmPort}</div>
                  </div>

                  {getTaskProgress(server.id)}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Server Details/Form */}
          <div className="flex-1 p-6 overflow-y-auto">
            {(showAddForm || isEditing) ? (
              <div className="space-y-6">
                <h3 className="text-xl font-medium text-gray-100 mb-4">
                  {isEditing ? 'Редактировать сервер' : 'Добавить сервер'}
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="form-label">Название *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Мой LLM сервер"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Хост *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.host || ''}
                      onChange={(e) => handleInputChange('host', e.target.value)}
                      placeholder="ssh2.vast.ai"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">SSH Порт</label>
                    <input
                      type="number"
                      className="input-field"
                      value={formData.port || 22}
                      onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Пользователь *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.user || ''}
                      onChange={(e) => handleInputChange('user', e.target.value)}
                      placeholder="root"
                    />
                  </div>

                  <div className="form-group col-span-2">
                    <label className="form-label">SSH Ключ</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.sshKey || ''}
                      onChange={(e) => handleInputChange('sshKey', e.target.value)}
                      placeholder="Путь к приватному ключу"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Путь развертывания</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.deployPath || ''}
                      onChange={(e) => handleInputChange('deployPath', e.target.value)}
                      placeholder="/opt/llm"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">LLM Порт</label>
                    <input
                      type="number"
                      className="input-field"
                      value={formData.llmPort || 8080}
                      onChange={(e) => handleInputChange('llmPort', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="form-group col-span-2">
                    <label className="form-label">Путь проекта</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.projectPath || ''}
                      onChange={(e) => handleInputChange('projectPath', e.target.value)}
                      placeholder="/home/admin/llm-project"
                    />
                  </div>
                </div>

                {/* Дополнительные поля Vast.AI */}
                <div className="border-t border-gray-600 pt-6">
                  <h4 className="text-lg font-medium text-gray-300 mb-4">Дополнительная информация (Vast.AI)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Instance ID</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.instanceId || ''}
                        onChange={(e) => handleInputChange('instanceId', e.target.value)}
                        placeholder="25954171"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Machine Copy Port</label>
                      <input
                        type="number"
                        className="input-field"
                        value={formData.machineCopyPort || ''}
                        onChange={(e) => handleInputChange('machineCopyPort', parseInt(e.target.value))}
                        placeholder="39999"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Public IP Address</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.publicIP || ''}
                        onChange={(e) => handleInputChange('publicIP', e.target.value)}
                        placeholder="213.181.108.221"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">IP Address Type</label>
                      <select
                        className="input-field"
                        value={formData.ipAddressType || 'Dynamic'}
                        onChange={(e) => handleInputChange('ipAddressType', e.target.value)}
                      >
                        <option value="Dynamic">Dynamic</option>
                        <option value="Static">Static</option>
                      </select>
                    </div>

                    <div className="form-group col-span-2">
                      <label className="form-label">Instance Port Range</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.instancePortRange || ''}
                        onChange={(e) => handleInputChange('instancePortRange', e.target.value)}
                        placeholder="39166-39166"
                      />
                    </div>

                    <div className="form-group col-span-2">
                      <label className="form-label">Local IP Addresses</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.localIPAddresses || ''}
                        onChange={(e) => handleInputChange('localIPAddresses', e.target.value)}
                        placeholder="10.10.0.210 192.168.122.1 172.17.0.1"
                      />
                    </div>

                    <div className="form-group col-span-2">
                      <label className="form-label">Proxy SSH Connect</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.proxyCommand || ''}
                        onChange={(e) => handleInputChange('proxyCommand', e.target.value)}
                        placeholder="ssh -p 34170 root@ssh2.vast.ai -L 8080:localhost:8080"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-6 border-t border-gray-600">
                  <button
                    onClick={() => setShowImageParser(true)}
                    className="btn-success"
                  >
                    📷 Из скриншотов
                  </button>
                  <button
                    onClick={handleSaveServer}
                    className="btn-primary"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setShowAddForm(false);
                    }}
                    className="btn-secondary"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : selectedServer ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-medium text-gray-100">{selectedServer.name}</h3>
                  <button
                    onClick={() => {
                      setFormData(selectedServer);
                      setIsEditing(true);
                    }}
                    className="btn-secondary"
                  >
                    Редактировать
                  </button>
                </div>

                {/* Server Actions */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleTestConnection(selectedServer.id)}
                    className="btn-secondary"
                    disabled={!!tasks[`test-${selectedServer.id}`]}
                  >
                    {tasks[`test-${selectedServer.id}`] ? 'Тестирование...' : 'Тест подключения'}
                  </button>

                  <button
                    onClick={() => handleDeploy(selectedServer.id)}
                    className="btn-primary"
                    disabled={!!tasks[`deploy-${selectedServer.id}`]}
                  >
                    {tasks[`deploy-${selectedServer.id}`] ? 'Развертывание...' : 'Развернуть LLM'}
                  </button>

                  <button
                    onClick={() => handleConnect(selectedServer.id)}
                    className="btn-success"
                    disabled={!!tasks[`connect-${selectedServer.id}`]}
                  >
                    {tasks[`connect-${selectedServer.id}`] ? 'Подключение...' : 'Подключиться'}
                  </button>
                </div>

                {/* Server Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="card">
                    <h4 className="font-medium text-gray-300 mb-3">Основная информация</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Хост:</span> {selectedServer.host}:{selectedServer.port}</div>
                      <div><span className="text-gray-400">Пользователь:</span> {selectedServer.user}</div>
                      <div><span className="text-gray-400">LLM Порт:</span> {selectedServer.llmPort}</div>
                      <div><span className="text-gray-400">Развернут:</span> {selectedServer.deployed ? 'Да' : 'Нет'}</div>
                      <div><span className="text-gray-400">Подключен:</span> {selectedServer.connected ? 'Да' : 'Нет'}</div>
                    </div>
                  </div>

                  {(selectedServer.instanceId || selectedServer.publicIP) && (
                    <div className="card">
                      <h4 className="font-medium text-gray-300 mb-3">Vast.AI информация</h4>
                      <div className="space-y-2 text-sm">
                        {selectedServer.instanceId && (
                          <div><span className="text-gray-400">Instance ID:</span> {selectedServer.instanceId}</div>
                        )}
                        {selectedServer.publicIP && (
                          <div><span className="text-gray-400">Public IP:</span> {selectedServer.publicIP}</div>
                        )}
                        {selectedServer.machineCopyPort && (
                          <div><span className="text-gray-400">Copy Port:</span> {selectedServer.machineCopyPort}</div>
                        )}
                        {selectedServer.instancePortRange && (
                          <div><span className="text-gray-400">Port Range:</span> {selectedServer.instancePortRange}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedServer.proxyCommand && (
                  <div className="card">
                    <h4 className="font-medium text-gray-300 mb-3">SSH команда</h4>
                    <div className="bg-gray-900 p-3 rounded font-mono text-sm text-gray-300 break-all">
                      {selectedServer.proxyCommand}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <div className="text-4xl mb-4">🖥️</div>
                <div className="text-lg">Выберите сервер для просмотра деталей</div>
                <div className="text-sm mt-2">или добавьте новый сервер</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Parser Modal */}
      {showImageParser && (
        <ImageServerParser
          onDataParsed={handleImageDataParsed}
          onClose={() => setShowImageParser(false)}
        />
      )}
    </div>
  );
};

export default ServerSettingsWindow;
