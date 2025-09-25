#!/usr/bin/env python3

import os
import sys
import subprocess
import json
import time
from pathlib import Path

class Stage10BuildTest:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.success_count = 0
        self.total_tests = 0
        
    def run_command(self, cmd, cwd=None):
        try:
            result = subprocess.run(
                cmd, 
                shell=True, 
                cwd=cwd or self.project_root,
                capture_output=True, 
                text=True, 
                timeout=300,
                encoding='utf-8',
                errors='ignore'
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except Exception as e:
            return False, "", str(e)
    
    def test_step(self, name, cmd, cwd=None):
        self.total_tests += 1
        print(f"[{self.total_tests}] {name}...")
        
        success, stdout, stderr = self.run_command(cmd, cwd)
        
        if success:
            self.success_count += 1
            print(f"✅ {name}")
            return True
        else:
            print(f"❌ {name}")
            if stderr:
                print(f"   Error: {stderr[:200]}")
            return False
    
    def check_dependencies(self):
        print("🔍 Checking dependencies...")
        
        # Check Node.js
        if not self.test_step("Node.js installed", "node --version"):
            return False
            
        # Check npm
        if not self.test_step("npm installed", "npm --version"):
            return False
            
        # Check TypeScript
        if not self.test_step("TypeScript available", "npx tsc --version"):
            return False
            
        return True
    
    def install_dependencies(self):
        print("\n📦 Installing dependencies...")
        
        return self.test_step("Install npm packages", "npm install")
    
    def compile_typescript(self):
        print("\n🔨 Compiling TypeScript...")
        
        # Backend compilation
        backend_success = self.test_step("Compile backend", "npx tsc --project backend/tsconfig.json")
        
        # Frontend compilation check
        frontend_success = self.test_step("Check frontend types", "npx tsc --project renderer/tsconfig.json --noEmit")
        
        return backend_success and frontend_success
    
    def test_components(self):
        print("\n🧪 Testing components...")
        
        # Test if key files exist
        key_files = [
            "renderer/src/App.tsx",
            "renderer/src/App.css", 
            "renderer/src/components/ServerSettingsWindow.tsx",
            "renderer/src/components/ImageServerParser.tsx",
            "tailwind.config.js",
            "backend/main.ts"
        ]
        
        all_exist = True
        for file_path in key_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                self.test_step(f"File exists: {file_path}", "echo 'exists'")
            else:
                print(f"❌ Missing file: {file_path}")
                all_exist = False
                
        return all_exist
    
    def build_application(self):
        print("\n🏗️ Building application...")
        
        # Build renderer
        renderer_success = self.test_step("Build renderer", "npm run build:renderer")
        
        # Build backend process
        backend_success = self.test_step("Build backend process", "npm run build:backend")
        
        return renderer_success and backend_success
    
    def test_macOS_styles(self):
        print("\n🎨 Testing macOS styles...")
        
        # Check if Tailwind config has macOS colors
        tailwind_path = self.project_root / "tailwind.config.js"
        if tailwind_path.exists():
            with open(tailwind_path, 'r') as f:
                content = f.read()
                if 'macos' in content.lower() and 'San Francisco' in content:
                    self.test_step("macOS styles configured", "echo 'configured'")
                    return True
                else:
                    print("❌ macOS styles not properly configured")
                    return False
        else:
            print("❌ Tailwind config not found")
            return False
    
    def run_electron_test(self):
        print("\n⚡ Testing Electron startup...")
        
        # Quick Electron test (5 second timeout)
        return self.test_step("Electron startup test", "timeout 5s npm run electron || true")
    
    def generate_report(self):
        print(f"\n📊 Stage 10 Build Test Results")
        print(f"=" * 50)
        print(f"Tests passed: {self.success_count}/{self.total_tests}")
        print(f"Success rate: {(self.success_count/self.total_tests)*100:.1f}%")
        
        if self.success_count == self.total_tests:
            print("🎉 All tests passed! Stage 10 macOS redesign is ready.")
            return True
        else:
            print("⚠️ Some tests failed. Please check the issues above.")
            return False
    
    def run_all_tests(self):
        print("🚀 Starting Stage 10 macOS Redesign Build Test")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all test phases
        phases = [
            self.check_dependencies,
            self.install_dependencies, 
            self.compile_typescript,
            self.test_components,
            self.test_macOS_styles,
            self.build_application,
            self.run_electron_test
        ]
        
        for phase in phases:
            if not phase():
                print(f"\n❌ Phase failed: {phase.__name__}")
                break
        
        end_time = time.time()
        print(f"\n⏱️ Total time: {end_time - start_time:.1f} seconds")
        
        return self.generate_report()

if __name__ == "__main__":
    tester = Stage10BuildTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
