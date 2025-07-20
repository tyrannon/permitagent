# Week 1 Sprint: Foundation That Doesn't Suck

## Day 1-2: Database Schema That Makes Sense

### The Right Structure From Day One
```sql
-- Projects table (the parent of everything)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number VARCHAR(50) UNIQUE, -- PRJ-2024-00001
  description TEXT NOT NULL,
  address_id UUID REFERENCES addresses(id),
  applicant_id UUID REFERENCES persons(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ai_suggested BOOLEAN DEFAULT FALSE,
  total_fees DECIMAL(10,2) DEFAULT 0,
  total_paid DECIMAL(10,2) DEFAULT 0
);

-- Permits table (children of projects)
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL, -- ALWAYS linked!
  permit_number VARCHAR(50) UNIQUE, -- BLD-2024-00001
  type VARCHAR(50) NOT NULL, -- BUILDING, ELECTRICAL, PLUMBING
  subtype VARCHAR(50), -- NEW, ADDITION, ALTERATION
  status VARCHAR(50) DEFAULT 'DRAFT',
  current_workflow_state_id UUID REFERENCES workflow_states(id),
  assigned_to UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ai_confidence DECIMAL(3,2), -- 0.95 = 95% confident
  auto_routed BOOLEAN DEFAULT FALSE
);

-- Workflow states (trackable, undoable)
CREATE TABLE workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID REFERENCES permits(id),
  state_name VARCHAR(100) NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  entered_by UUID REFERENCES users(id),
  duration_hours INTEGER, -- calculated on exit
  is_bottleneck BOOLEAN DEFAULT FALSE,
  undo_available BOOLEAN DEFAULT TRUE
);

-- Workflow history (for undo capability)
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID REFERENCES permits(id),
  action VARCHAR(100) NOT NULL, -- APPROVED, REJECTED, RETURNED
  from_state VARCHAR(100),
  to_state VARCHAR(100),
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  comments TEXT,
  undone BOOLEAN DEFAULT FALSE,
  undone_by UUID REFERENCES users(id),
  undone_at TIMESTAMPTZ
);

-- Smart indexes for speed
CREATE INDEX idx_permits_project ON permits(project_id);
CREATE INDEX idx_permits_assigned ON permits(assigned_to) WHERE status != 'CLOSED';
CREATE INDEX idx_workflow_bottlenecks ON workflow_states(permit_id) WHERE is_bottleneck = TRUE;
CREATE INDEX idx_permits_status ON permits(status) WHERE status IN ('SUBMITTED', 'UNDER_REVIEW');
```

### Prisma Schema
```prisma
model Project {
  id              String   @id @default(uuid())
  referenceNumber String   @unique @map("reference_number")
  description     String
  address         Address  @relation(fields: [addressId], references: [id])
  addressId       String   @map("address_id")
  applicant       Person   @relation(fields: [applicantId], references: [id])
  applicantId     String   @map("applicant_id")
  permits         Permit[]
  documents       Document[]
  status          String   @default("active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  aiSuggested     Boolean  @default(false) @map("ai_suggested")
  totalFees       Decimal  @default(0) @map("total_fees")
  totalPaid       Decimal  @default(0) @map("total_paid")
  
  @@map("projects")
}

model Permit {
  id                    String    @id @default(uuid())
  project               Project   @relation(fields: [projectId], references: [id])
  projectId             String    @map("project_id")
  permitNumber          String    @unique @map("permit_number")
  type                  String
  subtype               String?
  status                String    @default("DRAFT")
  currentWorkflowState  WorkflowState? @relation("CurrentState", fields: [currentWorkflowStateId], references: [id])
  currentWorkflowStateId String?  @map("current_workflow_state_id")
  assignedTo            User?     @relation(fields: [assignedToId], references: [id])
  assignedToId          String?   @map("assigned_to")
  workflowStates        WorkflowState[] @relation("PermitStates")
  workflowHistory       WorkflowHistory[]
  fees                  Fee[]
  tasks                 Task[]
  submittedAt           DateTime? @map("submitted_at")
  approvedAt            DateTime? @map("approved_at")
  issuedAt              DateTime? @map("issued_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  aiConfidence          Decimal?  @map("ai_confidence")
  autoRouted            Boolean   @default(false) @map("auto_routed")
  
  @@index([projectId])
  @@index([assignedToId])
  @@index([status])
  @@map("permits")
}
```

## Day 3-4: Authentication That Works

### JWT with Refresh Tokens
```typescript
// packages/api/src/auth/auth.service.ts
export class AuthService {
  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    
    const tokens = {
      accessToken: this.generateAccessToken(user),
      refreshToken: await this.generateRefreshToken(user),
    };
    
    // Log for analytics
    await this.auditLog.create({
      action: 'LOGIN',
      userId: user.id,
      metadata: { ip: context.ip, userAgent: context.userAgent }
    });
    
    return { user, tokens };
  }
  
  private generateAccessToken(user: User) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }
  
  // Refresh tokens in database for revocation
  private async generateRefreshToken(user: User) {
    const token = crypto.randomBytes(32).toString('hex');
    
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });
    
    return token;
  }
}
```

