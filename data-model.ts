// Core Permit Data Model for PermitAI

export interface Permit {
  id: string;
  permitNumber: string;
  type: PermitType;
  status: PermitStatus;
  
  // Applicant Information
  applicant: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: Address;
    organizationId?: string;
  };
  
  // Project Details
  project: {
    address: Address;
    description: string;
    estimatedCost?: number;
    squareFootage?: number;
    units?: number;
  };
  
  // Documents
  documents: Document[];
  
  // AI-Generated Content
  aiSummary?: string;
  extractedData?: Record<string, any>;
  missingRequirements?: string[];
  riskScore?: number;
  
  // Workflow
  workflow: {
    currentStep: string;
    assignedTo?: string;
    dueDate?: Date;
    history: WorkflowEvent[];
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  expiresAt?: Date;
}

export interface Document {
  id: string;
  permitId: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  
  // Processing Results
  ocrText?: string;
  extractedFields?: Record<string, any>;
  validationStatus?: 'pending' | 'valid' | 'invalid';
  validationErrors?: string[];
  
  // AI Analysis
  summary?: string;
  confidence?: number;
  detectedType?: DocumentType;
}

export interface WorkflowEvent {
  id: string;
  timestamp: Date;
  action: WorkflowAction;
  performedBy: string;
  notes?: string;
  automatedAction?: boolean;
  
  // For AI actions
  aiModel?: string;
  aiConfidence?: number;
  aiReasoning?: string;
}

export enum PermitType {
  BUILDING = 'BUILDING',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  MECHANICAL = 'MECHANICAL',
  DEMO = 'DEMOLITION',
  FENCE = 'FENCE',
  SIGN = 'SIGN',
  GRADING = 'GRADING',
  TREE = 'TREE',
  SPECIAL_EVENT = 'SPECIAL_EVENT',
  OTHER = 'OTHER'
}

export enum PermitStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_INFO = 'PENDING_INFO',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  INSPECTIONS = 'INSPECTIONS',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum DocumentType {
  APPLICATION = 'APPLICATION',
  SITE_PLAN = 'SITE_PLAN',
  FLOOR_PLAN = 'FLOOR_PLAN',
  ELEVATION = 'ELEVATION',
  STRUCTURAL = 'STRUCTURAL',
  MECHANICAL_PLAN = 'MECHANICAL_PLAN',
  ELECTRICAL_PLAN = 'ELECTRICAL_PLAN',
  PLUMBING_PLAN = 'PLUMBING_PLAN',
  CALC = 'CALCULATIONS',
  SPEC = 'SPECIFICATIONS',
  PHOTO = 'PHOTO',
  LICENSE = 'LICENSE',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER'
}

export enum WorkflowAction {
  CREATED = 'CREATED',
  SUBMITTED = 'SUBMITTED',
  ASSIGNED = 'ASSIGNED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INFO_REQUESTED = 'INFO_REQUESTED',
  INFO_PROVIDED = 'INFO_PROVIDED',
  ISSUED = 'ISSUED',
  INSPECTION_SCHEDULED = 'INSPECTION_SCHEDULED',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
  CLOSED = 'CLOSED',
  AI_PROCESSED = 'AI_PROCESSED',
  AI_FLAGGED = 'AI_FLAGGED'
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  parcelId?: string;
  latitude?: number;
  longitude?: number;
}

// Vector Storage Schema for RAG
export interface PermitEmbedding {
  id: string;
  permitId: string;
  documentId?: string;
  content: string;
  contentType: 'permit_summary' | 'document' | 'decision' | 'code_section';
  embedding: number[];
  metadata: {
    permitType?: PermitType;
    permitStatus?: PermitStatus;
    date?: Date;
    keywords?: string[];
  };
}