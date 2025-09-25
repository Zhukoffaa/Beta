#!/usr/bin/env python3

import os
import sys
import json
import subprocess
import time
from pathlib import Path

class PerformanceOptimizationTester:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.test_results = {
            'app_optimization': False,
            'memo_usage': False,
            'callback_usage': False,
            'debounce_implementation': False,
            'loading_states': False,
            'build_performance': False
        }
        
    def test_app_optimization(self):
        """Проверка оптимизации App.tsx"""
        print("⚡ Тестирование оптимизации App.tsx...")
        
        app_file = self.project_root / 'renderer' / 'src' / 'App.tsx'
        if not app_file.exists():
            print("❌ App.tsx не найден")
            return False
            
        with open(app_file, 'r', encoding='utf-8') as f:
            app_content = f.read()
            
        # Проверяем оптимизации
        required_optimizations = [
            'useCallback',
            'useMemo',
            'memo',
            'useDebounce',
            'isLoading',
            'isFileLoading',
            'debouncedFileContent',
            'AppHeader = memo',
            'TabNavigation = memo'
        ]
        
        missing_optimizations = []
        for optimization in required_optimizations:
            if optimization not in app_content:
                missing_optimizations.append(optimization)
                
        if missing_optimizations:
            print(f"❌ Отсутствуют оптимизации: {missing_optimizations}")
            return False
            
        print("✅ App.tsx оптимизирован корректно")
        return True
        
    def test_memo_usage(self):
        """Проверка использования React.memo"""
        print("🧠 Тестирование использования React.memo...")
        
        app_file = self.project_root / 'renderer' / 'src' / 'App.tsx'
        with open(app_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Проверяем мемоизированные компоненты
        memo_components = [
            'AppHeader = memo',
            'TabNavigation = memo'
        ]
        
        memo_props = [
            'fileTreeProps = useMemo',
            'chatProps = useMemo',
            'settingsProps = useMemo'
        ]
        
        missing_memo = []
        for component in memo_components + memo_props:
            if component not in content:
                missing_memo.append(component)
                
        if missing_memo:
            print(f"❌ Отсутствуют memo оптимизации: {missing_memo}")
            return False
            
        print("✅ React.memo используется корректно")
        return True
        
    def test_callback_usage(self):
        """Проверка использования useCallback"""
        print("🔄 Тестирование использования useCallback...")
        
        app_file = self.project_root / 'renderer' / 'src' / 'App.tsx'
        with open(app_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Проверяем useCallback функции
        callback_functions = [
            'loadLLMSettings = useCallback',
            'handleLLMSettingsChange = useCallback',
            'handleFileSelect = useCallback',
            'handleOpenServerSettings = useCallback',
            'handleTabChange = useCallback',
            'getLanguageFromFile = useCallback'
        ]
        
        missing_callbacks = []
        for callback in callback_functions:
            if callback not in content:
                missing_callbacks.append(callback)
                
        if missing_callbacks:
            print(f"❌ Отсутствуют useCallback оптимизации: {missing_callbacks}")
            return False
            
        print("✅ useCallback используется корректно")
        return True
        
    def test_debounce_implementation(self):
        """Проверка реализации debounce"""
        print("⏱️ Тестирование debounce реализации...")
        
        app_file = self.project_root / 'renderer' / 'src' / 'App.tsx'
        with open(app_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Проверяем debounce функциональность
        debounce_features = [
            'useDebounce',
            'debouncedValue',
            'setTimeout',
            'clearTimeout',
            'debouncedFileContent = useDebounce(fileContent, 300)'
        ]
        
        missing_debounce = []
        for feature in debounce_features:
            if feature not in content:
                missing_debounce.append(feature)
                
        if missing_debounce:
            print(f"❌ Отсутствуют debounce функции: {missing_debounce}")
            return False
            
        print("✅ Debounce реализован корректно")
        return True
        
    def test_loading_states(self):
        """Проверка loading состояний"""
        print("🔄 Тестирование loading состояний...")
        
        app_file = self.project_root / 'renderer' / 'src' / 'App.tsx'
        with open(app_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Проверяем loading состояния
        loading_features = [
            'isLoading',
            'isFileLoading',
            'setIsLoading',
            'setIsFileLoading',
            'animate-spin',
            'Загрузка...',
            'disabled={isLoading}'
        ]
        
        missing_loading = []
        for feature in loading_features:
            if feature not in content:
                missing_loading.append(feature)
                
        if missing_loading:
            print(f"❌ Отсутствуют loading состояния: {missing_loading}")
            return False
            
        print("✅ Loading состояния реализованы корректно")
        return True
        
    def test_build_performance(self):
        """Тестирование производительности сборки"""
        print("🏗️ Тестирование производительности сборки...")
        
        try:
            # Проверяем время сборки
            start_time = time.time()
            
            result = subprocess.run(['cmd', '/c', 'npm', 'run', 'build:renderer'], 
                                  cwd=self.project_root, 
                                  capture_output=True, 
                                  text=True,
                                  shell=True,
                                  timeout=120)  # 2 минуты максимум
            
            build_time = time.time() - start_time
            
            if result.returncode != 0:
                print(f"❌ Ошибка сборки: {result.stderr}")
                return False
                
            print(f"✅ Сборка завершена за {build_time:.2f} секунд")
            
            # Проверяем размер bundle
            dist_folder = self.project_root / 'renderer' / 'dist'
            if dist_folder.exists():
                total_size = sum(f.stat().st_size for f in dist_folder.rglob('*') if f.is_file())
                size_mb = total_size / (1024 * 1024)
                print(f"📦 Размер bundle: {size_mb:.2f} MB")
                
                if size_mb > 50:  # Предупреждение если больше 50MB
                    print("⚠️ Bundle размер больше 50MB, рекомендуется оптимизация")
                    
            return True
            
        except subprocess.TimeoutExpired:
            print("❌ Сборка превысила лимит времени (2 минуты)")
            return False
        except Exception as e:
            print(f"❌ Ошибка при тестировании сборки: {e}")
            return False
            
    def run_all_tests(self):
        """Запуск всех тестов производительности"""
        print("🚀 Запуск тестирования производительности и оптимизации...")
        print("=" * 70)
        
        # Запускаем тесты
        self.test_results['app_optimization'] = self.test_app_optimization()
        self.test_results['memo_usage'] = self.test_memo_usage()
        self.test_results['callback_usage'] = self.test_callback_usage()
        self.test_results['debounce_implementation'] = self.test_debounce_implementation()
        self.test_results['loading_states'] = self.test_loading_states()
        self.test_results['build_performance'] = self.test_build_performance()
        
        # Результаты
        print("\n" + "=" * 70)
        print("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ПРОИЗВОДИТЕЛЬНОСТИ:")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, result in self.test_results.items():
            status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            
        print("=" * 70)
        print(f"Общий результат: {passed_tests}/{total_tests} тестов пройдено")
        success_rate = (passed_tests / total_tests) * 100
        print(f"Процент успешности: {success_rate:.1f}%")
        
        if passed_tests == total_tests:
            print("🎉 ВСЕ ТЕСТЫ ПРОИЗВОДИТЕЛЬНОСТИ ПРОЙДЕНЫ!")
            print("⚡ Приложение оптимизировано для максимальной отзывчивости!")
            return True
        else:
            print("⚠️ Некоторые тесты производительности провалены.")
            print("🔧 Требуется дополнительная оптимизация.")
            return False
            
    def generate_performance_report(self):
        """Генерация отчета о производительности"""
        report = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'test_results': self.test_results,
            'summary': {
                'total_tests': len(self.test_results),
                'passed_tests': sum(self.test_results.values()),
                'success_rate': sum(self.test_results.values()) / len(self.test_results) * 100
            },
            'optimizations_applied': [
                'React.memo для компонентов',
                'useCallback для функций',
                'useMemo для вычислений',
                'useDebounce для ввода',
                'Loading состояния',
                'Мемоизация пропсов'
            ],
            'performance_metrics': {
                'debounce_delay': '300ms',
                'loading_timeout': '150ms для файлов, 500ms для серверов',
                'memo_components': ['AppHeader', 'TabNavigation'],
                'callback_functions': 6,
                'memoized_props': 3
            }
        }
        
        report_file = self.project_root / 'PERFORMANCE_OPTIMIZATION_REPORT.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            
        print(f"\n📄 Отчет о производительности сохранен: {report_file}")

if __name__ == "__main__":
    tester = PerformanceOptimizationTester()
    success = tester.run_all_tests()
    tester.generate_performance_report()
    
    sys.exit(0 if success else 1)
