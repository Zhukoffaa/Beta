# Backend Services

Этот каталог содержит backend службы приложения:

- `main.ts` - точка входа Electron приложения
- `services/` - основные службы (SSH, LLM, Config, Logger, etc.)

## Структура

- `services/logger.ts` - система логирования
- `services/config.ts` - управление конфигурациями  
- `services/sshService.ts` - SSH/SFTP операции
- `services/llmService.ts` - HTTP клиент для LLM API
- `services/taskExecutor.ts` - менеджер worker потоков
- `services/serverManager.ts` - управление серверами
