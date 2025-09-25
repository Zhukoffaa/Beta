import React, { useState, useEffect } from 'react';
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

export default CodeEditor;