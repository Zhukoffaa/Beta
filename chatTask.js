
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

async function chatTask() {
  const { taskId, args } = workerData;
  
  try {
    sendMessage('log', { level: 'info', message: 'Начало обработки чат запроса' });
    
    const messages = args.messages || [];
    sendMessage('progress', { progress: 25, message: 'Валидация сообщений' });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    sendMessage('progress', { progress: 50, message: 'Отправка запроса к LLM' });
    
    // Симуляция обработки сообщений
    for (let i = 0; i < messages.length; i++) {
      sendMessage('log', { 
        level: 'info', 
        message: `Обработка сообщения ${i + 1}: ${messages[i].content.substring(0, 50)}...`
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    sendMessage('progress', { progress: 75, message: 'Получение ответа' });
    await new Promise(resolve => setTimeout(resolve, 200));
    
    sendMessage('progress', { progress: 100, message: 'Обработка завершена' });
    
    sendMessage('complete', {
      data: {
        serverId: args.serverId,
        response: {
          role: 'assistant',
          content: 'Тестовый ответ от LLM сервера. Запрос обработан успешно!'
        },
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75
        }
      }
    });
    
  } catch (error) {
    sendMessage('error', { error: error.message });
  }
}

chatTask();
