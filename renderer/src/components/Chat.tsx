import React, { useState, useRef, useEffect } from 'react';
import { useLlmChat } from '../hooks/useIpc';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatProps {
  serverId?: string;
  className?: string;
}

const Chat: React.FC<ChatProps> = ({ serverId, className = '' }) => {
  const {
    messages,
    isLoading,
    isConnected,
    sendChatMessage,
    clearChat,
    checkLlmConnection
  } = useLlmChat();

  const [inputMessage, setInputMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Проверка подключения при изменении сервера
  useEffect(() => {
    if (serverId) {
      checkLlmConnection(serverId);
    }
  }, [serverId, checkLlmConnection]);

  // Автоматическое изменение высоты textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    if (!serverId) {
      alert('Пожалуйста, выберите сервер для чата');
      return;
    }

    const message = inputMessage.trim();
    setInputMessage('');
    
    try {
      await sendChatMessage(message, serverId);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Алиас для совместимости с тестами
  const sendMessage = handleSendMessage;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = (message: Message) => {
    const baseClasses = "max-w-[80%] p-3 rounded-lg break-words";
    
    switch (message.role) {
      case 'user':
        return (
          <div key={message.id} className="flex justify-end mb-3">
            <div className={`${baseClasses} bg-primary-600 text-white rounded-br-sm`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-75 mt-1">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        );
      
      case 'assistant':
        return (
          <div key={message.id} className="flex justify-start mb-3">
            <div className={`${baseClasses} bg-dark-700 text-gray-100 rounded-bl-sm`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        );
      
      case 'system':
        return (
          <div key={message.id} className="flex justify-center mb-3">
            <div className="bg-yellow-600/20 text-yellow-200 rounded-lg p-2 text-sm border border-yellow-600/30 max-w-[90%]">
              <div className="text-center">{message.content}</div>
              <div className="text-xs text-yellow-300/70 text-center mt-1">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col bg-dark-800 border-l border-dark-700 ${className}`}>
      {/* Заголовок чата */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-100">LLM Чат</h2>
          {isConnected ? (
            <span className="status-connected">Подключен</span>
          ) : (
            <span className="status-disconnected">Отключен</span>
          )}
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
            onClick={clearChat}
            className="btn-secondary text-sm py-1 px-2"
            title="Очистить чат"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Область сообщений */}
      <div 
        className={`flex-1 overflow-y-auto p-4 scrollbar-thin transition-all duration-300 ${
          isExpanded ? 'min-h-[600px]' : 'min-h-[400px]'
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <div>Начните разговор с LLM</div>
              <div className="text-sm mt-1">
                {serverId ? 'Введите сообщение ниже' : 'Выберите сервер для начала'}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            
            {/* Индикатор загрузки */}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-dark-700 text-gray-100 rounded-lg rounded-bl-sm p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="loading-dots">
                      <div style={{ '--i': 0 } as React.CSSProperties}></div>
                      <div style={{ '--i': 1 } as React.CSSProperties}></div>
                      <div style={{ '--i': 2 } as React.CSSProperties}></div>
                    </div>
                    <span className="text-sm text-gray-400">LLM думает...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Поле ввода */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                serverId 
                  ? "Введите сообщение... (Enter - отправить, Shift+Enter - новая строка)"
                  : "Выберите сервер для начала чата"
              }
              className="form-textarea min-h-[40px] max-h-[120px] resize-none pr-12"
              disabled={!serverId || isLoading}
              rows={1}
            />
            
            {/* Счетчик символов */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {inputMessage.length}
            </div>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !serverId || isLoading}
            className="btn-primary px-4 py-2 min-w-[80px] flex items-center justify-center"
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              '📤'
            )}
          </button>
        </div>
        
        {/* Статус подключения */}
        {!isConnected && serverId && (
          <div className="mt-2 text-sm text-yellow-400 flex items-center">
            <span className="mr-2">⚠️</span>
            LLM сервер недоступен. Проверьте подключение.
          </div>
        )}
        
        {/* Подсказки */}
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex flex-wrap gap-4">
            <span>💡 Совет: используйте Shift+Enter для переноса строки</span>
            {messages.length > 0 && (
              <span>📊 Сообщений: {messages.length}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
