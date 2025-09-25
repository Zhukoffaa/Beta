#!/usr/bin/env python3

import os
import sys

class Stage9Tester:
    def __init__(self):
        self.project_root = os.path.dirname(os.path.abspath(__file__))
        self.tests_passed = 0
        self.tests_total = 0
    
    def test_component_exists(self, component_name):
        self.tests_total += 1
        path = os.path.join(self.project_root, f'renderer/src/components/{component_name}')
        if os.path.exists(path):
            print(f"+ {component_name} exists")
            self.tests_passed += 1
            return True
        else:
            print(f"- {component_name} missing")
            return False
    
    def run_tests(self):
        print("Stage 9 Component Tests")
        print("=" * 30)
        
        components = ['CodeEditor.tsx', 'DiffViewer.tsx', 'SettingsDialog.tsx']
        
        for component in components:
            self.test_component_exists(component)
        
        print(f"\nResults: {self.tests_passed}/{self.tests_total} tests passed")
        return self.tests_passed == self.tests_total

if __name__ == '__main__':
    tester = Stage9Tester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)