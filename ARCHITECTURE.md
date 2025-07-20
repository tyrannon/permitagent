# PermitAI Architecture Documentation

## Overview

PermitAI is a modern, AI-powered permitting platform designed to replace legacy government permitting systems. Built with a microservices architecture, it leverages cutting-edge AI models for document processing, natural language understanding, and workflow automation.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │  Staff Portal   │
│   (React/Next)  │     │ (React Native)  │     │    (Electron)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   API Gateway   │
                        │   (Express)     │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐     ┌────────▼────────┐    ┌────────▼────────┐
│  Core Services  │     │   AI Services   │    │  Doc Processing │
│  - Auth         │     │  - LLM Router   │    │  - OCR Engine   │
│  - Permits      │     │  - Embeddings   │    │  - PDF Parser   │
│  - Workflow     │     │  - RAG Pipeline │    │  - Classifier   │
└─────────────────┘     └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Web Application**: React with Next.js for SSR/SSG
- **Mobile Application**: React Native for iOS/Android
- **Staff Portal**: Electron for desktop application
- **UI Components**: Tailwind CSS, Radix UI
- **State Management**: Zustand or Jotai
- **Forms**: React Hook Form with Zod validation

#### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **API Framework**: Express.js with middleware
- **Authentication**: JWT with refresh tokens
- **Queue System**: Bull with Redis
- **File Storage**: MinIO (S3-compatible)
- **Logging**: Winston with structured logging
- **Monitoring**: OpenTelemetry

#### AI/ML Stack
- **LLMs**: 
  - Claude 3 (Haiku/Sonnet) for cost-effective processing
  - GPT-4o for complex reasoning
  - Llama 3 70B via Ollama for offline/local processing
- **Vision Models**:
  - PaddleOCR for form and typed text extraction
  - Azure Computer Vision for handwriting
  - LayoutLMv3 for document understanding
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Database**: Pinecone for RAG

#### Infrastructure
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis for session and queue management
- **Container**: Docker with Docker Compose
- **Orchestration**: Kubernetes (production)
- **CI/CD**: GitHub Actions

## Data Architecture

### Core Entities

1. **Permit**
   - Unique permit number
   - Type (Building, Electrical, Plumbing, etc.)
   - Status workflow
   - Applicant information
   - Project details
   - Document attachments
   - AI-generated summaries

2. **Document**
   - File metadata
   - OCR results
   - Extracted fields
   - Validation status
   - AI confidence scores

3. **Workflow**
   - Current step
   - Assignment
   - History/audit trail
   - Automated actions
   - Due dates

4. **User**
   - Authentication
   - Roles (Applicant, Staff, Admin)
   - Permissions
   - Activity history

### Data Flow

```
1. Document Upload → 2. OCR Processing → 3. Field Extraction
                                            ↓
6. Status Update ← 5. Human Review ← 4. AI Validation
     ↓
7. Notification → 8. Next Workflow Step
```

## Security Architecture

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- API key management for external integrations
- Session management with Redis

### Data Security
- Encryption at rest (PostgreSQL, MinIO)
- Encryption in transit (TLS 1.3)
- PII detection and masking
- Audit logging for all data access

### Infrastructure Security
- Network isolation with VPC
- Web Application Firewall (WAF)
- Rate limiting and DDoS protection
- Regular security scanning

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Queue-based job processing
- Database read replicas
- CDN for static assets

### Performance Optimization
- Redis caching layer
- Database query optimization
- Lazy loading and pagination
- Image optimization and resizing

### Monitoring & Observability
- Application Performance Monitoring (APM)
- Distributed tracing
- Error tracking with Sentry
- Custom dashboards with Grafana

## Integration Architecture

### Legacy System Integration
- REST API adapters for Accela
- Batch import/export capabilities
- Webhook notifications
- Event-driven architecture

### External Services
- Email service (SendGrid/SES)
- SMS notifications (Twilio)
- Payment processing (Stripe)
- GIS integration (Esri/Mapbox)

## Development Workflow

### Monorepo Structure
```
permitai/
├── apps/           # Frontend applications
├── packages/       # Shared packages
├── infrastructure/ # IaC and configs
└── scripts/        # Build and deploy scripts
```

### Code Organization
- Domain-driven design principles
- Clean architecture layers
- Dependency injection
- Interface-based programming

### Testing Strategy
- Unit tests for business logic
- Integration tests for APIs
- E2E tests for critical paths
- Load testing for performance

## Deployment Architecture

### Development Environment
- Local Docker Compose setup
- Hot reloading for all services
- Seeded test data
- Mock external services

### Staging Environment
- Kubernetes cluster
- Feature branch deployments
- Integration with test accounts
- Performance profiling

### Production Environment
- Multi-region deployment
- Blue-green deployments
- Database backups and replication
- Disaster recovery plan

## Future Considerations

### Phase 2 Features
- Multi-tenant architecture
- Advanced analytics dashboard
- Mobile offline mode
- Voice interface

### Technical Debt Management
- Regular dependency updates
- Code quality metrics
- Performance budgets
- Security audits

### Scaling Strategy
- Microservices decomposition
- Event sourcing for audit trail
- CQRS for read-heavy operations
- GraphQL federation