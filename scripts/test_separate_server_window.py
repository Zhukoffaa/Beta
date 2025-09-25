#!/usr/bin/env python3

import os
import sys
import json
import time
import subprocess
from pathlib import Path

class SeparateServerWindowTester:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'tests': [],
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0
            }
        }

    def log_test(self, name, status, details=""):
        test_result = {
            'name': name,
            'status': status,
            'details': details,
            'timestamp': time.strftime('%H:%M:%S')
        }
        self.results['tests'].append(test_result)
        self.results['summary']['total'] += 1
        if status == 'PASS':
            self.results['summary']['passed'] += 1
            print(f"✅ {name}")
        else:
            self.results['summary']['failed'] += 1
            print(f"❌ {name}: {details}")

    def check_file_exists(self, file_path, description):
        full_path = self.project_root / file_path
        if full_path.exists():
            self.log_test(f"File exists: {description}", "PASS")
            return True
        else:
            self.log_test(f"File exists: {description}", "FAIL", f"Missing: {file_path}")
            return False

    def check_file_content(self, file_path, search_terms, description):
        full_path = self.project_root / file_path
        if not full_path.exists():
            self.log_test(f"Content check: {description}", "FAIL", f"File not found: {file_path}")
            return False
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            missing_terms = []
            for term in search_terms:
                if term not in content:
                    missing_terms.append(term)
            
            if missing_terms:
                self.log_test(f"Content check: {description}", "FAIL", f"Missing terms: {missing_terms}")
                return False
            else:
                self.log_test(f"Content check: {description}", "PASS")
                return True
        except Exception as e:
            self.log_test(f"Content check: {description}", "FAIL", f"Error reading file: {str(e)}")
            return False

    def test_backend_changes(self):
        print("\n🔧 Testing Backend Changes...")
        
        # Проверка main.ts
        self.check_file_content(
            'backend/main.ts',
            [
                'serverSettingsWindow: BrowserWindow | null = null',
                'openServerSettingsWindow()',
                'open-server-settings',
                'close-server-settings',
                'modal: false',
                'frame: true',
                'transparent: false',
                'title: "Серверы"'
            ],
            "main.ts server window implementation"
        )

    def test_preload_changes(self):
        print("\n🔌 Testing Preload Changes...")
        
        # Проверка preload.js
        self.check_file_content(
            'backend/preload.js',
            [
                'openServerSettings: () => ipcRenderer.invoke(\'open-server-settings\')',
                'closeServerSettings: () => ipcRenderer.invoke(\'close-server-settings\')'
            ],
            "preload.js IPC methods"
        )

    def test_frontend_changes(self):
        print("\n🎨 Testing Frontend Changes...")
        
        # Проверка App.tsx
        self.check_file_content(
            'renderer/src/App.tsx',
            [
                'handleOpenServerSettings',
                'electronAPI.openServerSettings()',
                'onClick={handleOpenServerSettings}'
            ],
            "App.tsx server settings integration"
        )
        
        # Проверка что ServerSettingsWindow больше не импортируется
        app_tsx_path = self.project_root / 'renderer/src/App.tsx'
        if app_tsx_path.exists():
            with open(app_tsx_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if 'import ServerSettingsWindow' not in content:
                self.log_test("App.tsx ServerSettingsWindow import removed", "PASS")
            else:
                self.log_test("App.tsx ServerSettingsWindow import removed", "FAIL", "Import still exists")

    def test_build_compatibility(self):
        print("\n🏗️ Testing Build Compatibility...")
        
        # Проверка package.json
        package_json_path = self.project_root / 'package.json'
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                
                # Проверка основных зависимостей
                required_deps = ['electron', 'react', 'typescript']
                missing_deps = []
                
                all_deps = {**package_data.get('dependencies', {}), **package_data.get('devDependencies', {})}
                
                for dep in required_deps:
                    if dep not in all_deps:
                        missing_deps.append(dep)
                
                if missing_deps:
                    self.log_test("Package.json dependencies", "FAIL", f"Missing: {missing_deps}")
                else:
                    self.log_test("Package.json dependencies", "PASS")
                    
            except Exception as e:
                self.log_test("Package.json dependencies", "FAIL", f"Error: {str(e)}")

    def test_typescript_compilation(self):
        print("\n📝 Testing TypeScript Compilation...")
        
        try:
            # Проверка TypeScript конфигурации
            tsconfig_path = self.project_root / 'renderer/tsconfig.json'
            if tsconfig_path.exists():
                self.log_test("TypeScript config exists", "PASS")
            else:
                self.log_test("TypeScript config exists", "FAIL", "tsconfig.json not found")
                
        except Exception as e:
            self.log_test("TypeScript compilation check", "FAIL", f"Error: {str(e)}")

    def run_all_tests(self):
        print("🚀 Starting Separate Server Window Tests...")
        print(f"Project root: {self.project_root}")
        
        self.test_backend_changes()
        self.test_preload_changes()
        self.test_frontend_changes()
        self.test_build_compatibility()
        self.test_typescript_compilation()
        
        # Сохранение результатов
        results_file = self.project_root / 'SEPARATE_SERVER_WINDOW_TEST_REPORT.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        # Вывод итогов
        print(f"\n📊 Test Summary:")
        print(f"Total tests: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")
        
        success_rate = (self.results['summary']['passed'] / self.results['summary']['total']) * 100 if self.results['summary']['total'] > 0 else 0
        print(f"Success rate: {success_rate:.1f}%")
        
        if self.results['summary']['failed'] == 0:
            print("🎉 All tests passed! Separate server window implementation is ready.")
            return True
        else:
            print("⚠️ Some tests failed. Please review the issues above.")
            return False

if __name__ == "__main__":
    tester = SeparateServerWindowTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
