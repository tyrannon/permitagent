# Document Upload API Documentation

## Overview

The document upload system provides secure file storage using MinIO with comprehensive validation, virus scanning capabilities, and access control. All document endpoints require authentication.

## Features

- **File Validation**: Type checking, size limits, malicious content detection
- **Image Optimization**: Automatic resizing and compression
- **Virus Scanning**: Optional ClamAV integration
- **Access Control**: Role-based permissions
- **Audit Logging**: All actions tracked
- **Presigned URLs**: Direct browser uploads for large files
- **Streaming**: Efficient handling of large files

## Endpoints

### Upload Single Document
```http
POST /api/documents/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

Form Data:
- document: (file) The document to upload
- permitId: (string, optional) Associated permit ID
- projectId: (string, optional) Associated project ID
- documentType: (string, required) Type of document
- metadata: (JSON, optional) Additional metadata

Response: 201 Created
{
  "id": "clxxx...",
  "filename": "site-plan.pdf",
  "originalName": "site-plan.pdf",
  "mimeType": "application/pdf",
  "size": 2048576,
  "storageKey": "permits/xxx/documents/xxx-site-plan.pdf",
  "documentType": "site-plan",
  "validationStatus": "VALID",
  "permitId": "clxxx...",
  "uploadedBy": {
    "id": "clxxx...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "createdAt": "2024-01-20T10:30:00Z",
  "downloadUrl": "https://..."
}
```

### Upload Multiple Documents
```http
POST /api/documents/upload-multiple
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

Form Data:
- documents: (files) Multiple files (max 10)
- permitId: (string, optional) Associated permit ID
- projectId: (string, optional) Associated project ID
- documentType: (string, required) Type of documents

Response: 201 Created
{
  "documents": [
    { ... },
    { ... }
  ]
}
```

### Get Document Info
```http
GET /api/documents/{documentId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "clxxx...",
  "filename": "site-plan.pdf",
  "originalName": "site-plan.pdf",
  "mimeType": "application/pdf",
  "size": 2048576,
  "storageKey": "permits/xxx/documents/xxx-site-plan.pdf",
  "documentType": "site-plan",
  "validationStatus": "VALID",
  "permitId": "clxxx...",
  "uploadedBy": { ... },
  "createdAt": "2024-01-20T10:30:00Z",
  "downloadUrl": "https://..."
}
```

### Download Document
```http
GET /api/documents/{documentId}/download
Authorization: Bearer {accessToken}

Response: 200 OK
Content-Type: {document mime type}
Content-Disposition: attachment; filename="site-plan.pdf"
[Binary file data]
```

### Stream Document
```http
GET /api/documents/{documentId}/stream
Authorization: Bearer {accessToken}

Response: 200 OK
Content-Type: {document mime type}
Content-Disposition: inline; filename="site-plan.pdf"
[Streamed file data]
```

### Delete Document
```http
DELETE /api/documents/{documentId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

### Get Documents by Permit
```http
GET /api/documents/permit/{permitId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "documents": [
    { ... },
    { ... }
  ]
}
```

### Get Documents by Project
```http
GET /api/documents/project/{projectId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "documents": [
    { ... },
    { ... }
  ]
}
```

### Update Document Metadata
```http
PATCH /api/documents/{documentId}/metadata
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "description": "Updated site plan with setbacks",
  "tags": ["reviewed", "approved"]
}

Response: 200 OK
{
  "message": "Metadata updated successfully"
}
```

### Get Presigned Upload URL
```http
POST /api/documents/presigned-upload
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "filename": "large-blueprint.pdf",
  "documentType": "blueprint"
}

Response: 200 OK
{
  "uploadUrl": "https://minio.../presigned-url",
  "key": "temp/user-id/timestamp-large-blueprint.pdf",
  "expiresIn": 3600
}
```

## Document Types

Common document types accepted:
- `application` - Permit application forms
- `site-plan` - Site plans and surveys
- `floor-plan` - Building floor plans
- `elevation` - Building elevations
- `structural` - Structural drawings
- `mep-plans` - Mechanical/Electrical/Plumbing
- `calculations` - Engineering calculations
- `specifications` - Project specifications
- `photo` - Site photos
- `license` - Professional licenses
- `insurance` - Insurance certificates

## File Validation Rules

### Default Rules
- **Max Size**: 50MB
- **Allowed Types**: PDF, Images (JPG, PNG, TIFF), Office docs (DOC, DOCX, XLS, XLSX), DWG
- **Virus Scan**: When enabled

### Document-Specific Rules
- **Site Plans**: Up to 100MB, PDF/DWG preferred
- **Photos**: 800x600 minimum, 8000x8000 maximum, 10MB max
- **Licenses**: 5MB max, PDF/Image only
- **Insurance**: 10MB max, PDF only

## Security Features

1. **File Type Verification**: Magic number checking, not just extension
2. **Malicious Content Detection**: Script injection, executable detection
3. **Image Optimization**: Strips EXIF data, resizes large images
4. **Access Control**: Only document owner or admin can delete
5. **Audit Trail**: All uploads, downloads, deletes logged

## Error Responses

### 400 Bad Request
```json
{
  "error": "Document validation failed: File type 'application/x-executable' is not allowed"
}
```

### 403 Forbidden
```json
{
  "error": "Only the uploader or admin can delete this document"
}
```

### 404 Not Found
```json
{
  "error": "Document not found"
}
```

### 413 Payload Too Large
```json
{
  "error": "File size exceeds maximum allowed"
}
```

## Usage Examples

### JavaScript/TypeScript
```typescript
// Upload document
const formData = new FormData();
formData.append('document', file);
formData.append('permitId', 'clxxx...');
formData.append('documentType', 'site-plan');

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const document = await response.json();

// Download document
const downloadResponse = await fetch(`/api/documents/${documentId}/download`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const blob = await downloadResponse.blob();
const url = URL.createObjectURL(blob);
```

### Direct Browser Upload (Large Files)
```typescript
// Get presigned URL
const { uploadUrl, key } = await getPresignedUrl(filename);

// Upload directly to MinIO
await fetch(uploadUrl, {
  method: 'PUT',
  body: file
});

// Register document in system
await registerDocument(key, documentType);
```

## MinIO Configuration

Required environment variables:
```bash
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=permitai-documents
```