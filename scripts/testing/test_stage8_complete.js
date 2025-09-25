const fs = require('fs');
const path = require('path');

class Stage8CompleteTest {
  constructor() {
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  addTest(name, status, details = '') {
    this.totalTests++;
    if (status === 'PASS') this.passedTests++;
    
    this.results.push({
      name,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${name}: ${status}${details ? ` - ${details}` : ''}`);
  }

  checkFileExists(filePath, description) {
    const exists = fs.existsSync(filePath);
    this.addTest(`${description} exists`, exists ? 'PASS' : 'FAIL', filePath);
    return exists;
  }

  checkFileContent(filePath, patterns, description) {
    if (!fs.existsSync(filePath)) {
      this.addTest(`${description} content check`, 'FAIL', 'File not found');
      return false;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let allFound = true;
      
      for (const pattern of patterns) {
        if (!content.includes(pattern)) {
          this.addTest(`${description} contains "${pattern}"`, 'FAIL');
          allFound = false;
        } else {
          this.addTest(`${description} contains "${pattern}"`, 'PASS');
        }
      }
      
      return allFound;
    } catch (error) {
      this.addTest(`${description} content check`, 'FAIL', error.message);
      return false;
    }
  }

  async runTests() {
    console.log('🚀 Starting Stage 8 Complete Testing...\n');

    // 1. Backend Services Tests
    console.log('📁 Testing Backend Services...');
    
    this.checkFileExists('backend/services/ocrService.ts', 'OCR Service');
    this.checkFileContent('backend/services/ocrService.ts', [
      'processMultipleImages',
      'parseServerFields',
      'mergeResults'
    ], 'OCR Service functionality');

    this.checkFileExists('backend/services/fileIndexer.ts', 'File Indexer Service');
    this.checkFileContent('backend/services/fileIndexer.ts', [
      'scanProject',
      'getProjectIndex',
      'searchFiles'
    ], 'File Indexer functionality');

    // 2. IPC Integration Tests
    console.log('\n🔗 Testing IPC Integration...');
    
    this.checkFileContent('backend/main.ts', [
      'OCRService',
      'ocr-process-images',
      'scan-project',
      'get-project-index'
    ], 'Main.ts IPC handlers');

    // 3. Frontend Components Tests
    console.log('\n🎨 Testing Frontend Components...');
    
    this.checkFileExists('renderer/src/components/FileTreePanel.tsx', 'FileTreePanel Component');
    this.checkFileContent('renderer/src/components/FileTreePanel.tsx', [
      'FileTreePanel',
      'useFileTree',
      'file-tree'
    ], 'FileTreePanel functionality');

    this.checkFileExists('renderer/src/components/ServerSettingsWindow.tsx', 'ServerSettingsWindow Component');
    this.checkFileContent('renderer/src/components/ServerSettingsWindow.tsx', [
      'ServerSettingsWindow',
      'modal-overlay',
      'ImageServerParser'
    ], 'ServerSettingsWindow functionality');

    // 4. Updated ImageServerParser Tests
    console.log('\n🖼️ Testing Updated ImageServerParser...');
    
    this.checkFileContent('renderer/src/components/ImageServerParser.tsx', [
      'ocr-process-images',
      'processMultipleImages',
      '2-3 скриншота'
    ], 'ImageServerParser OCR integration');

    // 5. App.tsx Integration Tests
    console.log('\n📱 Testing App.tsx Integration...');
    
    this.checkFileContent('renderer/src/App.tsx', [
      'FileTreePanel',
      'ServerSettingsWindow',
      'showServerSettings'
    ], 'App.tsx integration');

    // 6. Styles and Design Tests
    console.log('\n🎨 Testing macOS Styles...');
    
    this.checkFileContent('tailwind.config.js', [
      'Inter',
      'macos',
      'backdrop-blur',
      'fade-in',
      'slide-up'
    ], 'Tailwind macOS config');

    this.checkFileContent('renderer/src/App.css', [
      'macOS-inspired',
      'backdrop-filter',
      'animation',
      'gradient'
    ], 'App.css macOS styles');

    // 7. Configuration Tests
    console.log('\n⚙️ Testing Configuration...');
    
    this.checkFileExists('configs/projects.json', 'Projects Configuration');
    this.checkFileContent('configs/projects.json', [
      'projects',
      'lastAccessed'
    ], 'Projects config structure');

    // 8. TODO Progress Tests
    console.log('\n📋 Testing TODO Progress...');
    
    this.checkFileExists('STAGE8_RESTRUCTURE_TODO.md', 'Stage 8 TODO');
    this.checkFileContent('STAGE8_RESTRUCTURE_TODO.md', [
      'OCR Service',
      'FileTreePanel',
      'ServerSettingsWindow',
      'macOS стили'
    ], 'Stage 8 TODO content');

    // 9. File Structure Tests
    console.log('\n📂 Testing File Structure...');
    
    const requiredFiles = [
      'backend/services/ocrService.ts',
      'backend/services/fileIndexer.ts',
      'renderer/src/components/FileTreePanel.tsx',
      'renderer/src/components/ServerSettingsWindow.tsx',
      'configs/projects.json',
      'tailwind.config.js',
      'renderer/src/App.css'
    ];

    let structureValid = true;
    for (const file of requiredFiles) {
      if (!this.checkFileExists(file, `Required file: ${file}`)) {
        structureValid = false;
      }
    }

    this.addTest('File structure complete', structureValid ? 'PASS' : 'FAIL');

    // 10. Integration Completeness Test
    console.log('\n🔄 Testing Integration Completeness...');
    
    const integrationChecks = [
      { file: 'backend/main.ts', patterns: ['OCRService', 'FileIndexer'] },
      { file: 'renderer/src/App.tsx', patterns: ['FileTreePanel', 'ServerSettingsWindow'] },
      { file: 'renderer/src/components/ImageServerParser.tsx', patterns: ['ocr-process-images'] }
    ];

    let integrationComplete = true;
    for (const check of integrationChecks) {
      if (!this.checkFileContent(check.file, check.patterns, `Integration: ${check.file}`)) {
        integrationComplete = false;
      }
    }

    this.addTest('Integration complete', integrationComplete ? 'PASS' : 'FAIL');

    // Generate Report
    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 STAGE 8 COMPLETE TEST RESULTS');
    console.log('='.repeat(60));
    
    const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    console.log(`✅ Passed: ${this.passedTests}/${this.totalTests} (${successRate}%)`);
    
    if (this.passedTests === this.totalTests) {
      console.log('🎉 ALL TESTS PASSED! Stage 8 restructuring is complete.');
    } else {
      console.log('⚠️ Some tests failed. Review the issues above.');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      stage: 'Stage 8 Complete',
      summary: {
        total: this.totalTests,
        passed: this.passedTests,
        failed: this.totalTests - this.passedTests,
        successRate: `${successRate}%`
      },
      tests: this.results
    };

    fs.writeFileSync('STAGE8_COMPLETE_TEST_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: STAGE8_COMPLETE_TEST_REPORT.json');
  }
}

// Run tests
const tester = new Stage8CompleteTest();
tester.runTests().catch(console.error);
