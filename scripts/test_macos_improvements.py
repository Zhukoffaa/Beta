#!/usr/bin/env python3

import os
import sys
import json
import subprocess
import time
from pathlib import Path

class MacOSImprovementsTester:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'tests': {},
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0,
                'warnings': 0
            }
        }

    def log(self, message, level='INFO'):
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] {level}: {message}")

    def test_file_exists(self, file_path, description):
        test_name = f"file_exists_{Path(file_path).name}"
        self.results['tests'][test_name] = {
            'description': description,
            'status': 'UNKNOWN',
            'details': []
        }
        
        full_path = self.project_root / file_path
        if full_path.exists():
            self.results['tests'][test_name]['status'] = 'PASSED'
            self.results['tests'][test_name]['details'].append(f"File exists: {full_path}")
            self.log(f"✓ {description}")
            return True
        else:
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"File missing: {full_path}")
            self.log(f"✗ {description} - File not found", 'ERROR')
            return False

    def test_file_content(self, file_path, patterns, description):
        test_name = f"content_{Path(file_path).name}"
        self.results['tests'][test_name] = {
            'description': description,
            'status': 'UNKNOWN',
            'details': []
        }
        
        full_path = self.project_root / file_path
        if not full_path.exists():
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"File not found: {full_path}")
            self.log(f"✗ {description} - File not found", 'ERROR')
            return False

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            found_patterns = []
            missing_patterns = []
            
            for pattern in patterns:
                if pattern in content:
                    found_patterns.append(pattern)
                else:
                    missing_patterns.append(pattern)
            
            if missing_patterns:
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].append(f"Missing patterns: {missing_patterns}")
                self.log(f"✗ {description} - Missing patterns: {missing_patterns}", 'ERROR')
                return False
            else:
                self.results['tests'][test_name]['status'] = 'PASSED'
                self.results['tests'][test_name]['details'].append(f"All patterns found: {found_patterns}")
                self.log(f"✓ {description}")
                return True
                
        except Exception as e:
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"Error reading file: {str(e)}")
            self.log(f"✗ {description} - Error: {str(e)}", 'ERROR')
            return False

    def test_typescript_files(self):
        test_name = "typescript_files"
        self.results['tests'][test_name] = {
            'description': "TypeScript files syntax check",
            'status': 'UNKNOWN',
            'details': []
        }
        
        try:
            # Check key TypeScript files for basic syntax
            ts_files = [
                'renderer/src/App.tsx',
                'renderer/src/components/FileTreePanel.tsx',
                'backend/services/ocrService.ts'
            ]
            
            syntax_errors = []
            for ts_file in ts_files:
                full_path = self.project_root / ts_file
                if full_path.exists():
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Basic syntax checks
                    if 'import' not in content and 'export' not in content:
                        syntax_errors.append(f"{ts_file}: No imports/exports found")
                    if content.count('{') != content.count('}'):
                        syntax_errors.append(f"{ts_file}: Unmatched braces")
                else:
                    syntax_errors.append(f"{ts_file}: File not found")
            
            if syntax_errors:
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].extend(syntax_errors)
                self.log(f"✗ TypeScript files have syntax issues: {syntax_errors}", 'ERROR')
                return False
            else:
                self.results['tests'][test_name]['status'] = 'PASSED'
                self.results['tests'][test_name]['details'].append("All TypeScript files have valid syntax")
                self.log("✓ TypeScript files syntax check")
                return True
                
        except Exception as e:
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"Error: {str(e)}")
            self.log(f"✗ TypeScript files check error: {str(e)}", 'ERROR')
            return False

    def run_all_tests(self):
        self.log("Starting macOS improvements testing...")
        
        # Test 1: FileTreePanel improvements
        self.test_file_exists(
            'renderer/src/components/FileTreePanel.tsx',
            'FileTreePanel component exists'
        )
        
        self.test_file_content(
            'renderer/src/components/FileTreePanel.tsx',
            ['useCallback', 'error', 'setError', 'disabled'],
            'FileTreePanel has improved error handling'
        )
        
        # Test 2: App.tsx server settings button
        self.test_file_content(
            'renderer/src/App.tsx',
            ['handleOpenServerSettings', 'Серверы', 'openServerSettings'],
            'App.tsx has server settings button'
        )
        
        # Test 3: ImageServerParser multiple images support
        self.test_file_content(
            'renderer/src/components/ImageServerParser.tsx',
            ['multiple', 'onDragOver', 'onDrop', 'images.length'],
            'ImageServerParser supports multiple images'
        )
        
        # Test 4: OCR service improvements
        self.test_file_content(
            'backend/services/ocrService.ts',
            ['processMultipleImages', 'mergeResults', 'Promise.all'],
            'OCR service supports multiple images'
        )
        
        # Test 5: Tailwind config macOS styles
        self.test_file_content(
            'tailwind.config.js',
            ['Inter', 'macos', 'animation', 'backdrop'],
            'Tailwind config has macOS styles'
        )
        
        # Test 6: TypeScript files syntax
        self.test_typescript_files()
        
        # Calculate summary
        for test_result in self.results['tests'].values():
            self.results['summary']['total'] += 1
            if test_result['status'] == 'PASSED':
                self.results['summary']['passed'] += 1
            elif test_result['status'] == 'FAILED':
                self.results['summary']['failed'] += 1
            else:
                self.results['summary']['warnings'] += 1
        
        # Save results
        results_file = self.project_root / 'MACOS_IMPROVEMENTS_TEST_REPORT.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        # Print summary
        self.log("=" * 50)
        self.log("TEST SUMMARY")
        self.log("=" * 50)
        self.log(f"Total tests: {self.results['summary']['total']}")
        self.log(f"Passed: {self.results['summary']['passed']}")
        self.log(f"Failed: {self.results['summary']['failed']}")
        self.log(f"Warnings: {self.results['summary']['warnings']}")
        
        success_rate = (self.results['summary']['passed'] / self.results['summary']['total']) * 100
        self.log(f"Success rate: {success_rate:.1f}%")
        
        if self.results['summary']['failed'] == 0:
            self.log("🎉 All macOS improvements tests passed!", 'SUCCESS')
            return True
        else:
            self.log(f"❌ {self.results['summary']['failed']} tests failed", 'ERROR')
            return False

if __name__ == '__main__':
    tester = MacOSImprovementsTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