### Role-Based Permissions (AI-Enhanced)
```typescript
// packages/core/src/permissions/permission.engine.ts
export class PermissionEngine {
  // AI suggests permissions based on job title
  async suggestPermissions(jobTitle: string): Promise<Permission[]> {
    const prompt = `Given job title "${jobTitle}" in a permit department, 
                    suggest appropriate system permissions from this list:
                    ${AVAILABLE_PERMISSIONS.join(', ')}`;
    
    const suggestions = await this.ai.complete(prompt);
    return this.parsePermissions(suggestions);
  }
  
  // Smart permission checking
  async canPerform(user: User, action: string, resource: any) {
    // Basic role check
    if (this.hasPermission(user, action)) return true;
    
    // Smart checks
    if (action === 'APPROVE_PERMIT') {
      // Can't approve own submissions
      if (resource.submittedBy === user.id) return false;
      
      // Check department match
      if (resource.type === 'ELECTRICAL' && user.department !== 'ELECTRICAL') {
        return false;
      }
    }
    
    return false;
  }
}
```

## Day 5: Docker Setup for Easy Development

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: permitagent
      POSTGRES_USER: permitagent
      POSTGRES_PASSWORD: ${DB_PASSWORD:-development}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER:-permitagent}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-development}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  api:
    build: 
      context: .
      dockerfile: packages/api/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://permitagent:development@postgres:5432/permitagent
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: http://minio:9000
    depends_on:
      - postgres
      - redis
      - minio
    volumes:
      - ./packages/api:/app/packages/api
      - /app/packages/api/node_modules

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

## Day 6-7: Core API Scaffolding

### Express Setup with TypeScript
```typescript
// packages/api/src/app.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRouter } from './routes/auth.router';
import { ProjectRouter } from './routes/project.router';
import { PermitRouter } from './routes/permit.router';
import { AIRouter } from './routes/ai.router';
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes
app.use('/api/auth', AuthRouter);

// Protected routes
app.use('/api/projects', authMiddleware, ProjectRouter);
app.use('/api/permits', authMiddleware, PermitRouter);
app.use('/api/ai', authMiddleware, AIRouter);

// Error handling
app.use(errorHandler);

export { app, prisma };
```

### Smart Project Creation Endpoint
```typescript
// packages/api/src/routes/project.router.ts
router.post('/projects', async (req, res) => {
  const { description, address, applicantEmail } = req.body;
  
  try {
    // AI analyzes description
    const aiAnalysis = await aiService.analyzeProjectDescription(description);
    
    // Create project with AI suggestions
    const project = await prisma.project.create({
      data: {
        referenceNumber: generateProjectNumber(),
        description,
        address: { connect: { id: addressId } },
        applicant: { connect: { email: applicantEmail } },
        aiSuggested: true,
      }
    });
    
    // Create suggested permits
    const permits = await Promise.all(
      aiAnalysis.suggestedPermits.map(permit => 
        prisma.permit.create({
          data: {
            projectId: project.id,
            permitNumber: generatePermitNumber(permit.type),
            type: permit.type,
            status: 'DRAFT',
            aiConfidence: permit.confidence
          }
        })
      )
    );
    
    res.json({
      project,
      permits,
      aiAnalysis: {
        confidence: aiAnalysis.overallConfidence,
        suggestions: aiAnalysis.suggestions
      }
    });
  } catch (error) {
    next(error);
  }
});
```

## Week 1 Deliverables Checklist

### Database ✓
- [ ] Projects table linking everything
- [ ] Permits always tied to projects  
- [ ] Workflow tracking with history
- [ ] Undo capability built in
- [ ] Smart indexes for performance

### Authentication ✓
- [ ] JWT with refresh tokens
- [ ] Role-based permissions
- [ ] AI permission suggestions
- [ ] Audit logging
- [ ] Session management

### API Foundation ✓
- [ ] Express + TypeScript setup
- [ ] Prisma ORM configured
- [ ] Error handling middleware
- [ ] Request validation
- [ ] API documentation

### DevOps ✓
- [ ] Docker Compose working
- [ ] Hot reloading in development
- [ ] Environment variables
- [ ] Database migrations
- [ ] Seed data for testing

### AI Integration Started ✓
- [ ] LLM router configured
- [ ] Project analysis endpoint
- [ ] Permit type suggestions
- [ ] Basic prompt templates
- [ ] Error handling for AI

## What We've Built vs Accela

| Feature | Accela | PermitAgent Week 1 |
|---------|---------|-------------------|
| Project-centric | ❌ Scattered records | ✅ Everything linked |
| Undo capability | ❌ No going back | ✅ Built into schema |
| AI assistance | ❌ None | ✅ From day one |
| Modern auth | ❌ Session-based | ✅ JWT + refresh |
| Developer experience | ❌ Painful | ✅ Hot reload + TypeScript |

## Next Week Preview

With this foundation, Week 2 will add:
- Beautiful permit creation screen
- AI-powered type suggestions
- Workflow visualization
- Real-time updates
- Document upload with OCR

The foundation doesn't suck anymore. Time to build the features that make people say "Holy shit!"