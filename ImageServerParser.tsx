import React, { useState, useCallback } from 'react';

interface ParsedServerData {
  name?: string;
  host?: string;
  port?: number;
  user?: string;
  instanceId?: string;
  machineCopyPort?: number;
  publicIP?: string;
  instancePortRange?: string;
  ipAddressType?: string;
  localIPAddresses?: string;
  proxyCommand?: string;
}

interface ImageServerParserProps {
  onDataParsed: (data: ParsedServerData) => void;
  onClose: () => void;
}

const ImageServerParser: React.FC<ImageServerParserProps> = ({ onDataParsed, onClose }) => {
  const [images, setImages] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedServerData | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addImages(files);
  };

  const addImages = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setImages(prev => [...prev, ...imageFiles]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  }, []);

  const parseImageData = async () => {
    if (images.length === 0) {
      alert('Пожалуйста, загрузите хотя бы одно изображение');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Создаем временные файлы для изображений
      const imagePaths: string[] = [];
      
      // Симуляция прогресса загрузки файлов
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const tempPath = `temp_ocr_${Date.now()}_${i}.${image.name.split('.').pop()}`;
        
        // В реальной реализации здесь будет сохранение файла во временную папку
        // Пока используем имя файла как путь для mock OCR
        imagePaths.push(tempPath);
        
        // Обновляем прогресс подготовки файлов (первые 20%)
        const prepProgress = Math.round(((i + 1) / images.length) * 20);
        setProcessingProgress(prepProgress);
        
        // Небольшая задержка для визуализации прогресса
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Прогресс OCR обработки (80% от общего прогресса)
      setProcessingProgress(20);
      
      // Вызываем OCR сервис через IPC для processMultipleImages
      const result = await (window as any).electronAPI.invoke('ocr-process-images', imagePaths);
      
      // Симуляция прогресса OCR
      for (let progress = 20; progress <= 90; progress += 10) {
        setProcessingProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (result.success) {
        const ocrData = result.data;
        
        // Преобразуем данные OCR в формат компонента
        const parsedData: ParsedServerData = {
          name: ocrData.name || 'Vast.AI Server',
          host: ocrData.host,
          port: ocrData.port,
          user: ocrData.user,
          instanceId: ocrData.instanceId,
          machineCopyPort: ocrData.machineCopyPort,
          publicIP: ocrData.publicIP,
          instancePortRange: ocrData.instancePortRange,
          ipAddressType: ocrData.ipAddressType,
          localIPAddresses: ocrData.localIPAddresses,
          proxyCommand: ocrData.proxyCommand
        };

        setProcessingProgress(100);
        setParsedData(parsedData);
      } else {
        throw new Error(result.error || 'OCR processing failed');
      }
    } catch (error) {
      console.error('Ошибка при анализе изображений:', error);
      
      // Показываем более детальную ошибку
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert(`Ошибка при анализе изображений:\n\n${errorMessage}\n\nПопробуйте:\n- Использовать изображения лучшего качества\n- Убедиться, что текст четко виден\n- Загрузить несколько разных изображений`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      onDataParsed(parsedData);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Автоматическое распознавание данных сервера
        </h3>

        <div className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver 
                ? 'border-accent-blue bg-accent-blue bg-opacity-10' 
                : 'border-macos-dark-border hover:border-macos-dark-secondary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-3">
              <svg className="w-12 h-12 mx-auto text-macos-dark-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <p className="text-white font-medium">Перетащите изображения сюда</p>
                <p className="text-macos-dark-secondary text-sm">или</p>
                <label className="btn-primary inline-block cursor-pointer">
                  Выберите файлы
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-macos-dark-secondary">
                PNG, JPG, JPEG до 10MB каждый. Рекомендуется 2-3 изображения
              </p>
            </div>
          </div>

          {images.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">
                Загруженные изображения ({images.length}):
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-macos-dark-hover rounded-md">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="text-sm text-white">{image.name}</div>
                        <div className="text-xs text-macos-dark-secondary">
                          {(image.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeImage(index)}
                      className="text-macos-dark-secondary hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Обработка изображений...</span>
                <span className="text-sm text-macos-dark-secondary">{processingProgress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill transition-all duration-300" 
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          )}

          {parsedData && (
            <div className="card bg-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Распознанные данные:
              </h4>
              <div className="space-y-2 text-sm">
                {parsedData.name && (
                  <div><span className="text-gray-400">Название:</span> {parsedData.name}</div>
                )}
                {parsedData.host && (
                  <div><span className="text-gray-400">Хост:</span> {parsedData.host}</div>
                )}
                {parsedData.port && (
                  <div><span className="text-gray-400">Порт:</span> {parsedData.port}</div>
                )}
                {parsedData.user && (
                  <div><span className="text-gray-400">Пользователь:</span> {parsedData.user}</div>
                )}
                {parsedData.instanceId && (
                  <div><span className="text-gray-400">Instance ID:</span> {parsedData.instanceId}</div>
                )}
                {parsedData.publicIP && (
                  <div><span className="text-gray-400">Public IP:</span> {parsedData.publicIP}</div>
                )}
                {parsedData.proxyCommand && (
                  <div className="mt-2">
                    <span className="text-gray-400">SSH команда:</span>
                    <div className="font-mono text-xs bg-gray-800 p-2 rounded mt-1 break-all">
                      {parsedData.proxyCommand}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            {!parsedData ? (
              <button
                onClick={parseImageData}
                disabled={isProcessing || images.length === 0}
                className="btn-primary flex-1"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <div className="spinner mr-2" />
                    Анализирую изображения...
                  </span>
                ) : (
                  'Распознать данные'
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="btn-primary flex-1"
              >
                Использовать эти данные
              </button>
            )}
            
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageServerParser;
