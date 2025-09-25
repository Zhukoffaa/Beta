import React, { useState, useEffect } from 'react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLLMSettingsChange?: (settings: LLMSettings) => void;
}

interface Settings {
  theme: 'dark' | 'light';
  fontSize: number;
  autoSave: boolean;
  wordWrap: boolean;
}

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

interface LLMPreset {
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, onLLMSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'llm'>('general');
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    fontSize: 14,
    autoSave: true,
    wordWrap: true
  });

  const [llmSettings, setLLMSettings] = useState<LLMSettings>({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    systemPrompt: 'Вы - полезный ассистент для разработки программного обеспечения. Отвечайте четко и по существу.',
    selectedPreset: 'custom'
  });

  const [presets] = useState<LLMPreset[]>([
    {
      name: 'Разработчик',
      systemPrompt: 'Вы - опытный разработчик программного обеспечения. Помогайте с кодом, архитектурой и лучшими практиками.',
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      name: 'Аналитик',
      systemPrompt: 'Вы - системный аналитик. Помогайте с анализом требований, проектированием и документацией.',
      temperature: 0.5,
      maxTokens: 2048
    },
    {
      name: 'Креативный',
      systemPrompt: 'Вы - креативный помощник. Генерируйте идеи, предлагайте нестандартные решения.',
      temperature: 0.9,
      maxTokens: 1024
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const appConfig = await (window as any).electronAPI.invoke('get-app-config');
      if (appConfig?.llm) {
        setLLMSettings({
          model: appConfig.llm.model || 'gpt-3.5-turbo',
          temperature: appConfig.llm.temperature || 0.7,
          maxTokens: appConfig.llm.maxTokens || 2048,
          topP: appConfig.llm.topP || 1.0,
          frequencyPenalty: appConfig.llm.frequencyPenalty || 0.0,
          presencePenalty: appConfig.llm.presencePenalty || 0.0,
          systemPrompt: appConfig.llm.systemPrompt || '',
          selectedPreset: 'custom'
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handlePresetChange = (presetName: string) => {
    if (presetName === 'custom') {
      setLLMSettings(prev => ({ ...prev, selectedPreset: 'custom' }));
      return;
    }

    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      setLLMSettings(prev => ({
        ...prev,
        selectedPreset: presetName,
        systemPrompt: preset.systemPrompt,
        temperature: preset.temperature,
        maxTokens: preset.maxTokens
      }));
    }
  };

  const handleLLMSettingChange = (key: keyof LLMSettings, value: any) => {
    setLLMSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (key !== 'selectedPreset') {
        newSettings.selectedPreset = 'custom';
      }
      return newSettings;
    });
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
      
      // Сохранить настройки LLM через IPC
      await (window as any).electronAPI.invoke('update-llm-settings', llmSettings);
      
      // Уведомить родительский компонент об изменениях
      onLLMSettingsChange?.(llmSettings);
      
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-macos-dark-surface rounded-lg shadow-macos-lg w-[600px] max-w-[90vw] max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-macos-dark-border">
          <h2 className="text-lg font-semibold text-white">Настройки</h2>
          <button
            onClick={onClose}
            className="text-macos-dark-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Вкладки */}
        <div className="flex border-b border-macos-dark-border">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-accent-blue border-b-2 border-accent-blue'
                : 'text-macos-dark-secondary hover:text-white'
            }`}
          >
            Общие
          </button>
          <button
            onClick={() => setActiveTab('llm')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'llm'
                ? 'text-accent-blue border-b-2 border-accent-blue'
                : 'text-macos-dark-secondary hover:text-white'
            }`}
          >
            Модель LLM
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-macos-dark-text mb-2">
                  Тема
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({...settings, theme: e.target.value as 'dark' | 'light'})}
                  className="w-full bg-macos-dark-hover text-white rounded-md px-3 py-2 border border-macos-dark-border focus:border-accent-blue focus:outline-none"
                >
                  <option value="dark">Темная</option>
                  <option value="light">Светлая</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-macos-dark-text mb-2">
                  Размер шрифта: {settings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={settings.fontSize}
                  onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                  className="w-full accent-accent-blue"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
                  className="mr-3 accent-accent-blue"
                />
                <label className="text-sm text-macos-dark-text">Автосохранение</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.wordWrap}
                  onChange={(e) => setSettings({...settings, wordWrap: e.target.checked})}
                  className="mr-3 accent-accent-blue"
                />
                <label className="text-sm text-macos-dark-text">Перенос строк</label>
              </div>
            </div>
          )}

          {activeTab === 'llm' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-macos-dark-text mb-2">
                  Пресеты настроек
                </label>
                <select
                  value={llmSettings.selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-macos-dark-hover text-white rounded-md px-3 py-2 border border-macos-dark-border focus:border-accent-blue focus:outline-none"
                >
                  <option value="custom">Пользовательские настройки</option>
                  {presets.map(preset => (
                    <option key={preset.name} value={preset.name}>{preset.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-macos-dark-text mb-2">
                  Модель
                </label>
                <select
                  value={llmSettings.model}
                  onChange={(e) => handleLLMSettingChange('model', e.target.value)}
                  className="w-full bg-macos-dark-hover text-white rounded-md px-3 py-2 border border-macos-dark-border focus:border-accent-blue focus:outline-none"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-macos-dark-text mb-2">
                  Системный промпт
                </label>
                <textarea
                  value={llmSettings.systemPrompt}
                  onChange={(e) => handleLLMSettingChange('systemPrompt', e.target.value)}
                  rows={4}
                  className="w-full bg-macos-dark-hover text-white rounded-md px-3 py-2 border border-macos-dark-border focus:border-accent-blue focus:outline-none resize-none"
                  placeholder="Введите системный промпт..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-macos-dark-text mb-2">
                    Температура: {llmSettings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={llmSettings.temperature}
                    onChange={(e) => handleLLMSettingChange('temperature', parseFloat(e.target.value))}
                    className="w-full accent-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-macos-dark-text mb-2">
                    Макс. токенов: {llmSettings.maxTokens}
                  </label>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={llmSettings.maxTokens}
                    onChange={(e) => handleLLMSettingChange('maxTokens', parseInt(e.target.value))}
                    className="w-full accent-accent-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-macos-dark-text mb-2">
                    Top P: {llmSettings.topP}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={llmSettings.topP}
                    onChange={(e) => handleLLMSettingChange('topP', parseFloat(e.target.value))}
                    className="w-full accent-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-macos-dark-text mb-2">
                    Frequency Penalty: {llmSettings.frequencyPenalty}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={llmSettings.frequencyPenalty}
                    onChange={(e) => handleLLMSettingChange('frequencyPenalty', parseFloat(e.target.value))}
                    className="w-full accent-accent-blue"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t border-macos-dark-border">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
