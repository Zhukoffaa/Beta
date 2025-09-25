
const { parentPort, workerData } = require('worker_threads');

function sendMessage(type, data) {
  if (parentPort) {
    parentPort.postMessage({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

async function connectTask() {
  const { taskId, args } = workerData;
  
  try {
    sendMessage('log', { level: 'info', message: 'Начало подключения к LLM серверу' });
    
    // Симуляция этапов подключения
    const steps = [
      'Проверка локального порта',
      'Создание SSH туннеля',
      'Проверка здоровья LLM',
      'Проверка API эндпоинтов'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      const progress = Math.round(((i + 1) / steps.length) * 100);
      sendMessage('progress', { progress, message: steps[i] });
      sendMessage('log', { level: 'info', message: `Этап ${i + 1}/${steps.length}: ${steps[i]}` });
      
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
    }
    
    sendMessage('complete', {
      data: {
        serverId: args.serverId,
        connected: true,
        localPort: args.localPort,
        tunnelActive: true
      }
    });
    
  } catch (error) {
    sendMessage('error', { error: error.message });
  }
}

connectTask();
