# ЭТАП 8: РЕСТРУКТУРИЗАЦИЯ - ДЕТАЛЬНЫЙ ПЛАН

## 🎯 ЦЕЛЬ
Переработать UI с заменой панели серверов на файловый проводник, вынести настройки серверов в отдельное окно, улучшить OCR и обновить дизайн в стиле macOS.

## 📋 ЗАДАЧИ ПО ПРИОРИТЕТУ

### 1. СОЗДАНИЕ ФАЙЛОВОГО ИНДЕКСЕРА (Backend) ✅
- [x] Создать `backend/services/fileIndexer.ts`
- [x] Методы: `scanProject()`, `getTree()`, `watchChanges()`, `cacheIndex()`
- [x] Добавить IPC обработчики в `main.ts`
- [x] Создать `configs/projects.json` для сохранения состояния

### 2. КОМПОНЕНТ ФАЙЛОВОГО ДЕРЕВА (Frontend) ✅
- [x] Создать `renderer/src/components/FileTreePanel.tsx`
- [x] Рекурсивное отображение папок и файлов
- [x] Иконки для типов файлов
- [x] Поиск по файлам и проектам

### 3. ОКНО НАСТРОЕК СЕРВЕРОВ ✅
- [x] Создать `renderer/src/components/ServerSettingsWindow.tsx`
- [x] Перенести логику из `ServersPanel.tsx`
- [x] Модальное окно с backdrop
- [x] Кнопка "Серверы" в верхней панели

### 4. ОБНОВЛЕНИЕ ГЛАВНОГО ИНТЕРФЕЙСА ✅
- [x] Изменить `App.tsx` - заменить ServersPanel на FileTreePanel
- [x] Добавить кнопку серверов в header
- [x] Обновить состояние и хуки

### 5. УЛУЧШЕНИЕ OCR
- [ ] Обновить `ImageServerParser.tsx` для множественной загрузки
- [ ] Создать `backend/services/ocrService.ts` с Tesseract.js
- [ ] Параллельная обработка 2-3 изображений

### 6. ОБНОВЛЕНИЕ СТИЛЕЙ macOS
- [ ] Обновить `tailwind.config.js` - добавить анимации
- [ ] Создать новые CSS классы в `App.css`
- [ ] Обновить все компоненты с новыми стилями

### 7. ИСПРАВЛЕНИЕ ВАЛИДАЦИИ ФОРМ
- [ ] Проверить все формы на зависание
- [ ] Исправить состояния loading/disabled
- [ ] Добавить правильную обработку ошибок

### 8. ТЕСТИРОВАНИЕ И СБОРКА
- [ ] Создать тесты для новых компонентов
- [ ] Проверить работу файлового дерева
- [ ] Финальная сборка v2.0

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### FileIndexer Service ✅
```typescript
interface ProjectIndex {
  path: string;
  name: string;
  files: FileNode[];
  lastScan: string;
  totalFiles: number;
  totalSize: number;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: string;
  extension?: string;
}
```

### FileTreePanel Component ✅
- Использовать рекурсивный рендеринг
- Состояние развернутых папок
- Поиск по файлам
- Селектор проектов

### ServerSettingsWindow ✅
- Модальное окно поверх основного интерфейса
- Полная функциональность ServersPanel
- Drag & drop для скриншотов OCR
- Валидация форм без зависания

### macOS стили
- Плавные переходы (transition-all duration-200)
- Blur эффекты (backdrop-blur)
- Тени и градиенты
- Hover анимации
- Уменьшенные размеры (text-sm, p-2, rounded-md)

## 📁 СТРУКТУРА ФАЙЛОВ

```
Beta/
├── backend/services/
│   ├── fileIndexer.ts          # ✅ СОЗДАН
│   └── ocrService.ts           # НОВЫЙ
├── renderer/src/components/
│   ├── FileTreePanel.tsx       # ✅ СОЗДАН
│   ├── ServerSettingsWindow.tsx # ✅ СОЗДАН
│   └── ImageServerParser.tsx   # ОБНОВИТЬ
├── configs/
│   └── projects.json           # ✅ СОЗДАН
└── renderer/src/
    ├── App.tsx                 # ✅ ОБНОВЛЕН
    ├── App.css                 # ОБНОВИТЬ
    └── hooks/useIpc.ts         # РАБОТАЕТ
```

## ⚡ ПОРЯДОК ВЫПОЛНЕНИЯ

1. **Backend сервисы** ✅ (fileIndexer создан, ocrService - следующий)
2. **FileTreePanel** ✅ компонент создан
3. **ServerSettingsWindow** ✅ компонент создан  
4. **Обновление App.tsx** ✅ и интеграция завершена
5. **Стили macOS** и анимации (следующий этап)
6. **Исправление валидации** форм
7. **Тестирование** и сборка

## 🎨 ДИЗАЙН КОНЦЕПЦИЯ

- **Цветовая схема**: темная с акцентами синего/зеленого
- **Шрифт**: Inter (уже настроен)
- **Размеры**: компактные (text-sm, p-2, h-8)
- **Анимации**: плавные переходы 200ms
- **Эффекты**: blur, тени, градиенты
- **Иконки**: эмодзи или Lucide React

## 📊 ПРОГРЕСС ТРЕКИНГ

- [x] 8.1 Файловый индексер (100%) ✅
- [x] 8.2 FileTreePanel (100%) ✅
- [x] 8.3 ServerSettingsWindow (100%) ✅
- [x] 8.4 Интеграция App.tsx (100%) ✅
- [ ] 8.5 OCR улучшения (0%)
- [ ] 8.6 Стили macOS (0%)
- [ ] 8.7 Валидация форм (0%)
- [ ] 8.8 Тестирование (0%)

**Общий прогресс: 50% (4/8 задач завершено)**

## 🎉 ЗАВЕРШЕННЫЕ КОМПОНЕНТЫ

### ✅ FileIndexer Service
- Полное сканирование проектов с рекурсивным обходом
- Кеширование индексов в projects.json
- Поиск файлов по содержимому
- Отслеживание изменений через fs.watch
- IPC интеграция с frontend

### ✅ FileTreePanel Component  
- Древовидное отображение файлов и папок
- Иконки для разных типов файлов
- Поиск по файлам в проекте
- Селектор недавних проектов
- Информация о проекте (размер, количество файлов)

### ✅ ServerSettingsWindow Component
- Модальное окно с полным управлением серверами
- Формы добавления/редактирования серверов
- Поддержка Vast.AI полей
- Интеграция с ImageServerParser для OCR
- Кнопки тестирования, развертывания, подключения

### ✅ App.tsx Integration
- Замена ServersPanel на FileTreePanel
- Кнопка "Серверы" в header для открытия настроек
- Обновленная логика выбора файлов
- Интеграция модального окна серверов

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. **OCR Service** - создать backend/services/ocrService.ts с Tesseract.js
2. **Multiple Image Upload** - обновить ImageServerParser для 2-3 файлов
3. **macOS Styles** - обновить tailwind.config.js и добавить анимации
4. **Form Validation** - исправить зависания полей после ошибок
5. **Testing** - создать тесты и проверить функциональность
