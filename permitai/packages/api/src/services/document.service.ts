import { PrismaClient } from '@prisma/client';
import { storageService } from './storage.service';
import { documentValidationService } from './document-validation.service';
import { Readable } from 'stream';

const prisma = new PrismaClient();

export interface DocumentUploadDto {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  permitId?: string;
  projectId?: string;
  documentType: string;
  userId: string;
  metadata?: any;
}

export interface DocumentResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  documentType: string;
  validationStatus: string;
  permitId?: string;
  projectId?: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  downloadUrl?: string;
}

export class DocumentService {
  async uploadDocument(data: DocumentUploadDto): Promise<DocumentResponse> {
    // Validate document
    const validation = await documentValidationService.validateDocument(
      data.buffer,
      data.originalname,
      data.documentType
    );

    if (!validation.isValid) {
      throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
    }

    // Scan for viruses if enabled
    if (process.env['ENABLE_VIRUS_SCAN'] === 'true') {
      const scanResult = await documentValidationService.scanForViruses(data.buffer);
      if (!scanResult.clean) {
        throw new Error(`Virus detected: ${scanResult.threats.join(', ')}`);
      }
    }

    // Optimize images if needed
    let processedBuffer = data.buffer;
    if (validation.metadata.actualMimeType?.startsWith('image/')) {
      try {
        processedBuffer = await documentValidationService.optimizeImage(data.buffer, {
          maxWidth: 4096,
          maxHeight: 4096,
          quality: 90,
        });
      } catch (error) {
        console.warn('Image optimization failed, using original:', error);
      }
    }

    // Generate storage key based on context
    const prefix = this.getStoragePrefix(data);
    
    // Upload to MinIO
    const uploadResult = await storageService.upload(
      {
        key: '',
        buffer: processedBuffer,
        mimetype: validation.metadata.actualMimeType || data.mimetype,
        originalname: data.originalname,
        size: processedBuffer.length,
      },
      prefix
    );

    // Save to database
    const document = await prisma.document.create({
      data: {
        filename: data.originalname,
        originalName: data.originalname,
        mimeType: validation.metadata.actualMimeType || data.mimetype,
        size: processedBuffer.length,
        storageKey: uploadResult.key,
        documentType: data.documentType,
        permitId: data.permitId,
        projectId: data.projectId,
        metadata: {
          ...data.metadata,
          validation: validation.metadata,
          originalSize: data.size,
          optimized: processedBuffer.length < data.buffer.length,
        },
        validationStatus: validation.warnings.length > 0 ? 'WARNING' : 'VALID',
        validationErrors: validation.warnings.length > 0 ? validation.warnings : null,
        uploadedById: data.userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: 'UPLOAD_DOCUMENT',
        entityType: 'Document',
        entityId: document.id,
        metadata: {
          filename: data.originalname,
          documentType: data.documentType,
          permitId: data.permitId,
          projectId: data.projectId,
          size: processedBuffer.length,
        },
      },
    });

    // Get download URL
    const downloadUrl = await this.getDocumentUrl(document.id, data.userId);

    return {
      ...document,
      downloadUrl,
    };
  }

  async getDocument(
    documentId: string,
    userId: string,
    userRole?: string
  ): Promise<DocumentResponse> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        permit: {
          select: {
            id: true,
            createdById: true,
          },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access permissions
    if (userRole !== 'admin' && userRole !== 'reviewer') {
      if (document.permit && document.permit.createdById !== userId) {
        throw new Error('Access denied');
      }
    }

    const downloadUrl = await this.getDocumentUrl(document.id, userId);

    return {
      id: document.id,
      filename: document.filename,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      storageKey: document.storageKey,
      documentType: document.documentType,
      validationStatus: document.validationStatus,
      permitId: document.permitId || undefined,
      projectId: document.projectId || undefined,
      uploadedBy: document.uploadedBy,
      createdAt: document.createdAt,
      downloadUrl,
    };
  }

  async downloadDocument(
    documentId: string,
    userId: string,
    userRole?: string
  ): Promise<{ buffer: Buffer; document: DocumentResponse }> {
    const document = await this.getDocument(documentId, userId, userRole);
    const buffer = await storageService.download(document.storageKey);

    // Log download
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DOWNLOAD_DOCUMENT',
        entityType: 'Document',
        entityId: documentId,
        metadata: {
          filename: document.filename,
          size: document.size,
        },
      },
    });

    return { buffer, document };
  }

  async getDocumentStream(
    documentId: string,
    userId: string,
    userRole?: string
  ): Promise<{ stream: Readable; document: DocumentResponse }> {
    const document = await this.getDocument(documentId, userId, userRole);
    const stream = await storageService.getStream(document.storageKey);

    return { stream, document };
  }

  async deleteDocument(
    documentId: string,
    userId: string,
    userRole?: string
  ): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        permit: {
          select: {
            id: true,
            createdById: true,
            status: true,
          },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check permissions
    if (userRole !== 'admin') {
      if (document.uploadedById !== userId) {
        throw new Error('Only the uploader or admin can delete this document');
      }
      if (document.permit && document.permit.status !== 'DRAFT') {
        throw new Error('Cannot delete documents from submitted permits');
      }
    }

    // Delete from storage
    await storageService.delete(document.storageKey);

    // Delete from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_DOCUMENT',
        entityType: 'Document',
        entityId: documentId,
        metadata: {
          filename: document.filename,
          documentType: document.documentType,
          storageKey: document.storageKey,
        },
      },
    });
  }

  async getDocumentsByPermit(
    permitId: string,
    userId: string,
    userRole?: string
  ): Promise<DocumentResponse[]> {
    // Verify permit access
    const permit = await prisma.permit.findUnique({
      where: { id: permitId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!permit) {
      throw new Error('Permit not found');
    }

    if (userRole !== 'admin' && userRole !== 'reviewer' && permit.createdById !== userId) {
      throw new Error('Access denied');
    }

    const documents = await prisma.document.findMany({
      where: { permitId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        downloadUrl: await this.getDocumentUrl(doc.id, userId),
      }))
    );
  }

  async getDocumentsByProject(
    projectId: string,
    userId: string,
    userRole?: string
  ): Promise<DocumentResponse[]> {
    // TODO: Implement project access control
    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        downloadUrl: await this.getDocumentUrl(doc.id, userId),
      }))
    );
  }

  private getStoragePrefix(data: DocumentUploadDto): string {
    if (data.permitId) {
      return `permits/${data.permitId}/documents`;
    }
    if (data.projectId) {
      return `projects/${data.projectId}/documents`;
    }
    return `users/${data.userId}/documents`;
  }

  private async getDocumentUrl(documentId: string, userId: string): Promise<string> {
    // Generate a presigned URL that expires in 1 hour
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { storageKey: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return storageService.getPresignedUrl(document.storageKey, 3600);
  }

  async updateDocumentMetadata(
    documentId: string,
    userId: string,
    metadata: any
  ): Promise<void> {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        metadata: {
          ...(await prisma.document.findUnique({
            where: { id: documentId },
            select: { metadata: true },
          }))?.metadata,
          ...metadata,
          updatedAt: new Date().toISOString(),
          updatedBy: userId,
        },
      },
    });
  }
}

export const documentService = new DocumentService();