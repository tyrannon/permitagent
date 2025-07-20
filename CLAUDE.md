# Claude AI Development Context for PermitAI

## Project Overview
PermitAI is a modern, AI-powered permitting platform designed to replace legacy government permitting systems like Accela. The project aims to automate repetitive workflows, provide AI-assisted form generation and intake, and translate unstructured communication into structured permit data.

## Current Status
- Project structure created with monorepo architecture
- Basic scaffolding for packages (api, core, ai, document-processor)
- Architecture and feature documentation completed
- Docker compose setup for local development

## Technical Context

### Architecture Summary
- **Frontend**: React (web), React Native (mobile), Electron (staff portal)
- **Backend**: Node.js + Express with modular services
- **Databases**: PostgreSQL (primary), Redis (cache/queue), Pinecone (vectors)
- **AI Stack**: Claude 3, GPT-4o, Llama 3 (via Ollama), PaddleOCR
- **Infrastructure**: Docker, Kubernetes-ready

### Project Structure
```
permitai/
├── apps/           # Frontend applications
├── packages/       # Core packages (api, core, ai, document-processor)
├── infrastructure/ # Docker, K8s configs
└── docs/          # Documentation
```

### Key Files Created
- `/permitai/` - Main project directory
- `data-model.ts` - Complete TypeScript interfaces for permits
- `ARCHITECTURE.md` - Detailed system architecture
- `FEATURES.md` - Feature specifications
- `ROADMAP.md` - Development timeline
- `project-structure.md` - File organization

## Development Guidelines

### Code Style
- TypeScript for type safety
- Functional programming where appropriate
- Interface-based design for flexibility
- Minimal comments (self-documenting code)
- Follow existing patterns in codebase

### AI Integration Approach
1. Use LLMRouter for model selection (packages/ai/src/llm/router.ts)
2. Implement proper error handling and fallbacks
3. Log AI confidence scores for analysis
4. Design prompts for specific, structured outputs

### Security Considerations
- Never hardcode API keys or secrets
- Use environment variables for configuration
- Implement rate limiting on all endpoints
- Validate and sanitize all user inputs
- Audit log all permit actions

## Next Session Priorities

### Immediate Tasks
1. Fix npm workspace setup for proper monorepo
2. Implement Prisma schema for database
3. Create basic authentication system
4. Build document upload endpoint
5. Integrate PaddleOCR for text extraction

### Week 1 Goals
- Working development environment
- Basic API with auth
- Document upload and storage
- Simple OCR implementation
- Database migrations

## Common Commands

```bash
# Navigate to project
cd /Users/kaiyakramer/permitagent/permitai

# Start Docker services
npm run docker:up

# For now, install dependencies in each package
cd packages/api && npm install
cd packages/core && npm install

# Run development server (after setup)
npm run dev
```

## Claude-Prompter CLI Tool Integration 🚀

### Overview
A powerful CLI tool that enables Claude to generate intelligent prompt suggestions based on conversation context. This creates a feedback loop between Claude and GPT-4o for enhanced development assistance.

### Quick Start
```bash
# Generate suggestions for your current task
claude-prompter suggest -t "permit application API" --code -l typescript --task-type backend-service --claude-analysis

# Send a prompt to GPT-4o
claude-prompter prompt -m "How should I structure the permit workflow state machine?" --send

# Get suggestions after building features
claude-prompter suggest -t "document OCR processing" --code -l typescript --complexity complex --claude-analysis
```

### Usage Examples for PermitAI Development

#### After Creating API Endpoints
```bash
claude-prompter suggest -t "permit submission API with validation" --code -l typescript --task-type api-integration --claude-analysis
```

#### After Building UI Components
```bash
claude-prompter suggest -t "permit application form component" --code -l react --task-type ui-component --claude-analysis
```

#### For Architecture Decisions
```bash
claude-prompter suggest -t "microservice architecture for permit processing" --complexity complex --claude-analysis
```

#### For AI Integration
```bash
claude-prompter suggest -t "LLM router for multi-model AI system" --code -l typescript --task-type backend-service --complexity complex --claude-analysis
```

### Key Commands
- `suggest`: Generate categorized prompt suggestions based on context
- `prompt`: Send prompts directly to GPT-4o
- `usage`: Track API usage and costs
- `--claude-analysis`: Always include when Claude is generating suggestions

### Integration Workflow
1. Claude helps build a feature in PermitAI
2. Claude runs suggest command with appropriate parameters
3. Tool generates categorized suggestions (follow-up, clarification, deep-dive, etc.)
4. User picks a suggestion for next steps
5. Conversation continues with deeper insights

### Best Practices
- Use specific topics for better suggestions
- Include language and task-type for code-related tasks
- Set complexity level (simple/moderate/complex) appropriately
- Chain suggestions: Claude → Tool → GPT-4o → Claude

## Key Decisions Made
1. **Monorepo**: Using Turborepo for better code sharing
2. **Database**: PostgreSQL with Prisma ORM for type safety
3. **AI Strategy**: Hybrid approach with multiple models
4. **Architecture**: Microservices-ready but starting monolithic
5. **Security**: JWT auth with refresh tokens

