import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import crypto from 'crypto';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    actualMimeType?: string;
    fileSize: number;
    dimensions?: { width: number; height: number };
    hash?: string;
  };
}

export interface DocumentValidationRules {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  requireVirusScan?: boolean;
  minDimensions?: { width: number; height: number };
  maxDimensions?: { width: number; height: number };
}

export class DocumentValidationService {
  private readonly defaultRules: DocumentValidationRules = {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/dwg',
      'image/vnd.dwg',
    ],
    allowedExtensions: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.tiff',
      '.tif',
      '.xls',
      '.xlsx',
      '.doc',
      '.docx',
      '.txt',
      '.dwg',
    ],
  };

  private readonly documentTypeRules: Record<string, Partial<DocumentValidationRules>> = {
    'site-plan': {
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/dwg'],
      allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.dwg'],
      maxSize: 100 * 1024 * 1024, // 100MB for site plans
    },
    'photo': {
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      allowedExtensions: ['.jpg', '.jpeg', '.png'],
      maxSize: 10 * 1024 * 1024, // 10MB for photos
      minDimensions: { width: 800, height: 600 },
      maxDimensions: { width: 8000, height: 8000 },
    },
    'license': {
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxSize: 5 * 1024 * 1024, // 5MB for licenses
    },
    'insurance': {
      allowedMimeTypes: ['application/pdf'],
      allowedExtensions: ['.pdf'],
      maxSize: 10 * 1024 * 1024, // 10MB for insurance docs
    },
  };

  async validateDocument(
    buffer: Buffer,
    filename: string,
    documentType?: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: any = {
      fileSize: buffer.length,
    };

    // Get rules for document type
    const rules = this.getRulesForDocumentType(documentType);

    // Check file size
    if (buffer.length > rules.maxSize) {
      errors.push(
        `File size exceeds maximum allowed size of ${this.formatBytes(rules.maxSize)}`
      );
    }

    // Check file extension
    const ext = this.getFileExtension(filename).toLowerCase();
    if (!rules.allowedExtensions.includes(ext)) {
      errors.push(
        `File extension '${ext}' is not allowed. Allowed extensions: ${rules.allowedExtensions.join(', ')}`
      );
    }

    // Detect actual file type from buffer
    try {
      const fileType = await fileTypeFromBuffer(buffer);
      if (fileType) {
        metadata.actualMimeType = fileType.mime;

        // Check if detected mime type is allowed
        if (!rules.allowedMimeTypes.includes(fileType.mime)) {
          errors.push(
            `File type '${fileType.mime}' is not allowed. File appears to be ${fileType.ext} format.`
          );
        }

        // Warn if extension doesn't match detected type
        if (`.${fileType.ext}` !== ext && fileType.ext !== 'xml') {
          warnings.push(
            `File extension '${ext}' doesn't match detected type '.${fileType.ext}'`
          );
        }
      } else {
        // If we can't detect file type, check if it's a text file or DWG
        if (this.isTextFile(buffer)) {
          metadata.actualMimeType = 'text/plain';
        } else if (ext === '.dwg') {
          // DWG files might not be detected by file-type
          metadata.actualMimeType = 'application/dwg';
        } else {
          warnings.push('Unable to detect file type from content');
        }
      }
    } catch (error) {
      warnings.push('Error detecting file type');
    }

    // For images, check dimensions
    if (this.isImage(metadata.actualMimeType || ext)) {
      try {
        const imageMetadata = await sharp(buffer).metadata();
        metadata.dimensions = {
          width: imageMetadata.width || 0,
          height: imageMetadata.height || 0,
        };

        // Check minimum dimensions
        if (rules.minDimensions) {
          if (
            metadata.dimensions.width < rules.minDimensions.width ||
            metadata.dimensions.height < rules.minDimensions.height
          ) {
            errors.push(
              `Image dimensions (${metadata.dimensions.width}x${metadata.dimensions.height}) ` +
              `are below minimum required (${rules.minDimensions.width}x${rules.minDimensions.height})`
            );
          }
        }

        // Check maximum dimensions
        if (rules.maxDimensions) {
          if (
            metadata.dimensions.width > rules.maxDimensions.width ||
            metadata.dimensions.height > rules.maxDimensions.height
          ) {
            errors.push(
              `Image dimensions (${metadata.dimensions.width}x${metadata.dimensions.height}) ` +
              `exceed maximum allowed (${rules.maxDimensions.width}x${rules.maxDimensions.height})`
            );
          }
        }
      } catch (error) {
        warnings.push('Unable to read image dimensions');
      }
    }

    // Calculate file hash for integrity
    metadata.hash = this.calculateHash(buffer);

    // Check for malicious content patterns
    const maliciousPatterns = this.checkForMaliciousPatterns(buffer);
    if (maliciousPatterns.length > 0) {
      errors.push(...maliciousPatterns);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  }

  private getRulesForDocumentType(documentType?: string): DocumentValidationRules {
    if (documentType && this.documentTypeRules[documentType]) {
      return {
        ...this.defaultRules,
        ...this.documentTypeRules[documentType],
      };
    }
    return this.defaultRules;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isImage(mimeTypeOrExt: string): boolean {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/gif'];
    const imageExts = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.gif'];
    return imageTypes.includes(mimeTypeOrExt) || imageExts.includes(mimeTypeOrExt);
  }

  private isTextFile(buffer: Buffer): boolean {
    // Simple check for text files - look for common text patterns
    const sample = buffer.slice(0, 1024).toString('utf8');
    const textPattern = /^[\x20-\x7E\s]*$/;
    return textPattern.test(sample);
  }

  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private checkForMaliciousPatterns(buffer: Buffer): string[] {
    const errors: string[] = [];
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10240));

    // Check for common script injection patterns
    const scriptPatterns = [
      /<script[\s\S]*?>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers
      /<iframe/gi,
      /<embed/gi,
      /<object/gi,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        errors.push('File contains potentially malicious content');
        break;
      }
    }

    // Check for executable file signatures
    const executableSignatures = [
      Buffer.from([0x4D, 0x5A]), // PE/COFF executables (Windows)
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executables (Linux)
      Buffer.from([0xCE, 0xFA, 0xED, 0xFE]), // Mach-O executables (macOS)
      Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O executables (macOS)
    ];

    for (const signature of executableSignatures) {
      if (buffer.slice(0, signature.length).equals(signature)) {
        errors.push('File appears to be an executable');
        break;
      }
    }

    return errors;
  }

  async scanForViruses(buffer: Buffer): Promise<{
    clean: boolean;
    threats: string[];
  }> {
    // TODO: Integrate with ClamAV or other virus scanning service
    // For now, return a mock result
    console.log('Virus scanning not yet implemented');
    return {
      clean: true,
      threats: [],
    };
  }

  async optimizeImage(
    buffer: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<Buffer> {
    const {
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 85,
      format = 'jpeg',
    } = options;

    try {
      let image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if needed
      if (
        metadata.width && metadata.height &&
        (metadata.width > maxWidth || metadata.height > maxHeight)
      ) {
        image = image.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert format and compress
      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality });
          break;
        case 'png':
          image = image.png({ quality });
          break;
        case 'webp':
          image = image.webp({ quality });
          break;
      }

      return await image.toBuffer();
    } catch (error) {
      console.error('Image optimization error:', error);
      throw new Error('Failed to optimize image');
    }
  }
}

export const documentValidationService = new DocumentValidationService();