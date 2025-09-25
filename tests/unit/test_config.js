const fs = require('fs');
const path = require('path');
const { ConfigService } = require('../../backend/services/config');

const testConfigDir = path.join(__dirname, 'temp_configs');

function cleanup() {
  if (fs.existsSync(testConfigDir)) {
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  }
}

function runConfigTests() {
  console.log('Запуск тестов ConfigService...');
  
  cleanup();
  
  const config = new ConfigService(testConfigDir);
  
  const appConfig = config.getAppConfig();
  if (appConfig && appConfig.app && appConfig.app.name === 'Windows LLM Agent') {
    console.log('✓ Дефолтная конфигурация приложения загружена');
  } else {
    console.log('✗ Ошибка загрузки дефолтной конфигурации');
  }
  
  const servers = config.getServers();
  if (servers && servers.servers && servers.servers.length > 0) {
    console.log('✓ Дефолтная конфигурация серверов загружена');
  } else {
    console.log('✗ Ошибка загрузки дефолтных серверов');
  }
  
  const testServer = {
    name: 'Test Server',
    host: '192.168.1.200',
    port: 22,
    user: 'testuser',
    sshKey: '/path/to/key',
    deployPath: '/opt/test',
    llmPort: 8080,
    status: 'disconnected',
    deployed: false,
    connected: false,
    projectPath: '/home/test'
  };
  
  const serverId = config.addServer(testServer);
  if (serverId) {
    console.log('✓ Сервер добавлен');
  } else {
    console.log('✗ Ошибка добавления сервера');
  }
  
  const addedServer = config.getServer(serverId);
  if (addedServer && addedServer.name === 'Test Server') {
    console.log('✓ Сервер найден по ID');
  } else {
    console.log('✗ Сервер не найден');
  }
  
  config.setActiveServer(serverId);
  const activeServer = config.getActiveServer();
  if (activeServer && activeServer.id === serverId) {
    console.log('✓ Активный сервер установлен');
  } else {
    console.log('✗ Ошибка установки активного сервера');
  }
  
  const updatedServer = { ...addedServer, name: 'Updated Test Server' };
  config.updateServer(updatedServer);
  const updated = config.getServer(serverId);
  if (updated && updated.name === 'Updated Test Server') {
    console.log('✓ Сервер обновлен');
  } else {
    console.log('✗ Ошибка обновления сервера');
  }
  
  const errors = config.validateServerConfig({ name: '', host: 'test' });
  if (errors.length > 0) {
    console.log('✓ Валидация работает');
  } else {
    console.log('✗ Валидация не работает');
  }
  
  const removed = config.removeServer(serverId);
  if (removed) {
    console.log('✓ Сервер удален');
  } else {
    console.log('✗ Ошибка удаления сервера');
  }
  
  const appConfigPath = path.join(testConfigDir, 'app.yaml');
  const serversConfigPath = path.join(testConfigDir, 'servers.json');
  
  if (fs.existsSync(appConfigPath) && fs.existsSync(serversConfigPath)) {
    console.log('✓ Конфигурационные файлы созданы');
  } else {
    console.log('✗ Конфигурационные файлы не созданы');
  }
  
  cleanup();
  console.log('Тесты ConfigService завершены\n');
}

if (require.main === module) {
  runConfigTests();
}

module.exports = { runConfigTests };
