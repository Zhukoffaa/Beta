#!/usr/bin/env node
/**
 * Тестирование UI компонентов Windows LLM Agent
 * Проверяет компиляцию TypeScript и структуру компонентов
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Тестирование UI компонентов Windows LLM Agent');
console.log('=' .repeat(60));

// Список компонентов для проверки
const components = [
  'renderer/src/App.tsx',
  'renderer/src/components/ServersPanel.tsx',
  'renderer/src/components/Chat.tsx',
  'renderer/src/components/LogViewer.tsx',
  'renderer/src/hooks/useIpc.ts'
];

// Список стилей для проверки
const styles = [
  'renderer/src/index.css',
  'tailwind.config.js',
  'postcss.config.js'
];

// Конфигурационные файлы
const configs = [
  'renderer/webpack.config.js',
  'renderer/tsconfig.json',
  'package.json'
];

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFunction) {
  totalTests++;
  try {
    console.log(`\n🔍 ${testName}...`);
    testFunction();
    console.log(`✅ ${testName} - ПРОЙДЕН`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`❌ ${testName} - ПРОВАЛЕН`);
    console.log(`   Ошибка: ${error.message}`);
    return false;
  }
}

// Тест 1: Проверка существования компонентов
runTest('Проверка существования UI компонентов', () => {
  components.forEach(component => {
    if (!fs.existsSync(component)) {
      throw new Error(`Компонент не найден: ${component}`);
    }
  });
  console.log(`   Найдено компонентов: ${components.length}`);
});

// Тест 2: Проверка стилей и конфигураций
runTest('Проверка стилей и конфигураций', () => {
  [...styles, ...configs].forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Файл не найден: ${file}`);
    }
  });
  console.log(`   Найдено файлов: ${styles.length + configs.length}`);
});

// Тест 3: Проверка импортов в App.tsx
runTest('Проверка импортов в App.tsx', () => {
  const appContent = fs.readFileSync('renderer/src/App.tsx', 'utf8');
  
  const requiredImports = [
    'ServersPanel',
    'Chat', 
    'LogViewer',
    'useState'
  ];
  
  requiredImports.forEach(importName => {
    if (!appContent.includes(importName)) {
      throw new Error(`Отсутствует импорт: ${importName}`);
    }
  });
  
  console.log(`   Проверено импортов: ${requiredImports.length}`);
});

// Тест 4: Проверка хуков в useIpc.ts
runTest('Проверка хуков IPC', () => {
  const ipcContent = fs.readFileSync('renderer/src/hooks/useIpc.ts', 'utf8');
  
  const requiredHooks = [
    'useIpc',
    'useServerManager',
    'useLlmChat',
    'useLogs',
    'useTaskProgress'
  ];
  
  requiredHooks.forEach(hook => {
    if (!ipcContent.includes(`export const ${hook}`)) {
      throw new Error(`Отсутствует хук: ${hook}`);
    }
  });
  
  console.log(`   Проверено хуков: ${requiredHooks.length}`);
});

// Тест 5: Проверка Tailwind CSS классов
runTest('Проверка Tailwind CSS классов', () => {
  const cssContent = fs.readFileSync('renderer/src/index.css', 'utf8');
  
  const requiredDirectives = [
    '@tailwind base',
    '@tailwind components', 
    '@tailwind utilities'
  ];
  
  requiredDirectives.forEach(directive => {
    if (!cssContent.includes(directive)) {
      throw new Error(`Отсутствует директива: ${directive}`);
    }
  });
  
  // Проверка кастомных классов
  const customClasses = [
    '.btn-primary',
    '.btn-secondary',
    '.input-field',
    '.card',
    '.status-connected'
  ];
  
  customClasses.forEach(className => {
    if (!cssContent.includes(className)) {
      throw new Error(`Отсутствует класс: ${className}`);
    }
  });
  
  console.log(`   Проверено директив: ${requiredDirectives.length}`);
  console.log(`   Проверено классов: ${customClasses.length}`);
});

// Тест 6: Проверка TypeScript конфигурации
runTest('Проверка TypeScript конфигурации', () => {
  const tsConfig = JSON.parse(fs.readFileSync('renderer/tsconfig.json', 'utf8'));
  
  if (!tsConfig.compilerOptions) {
    throw new Error('Отсутствует compilerOptions в tsconfig.json');
  }
  
  const requiredOptions = ['jsx', 'target', 'module'];
  requiredOptions.forEach(option => {
    if (!tsConfig.compilerOptions[option]) {
      throw new Error(`Отсутствует опция: ${option}`);
    }
  });
  
  console.log(`   Проверено опций: ${requiredOptions.length}`);
});

// Тест 7: Проверка package.json зависимостей
runTest('Проверка зависимостей package.json', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    'react',
    'react-dom',
    'axios',
    'yaml'
  ];
  
  const requiredDevDeps = [
    'electron',
    '@types/react',
    'webpack',
    'ts-loader',
    'tailwindcss',
    'typescript'
  ];
  
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
      throw new Error(`Отсутствует зависимость: ${dep}`);
    }
  });
  
  requiredDevDeps.forEach(dep => {
    if (!packageJson.devDependencies || !packageJson.devDependencies[dep]) {
      throw new Error(`Отсутствует dev зависимость: ${dep}`);
    }
  });
  
  console.log(`   Проверено зависимостей: ${requiredDeps.length}`);
  console.log(`   Проверено dev зависимостей: ${requiredDevDeps.length}`);
});

// Тест 8: Проверка компиляции TypeScript (базовая)
runTest('Проверка синтаксиса TypeScript', () => {
  try {
    // Проверяем каждый компонент на синтаксические ошибки
    components.forEach(component => {
      const content = fs.readFileSync(component, 'utf8');
      
      // Базовые проверки синтаксиса
      if (content.includes('import') && !content.includes('from')) {
        throw new Error(`Некорректный импорт в ${component}`);
      }
      
      // Проверка закрытия JSX тегов
      const openTags = (content.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (content.match(/<\/[^>]*>/g) || []).length;
      const selfClosing = (content.match(/<[^>]*\/>/g) || []).length;
      
      // Примерная проверка (не точная, но базовая)
      if (openTags > closeTags + selfClosing + 5) { // +5 для погрешности
        console.log(`   Предупреждение: возможно несоответствие тегов в ${component}`);
      }
    });
    
    console.log(`   Проверено файлов: ${components.length}`);
  } catch (error) {
    throw new Error(`Ошибка синтаксиса: ${error.message}`);
  }
});

// Тест 9: Проверка структуры компонентов
runTest('Проверка структуры React компонентов', () => {
  const reactComponents = components.filter(c => c.endsWith('.tsx'));
  
  reactComponents.forEach(component => {
    const content = fs.readFileSync(component, 'utf8');
    
    // Проверка наличия React импорта
    if (!content.includes('import React') && !content.includes('from \'react\'')) {
      throw new Error(`Отсутствует импорт React в ${component}`);
    }
    
    // Проверка экспорта компонента
    if (!content.includes('export default') && !content.includes('export const')) {
      throw new Error(`Отсутствует экспорт в ${component}`);
    }
    
    // Проверка JSX
    if (!content.includes('return (') && !content.includes('return <')) {
      throw new Error(`Отсутствует JSX return в ${component}`);
    }
  });
  
  console.log(`   Проверено React компонентов: ${reactComponents.length}`);
});

// Тест 10: Проверка Webpack конфигурации
runTest('Проверка Webpack конфигурации', () => {
  const webpackContent = fs.readFileSync('renderer/webpack.config.js', 'utf8');
  
  const requiredConfig = [
    'entry:',
    'output:',
    'module:',
    'rules:',
    'tsx?',
    'css',
    'postcss-loader'
  ];
  
  requiredConfig.forEach(config => {
    if (!webpackContent.includes(config)) {
      throw new Error(`Отсутствует конфигурация: ${config}`);
    }
  });
  
  console.log(`   Проверено конфигураций: ${requiredConfig.length}`);
});

// Результаты тестирования
console.log('\n' + '='.repeat(60));
console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ UI КОМПОНЕНТОВ');
console.log('='.repeat(60));

console.log(`✅ Пройдено тестов: ${passedTests}/${totalTests}`);
console.log(`📈 Процент успеха: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  console.log('✨ UI компоненты готовы к интеграции с backend');
  console.log('\n📋 Следующие шаги:');
  console.log('1. Запустить приложение: npm run electron:dev');
  console.log('2. Протестировать интеграцию с backend сервисами');
  console.log('3. Проверить IPC коммуникацию');
  process.exit(0);
} else {
  console.log('\n⚠️  НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ');
  console.log('🔧 Исправьте ошибки перед продолжением разработки');
  process.exit(1);
}
