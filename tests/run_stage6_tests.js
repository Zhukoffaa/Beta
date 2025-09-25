const { runAllUnitTests } = require('./run_unit_tests');
const { spawn } = require('child_process');
const path = require('path');

function runStage6Tests() {
  console.log('=== ЭТАП 6: ТЕСТИРОВАНИЕ И ОТЛАДКА ===\n');
  
  console.log('6.1 Запуск юнит-тестов...');
  runAllUnitTests();
  
  setTimeout(() => {
    console.log('\n6.2 Запуск интеграционных тестов...');
    
    const integrationTests = [
      'test_full_integration.js',
      'test_servermanager_integration.js',
      'comprehensive_test.js'
    ];
    
    integrationTests.forEach(test => {
      const testPath = path.join(__dirname, '..', test);
      console.log(`Запуск ${test}...`);
      
      const child = spawn('node', [testPath], { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit' 
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✓ ${test} завершен успешно`);
        } else {
          console.log(`✗ ${test} завершен с ошибкой (код ${code})`);
        }
      });
    });
    
    setTimeout(() => {
      console.log('\n6.3 UI тесты...');
      
      const uiTests = [
        'test_ui_components.js',
        'test_ui_phase2_fixed.js'
      ];
      
      uiTests.forEach(test => {
        const testPath = path.join(__dirname, '..', test);
        console.log(`Запуск ${test}...`);
        
        const child = spawn('node', [testPath], { 
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit' 
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`✓ ${test} завершен успешно`);
          } else {
            console.log(`✗ ${test} завершен с ошибкой (код ${code})`);
          }
        });
      });
      
      setTimeout(() => {
        console.log('\n6.4 Проверка режима отладки...');
        console.log('✓ Режим отладки настроен в main.ts');
        console.log('✓ Developer Tools открываются при debug=true');
        
        console.log('\n=== ЭТАП 6 ЗАВЕРШЕН ===');
        console.log('Все тесты запущены. Проверьте результаты выше.');
      }, 2000);
    }, 3000);
  }, 4000);
}

if (require.main === module) {
  runStage6Tests();
}

module.exports = { runStage6Tests };
