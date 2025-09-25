import React, { useState, useRef, useEffect } from 'react';
import { useLogger } from '../hooks/useIpc';

interface LogViewerProps {
  className?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ className = '' }) => {
  const { logs, clearLogs, filterLogs } = useLogger();
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Автоскролл к последнему логу
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Отслеживание ручного скролла для отключения автоскролла
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // Фильтрация логов
  const filteredLogs = logs.filter(log => {
    const matchesLevel = !selectedLevel || log.level === selectedLevel;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.source && log.source.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesLevel && matchesSearch;
  });

  // Подсчет логов по уровням
  const logCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const renderLogEntry = (log: any, index: number) => {
    const levelClass = `log-${log.level}`;
    
    return (
      <div key={`${log.timestamp}-${index}`} className={`log-entry ${levelClass}`}>
        <div className="flex items-start space-x-2 font-mono text-sm">
          <span className="text-xs opacity-75 min-w-[60px]">
            {formatTimestamp(log.timestamp)}
          </span>
          
          <span className="min-w-[20px]">
            {getLogIcon(log.level)}
          </span>
          
          <div className="flex-1">
            <div className="break-words">{log.message}</div>
            {log.source && (
              <div className="text-xs opacity-60 mt-1">
                Источник: {log.source}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-dark-800 ${className}`}>
      {/* Заголовок и фильтры */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-gray-100">Логи</h2>
            <span className="text-sm text-gray-400">
              ({filteredLogs.length} из {logs.length})
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn-secondary text-sm py-1 px-2"
              title={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
              {isExpanded ? '⬇' : '⬆'}
            </button>
            
            <button
              onClick={clearLogs}
              className="btn-danger text-sm py-1 px-2"
              title="Очистить логи"
            >
              🗑
            </button>
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setSelectedLevel('')}
            className={`text-sm px-2 py-1 rounded ${
              selectedLevel === '' 
                ? 'bg-primary-600 text-white' 
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            Все ({logs.length})
          </button>
          
          {['error', 'warn', 'info', 'debug'].map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`text-sm px-2 py-1 rounded flex items-center space-x-1 ${
                selectedLevel === level 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              <span>{getLogIcon(level)}</span>
              <span className="capitalize">{level}</span>
              <span>({logCounts[level] || 0})</span>
            </button>
          ))}
        </div>

        {/* Поиск */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Поиск в логах..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input flex-1 text-sm"
          />
          
          <label className="flex items-center space-x-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span>Автоскролл</span>
          </label>
        </div>
      </div>

      {/* Область логов */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto scrollbar-thin transition-all duration-300 ${
          isExpanded ? 'min-h-[500px]' : 'min-h-[300px]'
        }`}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <div>
                {logs.length === 0 
                  ? 'Логи пока отсутствуют' 
                  : 'Нет логов, соответствующих фильтрам'
                }
              </div>
              {searchTerm && (
                <div className="text-sm mt-1">
                  Попробуйте изменить поисковый запрос
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2">
            {filteredLogs.map(renderLogEntry)}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Статусная строка */}
      <div className="px-4 py-2 border-t border-dark-700 bg-dark-900">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Всего логов: {logs.length}</span>
            <span>Отфильтровано: {filteredLogs.length}</span>
            {searchTerm && (
              <span>Поиск: "{searchTerm}"</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!autoScroll && (
              <button
                onClick={() => {
                  setAutoScroll(true);
                  logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-primary-400 hover:text-primary-300"
              >
                ⬇ К концу
              </button>
            )}
            
            <span className={autoScroll ? 'text-green-400' : 'text-gray-500'}>
              {autoScroll ? '🔄 Автоскролл' : '⏸ Пауза'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
