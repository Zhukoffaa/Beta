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
  // Новые поля для Vast.AI формата
  instanceId?: string;
  machineCopyPort?: number;
  publicIP?: string;
  instancePortRange?: string;
  ipAddressType?: string;
  localIPAddresses?: string;
  proxyCommand?: string;
}

interface ServersPanel {
  onServerSelect?: (serverId: string) => void;
}

const ServersPanel: React.FC<ServersPanel> = ({ onServerSelect }) => {
  const {
    servers,
    activeServer,
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

  // Загрузка серверов при монтировании
  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Выбор первого сервера по умолчанию
  useEffect(() => {
    if (servers.length > 0 && !selectedServer) {
      setSelectedServer(servers[0]);
      onServerSelect?.(servers[0].id);
    }
  }, [servers, selectedServer, onServerSelect]);

  const handleServerSelect = (server: Server) => {
    setSelectedServer(server);
    setIsEditing(false);
    onServerSelect?.(server.id);
  };

  const handleInputChange = (field: keyof Server, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveServer = async () => {
    if (!formData.name || !formData.host || !formData.user) {
      alert('Пожалуйста, заполните все обязательные поля:\n- Название сервера\n- Хост (например: ssh2.vast.ai)\n- Пользователь (например: root)');
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
      // Очищаем форму только после успешного сохранения
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

  return (
    <div className="panel w-80 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">Серверы</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary text-sm py-1 px-2"
        >
          + Добавить
        </button>
      </div>

      {/* Список серверов */}
      <div className="space-y-2 mb-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className={`card cursor-pointer transition-colors ${
              selectedServer?.id === server.id ? 'ring-2 ring-primary-500' : ''
            }`}
            onClick={() => handleServerSelect(server)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-100">{server.name}</h3>
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

      {/* Форма добавления/редактирования */}
      {(showAddForm || isEditing) && (
        <div className="card mb-4">
          <h3 className="font-medium text-gray-100 mb-3">
            {isEditing ? 'Редактировать сервер' : 'Добавить сервер'}
          </h3>
          
          <div className="space-y-3">
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

            <div className="grid grid-cols-2 gap-2">
              <div className="form-group">
                <label className="form-label">Хост * (адрес сервера)</label>
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
            </div>

            <div className="form-group">
              <label className="form-label">Пользователь *</label>
              <input
                type="text"
                className="input-field"
                value={formData.user || ''}
                onChange={(e) => handleInputChange('user', e.target.value)}
                placeholder="admin"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SSH Ключ</label>
              <input
                type="text"
                className="input-field"
                value={formData.sshKey || ''}
                onChange={(e) => handleInputChange('sshKey', e.target.value)}
                placeholder="Путь к приватному ключу"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
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
            </div>

            <div className="form-group">
              <label className="form-label">Путь проекта</label>
              <input
                type="text"
                className="input-field"
                value={formData.projectPath || ''}
                onChange={(e) => handleInputChange('projectPath', e.target.value)}
                placeholder="/home/admin/llm-project"
              />
            </div>

            {/* Дополнительные поля для Vast.AI */}
            <div className="border-t border-dark-600 pt-3 mt-3">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Дополнительная информация (Vast.AI)</h4>
              
              <div className="grid grid-cols-2 gap-2">
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

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Instance Port Range</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.instancePortRange || ''}
                    onChange={(e) => handleInputChange('instancePortRange', e.target.value)}
                    placeholder="39166-39166"
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
              </div>

              <div className="form-group">
                <label className="form-label">Local IP Addresses</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.localIPAddresses || ''}
                  onChange={(e) => handleInputChange('localIPAddresses', e.target.value)}
                  placeholder="10.10.0.210 192.168.122.1 172.17.0.1"
                />
              </div>

              <div className="form-group">
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

            <div className="flex space-x-2">
              <button
                onClick={() => setShowImageParser(true)}
                className="btn-success flex-1"
              >
                📷 Из скриншотов
              </button>
              <button
                onClick={handleSaveServer}
                className="btn-primary flex-1"
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setShowAddForm(false);
                }}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Действия с выбранным сервером */}
      {selectedServer && !isEditing && !showAddForm && (
        <div className="card">
          <h3 className="font-medium text-gray-100 mb-3">Действия</h3>
          
          <div className="space-y-2">
            <button
              onClick={() => handleTestConnection(selectedServer.id)}
              className="btn-secondary w-full"
              disabled={!!tasks[`test-${selectedServer.id}`]}
            >
              {tasks[`test-${selectedServer.id}`] ? (
                <span className="flex items-center justify-center">
                  <div className="spinner mr-2" />
                  Тестирование...
                </span>
              ) : (
                'Тест подключения'
              )}
            </button>

            <button
              onClick={() => handleDeploy(selectedServer.id)}
              className="btn-primary w-full"
              disabled={!!tasks[`deploy-${selectedServer.id}`]}
            >
              {tasks[`deploy-${selectedServer.id}`] ? (
                <span className="flex items-center justify-center">
                  <div className="spinner mr-2" />
                  Развертывание...
                </span>
              ) : (
                'Развернуть LLM'
              )}
            </button>

            <button
              onClick={() => handleConnect(selectedServer.id)}
              className="btn-success w-full"
              disabled={!!tasks[`connect-${selectedServer.id}`]}
            >
              {tasks[`connect-${selectedServer.id}`] ? (
                <span className="flex items-center justify-center">
                  <div className="spinner mr-2" />
                  Подключение...
                </span>
              ) : (
                'Подключиться'
              )}
            </button>

            <button
              onClick={() => {
                setFormData(selectedServer);
                setIsEditing(true);
              }}
              className="btn-secondary w-full"
            >
              Редактировать
            </button>
          </div>

          {/* Информация о сервере */}
          <div className="mt-4 pt-4 border-t border-dark-600">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Информация о сервере</h4>
            <div className="text-xs text-gray-400 space-y-1">
              <div>Развернут: {selectedServer.deployed ? 'Да' : 'Нет'}</div>
              <div>Подключен: {selectedServer.connected ? 'Да' : 'Нет'}</div>
              {selectedServer.lastCheck && (
                <div>Последняя проверка: {new Date(selectedServer.lastCheck).toLocaleString()}</div>
              )}
            </div>

            {/* Дополнительная информация Vast.AI */}
            {(selectedServer.instanceId || selectedServer.publicIP) && (
              <div className="mt-3 pt-3 border-t border-dark-700">
                <h5 className="text-xs font-medium text-gray-300 mb-2">IP & Port Info:</h5>
                <div className="text-xs text-gray-400 space-y-1">
                  {selectedServer.instanceId && (
                    <div>Instance ID: {selectedServer.instanceId}</div>
                  )}
                  {selectedServer.machineCopyPort && (
                    <div>Machine Copy Port: {selectedServer.machineCopyPort}</div>
                  )}
                  {selectedServer.publicIP && (
                    <div>Public IP Address: {selectedServer.publicIP}</div>
                  )}
                  {selectedServer.instancePortRange && (
                    <div>Instance Port Range: {selectedServer.instancePortRange}</div>
                  )}
                  {selectedServer.ipAddressType && (
                    <div>IP Address Type: {selectedServer.ipAddressType}</div>
                  )}
                  {selectedServer.localIPAddresses && (
                    <div>Local IP Addresses: {selectedServer.localIPAddresses}</div>
                  )}
                </div>
              </div>
            )}

            {/* SSH команда */}
            {selectedServer.proxyCommand && (
              <div className="mt-3 pt-3 border-t border-dark-700">
                <h5 className="text-xs font-medium text-gray-300 mb-2">Proxy SSH Connect:</h5>
                <div className="text-xs text-gray-400 font-mono bg-dark-800 p-2 rounded break-all">
                  {selectedServer.proxyCommand}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Компонент распознавания изображений */}
      {showImageParser && (
        <ImageServerParser
          onDataParsed={handleImageDataParsed}
          onClose={() => setShowImageParser(false)}
        />
      )}
    </div>
  );
};

export default ServersPanel;
