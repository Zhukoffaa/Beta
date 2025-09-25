const { TaskExecutor } = require('../../backend/services/taskExecutor');

function runTaskExecutorTests() {
  console.log('Запуск тестов TaskExecutor...');
  
  const taskExecutor = new TaskExecutor();
  
  console.log('✓ TaskExecutor создан');
  
  const testTask = {
    name: 'test',
    code: `
      const { parentPort } = require('worker_threads');
      parentPort.postMessage({ type: 'progress', data: { progress: 50, message: 'Test progress' } });
      setTimeout(() => {
        parentPort.postMessage({ type: 'complete', data: { result: 'Test completed' } });
      }, 100);
    `
  };
  
  const taskId = taskExecutor.runTask(testTask.name, {}, testTask.code);
  if (taskId) {
    console.log('✓ Задача запущена');
  } else {
    console.log('✗ Ошибка запуска задачи');
  }
  
  taskExecutor.on('progress', (data) => {
    if (data.taskId === taskId && data.progress === 50) {
      console.log('✓ Progress событие получено');
    }
  });
  
  taskExecutor.on('complete', (data) => {
    if (data.taskId === taskId) {
      console.log('✓ Complete событие получено');
    }
  });
  
  setTimeout(() => {
    const stats = taskExecutor.getStats();
    if (stats && typeof stats.totalTasks === 'number') {
      console.log('✓ Статистика работает');
    } else {
      console.log('✗ Статистика не работает');
    }
    
    const activeTasks = taskExecutor.getActiveTasks();
    if (Array.isArray(activeTasks)) {
      console.log('✓ Получение активных задач работает');
    } else {
      console.log('✗ Получение активных задач не работает');
    }
    
    console.log('Тесты TaskExecutor завершены\n');
  }, 500);
}

if (require.main === module) {
  runTaskExecutorTests();
}

module.exports = { runTaskExecutorTests };
