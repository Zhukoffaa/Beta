#!/usr/bin/env python3

import os
import subprocess
import json
from datetime import datetime

class Stage9Development:
    def __init__(self):
        self.project_root = os.path.dirname(os.path.abspath(__file__))
        self.components = [
            'CodeEditor.tsx',
            'DiffViewer.tsx', 
            'SettingsDialog.tsx'
        ]
        
    def install_dependencies(self):
        print("Skipping npm install - dependencies will be installed manually")
        return True
    
    def create_code_editor(self):
        content = '''import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  filePath?: string;
  language?: string;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  language = 'typescript',
  value = '',
  onChange,
  readOnly = false
}) => {
  const [editorValue, setEditorValue] = useState(value);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const handleEditorChange = (newValue: string | undefined) => {
    const val = newValue || '';
    setEditorValue(val);
    onChange?.(val);
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        value={editorValue}
        onChange={handleEditorChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          theme: 'vs-dark'
        }}
      />
    </div>
  );
};

export default CodeEditor;'''
        
        with open(os.path.join(self.project_root, 'renderer/src/components/CodeEditor.tsx'), 'w') as f:
            f.write(content)
    
    def create_diff_viewer(self):
        content = '''import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  oldTitle?: string;
  newTitle?: string;
  splitView?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldValue,
  newValue,
  oldTitle = 'Original',
  newTitle = 'Modified',
  splitView = true
}) => {
  return (
    <div className="h-full w-full bg-gray-900">
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={splitView}
        leftTitle={oldTitle}
        rightTitle={newTitle}
        styles={{
          variables: {
            dark: {
              diffViewerBackground: '#1f2937',
              addedBackground: '#065f46',
              removedBackground: '#7f1d1d',
              wordAddedBackground: '#059669',
              wordRemovedBackground: '#dc2626',
              addedGutterBackground: '#064e3b',
              removedGutterBackground: '#771d1d',
              gutterBackground: '#374151',
              gutterBackgroundDark: '#1f2937',
              highlightBackground: '#374151',
              highlightGutterBackground: '#4b5563',
              codeFoldGutterBackground: '#374151',
              codeFoldBackground: '#4b5563',
              emptyLineBackground: '#1f2937',
              gutterColor: '#9ca3af',
              addedColor: '#d1fae5',
              removedColor: '#fecaca',
              wordAddedColor: '#ffffff',
              wordRemovedColor: '#ffffff',
              lineNumberColor: '#6b7280'
            }
          }
        }}
        useDarkTheme={true}
      />
    </div>
  );
};

export default DiffViewer;'''
        
        with open(os.path.join(self.project_root, 'renderer/src/components/DiffViewer.tsx'), 'w') as f:
            f.write(content)
    
    def create_settings_dialog(self):
        content = '''import React, { useState } from 'react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Settings {
  theme: 'dark' | 'light';
  fontSize: number;
  autoSave: boolean;
  wordWrap: boolean;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    fontSize: 14,
    autoSave: true,
    wordWrap: true
  });

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            X
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({...settings, theme: e.target.value as 'dark' | 'light'})}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="20"
              value={settings.fontSize}
              onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
              className="mr-2"
            />
            <label className="text-sm text-gray-300">Auto Save</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.wordWrap}
              onChange={(e) => setSettings({...settings, wordWrap: e.target.checked})}
              className="mr-2"
            />
            <label className="text-sm text-gray-300">Word Wrap</label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;'''
        
        with open(os.path.join(self.project_root, 'renderer/src/components/SettingsDialog.tsx'), 'w') as f:
            f.write(content)
    
    def update_app_tsx(self):
        app_path = os.path.join(self.project_root, 'renderer/src/App.tsx')
        
        with open(app_path, 'r') as f:
            content = f.read()
        
        imports_to_add = '''import CodeEditor from './components/CodeEditor';
import DiffViewer from './components/DiffViewer';
import SettingsDialog from './components/SettingsDialog';'''
        
        if 'import CodeEditor' not in content:
            content = content.replace(
                "import LogViewer from './components/LogViewer';",
                f"import LogViewer from './components/LogViewer';\n{imports_to_add}"
            )
        
        with open(app_path, 'w') as f:
            f.write(content)
    
    def create_test_script(self):
        content = '''#!/usr/bin/env python3

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
        
        print(f"\\nResults: {self.tests_passed}/{self.tests_total} tests passed")
        return self.tests_passed == self.tests_total

if __name__ == '__main__':
    tester = Stage9Tester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)'''
        
        with open(os.path.join(self.project_root, 'test_stage9.py'), 'w') as f:
            f.write(content)
    
    def run(self):
        print("Starting Stage 9 Development...")
        
        print("1. Installing dependencies...")
        self.install_dependencies()
        
        print("2. Creating CodeEditor component...")
        self.create_code_editor()
        
        print("3. Creating DiffViewer component...")
        self.create_diff_viewer()
        
        print("4. Creating SettingsDialog component...")
        self.create_settings_dialog()
        
        print("5. Updating App.tsx...")
        self.update_app_tsx()
        
        print("6. Creating test script...")
        self.create_test_script()
        
        print("Stage 9 development completed!")

if __name__ == '__main__':
    dev = Stage9Development()
    dev.run()
