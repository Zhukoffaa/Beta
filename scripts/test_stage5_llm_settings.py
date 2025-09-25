#!/usr/bin/env python3

import os
import sys
import json
import yaml
import time
import subprocess
from pathlib import Path

class Stage5LLMSettingsTest:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.test_results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'stage': 'Stage 5 - LLM Settings & Central Editor',
            'tests': [],
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0,
                'success_rate': 0
            }
        }

    def log_test(self, name, status, details=""):
        test_result = {
            'name': name,
            'status': status,
            'details': details,
            'timestamp': time.strftime('%H:%M:%S')
        }
        self.test_results['tests'].append(test_result)
        self.test_results['summary']['total'] += 1
        
        if status == 'PASS':
            self.test_results['summary']['passed'] += 1
            print(f"✅ {name}")
        else:
            self.test_results['summary']['failed'] += 1
            print(f"❌ {name}: {details}")

    def test_app_yaml_llm_config(self):
        """Тест конфигурации LLM в app.yaml"""
        try:
            app_yaml_path = self.project_root / 'configs' / 'app.yaml'
            
            if not app_yaml_path.exists():
                self.log_test("app.yaml exists", "FAIL", "File not found")
                return
            
            with open(app_yaml_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            # Проверка структуры LLM конфигурации
            if 'llm' not in config:
                self.log_test("LLM config section", "FAIL", "Missing llm section")
                return
            
            llm_config = config['llm']
            required_fields = ['model', 'temperature', 'maxTokens', 'topP', 'systemPrompt', 'presets']
            
            for field in required_fields:
                if field not in llm_config:
                    self.log_test(f"LLM config field: {field}", "FAIL", f"Missing {field}")
                    return
            
            # Проверка пресетов
            if not isinstance(llm_config['presets'], list) or len(llm_config['presets']) < 3:
                self.log_test("LLM presets", "FAIL", "Should have at least 3 presets")
                return
            
            preset_names = [p['name'] for p in llm_config['presets']]
            expected_presets = ['Разработчик', 'Аналитик', 'Креативный']
            
            for preset in expected_presets:
                if preset not in preset_names:
                    self.log_test(f"LLM preset: {preset}", "FAIL", f"Missing preset {preset}")
                    return
            
            self.log_test("app.yaml LLM configuration", "PASS", f"All required fields present, {len(llm_config['presets'])} presets")
            
        except Exception as e:
            self.log_test("app.yaml LLM configuration", "FAIL", str(e))

    def test_config_service_llm_types(self):
        """Тест типов LLM в ConfigService"""
        try:
            config_path = self.project_root / 'backend' / 'services' / 'config.ts'
            
            if not config_path.exists():
                self.log_test("config.ts exists", "FAIL", "File not found")
                return
            
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверка интерфейсов LLM
            required_interfaces = ['LLMPreset', 'LLMConfig']
            for interface in required_interfaces:
                if f'export interface {interface}' not in content:
                    self.log_test(f"Interface {interface}", "FAIL", f"Missing interface {interface}")
                    return
            
            # Проверка полей в AppConfig
            if 'llm?: LLMConfig;' not in content:
                self.log_test("AppConfig LLM field", "FAIL", "Missing llm field in AppConfig")
                return
            
            self.log_test("ConfigService LLM types", "PASS", "All LLM interfaces and types defined")
            
        except Exception as e:
            self.log_test("ConfigService LLM types", "FAIL", str(e))

    def test_main_ts_llm_handlers(self):
        """Тест IPC обработчиков LLM в main.ts"""
        try:
            main_path = self.project_root / 'backend' / 'main.ts'
            
            if not main_path.exists():
                self.log_test("main.ts exists", "FAIL", "File not found")
                return
            
            with open(main_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверка IPC обработчиков
            required_handlers = [
                'update-llm-settings',
                'get-llm-settings'
            ]
            
            for handler in required_handlers:
                if f"ipcMain.handle('{handler}'" not in content:
                    self.log_test(f"IPC handler: {handler}", "FAIL", f"Missing handler {handler}")
                    return
            
            self.log_test("main.ts LLM IPC handlers", "PASS", "All LLM IPC handlers present")
            
        except Exception as e:
            self.log_test("main.ts LLM IPC handlers", "FAIL", str(e))

    def test_settings_dialog_llm_tab(self):
        """Тест вкладки LLM в SettingsDialog"""
        try:
            settings_path = self.project_root / 'renderer' / 'src' / 'components' / 'SettingsDialog.tsx'
            
            if not settings_path.exists():
                self.log_test("SettingsDialog.tsx exists", "FAIL", "File not found")
                return
            
            with open(settings_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверка интерфейсов и типов
            required_interfaces = ['LLMSettings', 'LLMPreset']
            for interface in required_interfaces:
                if f'interface {interface}' not in content:
                    self.log_test(f"SettingsDialog interface: {interface}", "FAIL", f"Missing interface {interface}")
                    return
            
            # Проверка вкладок
            if "'llm'" not in content or "Модель LLM" not in content:
                self.log_test("SettingsDialog LLM tab", "FAIL", "Missing LLM tab")
                return
            
            # Проверка полей настроек
            llm_fields = ['temperature', 'maxTokens', 'topP', 'systemPrompt', 'frequencyPenalty']
            for field in llm_fields:
                if field not in content:
                    self.log_test(f"SettingsDialog LLM field: {field}", "FAIL", f"Missing field {field}")
                    return
            
            # Проверка пресетов
            if 'selectedPreset' not in content or 'handlePresetChange' not in content:
                self.log_test("SettingsDialog presets", "FAIL", "Missing preset functionality")
                return
            
            self.log_test("SettingsDialog LLM functionality", "PASS", "All LLM settings and presets implemented")
            
        except Exception as e:
            self.log_test("SettingsDialog LLM functionality", "FAIL", str(e))

    def test_app_tsx_llm_integration(self):
        """Тест интеграции LLM настроек в App.tsx"""
        try:
            app_path = self.project_root / 'renderer' / 'src' / 'App.tsx'
            
            if not app_path.exists():
                self.log_test("App.tsx exists", "FAIL", "File not found")
                return
            
            with open(app_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверка интерфейса LLMSettings
            if 'interface LLMSettings' not in content:
                self.log_test("App.tsx LLMSettings interface", "FAIL", "Missing LLMSettings interface")
                return
            
            # Проверка состояния LLM
            if 'llmSettings, setLLMSettings' not in content:
                self.log_test("App.tsx LLM state", "FAIL", "Missing LLM settings state")
                return
            
            # Проверка функций обработки
            required_functions = ['loadLLMSettings', 'handleLLMSettingsChange']
            for func in required_functions:
                if func not in content:
                    self.log_test(f"App.tsx function: {func}", "FAIL", f"Missing function {func}")
                    return
            
            # Проверка передачи пропсов в SettingsDialog
            if 'onLLMSettingsChange={handleLLMSettingsChange}' not in content:
                self.log_test("App.tsx SettingsDialog props", "FAIL", "Missing LLM settings change handler prop")
                return
            
            self.log_test("App.tsx LLM integration", "PASS", "LLM settings fully integrated")
            
        except Exception as e:
            self.log_test("App.tsx LLM integration", "FAIL", str(e))

    def test_central_editor_layout(self):
        """Тест центрального расположения редактора"""
        try:
            app_path = self.project_root / 'renderer' / 'src' / 'App.tsx'
            
            with open(app_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверка вкладок
            required_tabs = ['editor', 'diff', 'logs', 'settings']
            for tab in required_tabs:
                if f"'{tab}'" not in content:
                    self.log_test(f"Tab: {tab}", "FAIL", f"Missing tab {tab}")
                    return
            
            # Проверка структуры layout
            layout_elements = ['sidebar', 'main-content', 'chat-panel']
            for element in layout_elements:
                if element not in content:
                    self.log_test(f"Layout element: {element}", "FAIL", f"Missing layout element {element}")
                    return
            
            # Проверка CodeEditor в центре
            if 'CodeEditor' not in content or 'renderCenterPanel' not in content:
                self.log_test("Central CodeEditor", "FAIL", "CodeEditor not properly centered")
                return
            
            self.log_test("Central editor layout", "PASS", "Editor properly positioned in center with tabs")
            
        except Exception as e:
            self.log_test("Central editor layout", "FAIL", str(e))

    def test_css_macos_styles(self):
        """Тест стилей в стиле macOS"""
        try:
            css_path = self.project_root / 'renderer' / 'src' / 'App.css'
            
            if not css_path.exists():
                self.log_test("App.css exists", "FAIL", "File not found")
                return
            
            with open(css_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверка macOS стилей
            macos_classes = [
                'macos-dark-surface',
                'macos-dark-border', 
                'macos-dark-text',
                'btn-primary',
                'btn-secondary'
            ]
            
            for css_class in macos_classes:
                if css_class not in content:
                    self.log_test(f"CSS class: {css_class}", "FAIL", f"Missing CSS class {css_class}")
                    return
            
            self.log_test("macOS CSS styles", "PASS", "All macOS style classes present")
            
        except Exception as e:
            self.log_test("macOS CSS styles", "FAIL", str(e))

    def run_all_tests(self):
        """Запуск всех тестов"""
        print("🚀 Запуск тестов Stage 5: LLM Settings & Central Editor")
        print("=" * 60)
        
        # Основные тесты
        self.test_app_yaml_llm_config()
        self.test_config_service_llm_types()
        self.test_main_ts_llm_handlers()
        self.test_settings_dialog_llm_tab()
        self.test_app_tsx_llm_integration()
        self.test_central_editor_layout()
        self.test_css_macos_styles()
        
        # Подсчет результатов
        total = self.test_results['summary']['total']
        passed = self.test_results['summary']['passed']
        failed = self.test_results['summary']['failed']
        
        if total > 0:
            success_rate = (passed / total) * 100
            self.test_results['summary']['success_rate'] = success_rate
        
        # Вывод результатов
        print("\n" + "=" * 60)
        print(f"📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ STAGE 5")
        print(f"Всего тестов: {total}")
        print(f"Успешно: {passed}")
        print(f"Неудачно: {failed}")
        print(f"Процент успеха: {success_rate:.1f}%")
        
        # Сохранение результатов
        results_file = self.project_root / 'STAGE5_LLM_SETTINGS_TEST_REPORT.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Отчет сохранен: {results_file}")
        
        if success_rate >= 85:
            print("🎉 STAGE 5 УСПЕШНО ЗАВЕРШЕН!")
            return True
        else:
            print("⚠️  STAGE 5 ТРЕБУЕТ ДОРАБОТКИ")
            return False

def main():
    tester = Stage5LLMSettingsTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
