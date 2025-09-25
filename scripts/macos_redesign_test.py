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
        self.results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'tests': {},
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0,
                'success_rate': 0
            }
        }
    
    def log(self, message, level='INFO'):
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] {level}: {message}")
    
    def run_test(self, test_name, test_func):
        self.log(f"Running test: {test_name}")
        self.results['summary']['total'] += 1
        
        try:
            result = test_func()
            if result:
                self.results['tests'][test_name] = {'status': 'PASS', 'details': result}
                self.results['summary']['passed'] += 1
                self.log(f"✓ {test_name} - PASSED", 'SUCCESS')
            else:
                self.results['tests'][test_name] = {'status': 'FAIL', 'details': 'Test returned False'}
                self.results['summary']['failed'] += 1
                self.log(f"✗ {test_name} - FAILED", 'ERROR')
        except Exception as e:
            self.results['tests'][test_name] = {'status': 'ERROR', 'details': str(e)}
            self.results['summary']['failed'] += 1
            self.log(f"✗ {test_name} - ERROR: {str(e)}", 'ERROR')
    
    def test_font_imports(self):
        """Проверка импорта шрифтов Inter и Roboto"""
        css_file = self.project_root / 'renderer' / 'src' / 'App.css'
        if not css_file.exists():
            return False
        
        content = css_file.read_text(encoding='utf-8')
        has_inter = 'Inter' in content and '@import' in content
        has_roboto = 'Roboto' in content and '@import' in content
        
        return has_inter and has_roboto
    
    def test_tailwind_config(self):
        """Проверка конфигурации Tailwind для macOS"""
        config_file = self.project_root / 'tailwind.config.js'
        if not config_file.exists():
            return False
        
        content = config_file.read_text(encoding='utf-8')
        required_elements = [
            'San Francisco',
            'macos',
            'backdrop-blur',
            'cubic-bezier',
            'fadeIn',
            'slideUp'
        ]
        
        return all(element in content for element in required_elements)
    
    def test_macos_colors(self):
        """Проверка цветовой палитры macOS"""
        config_file = self.project_root / 'tailwind.config.js'
        content = config_file.read_text(encoding='utf-8')
        
        macos_colors = [
            'macos:',
            'light:',
            'dark:',
            'blue:',
            'accent:'
        ]
        
        return all(color in content for color in macos_colors)
    
    def test_css_classes(self):
        """Проверка CSS классов в стиле macOS"""
        css_file = self.project_root / 'renderer' / 'src' / 'App.css'
        content = css_file.read_text(encoding='utf-8')
        
        required_classes = [
            '.app-header',
            '.sidebar',
            '.chat-panel',
            '.modal-overlay',
            '.btn-primary',
            '.btn-secondary',
            '.status-connected',
            '.progress-bar'
        ]
        
        return all(cls in content for cls in required_classes)
    
    def test_app_structure(self):
        """Проверка структуры App.tsx"""
        app_file = self.project_root / 'renderer' / 'src' / 'App.tsx'
        if not app_file.exists():
            return False
        
        content = app_file.read_text(encoding='utf-8')
        
        required_elements = [
            'app-header',
            'electron-drag',
            'ServerSettingsWindow',
            'CodeEditor',
            'FileTreePanel',
            'Chat'
        ]
        
        return all(element in content for element in required_elements)
    
    def test_server_settings_window(self):
        """Проверка окна настроек серверов"""
        component_file = self.project_root / 'renderer' / 'src' / 'components' / 'ServerSettingsWindow.tsx'
        if not component_file.exists():
            return False
        
        content = component_file.read_text(encoding='utf-8')
        
        required_elements = [
            'modal-overlay',
            'modal-content',
            'traffic lights',
            'bg-red-500',
            'bg-yellow-500',
            'bg-green-500'
        ]
        
        return any('bg-red-500' in content and 'bg-yellow-500' in content and 'bg-green-500' in content for _ in [1])
    
    def test_animations(self):
        """Проверка анимаций"""
        css_file = self.project_root / 'renderer' / 'src' / 'App.css'
        content = css_file.read_text(encoding='utf-8')
        
        animations = [
            '@keyframes fade-in',
            '@keyframes slide-up',
            '@keyframes scale-in',
            'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        ]
        
        return all(anim in content for anim in animations)
    
    def test_backdrop_blur(self):
        """Проверка backdrop-filter эффектов"""
        css_file = self.project_root / 'renderer' / 'src' / 'App.css'
        content = css_file.read_text(encoding='utf-8')
        
        blur_effects = [
            'backdrop-filter: blur',
            '-webkit-backdrop-filter: blur',
            'saturate(180%)'
        ]
        
        return all(effect in content for effect in blur_effects)
    
    def test_typescript_compilation(self):
        """Проверка компиляции TypeScript"""
        try:
            os.chdir(self.project_root)
            # Проверяем наличие tsconfig.json
            tsconfig_files = [
                'tsconfig.json',
                'backend/tsconfig.json', 
                'renderer/tsconfig.json'
            ]
            
            for config in tsconfig_files:
                if (self.project_root / config).exists():
                    return True
            return False
        except Exception:
            return False
    
    def test_build_process(self):
        """Проверка процесса сборки"""
        try:
            os.chdir(self.project_root)
            # Проверяем наличие build скриптов в package.json
            package_json = self.project_root / 'package.json'
            if not package_json.exists():
                return False
            
            with open(package_json, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            scripts = package_data.get('scripts', {})
            return 'build' in scripts and 'build:backend' in scripts and 'build:renderer' in scripts
        except Exception:
            return False
    
    def run_all_tests(self):
        """Запуск всех тестов"""
        self.log("Starting macOS Redesign Tests")
        self.log("=" * 50)
        
        # Тесты дизайна
        self.run_test("Font Imports", self.test_font_imports)
        self.run_test("Tailwind Config", self.test_tailwind_config)
        self.run_test("macOS Colors", self.test_macos_colors)
        self.run_test("CSS Classes", self.test_css_classes)
        self.run_test("App Structure", self.test_app_structure)
        self.run_test("Server Settings Window", self.test_server_settings_window)
        self.run_test("Animations", self.test_animations)
        self.run_test("Backdrop Blur", self.test_backdrop_blur)
        
        # Технические тесты
        self.run_test("TypeScript Compilation", self.test_typescript_compilation)
        self.run_test("Build Process", self.test_build_process)
        
        # Подсчет результатов
        total = self.results['summary']['total']
        passed = self.results['summary']['passed']
        self.results['summary']['success_rate'] = (passed / total * 100) if total > 0 else 0
        
        self.log("=" * 50)
        self.log(f"Tests completed: {passed}/{total} passed ({self.results['summary']['success_rate']:.1f}%)")
        
        if self.results['summary']['success_rate'] >= 90:
            self.log("🎉 macOS Redesign: EXCELLENT", 'SUCCESS')
        elif self.results['summary']['success_rate'] >= 80:
            self.log("✅ macOS Redesign: GOOD", 'SUCCESS')
        elif self.results['summary']['success_rate'] >= 70:
            self.log("⚠️  macOS Redesign: ACCEPTABLE", 'WARNING')
        else:
            self.log("❌ macOS Redesign: NEEDS IMPROVEMENT", 'ERROR')
        
        return self.results
    
    def save_results(self):
        """Сохранение результатов"""
        results_file = self.project_root / 'MACOS_REDESIGN_TEST_REPORT.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        self.log(f"Results saved to: {results_file}")

def main():
    tester = MacOSRedesignTester()
    results = tester.run_all_tests()
    tester.save_results()
    
    # Возврат кода выхода
    success_rate = results['summary']['success_rate']
    if success_rate >= 80:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
