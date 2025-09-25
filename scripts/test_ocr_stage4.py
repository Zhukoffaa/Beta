#!/usr/bin/env python3

import os
import sys
import json
import time
from pathlib import Path

class OCRStage4Tester:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'tests': {},
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0
            }
        }

    def log(self, message, level='INFO'):
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] {level}: {message}")

    def test_component_features(self):
        test_name = "ocr_component_features"
        self.results['tests'][test_name] = {
            'description': "ImageServerParser OCR component features",
            'status': 'UNKNOWN',
            'details': []
        }
        
        try:
            component_path = self.project_root / 'renderer/src/components/ImageServerParser.tsx'
            
            if not component_path.exists():
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].append("ImageServerParser.tsx not found")
                self.log("✗ ImageServerParser component not found", 'ERROR')
                return False

            with open(component_path, 'r', encoding='utf-8') as f:
                content = f.read()

            required_features = [
                'multiple',  # Multiple file support
                'onDragOver',  # Drag and drop
                'onDrop',
                'processingProgress',  # Progress indicator
                'setProcessingProgress',
                'images.length',  # Multiple images handling
                'Promise(resolve => setTimeout',  # Progress simulation
                'alert(',  # Error handling with detailed messages
                'Попробуйте:'  # Detailed error suggestions
            ]

            missing_features = []
            found_features = []

            for feature in required_features:
                if feature in content:
                    found_features.append(feature)
                else:
                    missing_features.append(feature)

            if missing_features:
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].append(f"Missing features: {missing_features}")
                self.log(f"✗ OCR component missing features: {missing_features}", 'ERROR')
                return False
            else:
                self.results['tests'][test_name]['status'] = 'PASSED'
                self.results['tests'][test_name]['details'].append(f"All features found: {found_features}")
                self.log("✓ OCR component has all required features")
                return True

        except Exception as e:
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"Error: {str(e)}")
            self.log(f"✗ Error testing OCR component: {str(e)}", 'ERROR')
            return False

    def test_ocr_service_improvements(self):
        test_name = "ocr_service_improvements"
        self.results['tests'][test_name] = {
            'description': "OCR service backend improvements",
            'status': 'UNKNOWN',
            'details': []
        }
        
        try:
            service_path = self.project_root / 'backend/services/ocrService.ts'
            
            if not service_path.exists():
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].append("ocrService.ts not found")
                self.log("✗ OCR service not found", 'ERROR')
                return False

            with open(service_path, 'r', encoding='utf-8') as f:
                content = f.read()

            required_improvements = [
                'timeout: number = 30000',  # Timeout parameter
                'Promise.race',  # Timeout implementation
                'setTimeout(() => reject',  # Timeout rejection
                'this.logger.info(`Processing image ${index + 1}',  # Progress logging
                'this.logger.warn(`Image not found',  # Error handling
                'this.logger.error(`Failed to process image',  # Individual image error handling
                'Object.keys(mergedResults).join',  # Result logging
                'mergeResults(results)'  # Result merging
            ]

            missing_improvements = []
            found_improvements = []

            for improvement in required_improvements:
                if improvement in content:
                    found_improvements.append(improvement)
                else:
                    missing_improvements.append(improvement)

            if missing_improvements:
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].append(f"Missing improvements: {missing_improvements}")
                self.log(f"✗ OCR service missing improvements: {missing_improvements}", 'ERROR')
                return False
            else:
                self.results['tests'][test_name]['status'] = 'PASSED'
                self.results['tests'][test_name]['details'].append(f"All improvements found: {found_improvements}")
                self.log("✓ OCR service has all required improvements")
                return True

        except Exception as e:
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"Error: {str(e)}")
            self.log(f"✗ Error testing OCR service: {str(e)}", 'ERROR')
            return False

    def test_ipc_integration(self):
        test_name = "ipc_integration"
        self.results['tests'][test_name] = {
            'description': "IPC integration for OCR processing",
            'status': 'UNKNOWN',
            'details': []
        }
        
        try:
            main_path = self.project_root / 'backend/main.ts'
            
            if not main_path.exists():
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].append("main.ts not found")
                self.log("✗ main.ts not found", 'ERROR')
                return False

            with open(main_path, 'r', encoding='utf-8') as f:
                content = f.read()

            required_ipc = [
                "ipcMain.handle('ocr-process-images'",  # IPC handler
                'this.ocrService.processMultipleImages',  # Service call
                'imagePaths: string[]',  # Parameter type
                'success: true, data: result',  # Success response
                'success: false, error: errorMessage'  # Error response
            ]

            missing_ipc = []
            found_ipc = []

            for ipc_feature in required_ipc:
                if ipc_feature in content:
                    found_ipc.append(ipc_feature)
                else:
                    missing_ipc.append(ipc_feature)

            if missing_ipc:
                self.results['tests'][test_name]['status'] = 'FAILED'
                self.results['tests'][test_name]['details'].append(f"Missing IPC features: {missing_ipc}")
                self.log(f"✗ IPC integration missing features: {missing_ipc}", 'ERROR')
                return False
            else:
                self.results['tests'][test_name]['status'] = 'PASSED'
                self.results['tests'][test_name]['details'].append(f"All IPC features found: {found_ipc}")
                self.log("✓ IPC integration is complete")
                return True

        except Exception as e:
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"Error: {str(e)}")
            self.log(f"✗ Error testing IPC integration: {str(e)}", 'ERROR')
            return False

    def create_test_images_info(self):
        test_name = "test_images_creation"
        self.results['tests'][test_name] = {
            'description': "Create test images information",
            'status': 'UNKNOWN',
            'details': []
        }
        
        try:
            # Создаем папку для тестовых изображений
            test_images_dir = self.project_root / 'test_images'
            test_images_dir.mkdir(exist_ok=True)
            
            # Создаем README с информацией о тестовых изображениях
            readme_content = """# Тестовые изображения для OCR

## Рекомендуемые изображения для тестирования:

### 1. SSH Connection Details (ssh_details.png)
Содержимое:
```
SSH Connection Details
Host: ssh2.vast.ai
Port: 34170
User: root
Instance ID: 25954171
```

### 2. Server Configuration (server_config.png)
Содержимое:
```
Server Configuration
Public IP: 213.181.108.221
Machine Copy Port: 39999
Instance Port Range: 39166-39166
IP Address Type: Dynamic
```

### 3. Connection Command (connection_cmd.png)
Содержимое:
```
Connection Info
Proxy Command: ssh -p 34170 root@ssh2.vast.ai -L 8080:localhost:8080
Local IP Addresses: 192.168.1.100
```

## Инструкции по созданию:

1. Создайте изображения с четким текстом на контрастном фоне
2. Используйте шрифт размером не менее 12pt
3. Сохраните в форматах PNG или JPG
4. Размер файла не должен превышать 10MB

## Тестирование:

1. Загрузите 2-3 изображения в ImageServerParser
2. Проверьте drag-and-drop функциональность
3. Убедитесь, что прогресс-бар отображается корректно
4. Проверьте объединение результатов из разных изображений
5. Протестируйте обработку ошибок с поврежденными файлами
"""
            
            readme_path = test_images_dir / 'README.md'
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            self.results['tests'][test_name]['status'] = 'PASSED'
            self.results['tests'][test_name]['details'].append(f"Test images directory created: {test_images_dir}")
            self.results['tests'][test_name]['details'].append(f"README created: {readme_path}")
            self.log("✓ Test images information created")
            return True

        except Exception as e:
            self.results['tests'][test_name]['status'] = 'FAILED'
            self.results['tests'][test_name]['details'].append(f"Error: {str(e)}")
            self.log(f"✗ Error creating test images info: {str(e)}", 'ERROR')
            return False

    def run_all_tests(self):
        self.log("Starting OCR Stage 4 testing...")
        
        # Test 1: Component features
        self.test_component_features()
        
        # Test 2: Service improvements
        self.test_ocr_service_improvements()
        
        # Test 3: IPC integration
        self.test_ipc_integration()
        
        # Test 4: Create test images info
        self.create_test_images_info()
        
        # Calculate summary
        for test_result in self.results['tests'].values():
            self.results['summary']['total'] += 1
            if test_result['status'] == 'PASSED':
                self.results['summary']['passed'] += 1
            elif test_result['status'] == 'FAILED':
                self.results['summary']['failed'] += 1
        
        # Save results
        results_file = self.project_root / 'OCR_STAGE4_TEST_REPORT.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        # Print summary
        self.log("=" * 50)
        self.log("OCR STAGE 4 TEST SUMMARY")
        self.log("=" * 50)
        self.log(f"Total tests: {self.results['summary']['total']}")
        self.log(f"Passed: {self.results['summary']['passed']}")
        self.log(f"Failed: {self.results['summary']['failed']}")
        
        success_rate = (self.results['summary']['passed'] / self.results['summary']['total']) * 100
        self.log(f"Success rate: {success_rate:.1f}%")
        
        if self.results['summary']['failed'] == 0:
            self.log("🎉 All OCR Stage 4 tests passed!", 'SUCCESS')
            return True
        else:
            self.log(f"❌ {self.results['summary']['failed']} tests failed", 'ERROR')
            return False

if __name__ == '__main__':
    tester = OCRStage4Tester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
