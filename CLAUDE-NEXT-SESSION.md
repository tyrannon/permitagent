# Next Session: Building PermitAgent MVP

## What We've Accomplished
✅ Complete strategic vision and business plan
✅ MVP feature set defined (30-day sprint)
✅ Technical differentiation documented
✅ All permit types and requirements mapped
✅ Finance integration with ELI5 mode planned
✅ Inspector scheduling by STOPS designed
✅ Dynamic field system architected

## Priority for Next Session

### 1. Start Building Foundation (Week 1)
```bash
cd /Users/kaiyakramer/permitagent/permitai

# Fix npm workspaces first
# Set up Prisma with flexible schema
# Create project-centric database
# Build JWT auth system
```

### 2. Key Database Tables to Create
- Projects (parent of everything)
- Permits (always linked to projects)
- Dynamic fields (for council demands)
- Workflow states (with undo history)
- Inspections (grouped by location)
- Financial records (with GL mapping)

### 3. First API Endpoints
- POST /projects - Create with AI suggestions
- POST /permits - AI type detection
- GET /analytics/bottlenecks - Real-time
- POST /ai/analyze-document - OCR + extraction

## Claude-Prompter Commands to Use

```bash
# When starting database work
claude-prompter suggest -t "Prisma schema for flexible permit system" --code -l typescript --task-type database-design --claude-analysis

# When building APIs
claude-prompter suggest -t "Express API with AI permit routing" --code -l typescript --task-type api-integration --claude-analysis

# For UI components
claude-prompter suggest -t "React permit creation form with AI assistance" --code -l react --task-type ui-component --claude-analysis
```

## Remember
- Project is at `/Users/kaiyakramer/permitagent/permitai/`
- Use Docker Compose for dev environment
- AI is core to everything - not an add-on
- Focus on solving real pain points
- Build for flexibility (council demands)

*Let's build the permit system that doesn't suck!*