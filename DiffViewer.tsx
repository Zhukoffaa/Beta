import React from 'react';
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
              gutterColor: '#9ca3af'
            }
          }
        }}
        useDarkTheme={true}
      />
    </div>
  );
};

export default DiffViewer;
