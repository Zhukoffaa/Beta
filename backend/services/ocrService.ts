import * as fs from 'fs';
import { Logger } from './logger';

interface OCRResult {
  text: string;
  confidence: number;
  fields: ServerFields;
}

interface ServerFields {
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

export class OCRService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async processMultipleImages(imagePaths: string[], timeout: number = 30000): Promise<ServerFields> {
    try {
      this.logger.info(`Processing ${imagePaths.length} images for OCR with ${timeout}ms timeout`);
      
      // Обработка множественных изображений параллельно с Promise.all и тайм-аутом
      const results: OCRResult[] = await Promise.race([
        Promise.all(
          imagePaths.map(async (imagePath, index) => {
            try {
              if (fs.existsSync(imagePath)) {
                this.logger.info(`Processing image ${index + 1}/${imagePaths.length}: ${imagePath}`);
                return await this.processImage(imagePath);
              } else {
                this.logger.warn(`Image not found: ${imagePath}`);
                return { text: '', confidence: 0, fields: {} };
              }
            } catch (error) {
              this.logger.error(`Failed to process image ${imagePath}: ${error}`);
              return { text: '', confidence: 0, fields: {} };
            }
          })
        ),
        new Promise<OCRResult[]>((_, reject) => 
          setTimeout(() => reject(new Error(`OCR processing timeout after ${timeout}ms`)), timeout)
        )
      ]);

      const mergedResults = this.mergeResults(results);
      this.logger.info(`OCR processing completed. Found fields: ${Object.keys(mergedResults).join(', ')}`);
      
      return mergedResults;
    } catch (error) {
      this.logger.error(`OCR processing failed: ${error}`);
      throw error;
    }
  }

  private async processImage(imagePath: string): Promise<OCRResult> {
    const text = await this.extractText(imagePath);
    const fields = this.parseServerFields(text);
    
    return {
      text,
      confidence: 0.8,
      fields
    };
  }

  private async extractText(imagePath: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(imagePath);
      return this.mockOCRExtraction(buffer);
    } catch (error) {
      this.logger.error(`Text extraction failed for ${imagePath}: ${error}`);
      return '';
    }
  }

  private mockOCRExtraction(buffer: Buffer): string {
    const mockTexts = [
      'SSH Connection Details\nHost: ssh2.vast.ai\nPort: 34170\nUser: root\nInstance ID: 25954171',
      'Server Configuration\nPublic IP: 213.181.108.221\nMachine Copy Port: 39999\nInstance Port Range: 39166-39166',
      'Connection Info\nProxy Command: ssh -p 34170 root@ssh2.vast.ai -L 8080:localhost:8080\nIP Address Type: Dynamic'
    ];
    
    return mockTexts[Math.floor(Math.random() * mockTexts.length)];
  }

  parseServerFields(text: string): ServerFields {
    return this.extractFields(text);
  }

  private extractFields(text: string): ServerFields {
    const fields: ServerFields = {};
    
    const patterns = {
      host: /(?:host|server|hostname):\s*([^\s\n]+)/i,
      port: /(?:port|ssh port):\s*(\d+)/i,
      user: /(?:user|username):\s*([^\s\n]+)/i,
      instanceId: /(?:instance id|id):\s*([^\s\n]+)/i,
      publicIP: /(?:public ip|ip address):\s*([^\s\n]+)/i,
      machineCopyPort: /(?:machine copy port|copy port):\s*(\d+)/i,
      instancePortRange: /(?:instance port range|port range):\s*([^\s\n]+)/i,
      ipAddressType: /(?:ip address type|address type):\s*([^\s\n]+)/i,
      proxyCommand: /(?:proxy command|ssh command):\s*(.+)/i
    };

    for (const [field, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        if (field === 'port' || field === 'machineCopyPort') {
          (fields as any)[field] = parseInt(match[1], 10);
        } else {
          (fields as any)[field] = match[1].trim();
        }
      }
    }

    return fields;
  }

  private mergeResults(results: OCRResult[]): ServerFields {
    const merged: ServerFields = {};
    
    for (const result of results) {
      Object.assign(merged, result.fields);
    }

    if (merged.host && merged.port && merged.user) {
      merged.proxyCommand = `ssh -p ${merged.port} ${merged.user}@${merged.host}`;
      if (merged.machineCopyPort) {
        merged.proxyCommand += ` -L ${merged.machineCopyPort}:localhost:${merged.machineCopyPort}`;
      }
    }

    return merged;
  }
}
