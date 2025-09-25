#!/usr/bin/env python3

import os
import sys
import json
import subprocess
import time
from pathlib import Path

class MacOSRedesignTester:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.test_results = {
            'css_styles': False,
            'app_component': False,
            'tailwind_config': False,
            'backend_support': False,
            'build_success': False,
            'electron_launch': False
        }
        
    def test_css_styles(self):
        """Проверка CSS стилей в стиле macOS"""
        print("🎨 Тестирование CSS стилей macOS...")
        
        css_file = self.project_root / 'renderer' / 'src' / 'App.css'
        if not css_file.exists():
            print("❌ App.css не найден")
            return False
            
        with open(css_file, 'r', encoding='utf-8') as f:
            css_content = f.read()
            
        # Проверяем ключевые macOS стили
        required_styles = [
            'backdrop-filter: blur',
            '-webkit-backdrop-filter: blur',
            'rgba(28, 28, 30',
            'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            '.app-header',
            '.sidebar',
            '.chat-panel',
            '.macos-dark-surface'
        ]
        
        missing_styles = []
        for style in required_styles:
            if style not in css_content:
                missing_styles.append(style)
                
        if missing_styles:
            print(f"❌ Отсутствуют стили: {missing_styles}")
            return False
            
        print("✅ CSS стили macOS корректны")
        return True
        
    def test_app_component(self):
        """Проверка компонента App.tsx"""
        print("⚛️ Тестирование App.tsx компонента...")
        
        app_file = self.project_root / 'renderer' / 'src' / 'App.tsx'
        if not app_file.exists():
            print("❌ App.tsx не найден")
            return False
            
        with open(app_file, 'r', encoding='utf-8') as f:
            app_content = f.read()
            
        # Проверяем ключевые изменения
        required_features = [
            "type TabType = 'editor'",
            "CodeEditor",
            "handleOpenServerSettings",
            "getLanguageFromFile",
            "LLMSettings",
            "electron-drag",
            "electron-no-drag"
        ]
        
        missing_features = []
        for feature in required_features:
            if feature not in app_content:
                missing_features.append(feature)
                
        if missing_features:
            print(f"❌ Отсутствуют функции: {missing_features}")
            return False
            
        print("✅ App.tsx компонент обновлен корректно")
        return True
        
    def test_tailwind_config(self):
        """Проверка конфигурации Tailwind"""
        print("🎨 Тестирование Tailwind конфигурации...")
        
        config_file = self.project_root / 'tailwind.config.js'
        if not config_file.exists():
            print("❌ tailwind.config.js не найден")
            return False
            
        with open(config_file, 'r', encoding='utf-8') as f:
            config_content = f.read()
            
        # Проверяем macOS конфигурацию
        required_config = [
            "San Francisco",
            "SF Pro Display",
            "macos:",
            "accent:",
            "cubic-bezier",
            "backdropBlur",
            "fadeIn",
            "slideUp"
        ]
        
        missing_config = []
        for config in required_config:
            if config not in config_content:
                missing_config.append(config)
                
        if missing_config:
            print(f"❌ Отсутствует конфигурация: {missing_config}")
            return False
            
        print("✅ Tailwind конфигурация macOS корректна")
        return True
        
    def test_backend_support(self):
        """Проверка поддержки backend"""
        print("🔧 Тестирование backend поддержки...")
        
        main_file = self.project_root / 'backend' / 'main.ts'
        if not main_file.exists():
            print("❌ backend/main.ts не найден")
            return False
            
        with open(main_file, 'r', encoding='utf-8') as f:
            main_content = f.read()
            
        # Проверяем поддержку отдельного окна серверов
        required_backend = [
            "serverSettingsWindow",
            "openServerSettingsWindow",
            "open-server-settings",
            "close-server-settings",
            "modal: false",
            "frame: true"
        ]
        
        missing_backend = []
        for backend in required_backend:
            if backend not in main_content:
                missing_backend.append(backend)
                
        if missing_backend:
            print(f"❌ Отсутствует backend функциональность: {missing_backend}")
            return False
            
        print("✅ Backend поддержка корректна")
        return True
        
    def test_build(self):
        """Тестирование сборки проекта"""
        print("🔨 Тестирование сборки проекта...")
        
        try:
            # Проверяем package.json
            package_file = self.project_root / 'package.json'
            if not package_file.exists():
                print("❌ package.json не найден")
                return False
                
            # Устанавливаем зависимости если нужно
            node_modules = self.project_root / 'node_modules'
            if not node_modules.exists():
                print("📦 Установка зависимостей...")
                result = subprocess.run(['cmd', '/c', 'npm', 'install'], 
                                      cwd=self.project_root, 
                                      capture_output=True, 
                                      text=True,
                                      shell=True)
                if result.returncode != 0:
                    print(f"❌ Ошибка установки зависимостей: {result.stderr}")
                    return False
                    
            # Сборка проекта
            print("🔨 Сборка проекта...")
            result = subprocess.run(['cmd', '/c', 'npm', 'run', 'build'], 
                                  cwd=self.project_root, 
                                  capture_output=True, 
                                  text=True,
                                  shell=True)
            
            if result.returncode != 0:
                print(f"❌ Ошибка сборки: {result.stderr}")
                return False
                
            print("✅ Сборка проекта успешна")
            return True
            
        except Exception as e:
            print(f"❌ Ошибка при сборке: {e}")
            return False
            
    def test_electron_launch(self):
        """Тестирование запуска Electron"""
        print("⚡ Тестирование запуска Electron...")
        
        try:
            # Проверяем наличие dist папки
            dist_folder = self.project_root / 'dist'
            if not dist_folder.exists():
                print("❌ Папка dist не найдена, сборка не выполнена")
                return False
                
            # Проверяем основные файлы сборки
            main_js = dist_folder / 'main.js'
            if not main_js.exists():
                print("❌ main.js не найден в папке dist")
                return False
                
            print("✅ Файлы сборки найдены")
            
            # Запускаем Electron в тестовом режиме с таймаутом
            process = subprocess.Popen(['cmd', '/c', 'npm', 'start'], 
                                     cwd=self.project_root,
                                     stdout=subprocess.PIPE,
                                     stderr=subprocess.PIPE,
                                     text=True,
                                     shell=True)
            
            # Ждем несколько секунд для запуска
            time.sleep(3)
            
            # Проверяем, что процесс запущен
            if process.poll() is None:
                print("✅ Electron запущен успешно")
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                return True
            else:
                stdout, stderr = process.communicate()
                print(f"❌ Electron не запустился: {stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка запуска Electron: {e}")
            return False
            
    def run_all_tests(self):
        """Запуск всех тестов"""
        print("🚀 Запуск полного тестирования macOS редизайна...")
        print("=" * 60)
        
        # Запускаем тесты
        self.test_results['css_styles'] = self.test_css_styles()
        self.test_results['app_component'] = self.test_app_component()
        self.test_results['tailwind_config'] = self.test_tailwind_config()
        self.test_results['backend_support'] = self.test_backend_support()
        self.test_results['build_success'] = self.test_build()
        self.test_results['electron_launch'] = self.test_electron_launch()
        
        # Результаты
        print("\n" + "=" * 60)
        print("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, result in self.test_results.items():
            status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            
        print("=" * 60)
        print(f"Общий результат: {passed_tests}/{total_tests} тестов пройдено")
        
        if passed_tests == total_tests:
            print("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! macOS редизайн готов!")
            return True
        else:
            print("⚠️ Некоторые тесты провалены. Требуется доработка.")
            return False
            
    def generate_report(self):
        """Генерация отчета"""
        report = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'test_results': self.test_results,
            'summary': {
                'total_tests': len(self.test_results),
                'passed_tests': sum(self.test_results.values()),
                'success_rate': sum(self.test_results.values()) / len(self.test_results) * 100
            }
        }
        
        report_file = self.project_root / 'MACOS_REDESIGN_TEST_REPORT.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            
        print(f"\n📄 Отчет сохранен: {report_file}")

if __name__ == "__main__":
    tester = MacOSRedesignTester()
    success = tester.run_all_tests()
    tester.generate_report()
    
    sys.exit(0 if success else 1)
