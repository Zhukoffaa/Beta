#!/usr/bin/env python3

import os
import shutil
from pathlib import Path

class ProjectOrganizer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.moved_files = []
        
    def create_directories(self):
        """Создание необходимых директорий"""
        directories = [
            'reports/stages',
            'reports/testing',
            'reports/completion',
            'reports/performance',
            'scripts/testing',
            'scripts/automation',
            'docs/archive'
        ]
        
        for directory in directories:
            dir_path = self.project_root / directory
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"📁 Создана директория: {directory}")
    
    def organize_stage_reports(self):
        """Организация отчетов по этапам"""
        stage_files = [
            'STAGE2_COMPLETION_REPORT.md',
            'STAGE3_COMPLETION_REPORT.md', 
            'STAGE4_COMPLETION_REPORT.md',
            'STAGE4_FINAL_COMPLETION_REPORT.md',
            'STAGE5_COMPLETION_REPORT.md',
            'STAGE5_FINAL_TESTING_PLAN.md',
            'STAGE5_INTEGRATION_PLAN.md',
            'STAGE5_PHASE1_REPORT.md',
            'STAGE5_PHASE2_COMPLETION_REPORT.md',
            'STAGE5_PHASE2_FIXED_REPORT.md',
            'STAGE5_PHASE2_REPORT.md',
            'STAGE5_PHASE3_REPORT.md',
            'STAGE5_TESTING_CHECKLIST.md',
            'STAGE5_TESTING_EXECUTION_REPORT.md',
            'STAGE6_COMPLETION_REPORT.md',
            'STAGE7_COMPLETION_REPORT.md',
            'STAGE8_COMPLETION_REPORT.md',
            'STAGE8_FINAL_COMPLETION_REPORT.md',
            'STAGE8_RESTRUCTURE_TODO.md',
            'STAGE9_COMPLETION_REPORT.md',
            'STAGE10_COMPLETION_REPORT.md',
            'STAGE10_MACOS_REDESIGN_TODO.md'
        ]
        
        for file_name in stage_files:
            source = self.project_root / file_name
            if source.exists():
                dest = self.project_root / 'reports' / 'stages' / file_name
                shutil.move(str(source), str(dest))
                self.moved_files.append(f"reports/stages/{file_name}")
                print(f"📄 Перемещен: {file_name} -> reports/stages/")
    
    def organize_testing_reports(self):
        """Организация отчетов тестирования"""
        testing_files = [
            'COMPREHENSIVE_TEST_REPORT.json',
            'FINAL_TESTING_REPORT.json',
            'PHASE4_E2E_REPORT.json',
            'PHASE5_PERFORMANCE_REPORT.json',
            'REAL_SERVER_TEST_REPORT.json',
            'REAL_SSH_TESTING_REPORT.json',
            'SEPARATE_SERVER_WINDOW_TEST_REPORT.json',
            'STAGE4_OCR_COMPLETION_REPORT.md',
            'STAGE5_LLM_SETTINGS_TEST_REPORT.json',
            'STAGE8_COMPLETE_TEST_REPORT.json',
            'STAGE8_FULL_FUNCTIONAL_TEST_REPORT.json',
            'STAGE8_TEST_REPORT.json',
            'TASKS_TESTING_REPORT.json',
            'TESTING_REPORT.md',
            'MACOS_IMPROVEMENTS_TEST_REPORT.json',
            'MACOS_REDESIGN_TEST_REPORT.json',
            'OCR_STAGE4_TEST_REPORT.json',
            'PERFORMANCE_OPTIMIZATION_REPORT.json'
        ]
        
        for file_name in testing_files:
            source = self.project_root / file_name
            if source.exists():
                dest = self.project_root / 'reports' / 'testing' / file_name
                shutil.move(str(source), str(dest))
                self.moved_files.append(f"reports/testing/{file_name}")
                print(f"📊 Перемещен: {file_name} -> reports/testing/")
    
    def organize_completion_reports(self):
        """Организация финальных отчетов"""
        completion_files = [
            'FINAL_PROJECT_COMPLETION_REPORT.md',
            'FINAL_STAGE10_PROJECT_COMPLETION.md',
            'STAGE10_MACOS_FINAL_COMPLETION_REPORT.md',
            'MACOS_REDESIGN_FINAL_COMPLETION_REPORT.md',
            'MACOS_IMPROVEMENTS_COMPLETION_REPORT.md',
            'SERVER_MANAGEMENT_UPGRADE_REPORT.md',
            'SUCCESSFUL_LAUNCH_REPORT.md',
            'CSS_FIX_COMPLETION_REPORT.md',
            'GPU_CRASH_FIX.md',
            'FULL_TESTING_REPORT.md'
        ]
        
        for file_name in completion_files:
            source = self.project_root / file_name
            if source.exists():
                dest = self.project_root / 'reports' / 'completion' / file_name
                shutil.move(str(source), str(dest))
                self.moved_files.append(f"reports/completion/{file_name}")
                print(f"✅ Перемещен: {file_name} -> reports/completion/")
    
    def organize_test_scripts(self):
        """Организация тестовых скриптов"""
        test_scripts = [
            'test_stage8_complete.js',
            'test_stage8_full_functional.js',
            'test_stage8_restructure.js',
            'test_stage9_final.js',
            'test_stage9.py',
            'test_ui_components.js',
            'test_ui_phase2.js',
            'test_ui_phase2_fixed.js',
            'test_ipc_phase3.js',
            'test_phase4_e2e.js',
            'test_phase5_performance.js',
            'test_final_comprehensive.js',
            'test_full_integration.js',
            'test_gpu_fix.js',
            'test_servermanager_integration.js',
            'test_taskexecutor_integration.js',
            'test_taskexecutor_simple.js',
            'test_tasks_comprehensive.js',
            'test_tasks_real_ssh.js',
            'comprehensive_test.js',
            'real_server_test.js'
        ]
        
        for file_name in test_scripts:
            source = self.project_root / file_name
            if source.exists():
                dest = self.project_root / 'scripts' / 'testing' / file_name
                shutil.move(str(source), str(dest))
                self.moved_files.append(f"scripts/testing/{file_name}")
                print(f"🧪 Перемещен: {file_name} -> scripts/testing/")
    
    def organize_automation_scripts(self):
        """Организация скриптов автоматизации"""
        automation_scripts = [
            'stage9_development.py',
            'setup_project_structure.py',
            'build_and_test.py'
        ]
        
        for file_name in automation_scripts:
            source = self.project_root / file_name
            if source.exists():
                dest = self.project_root / 'scripts' / 'automation' / file_name
                shutil.move(str(source), str(dest))
                self.moved_files.append(f"scripts/automation/{file_name}")
                print(f"🤖 Перемещен: {file_name} -> scripts/automation/")
    
    def organize_archive_files(self):
        """Организация архивных файлов"""
        archive_files = [
            'TODO.md',
            'detailed_plan.docx',
            'tailwind.config.new.js',
            'Нерешенные задачи.txt',
            'Нерешенные задачи.txt.bak'
        ]
        
        for file_name in archive_files:
            source = self.project_root / file_name
            if source.exists():
                dest = self.project_root / 'docs' / 'archive' / file_name
                shutil.move(str(source), str(dest))
                self.moved_files.append(f"docs/archive/{file_name}")
                print(f"📚 Перемещен: {file_name} -> docs/archive/")
    
    def run_organization(self):
        """Запуск полной организации проекта"""
        print("🚀 Начинаем организацию файлов проекта...")
        print("=" * 60)
        
        self.create_directories()
        print()
        
        self.organize_stage_reports()
        print()
        
        self.organize_testing_reports()
        print()
        
        self.organize_completion_reports()
        print()
        
        self.organize_test_scripts()
        print()
        
        self.organize_automation_scripts()
        print()
        
        self.organize_archive_files()
        
        print("\n" + "=" * 60)
        print("✅ ОРГАНИЗАЦИЯ ЗАВЕРШЕНА!")
        print(f"📁 Перемещено файлов: {len(self.moved_files)}")
        print("=" * 60)
        
        return self.moved_files

if __name__ == "__main__":
    organizer = ProjectOrganizer()
    moved_files = organizer.run_organization()
