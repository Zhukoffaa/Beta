import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import FileTreePanel from './components/FileTreePanel';
import Chat from './components/Chat';
import LogViewer from './components/LogViewer';
import CodeEditor from './components/CodeEditor';
import DiffViewer from './components/DiffViewer';
import SettingsDialog from './components/SettingsDialog';
import './App.css';

// Типы для вкладок
type TabType = 'editor' | 'diff' | 'logs' | 'settings';

interface LLMSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  selectedPreset: string;
}

// Debounce hook для оптимизации
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Мемоизированный компонент заголовка
const AppHeader = memo(({ 
  selectedServerId, 
  onOpenServerSettings, 
  isLoading 
}: { 
  selectedServerId: string | null;
  onOpenServerSettings: () => void;
  isLoading: boolean;
}) => (
  <header className="app-header electron-drag">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <div className="ml-4">
          <h1 className="text-sm font-medium text-macos-dark-text">LLM Agent</h1>
          <p className="text-xs text-macos-dark-secondary">Управление удаленными LLM серверами</p>
        </div>
      </div>
      
      <div className="electron-no-drag flex items-center space-x-3">
        <button
          onClick={onOpenServerSettings}
          className="btn-secondary"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Загрузка...</span>
            </div>
          ) : (
            'Серверы'
          )}
        </button>

        {selectedServerId && (
          <div className="text-xs text-macos-dark-secondary">
            Сервер: <span className="text-accent-blue">{selectedServerId}</span>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse-soft"></div>
          <span className="text-xs text-macos-dark-secondary">Online</span>
        </div>
      </div>
    </div>
  </header>
));

// Мемоизированный компонент вкладок
const TabNavigation = memo(({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) => (
  <div className="tabs">
    {(['editor', 'diff', 'logs', 'settings'] as TabType[]).map((tab) => (
      <button
        key={tab}
        onClick={() => onTabChange(tab)}
        className={activeTab === tab ? 'tab active' : 'tab'}
      >
        {tab === 'editor' && 'Редактор'}
        {tab === 'diff' && 'Diff'}
        {tab === 'logs' && 'Логи'}
        {tab === 'settings' && 'Настройки'}
      </button>
    ))}
  </div>
));

const App: React.FC = () => {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [showSettings, setShowSettings] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [llmSettings, setLLMSettings] = useState<LLMSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);

  // Debounced значения для оптимизации
  const debouncedFileContent = useDebounce(fileContent, 300);

  useEffect(() => {
    loadLLMSettings();
  }, []);

  const loadLLMSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await (window as any).electronAPI.invoke('get-llm-settings');
      if (result.success) {
        setLLMSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to load LLM settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLLMSettingsChange = useCallback((newSettings: LLMSettings) => {
    setLLMSettings(newSettings);
    console.log('LLM settings updated:', newSettings);
  }, []);

  const handleFileSelect = useCallback(async (filePath: string) => {
    setIsFileLoading(true);
    setSelectedFile(filePath);
    setActiveTab('editor');
    
    // Симуляция загрузки файла с задержкой для UX
    setTimeout(() => {
      setIsFileLoading(false);
      console.log('Selected file:', filePath);
    }, 150);
  }, []);

  const handleOpenServerSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await (window as any).electronAPI.openServerSettings();
    } catch (error) {
      console.error('Failed to open server settings:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Мемоизированная функция определения языка
  const getLanguageFromFile = useCallback((filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
    };
    return languageMap[ext || ''] || 'plaintext';
  }, []);

  // Мемоизированный рендер центральной панели
  const renderCenterPanel = useMemo(() => {
    if (isFileLoading) {
      return (
        <div className="flex-1 flex items-center justify-center content-area">
          <div className="welcome-message">
            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2>Загрузка файла...</h2>
            <p>Подождите, файл загружается</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'editor':
        return (
          <div className="flex-1 flex flex-col">
            <CodeEditor
              value={debouncedFileContent}
              onChange={setFileContent}
              language={selectedFile ? getLanguageFromFile(selectedFile) : 'javascript'}
            />
          </div>
        );
      case 'diff':
        return (
          <div className="flex-1">
            <DiffViewer
              oldValue=""
              newValue={debouncedFileContent}
              splitView={true}
            />
          </div>
        );
      case 'logs':
        return <LogViewer className="flex-1" />;
      case 'settings':
        return (
          <div className="flex-1 flex items-center justify-center content-area">
            <div className="welcome-message">
              <h2>Настройки приложения</h2>
              <p>Общие настройки и конфигурация</p>
              <button
                onClick={() => setShowSettings(true)}
                className="btn-primary mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Загрузка...</span>
                  </div>
                ) : (
                  'Открыть настройки'
                )}
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center content-area">
            <div className="welcome-message">
              <h2>Добро пожаловать в LLM Agent</h2>
              <p>{selectedFile ? `Выбран файл: ${selectedFile}` : 'Выберите файл в проводнике для редактирования'}</p>
            </div>
          </div>
        );
    }
  }, [activeTab, selectedFile, debouncedFileContent, getLanguageFromFile, isLoading, isFileLoading]);

  // Мемоизированные пропсы для компонентов
  const fileTreeProps = useMemo(() => ({
    onFileSelect: handleFileSelect
  }), [handleFileSelect]);

  const chatProps = useMemo(() => ({
    serverId: selectedServerId || undefined
  }), [selectedServerId]);

  const settingsProps = useMemo(() => ({
    isOpen: showSettings,
    onClose: () => setShowSettings(false),
    onLLMSettingsChange: handleLLMSettingsChange
  }), [showSettings, handleLLMSettingsChange]);

  return (
    <div className="app">
      {/* Заголовок приложения в стиле macOS */}
      <AppHeader 
        selectedServerId={selectedServerId}
        onOpenServerSettings={handleOpenServerSettings}
        isLoading={isLoading}
      />

      {/* Основной контент */}
      <div className="app-content">
        {/* Левая панель - Файловый проводник */}
        <div className="sidebar">
          <FileTreePanel {...fileTreeProps} />
        </div>

        {/* Центральная панель - Редактор кода */}
        <div className="main-content">
          {/* Вкладки */}
          <TabNavigation 
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Содержимое вкладок */}
          {renderCenterPanel}
        </div>

        {/* Правая панель - Чат */}
        <div className="chat-panel">
          <Chat {...chatProps} />
        </div>
      </div>

      {/* Модальные окна */}
      <SettingsDialog {...settingsProps} />

      {/* Статусная строка */}
      <footer className="px-3 py-1 bg-macos-dark-surface border-t border-macos-dark-border">
        <div className="flex items-center justify-between text-xs text-macos-dark-secondary">
          <div className="flex items-center space-x-3">
            <span>LLM Agent v3.0</span>
            <span>•</span>
            <span>macOS Design</span>
            {isLoading && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Обработка...</span>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <span>Память: {Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB</span>
            <span>•</span>
            <span>{new Date().toLocaleTimeString('ru-RU')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
