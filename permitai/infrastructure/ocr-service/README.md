# PermitAI OCR Service

A Python microservice for extracting text from permit documents using PaddleOCR.

## Features

- PDF and image processing (JPEG, PNG, TIFF, BMP)
- Multi-page PDF support
- Field extraction for permit-specific information
- Batch processing capabilities
- High accuracy with PaddleOCR's deep learning models
- REST API with FastAPI

## Extracted Fields

The service automatically extracts common permit fields:
- Project Address
- Contractor Name & License
- Project Description
- Valuation
- Square Footage
- Permit Type
- Owner Name
- Parcel Number

## API Endpoints

### Health Check
```
GET /health
```

### Extract Text
```
POST /ocr/extract
Content-Type: multipart/form-data

Parameters:
- file: The document file
- extract_fields: boolean (default: true)
- document_type: string (optional)

Response:
{
  "success": true,
  "text": "extracted text...",
  "lines": [...],
  "metadata": {...},
  "extracted_fields": {...},
  "confidence": 0.95,
  "processing_time": 2.5
}
```

### Batch Processing
```
POST /ocr/batch
Content-Type: multipart/form-data

Parameters:
- files: Multiple document files

Response:
{
  "results": [...],
  "total": 3
}
```

### Supported Formats
```
GET /ocr/supported-formats
```

## Node.js Integration

The OCR service is integrated with the main API through the `ocr.service.ts`:

### Process Single Document
```typescript
POST /api/documents/:id/ocr
```

### Batch Process Documents
```typescript
POST /api/documents/ocr/batch
Body: { documentIds: string[] }
```

### Search by Text Content
```typescript
POST /api/documents/ocr/search
Body: { 
  query: string,
  permitId?: string,
  projectId?: string 
}
```

### Get OCR Status
```typescript
GET /api/documents/:id/ocr/status
```

### Reprocess Document
```typescript
POST /api/documents/:id/ocr/reprocess
```

## Local Development

1. Build and run with Docker Compose:
```bash
docker-compose up ocr-service
```

2. Or run directly:
```bash
cd infrastructure/ocr-service
pip install -r requirements.txt
python main.py
```

## Configuration

Environment variables:
- `OCR_SERVICE_URL`: URL for the OCR service (default: http://localhost:8001)

## Performance

- Average processing time: 2-5 seconds per page
- Supports concurrent processing
- Automatically downloads PaddleOCR models on first run
- Uses CPU by default (GPU support available)