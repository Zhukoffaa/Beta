#!/usr/bin/env python3
"""
Скрипт развертывания LLM сервера
Этот скрипт копируется на удаленный сервер и запускается для установки и настройки LLM
"""

import os
import sys
import json
import subprocess
import time
import logging
from pathlib import Path

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LLMServerDeployer:
    def __init__(self, config_path='./llm_config.json'):
        self.config_path = config_path
        self.config = self.load_config()
        
    def load_config(self):
        """Загрузка конфигурации развертывания"""
        default_config = {
            "llm_type": "ollama",
            "models": ["llama2:7b"],
            "port": 11434,
            "host": "0.0.0.0",
            "install_path": "/opt/llm",
            "data_path": "/opt/llm/data"
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    return {**default_config, **config}
            except Exception as e:
                logger.warning(f"Ошибка загрузки конфига: {e}. Используем дефолтный.")
        
        return default_config
    
    def send_progress(self, progress, message):
        """Отправка прогресса в JSONL формате"""
        progress_data = {
            "type": "progress",
            "progress": progress,
            "message": message,
            "timestamp": time.time()
        }
        print(json.dumps(progress_data, ensure_ascii=False))
        sys.stdout.flush()
    
    def send_log(self, level, message):
        """Отправка лога в JSONL формате"""
        log_data = {
            "type": "log",
            "level": level,
            "message": message,
            "timestamp": time.time()
        }
        print(json.dumps(log_data, ensure_ascii=False))
        sys.stdout.flush()
    
    def run_command(self, command, check=True):
        """Выполнение команды с логированием"""
        self.send_log("info", f"Выполнение команды: {command}")
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                check=check
            )
            
            if result.stdout:
                self.send_log("info", f"STDOUT: {result.stdout}")
            if result.stderr:
                self.send_log("warn", f"STDERR: {result.stderr}")
                
            return result
        except subprocess.CalledProcessError as e:
            self.send_log("error", f"Ошибка выполнения команды: {e}")
            raise
    
    def check_system_requirements(self):
        """Проверка системных требований"""
        self.send_progress(5, "Проверка системных требований")
        
        # Проверка Python
        try:
            python_version = subprocess.check_output([sys.executable, '--version'], text=True)
            self.send_log("info", f"Python версия: {python_version.strip()}")
        except Exception as e:
            self.send_log("error", f"Python не найден: {e}")
            return False
        
        # Проверка curl
        try:
            self.run_command("curl --version")
            self.send_log("info", "curl доступен")
        except Exception:
            self.send_log("warn", "curl не найден, попытка установки")
            try:
                self.run_command("sudo apt-get update && sudo apt-get install -y curl")
            except Exception as e:
                self.send_log("error", f"Не удалось установить curl: {e}")
                return False
        
        return True
    
    def install_ollama(self):
        """Установка Ollama"""
        self.send_progress(20, "Установка Ollama")
        
        try:
            # Проверка, установлен ли уже Ollama
            result = self.run_command("ollama --version", check=False)
            if result.returncode == 0:
                self.send_log("info", "Ollama уже установлен")
                return True
            
            # Установка Ollama
            self.send_log("info", "Загрузка и установка Ollama")
            self.run_command("curl -fsSL https://ollama.ai/install.sh | sh")
            
            # Проверка установки
            self.run_command("ollama --version")
            self.send_log("info", "Ollama успешно установлен")
            return True
            
        except Exception as e:
            self.send_log("error", f"Ошибка установки Ollama: {e}")
            return False
    
    def start_ollama_service(self):
        """Запуск сервиса Ollama"""
        self.send_progress(40, "Запуск сервиса Ollama")
        
        try:
            # Запуск Ollama в фоновом режиме
            self.send_log("info", "Запуск Ollama сервера")
            
            # Создание systemd сервиса
            service_content = f"""[Unit]
Description=Ollama Server
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="OLLAMA_HOST={self.config['host']}:{self.config['port']}"

[Install]
WantedBy=default.target
"""
            
            # Создание пользователя ollama
            self.run_command("sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama", check=False)
            
            # Запись сервиса
            with open('/tmp/ollama.service', 'w') as f:
                f.write(service_content)
            
            self.run_command("sudo mv /tmp/ollama.service /etc/systemd/system/")
            self.run_command("sudo systemctl daemon-reload")
            self.run_command("sudo systemctl enable ollama")
            self.run_command("sudo systemctl start ollama")
            
            # Ожидание запуска
            time.sleep(5)
            
            # Проверка статуса
            self.run_command("sudo systemctl status ollama")
            self.send_log("info", "Ollama сервис запущен")
            return True
            
        except Exception as e:
            self.send_log("error", f"Ошибка запуска Ollama: {e}")
            return False
    
    def download_models(self):
        """Загрузка моделей"""
        self.send_progress(60, "Загрузка моделей LLM")
        
        for i, model in enumerate(self.config['models']):
            try:
                progress = 60 + (30 * (i + 1) / len(self.config['models']))
                self.send_progress(int(progress), f"Загрузка модели {model}")
                
                self.send_log("info", f"Загрузка модели: {model}")
                self.run_command(f"ollama pull {model}")
                self.send_log("info", f"Модель {model} загружена")
                
            except Exception as e:
                self.send_log("error", f"Ошибка загрузки модели {model}: {e}")
                return False
        
        return True
    
    def verify_installation(self):
        """Проверка установки"""
        self.send_progress(95, "Проверка установки")
        
        try:
            # Проверка доступности API
            self.run_command(f"curl -f http://localhost:{self.config['port']}/api/tags")
            
            # Список установленных моделей
            result = self.run_command("ollama list")
            self.send_log("info", f"Установленные модели:\n{result.stdout}")
            
            self.send_log("info", "Установка успешно завершена")
            return True
            
        except Exception as e:
            self.send_log("error", f"Ошибка проверки установки: {e}")
            return False
    
    def deploy(self):
        """Основной процесс развертывания"""
        try:
            self.send_progress(0, "Начало развертывания LLM сервера")
            
            # Проверка системы
            if not self.check_system_requirements():
                raise Exception("Системные требования не выполнены")
            
            # Установка Ollama
            if not self.install_ollama():
                raise Exception("Ошибка установки Ollama")
            
            # Запуск сервиса
            if not self.start_ollama_service():
                raise Exception("Ошибка запуска сервиса")
            
            # Загрузка моделей
            if not self.download_models():
                raise Exception("Ошибка загрузки моделей")
            
            # Проверка
            if not self.verify_installation():
                raise Exception("Ошибка проверки установки")
            
            # Завершение
            self.send_progress(100, "Развертывание завершено успешно")
            
            completion_data = {
                "type": "complete",
                "success": True,
                "message": "LLM сервер успешно развернут",
                "config": self.config
            }
            print(json.dumps(completion_data, ensure_ascii=False))
            
        except Exception as e:
            error_data = {
                "type": "error",
                "success": False,
                "message": str(e),
                "timestamp": time.time()
            }
            print(json.dumps(error_data, ensure_ascii=False))
            sys.exit(1)

def main():
    """Главная функция"""
    if len(sys.argv) > 1:
        config_path = sys.argv[1]
    else:
        config_path = './llm_config.json'
    
    deployer = LLMServerDeployer(config_path)
    deployer.deploy()

if __name__ == "__main__":
    main()
