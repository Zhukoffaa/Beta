const { SSHService } = require('../../backend/services/sshService');

function runSSHTests() {
  console.log('Запуск тестов SSHService...');
  
  const sshService = new SSHService();
  
  const mockConfig = {
    host: '127.0.0.1',
    port: 22,
    user: 'testuser',
    sshKey: '/fake/key/path'
  };
  
  console.log('✓ SSHService создан');
  
  sshService.checkConnection(mockConfig, 1000)
    .then(() => {
      console.log('✗ Подключение к несуществующему серверу прошло (ошибка)');
    })
    .catch(() => {
      console.log('✓ Подключение к несуществующему серверу отклонено');
    });
  
  const validHost = sshService.validateHost('192.168.1.1');
  if (validHost) {
    console.log('✓ Валидация хоста работает');
  } else {
    console.log('✗ Валидация хоста не работает');
  }
  
  const invalidHost = sshService.validateHost('invalid-host-name-999');
  if (!invalidHost) {
    console.log('✓ Валидация отклоняет неверные хосты');
  } else {
    console.log('✗ Валидация пропускает неверные хосты');
  }
  
  const portCheck = sshService.isPortInUse(99999);
  portCheck.then(inUse => {
    if (!inUse) {
      console.log('✓ Проверка порта работает');
    } else {
      console.log('✗ Проверка порта не работает');
    }
  });
  
  setTimeout(() => {
    console.log('Тесты SSHService завершены\n');
  }, 2000);
}

if (require.main === module) {
  runSSHTests();
}

module.exports = { runSSHTests };
