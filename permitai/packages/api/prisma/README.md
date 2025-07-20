# PermitAI Database Schema

This Prisma schema implements a comprehensive permit management system with the following features:

## Core Models

### User & Authentication
- **User**: Staff members with roles, departments, and preferences
- **Session**: JWT session management with refresh tokens
- **Role**: Permission-based access control
- **Department**: Organizational units with routing rules

### Project & Permits
- **Project**: Central entity that can have multiple permits
- **Permit**: Core permit with dynamic fields, AI features, and workflow
- **PermitType**: Configurable permit types with templates and rules
- **Organization**: Contractors, architects, engineers with licensing
- **Contact**: Organization contacts

### Workflow & Processing
- **WorkflowEvent**: Complete audit trail with AI tracking
- **Review**: Multi-department review process
- **Condition**: Pre/post issuance conditions

### Documents & AI
- **Document**: File storage with OCR and AI analysis
- AI fields on permits for:
  - Summary generation
  - Risk scoring
  - Data extraction
  - Suggestions

### Inspections
- **Inspection**: Scheduling with stop-based routing
- Location tracking for route optimization
- Result tracking with reinspection support

### Financial
- **Fee**: Versioned fee tracking with calculations
- **Payment**: Transaction management with refunds

### Communication
- **Comment**: Internal/external communication
- **Notification**: Multi-channel notifications
- **AuditLog**: Comprehensive activity tracking

## Key Features

1. **Dynamic Fields**: JSON fields for custom data per permit type
2. **AI Integration**: Built-in fields for AI processing
3. **Workflow Undo**: Complete history in WorkflowEvent
4. **Stop-Based Routing**: Inspections grouped by location
5. **Fee Versioning**: Track fee schedule changes
6. **Multi-Tenant Ready**: Organization-based isolation
7. **Full Audit Trail**: Every action tracked

## Next Steps

1. Start PostgreSQL: `npm run docker:up`
2. Run migrations: `npx prisma migrate dev`
3. Generate client: `npx prisma generate`
4. Seed data: `npx prisma db seed`

## Common Commands

```bash
# Create migration
npx prisma migrate dev --name init

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Format schema
npx prisma format
```