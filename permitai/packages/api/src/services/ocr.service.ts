import axios from 'axios';
import FormData from 'form-data';
import { PrismaClient } from '@prisma/client';
import { documentService } from './document.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface OCRResult {
  success: boolean;
  text: string;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
    page?: number;
  }>;
  metadata: {
    pages?: number;
    document_type?: string;
    file_type: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
  extracted_fields?: {
    project_address?: string;
    contractor_name?: string;
    contractor_license?: string;
    project_description?: string;
    valuation?: string;
    square_footage?: string;
    permit_type?: string;
    owner_name?: string;
    parcel_number?: string;
  };
  confidence: number;
  processing_time: number;
  error?: string;
}

export class OCRService {
  private readonly ocrServiceUrl: string;

  constructor() {
    this.ocrServiceUrl = process.env['OCR_SERVICE_URL'] || 'http://localhost:8001';
  }

  async processDocument(
    documentId: string,
    userId: string,
    userRole?: string
  ): Promise<OCRResult> {
    try {
      // Get document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Download document from storage
      const { buffer } = await documentService.downloadDocument(
        documentId,
        userId,
        userRole
      );

      // Prepare form data for OCR service
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: document.filename,
        contentType: document.mimeType,
      });

      // Call OCR service
      const response = await axios.post(
        `${this.ocrServiceUrl}/ocr/extract`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          params: {
            extract_fields: true,
            document_type: document.documentType,
          },
          timeout: 60000, // 60 second timeout for OCR processing
        }
      );

      const ocrResult: OCRResult = response.data;

      // Update document with OCR results
      await this.updateDocumentWithOCR(documentId, ocrResult);

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'OCR_PROCESS',
          entityType: 'Document',
          entityId: documentId,
          metadata: {
            success: ocrResult.success,
            confidence: ocrResult.confidence,
            processing_time: ocrResult.processing_time,
            extracted_fields: ocrResult.extracted_fields ? 
              Object.keys(ocrResult.extracted_fields).length : 0,
          },
        },
      });

      return ocrResult;
    } catch (error: any) {
      logger.error('OCR processing error:', error);
      
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'OCR_PROCESS_FAILED',
          entityType: 'Document',
          entityId: documentId,
          metadata: {
            error: error.message,
          },
        },
      });

      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  async processDocumentAsync(
    documentId: string,
    userId: string,
    userRole?: string
  ): Promise<{ jobId: string }> {
    // TODO: Implement async processing with Bull queue
    // For now, we'll process synchronously
    const result = await this.processDocument(documentId, userId, userRole);
    return { jobId: documentId };
  }

  private async updateDocumentWithOCR(
    documentId: string,
    ocrResult: OCRResult
  ): Promise<void> {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrText: ocrResult.text,
        ocrProcessedAt: new Date(),
        extractedFields: ocrResult.extracted_fields || {},
        metadata: {
          ...(await prisma.document.findUnique({
            where: { id: documentId },
            select: { metadata: true },
          }))?.metadata,
          ocr: {
            success: ocrResult.success,
            confidence: ocrResult.confidence,
            processing_time: ocrResult.processing_time,
            lines_count: ocrResult.lines.length,
            pages: ocrResult.metadata.pages,
          },
        },
        validationStatus: ocrResult.success ? 'VALID' : 'INVALID',
      },
    });
  }

  async searchDocumentsByText(
    query: string,
    permitId?: string,
    projectId?: string,
    userId?: string
  ): Promise<any[]> {
    const where: any = {
      ocrText: {
        contains: query,
        mode: 'insensitive',
      },
    };

    if (permitId) where.permitId = permitId;
    if (projectId) where.projectId = projectId;
    
    // If user is applicant, only search their documents
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (user?.role.name === 'applicant') {
        where.uploadedById = userId;
      }
    }

    const documents = await prisma.document.findMany({
      where,
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
      orderBy: {
        ocrProcessedAt: 'desc',
      },
    });

    // Highlight search terms in results
    return documents.map(doc => ({
      ...doc,
      highlights: this.highlightSearchTerms(doc.ocrText || '', query),
    }));
  }

  private highlightSearchTerms(text: string, query: string): string[] {
    const lines = text.split('\n');
    const queryLower = query.toLowerCase();
    const highlights: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().includes(queryLower)) {
        // Extract context around the match
        const index = line.toLowerCase().indexOf(queryLower);
        const start = Math.max(0, index - 50);
        const end = Math.min(line.length, index + query.length + 50);
        const highlight = line.substring(start, end);
        highlights.push(
          (start > 0 ? '...' : '') +
          highlight +
          (end < line.length ? '...' : '')
        );
      }
    }

    return highlights.slice(0, 5); // Return up to 5 highlights
  }

  async extractFieldsFromText(
    text: string,
    documentType?: string
  ): Promise<any> {
    try {
      // Call OCR service's field extraction endpoint
      const response = await axios.post(
        `${this.ocrServiceUrl}/ocr/extract-fields`,
        {
          text,
          document_type: documentType,
        },
        {
          timeout: 10000,
        }
      );

      return response.data.extracted_fields;
    } catch (error: any) {
      logger.error('Field extraction error:', error);
      return null;
    }
  }

  async getOCRStatus(documentId: string): Promise<{
    processed: boolean;
    processedAt?: Date;
    confidence?: number;
    extractedFieldsCount?: number;
  }> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        ocrProcessedAt: true,
        metadata: true,
        extractedFields: true,
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return {
      processed: !!document.ocrProcessedAt,
      processedAt: document.ocrProcessedAt || undefined,
      confidence: document.metadata?.ocr?.confidence,
      extractedFieldsCount: document.extractedFields ? 
        Object.keys(document.extractedFields).length : 0,
    };
  }

  async batchProcessDocuments(
    documentIds: string[],
    userId: string,
    userRole?: string
  ): Promise<{
    successful: string[];
    failed: Array<{ documentId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ documentId: string; error: string }> = [];

    // Process documents in parallel with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < documentIds.length; i += concurrency) {
      const batch = documentIds.slice(i, i + concurrency);
      const promises = batch.map(async (documentId) => {
        try {
          await this.processDocument(documentId, userId, userRole);
          successful.push(documentId);
        } catch (error: any) {
          failed.push({
            documentId,
            error: error.message,
          });
        }
      });

      await Promise.all(promises);
    }

    return { successful, failed };
  }

  async reprocessDocument(
    documentId: string,
    userId: string,
    userRole?: string
  ): Promise<OCRResult> {
    // Clear existing OCR data
    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrText: null,
        ocrProcessedAt: null,
        extractedFields: {},
      },
    });

    // Reprocess
    return this.processDocument(documentId, userId, userRole);
  }
}

export const ocrService = new OCRService();