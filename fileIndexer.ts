import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Logger } from './logger';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: string;
  extension?: string;
}

export interface ProjectIndex {
  path: string;
  name: string;
  files: FileNode[];
  lastScan: string;
  totalFiles: number;
  totalSize: number;
}

export class FileIndexer extends EventEmitter {
  private logger: Logger;
  private cache: Map<string, ProjectIndex> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly maxDepth = 10;
  private readonly excludePatterns = [
    /node_modules/,
    /\.git/,
    /\.vscode/,
    /build/,
    /dist/,
    /\.next/,
    /coverage/,
    /\.nyc_output/,
    /logs/,
    /tmp/,
    /temp/
  ];

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async scanProject(projectPath: string): Promise<ProjectIndex> {
    try {
      this.logger.info(`Scanning project: ${projectPath}`);
      
      if (!fs.existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      const stats = fs.statSync(projectPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${projectPath}`);
      }

      const startTime = Date.now();
      const files = await this.scanDirectory(projectPath, 0);
      const scanTime = Date.now() - startTime;

      const index: ProjectIndex = {
        path: projectPath,
        name: path.basename(projectPath),
        files,
        lastScan: new Date().toISOString(),
        totalFiles: this.countFiles(files),
        totalSize: this.calculateSize(files)
      };

      this.cache.set(projectPath, index);
      this.setupWatcher(projectPath);

      this.logger.info(`Project scan completed in ${scanTime}ms. Files: ${index.totalFiles}, Size: ${this.formatSize(index.totalSize)}`);
      this.emit('scan-complete', { projectPath, index });

      return index;
    } catch (error) {
      this.logger.error(`Error scanning project ${projectPath}: ${error}`);
      throw error;
    }
  }

  private async scanDirectory(dirPath: string, depth: number): Promise<FileNode[]> {
    if (depth > this.maxDepth) {
      return [];
    }

    const nodes: FileNode[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (this.shouldExclude(entry.name, fullPath)) {
          continue;
        }

        const stats = fs.statSync(fullPath);
        const node: FileNode = {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          modified: stats.mtime.toISOString()
        };

        if (entry.isDirectory()) {
          node.children = await this.scanDirectory(fullPath, depth + 1);
        } else {
          node.size = stats.size;
          node.extension = path.extname(entry.name).toLowerCase();
        }

        nodes.push(node);
      }
    } catch (error) {
      this.logger.warn(`Error reading directory ${dirPath}: ${error}`);
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private shouldExclude(name: string, fullPath: string): boolean {
    if (name.startsWith('.') && name !== '.env' && name !== '.gitignore') {
      return true;
    }

    return this.excludePatterns.some(pattern => pattern.test(fullPath));
  }

  private countFiles(nodes: FileNode[]): number {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'file') {
        count++;
      } else if (node.children) {
        count += this.countFiles(node.children);
      }
    }
    return count;
  }

  private calculateSize(nodes: FileNode[]): number {
    let size = 0;
    for (const node of nodes) {
      if (node.type === 'file' && node.size) {
        size += node.size;
      } else if (node.children) {
        size += this.calculateSize(node.children);
      }
    }
    return size;
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private setupWatcher(projectPath: string): void {
    if (this.watchers.has(projectPath)) {
      this.watchers.get(projectPath)?.close();
    }

    try {
      // Создаем дебаунсированную функцию для пересканирования
      const debouncedRescan = this.debounce(() => {
        this.rescanProject(projectPath);
      }, 1000);

      const watcher = fs.watch(projectPath, { recursive: true }, (eventType, filename) => {
        if (filename && !this.shouldExclude(filename, path.join(projectPath, filename))) {
          this.logger.info(`File system change detected: ${eventType} ${filename}`);
          this.emit('file-change', { projectPath, eventType, filename });
          
          // Используем дебаунсированную функцию
          debouncedRescan();
        }
      });

      this.watchers.set(projectPath, watcher);
      this.logger.info(`File watcher setup for: ${projectPath}`);
    } catch (error) {
      this.logger.warn(`Could not setup file watcher for ${projectPath}: ${error}`);
    }
  }

  private async rescanProject(projectPath: string): Promise<void> {
    try {
      const index = await this.scanProject(projectPath);
      this.emit('rescan-complete', { projectPath, index });
    } catch (error) {
      this.logger.error(`Error rescanning project ${projectPath}: ${error}`);
    }
  }

  getProjectIndex(projectPath: string): ProjectIndex | null {
    return this.cache.get(projectPath) || null;
  }

  getAllProjects(): ProjectIndex[] {
    return Array.from(this.cache.values());
  }

  searchFiles(projectPath: string, query: string): FileNode[] {
    const index = this.cache.get(projectPath);
    if (!index) {
      return [];
    }

    const results: FileNode[] = [];
    const searchInNodes = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          results.push(node);
        }
        if (node.children) {
          searchInNodes(node.children);
        }
      }
    };

    searchInNodes(index.files);
    return results;
  }

  removeProject(projectPath: string): void {
    const watcher = this.watchers.get(projectPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectPath);
    }

    this.cache.delete(projectPath);
    this.logger.info(`Removed project from index: ${projectPath}`);
  }

  // Debounce функция для оптимизации частых вызовов
  private debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Throttle функция для ограничения частоты вызовов
  private throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          func(...args);
        }, delay - (now - lastCall));
      }
    };
  }

  // Оптимизированное сканирование с батчингом
  private async scanDirectoryOptimized(dirPath: string, depth: number): Promise<FileNode[]> {
    if (depth > this.maxDepth) {
      return [];
    }

    const nodes: FileNode[] = [];
    const batchSize = 100; // Обрабатываем файлы батчами

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      // Разбиваем на батчи для больших директорий
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        const batchNodes = await Promise.all(
          batch.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            
            if (this.shouldExclude(entry.name, fullPath)) {
              return null;
            }

            try {
              const stats = fs.statSync(fullPath);
              const node: FileNode = {
                name: entry.name,
                path: fullPath,
                type: entry.isDirectory() ? 'directory' : 'file',
                modified: stats.mtime.toISOString()
              };

              if (entry.isDirectory()) {
                node.children = await this.scanDirectoryOptimized(fullPath, depth + 1);
              } else {
                node.size = stats.size;
                node.extension = path.extname(entry.name).toLowerCase();
              }

              return node;
            } catch (error) {
              this.logger.warn(`Error processing ${fullPath}: ${error}`);
              return null;
            }
          })
        );

        nodes.push(...batchNodes.filter(node => node !== null) as FileNode[]);
        
        // Небольшая пауза между батчами для предотвращения блокировки
        if (i + batchSize < entries.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    } catch (error) {
      this.logger.warn(`Error reading directory ${dirPath}: ${error}`);
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  cleanup(): void {
    // Очищаем все таймеры debounce
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    for (const [path, watcher] of this.watchers) {
      watcher.close();
      this.logger.info(`Closed file watcher for: ${path}`);
    }
    this.watchers.clear();
    this.cache.clear();
  }

  watchProject(projectPath: string): void {
    this.setupWatcher(projectPath);
  }

  getFileIcon(node: FileNode): string {
    if (node.type === 'directory') {
      return '📁';
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
  }
}
