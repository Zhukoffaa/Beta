import React, { useState, useEffect, useCallback } from 'react';
import { useIpc } from '../hooks/useIpc';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: string;
  extension?: string;
}

interface ProjectIndex {
  path: string;
  name: string;
  files: FileNode[];
  lastScan: string;
  totalFiles: number;
  totalSize: number;
}

interface FileTreePanelProps {
  onFileSelect?: (filePath: string) => void;
}

const FileTreePanel: React.FC<FileTreePanelProps> = ({ onFileSelect }) => {
  const { sendMessage } = useIpc();
  const [projects, setProjects] = useState<ProjectIndex[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectIndex | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileNode[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      const allProjects = await sendMessage('get-all-projects');
      setProjects(allProjects || []);
      
      if (allProjects && allProjects.length > 0 && !currentProject) {
        setCurrentProject(allProjects[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError('Не удалось загрузить проекты');
    }
  }, [sendMessage, currentProject]);

  const handleSelectProject = useCallback(async () => {
    try {
      setError(null);
      const projectPath = prompt('Введите путь к папке проекта:');
      
      if (projectPath && projectPath.trim()) {
        await scanProject(projectPath.trim());
      }
    } catch (error) {
      console.error('Failed to select project:', error);
      setError('Ошибка при выборе проекта');
    }
  }, []);

  const scanProject = useCallback(async (projectPath: string) => {
    if (!projectPath.trim()) return;
    
    try {
      setIsScanning(true);
      setError(null);
      const index = await sendMessage('scan-project', projectPath);
      setCurrentProject(index);
      await loadProjects();
    } catch (error) {
      console.error('Failed to scan project:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Ошибка при сканировании проекта: ${errorMessage}`);
    } finally {
      setIsScanning(false);
    }
  }, [sendMessage, loadProjects]);

  const toggleNode = useCallback((nodePath: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodePath)) {
        newExpanded.delete(nodePath);
      } else {
        newExpanded.add(nodePath);
      }
      return newExpanded;
    });
  }, []);

  const handleFileClick = useCallback((node: FileNode) => {
    if (node.type === 'directory') {
      toggleNode(node.path);
    } else {
      setSelectedFile(node.path);
      onFileSelect?.(node.path);
    }
  }, [toggleNode, onFileSelect]);

  const handleSearch = useCallback(async () => {
    if (!currentProject || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setError(null);
      const results = await sendMessage('search-files', { 
        projectPath: currentProject.path, 
        query: searchQuery.trim() 
      });
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Ошибка поиска');
      setSearchResults([]);
    }
  }, [currentProject, searchQuery, sendMessage]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  const getFileIcon = useCallback((node: FileNode): string => {
    if (node.type === 'directory') {
      return expandedNodes.has(node.path) ? '📂' : '📁';
    }

    const ext = node.extension || '';
    const iconMap: { [key: string]: string } = {
      '.js': '📄',
      '.ts': '📘',
      '.tsx': '⚛️',
      '.jsx': '⚛️',
      '.py': '🐍',
      '.json': '📋',
      '.md': '📝',
      '.txt': '📄',
      '.css': '🎨',
      '.scss': '🎨',
      '.html': '🌐',
      '.xml': '📄',
      '.yml': '⚙️',
      '.yaml': '⚙️',
      '.env': '🔧',
      '.gitignore': '🚫',
      '.png': '🖼️',
      '.jpg': '🖼️',
      '.jpeg': '🖼️',
      '.gif': '🖼️',
      '.svg': '🖼️',
      '.pdf': '📕',
      '.zip': '📦',
      '.tar': '📦',
      '.gz': '📦'
    };

    return iconMap[ext] || '📄';
  }, [expandedNodes]);

  const formatFileSize = useCallback((bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  const renderFileNode = useCallback((node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.path);
    const isSelected = selectedFile === node.path;
    const paddingLeft = depth * 16 + 8;

    return (
      <div key={node.path}>
        <div
          className={`file-node ${isSelected ? 'selected' : ''} ${error ? 'disabled' : ''}`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => !error && handleFileClick(node)}
        >
          <span className="file-icon">{getFileIcon(node)}</span>
          <span className="file-name">{node.name}</span>
          {node.type === 'file' && node.size && (
            <span className="file-size">{formatFileSize(node.size)}</span>
          )}
        </div>
        
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="file-children">
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedNodes, selectedFile, error, handleFileClick, getFileIcon, formatFileSize]);

  const renderSearchResults = useCallback((): React.ReactNode => {
    if (searchResults.length === 0) {
      return (
        <div className="search-no-results">
          <span className="text-gray-400 text-sm">Файлы не найдены</span>
        </div>
      );
    }

    return (
      <div className="search-results">
        {searchResults.map(node => (
          <div
            key={node.path}
            className={`file-node ${selectedFile === node.path ? 'selected' : ''} ${error ? 'disabled' : ''}`}
            onClick={() => !error && handleFileClick(node)}
          >
            <span className="file-icon">{getFileIcon(node)}</span>
            <span className="file-name">{node.name}</span>
            <span className="file-path">{node.path}</span>
          </div>
        ))}
      </div>
    );
  }, [searchResults, selectedFile, error, handleFileClick, getFileIcon]);

  return (
    <div className="panel w-80 p-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">Проект</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowProjectSelector(!showProjectSelector)}
            className="btn-secondary text-sm py-1 px-2"
            title="Выбрать проект"
            disabled={isScanning}
          >
            📁
          </button>
          <button
            onClick={handleSelectProject}
            className="btn-primary text-sm py-1 px-2"
            disabled={isScanning}
          >
            {isScanning ? '⏳' : '+'}
          </button>
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-3 py-2 rounded mb-4 text-sm">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-100 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Селектор проектов */}
      {showProjectSelector && projects.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-medium text-gray-100 mb-2">Недавние проекты</h3>
          <div className="space-y-1">
            {projects.map(project => (
              <div
                key={project.path}
                className={`project-item ${currentProject?.path === project.path ? 'active' : ''} ${isScanning ? 'disabled' : ''}`}
                onClick={() => {
                  if (!isScanning) {
                    setCurrentProject(project);
                    setShowProjectSelector(false);
                    setError(null);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-xs text-gray-400">{project.totalFiles} файлов</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{project.path}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Информация о проекте */}
      {currentProject && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-100">{currentProject.name}</h3>
            <button
              onClick={() => scanProject(currentProject.path)}
              className="btn-secondary text-xs py-1 px-2"
              disabled={isScanning}
              title="Обновить"
            >
              {isScanning ? '⏳' : '🔄'}
            </button>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Файлов: {currentProject.totalFiles}</div>
            <div>Размер: {formatFileSize(currentProject.totalSize)}</div>
            <div>Обновлен: {new Date(currentProject.lastScan).toLocaleString('ru-RU')}</div>
          </div>
        </div>
      )}

      {/* Поиск */}
      {currentProject && (
        <div className="bg-gray-800 hover:bg-gray-700 transition-all duration-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="bg-gray-700 hover:bg-gray-600 transition-colors duration-200 border border-gray-600 rounded px-3 py-1 flex-1 text-sm text-gray-100 disabled:opacity-50"
              placeholder="Поиск файлов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isScanning && handleSearch()}
              disabled={isScanning}
            />
            {searchQuery ? (
              <button
                onClick={clearSearch}
                className="bg-gray-600 hover:bg-gray-500 transition-colors duration-200 text-sm py-1 px-2 rounded disabled:opacity-50"
                disabled={isScanning}
              >
                ✕
              </button>
            ) : (
              <button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-500 transition-colors duration-200 text-sm py-1 px-2 rounded disabled:opacity-50"
                disabled={isScanning}
              >
                🔍
              </button>
            )}
          </div>
        </div>
      )}

      {/* Дерево файлов или результаты поиска */}
      <div className="file-tree">
        {!currentProject ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">📁</div>
            <div>Выберите папку проекта</div>
            <div className="text-sm mt-1">для просмотра файлов</div>
          </div>
        ) : searchQuery && searchResults.length >= 0 ? (
          renderSearchResults()
        ) : (
          <div className="file-nodes">
            {currentProject.files.map(node => renderFileNode(node))}
          </div>
        )}
      </div>

      {/* Статус сканирования */}
      {isScanning && (
        <div className="mt-4 text-center">
          <div className="spinner inline-block mr-2" />
          <span className="text-sm text-gray-400">Сканирование проекта...</span>
        </div>
      )}
    </div>
  );
};

export default FileTreePanel;