## Domain Knowledge Context
- **Permit Types**: Building, Electrical, Plumbing, Mechanical, Demolition, Fence, Sign, Grading, Tree, Special Event
- **Workflow States**: Draft → Submitted → Under Review → Pending Info → Approved → Issued → Inspections → Closed
- **Document Types**: Application, Site Plan, Floor Plan, Elevation, Structural, Mechanical/Electrical/Plumbing Plans, Calculations, Specifications, Photos, License, Insurance

## Performance Targets
- Document processing: < 10 seconds
- API response time: < 200ms
- OCR accuracy: > 95% for typed text
- AI field extraction: > 90% accuracy
- System uptime: > 99.9%

## Integration Points
- **Accela**: REST API adapter planned
- **GIS Systems**: Parcel lookup integration
- **Payment**: Stripe for online payments
- **Email**: SendGrid for notifications
- **SMS**: Twilio for urgent updates

## Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical workflows
- Load testing before production
- AI accuracy benchmarking

## Strategic Vision Documents

### Plus Ultra Strategy Files
- **[CLAUDE-STRATEGY.md](./CLAUDE-STRATEGY.md)** - Complete business strategy and market disruption plan
- **[CLAUDE-MVP-FEATURES.md](./CLAUDE-MVP-FEATURES.md)** - 30-day MVP sprint with demo scenarios
- **[CLAUDE-TECH-DIFFERENTIATION.md](./CLAUDE-TECH-DIFFERENTIATION.md)** - Technical superiority analysis vs Accela

### Key Strategic Insights
1. **AI-First Advantage**: We're not adding AI to permits, we're building permits on AI
2. **10x Better UX**: 5-minute permits vs 45+ minutes in Accela
3. **80% Cost Reduction**: SaaS model vs expensive licenses + infrastructure
4. **Zero Training Required**: AI guides users through everything
5. **Instant Accela Migration**: One-click data import preserves history

### MVP Demo Highlights
- Upload any document → Complete permit application
- Natural language permit assistant
- AI pre-review with instant feedback
- Real-time collaboration features
- Predictive analytics dashboard

### Investment Thesis
- **Market**: $2.3B government permitting software
- **Problem**: 20-year-old monopoly (Accela) with terrible UX
- **Solution**: AI-native platform with 10x better outcomes
- **Traction**: Industry connections ready to pilot
- **Ask**: $2M seed for 18-month runway to $10M ARR

## Complete Requirements Documentation

### All Permit Types Mapped
- **Building**: 18 types (Residential/Non-Residential × 9 categories)
- **Engineering**: EP Licensed/Major/Parklet, Encroachment, Lot Line
- **Planning**: STR, Planning Records, Variances, CUPs
- **Fire**: CUPA permits, Fire systems, Construction
- **Parks & Rec**: Events, Film, Street Trees
- **Code Enforcement**: Vacant buildings, Certificates, Cases
- **Water**: Connections, Meters, Backflow

### Key System Features
1. **Project-Centric Architecture**: One project → multiple linked permits
2. **Dynamic Fields**: Add custom fields without code changes
3. **Workflow Undo**: Finally! Can undo workflow actions
4. **Inspector Scheduling**: By STOPS not count (50 inspections at 1 address = 1 stop)
5. **Finance ELI5 Mode**: Explains complex data to finance dept
6. **PRA Engine**: Answer public records requests instantly
7. **Certificate Generator**: Shiny certificates on demand
8. **AI Everything**: Type detection, routing, scheduling, reporting

### Pain Points We're Solving
- Wrong permit types selected → AI suggests correct types
- No workflow visibility → Visual workflow with predictions
- Can't undo mistakes → Full history with undo
- Finance 5PM panic → One-click emergency reports
- Council demands new fields → Dynamic field creation
- Scattered records → Everything linked to projects
- Manual inspector routing → AI optimization by stops

### Technical Decisions
- **Database**: PostgreSQL with Prisma ORM
- **Schema**: Flexible with JSONB for dynamic fields
- **API**: Express + TypeScript
- **Auth**: JWT with refresh tokens
- **AI**: Multi-model (Claude, GPT-4V, Llama)
- **Files**: MinIO for document storage
- **Cache**: Redis for performance
- **Search**: Pinecone for vector search

## Remember for Next Session
1. The project is in `/Users/kaiyakramer/permitagent/permitai/`
2. Workspace protocol needs fixing in package.json files
3. User is focused on building an MVP quickly
4. Prioritize working features over perfect architecture
5. User has domain expertise in government permitting
6. Strategic documents created for investor pitch
7. 30-day MVP plan ready to execute
8. All permit types and requirements documented
9. Finance integration is CRITICAL (they panic at 5PM)
10. Inspector scheduling must be by STOPS not inspections
11. System must handle dynamic fields for council demands
12. Everything must be undoable (workflow history)
13. AI is at the CORE, not bolted on