import { Router } from 'express';
import multer from 'multer';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { documentService } from '../services/document.service';
import { ocrService } from '../services/ocr.service';
import Joi from 'joi';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
    files: 10, // Max 10 files at once
  },
});

// Validation schemas
const uploadSchema = Joi.object({
  permitId: Joi.string().optional(),
  projectId: Joi.string().optional(),
  documentType: Joi.string().required(),
  metadata: Joi.object().optional(),
}).or('permitId', 'projectId'); // Require either permitId or projectId

// Upload single document
router.post(
  '/upload',
  authenticate,
  upload.single('document'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Validate request body
      const { error, value } = uploadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details,
        });
      }

      // Upload document
      const document = await documentService.uploadDocument({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        permitId: value.permitId,
        projectId: value.projectId,
        documentType: value.documentType,
        userId: req.user!.id,
        metadata: value.metadata,
      });

      res.status(201).json(document);
    } catch (error: any) {
      console.error('Document upload error:', error);
      if (error.message.includes('validation failed') || error.message.includes('Virus detected')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// Upload multiple documents
router.post(
  '/upload-multiple',
  authenticate,
  upload.array('documents', 10),
  async (req: AuthRequest, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Validate request body
      const { error, value } = uploadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details,
        });
      }

      // Upload all documents
      const uploadPromises = req.files.map((file) =>
        documentService.uploadDocument({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          permitId: value.permitId,
          projectId: value.projectId,
          documentType: value.documentType,
          userId: req.user!.id,
          metadata: value.metadata,
        })
      );

      const documents = await Promise.all(uploadPromises);
      res.status(201).json({ documents });
    } catch (error: any) {
      console.error('Multiple document upload error:', error);
      res.status(500).json({ error: 'Failed to upload documents' });
    }
  }
);

// Get document by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await documentService.getDocument(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    res.json(document);
  } catch (error: any) {
    console.error('Get document error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Download document
router.get('/:id/download', authenticate, async (req: AuthRequest, res) => {
  try {
    const { buffer, document } = await documentService.downloadDocument(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    // Set headers for download
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.filename}"`
    );
    res.setHeader('Content-Length', buffer.length.toString());

    res.send(buffer);
  } catch (error: any) {
    console.error('Download document error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Stream document (for large files)
router.get('/:id/stream', authenticate, async (req: AuthRequest, res) => {
  try {
    const { stream, document } = await documentService.getDocumentStream(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    // Set headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.filename}"`
    );

    // Pipe the stream to response
    stream.pipe(res);
  } catch (error: any) {
    console.error('Stream document error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to stream document' });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await documentService.deleteDocument(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete document error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot delete') || error.message.includes('Only the uploader')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get documents by permit
router.get(
  '/permit/:permitId',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const documents = await documentService.getDocumentsByPermit(
        req.params.permitId,
        req.user!.id,
        req.user!.role
      );

      res.json({ documents });
    } catch (error: any) {
      console.error('Get permit documents error:', error);
      if (error.message === 'Permit not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to get documents' });
    }
  }
);

// Get documents by project
router.get(
  '/project/:projectId',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const documents = await documentService.getDocumentsByProject(
        req.params.projectId,
        req.user!.id,
        req.user!.role
      );

      res.json({ documents });
    } catch (error: any) {
      console.error('Get project documents error:', error);
      res.status(500).json({ error: 'Failed to get documents' });
    }
  }
);

// Update document metadata
router.patch('/:id/metadata', authenticate, async (req: AuthRequest, res) => {
  try {
    await documentService.updateDocumentMetadata(
      req.params.id,
      req.user!.id,
      req.body
    );

    res.json({ message: 'Metadata updated successfully' });
  } catch (error: any) {
    console.error('Update metadata error:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// Get presigned upload URL (for direct browser uploads)
router.post(
  '/presigned-upload',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { filename, documentType } = req.body;

      if (!filename || !documentType) {
        return res.status(400).json({
          error: 'filename and documentType are required',
        });
      }

      // Generate a unique key
      const key = `temp/${req.user!.id}/${Date.now()}-${filename}`;

      // Get presigned URL from storage service
      const { storageService } = await import('../services/storage.service');
      const uploadUrl = await storageService.getPresignedUploadUrl(key, 3600);

      res.json({
        uploadUrl,
        key,
        expiresIn: 3600,
      });
    } catch (error: any) {
      console.error('Presigned URL error:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }
);

// OCR endpoints

// Process document with OCR
router.post('/:id/ocr', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await ocrService.processDocument(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json(result);
  } catch (error: any) {
    console.error('OCR processing error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to process document with OCR' });
  }
});

// Process document with OCR asynchronously
router.post('/:id/ocr/async', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await ocrService.processDocumentAsync(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json(result);
  } catch (error: any) {
    console.error('Async OCR processing error:', error);
    res.status(500).json({ error: 'Failed to start OCR processing' });
  }
});

// Get OCR processing status
router.get('/:id/ocr/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const status = await ocrService.getOCRStatus(req.params.id);
    res.json(status);
  } catch (error: any) {
    console.error('Get OCR status error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get OCR status' });
  }
});

// Reprocess document with OCR
router.post('/:id/ocr/reprocess', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await ocrService.reprocessDocument(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json(result);
  } catch (error: any) {
    console.error('OCR reprocessing error:', error);
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to reprocess document' });
  }
});

// Batch process multiple documents
router.post('/ocr/batch', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Invalid documentIds array' });
    }

    if (documentIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 documents per batch' });
    }

    const result = await ocrService.batchProcessDocuments(
      documentIds,
      req.user!.id,
      req.user!.role
    );
    res.json(result);
  } catch (error: any) {
    console.error('Batch OCR processing error:', error);
    res.status(500).json({ error: 'Failed to process documents' });
  }
});

// Search documents by text content
router.post('/ocr/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const { query, permitId, projectId } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Search query must be at least 3 characters' 
      });
    }

    const results = await ocrService.searchDocumentsByText(
      query,
      permitId,
      projectId,
      req.user!.id
    );
    res.json({ results, total: results.length });
  } catch (error: any) {
    console.error('OCR search error:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

// Extract fields from text
router.post('/ocr/extract-fields', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text, documentType } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const fields = await ocrService.extractFieldsFromText(text, documentType);
    res.json({ fields });
  } catch (error: any) {
    console.error('Field extraction error:', error);
    res.status(500).json({ error: 'Failed to extract fields' });
  }
});

export default router;