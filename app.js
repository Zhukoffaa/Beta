// OpenAI Chat Application
// Simple app for testing prompts with OpenAI API

class OpenAIChat {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.model = localStorage.getItem('openai_model') || 'gpt-3.5-turbo';
        this.temperature = parseFloat(localStorage.getItem('openai_temperature')) || 0.7;
        this.systemPrompt = localStorage.getItem('openai_system_prompt') || 'Ты полезный ассистент, который помогает пользователям с их вопросами.';
        this.messages = [];
        
        this.initializeElements();
        this.loadSettings();
        this.attachEventListeners();
        this.loadChatHistory();
    }

    initializeElements() {
        this.settingsPanel = document.getElementById('settingsPanel');
        this.apiKeyInput = document.getElementById('apiKey');
        this.modelSelect = document.getElementById('model');
        this.temperatureInput = document.getElementById('temperature');
        this.tempValueSpan = document.getElementById('tempValue');
        this.systemPromptInput = document.getElementById('systemPrompt');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.saveSettingsButton = document.getElementById('saveSettings');
        this.toggleSettingsButton = document.getElementById('toggleSettings');
        this.clearChatButton = document.getElementById('clearChat');
    }

    loadSettings() {
        this.apiKeyInput.value = this.apiKey;
        this.modelSelect.value = this.model;
        this.temperatureInput.value = this.temperature;
        this.tempValueSpan.textContent = this.temperature;
        this.systemPromptInput.value = this.systemPrompt;
    }

    attachEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.saveSettingsButton.addEventListener('click', () => this.saveSettings());
        this.toggleSettingsButton.addEventListener('click', () => this.toggleSettings());
        this.clearChatButton.addEventListener('click', () => this.clearChat());

        this.temperatureInput.addEventListener('input', (e) => {
            this.tempValueSpan.textContent = e.target.value;
        });
    }

    toggleSettings() {
        this.settingsPanel.classList.toggle('active');
    }

    saveSettings() {
        this.apiKey = this.apiKeyInput.value.trim();
        this.model = this.modelSelect.value;
        this.temperature = parseFloat(this.temperatureInput.value);
        this.systemPrompt = this.systemPromptInput.value;

        localStorage.setItem('openai_api_key', this.apiKey);
        localStorage.setItem('openai_model', this.model);
        localStorage.setItem('openai_temperature', this.temperature);
        localStorage.setItem('openai_system_prompt', this.systemPrompt);

        this.addSystemMessage('✅ Настройки сохранены!');
        this.settingsPanel.classList.remove('active');
    }

    loadChatHistory() {
        const history = localStorage.getItem('chat_history');
        if (history) {
            try {
                this.messages = JSON.parse(history);
                this.renderMessages();
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
    }

    saveChatHistory() {
        localStorage.setItem('chat_history', JSON.stringify(this.messages));
    }

    renderMessages() {
        // Clear system messages first
        this.chatMessages.innerHTML = '';
        
        this.messages.forEach(msg => {
            if (msg.role === 'user') {
                this.addUserMessage(msg.content, false);
            } else if (msg.role === 'assistant') {
                this.addAssistantMessage(msg.content, false);
            }
        });
    }

    addUserMessage(content, save = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            ${this.escapeHtml(content)}
            <div class="message-time">${new Date().toLocaleTimeString('ru-RU')}</div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        if (save) {
            this.messages.push({ role: 'user', content });
            this.saveChatHistory();
        }
    }

    addAssistantMessage(content, save = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message';
        messageDiv.innerHTML = `
            ${this.formatMessage(content)}
            <div class="message-time">${new Date().toLocaleTimeString('ru-RU')}</div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        if (save) {
            this.messages.push({ role: 'assistant', content });
            this.saveChatHistory();
        }
    }

    addSystemMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';
        messageDiv.textContent = content;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addErrorMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message error-message';
        messageDiv.textContent = '❌ ' + content;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingDiv = document.getElementById('typingIndicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMessage(text) {
        // Simple markdown-like formatting
        text = this.escapeHtml(text);
        
        // Code blocks
        text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Bold
        text = text.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        text = text.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
        
        // Line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message) {
            return;
        }

        if (!this.apiKey) {
            this.addErrorMessage('Пожалуйста, введите API ключ в настройках');
            return;
        }

        // Add user message
        this.addUserMessage(message);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Disable send button
        this.sendButton.disabled = true;
        this.showTypingIndicator();

        try {
            const response = await this.callOpenAI(message);
            this.hideTypingIndicator();
            this.addAssistantMessage(response);
        } catch (error) {
            this.hideTypingIndicator();
            this.addErrorMessage(error.message || 'Произошла ошибка при обращении к API');
            console.error('OpenAI API Error:', error);
        } finally {
            this.sendButton.disabled = false;
            this.messageInput.focus();
        }
    }

    async callOpenAI(userMessage) {
        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...this.messages.slice(-10), // Last 10 messages for context
            { role: 'user', content: userMessage }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                temperature: this.temperature,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    clearChat() {
        if (confirm('Вы уверены, что хотите очистить историю чата?')) {
            this.messages = [];
            this.chatMessages.innerHTML = '';
            localStorage.removeItem('chat_history');
            this.addSystemMessage('📝 История чата очищена');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new OpenAIChat();
    console.log('OpenAI Chat initialized');
});
