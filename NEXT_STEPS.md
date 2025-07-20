# Next Steps for PermitAI Development

## Immediate Actions (Next Session)

### 1. Fix NPM Workspace Setup
The current workspace setup needs to be fixed. For now:
```bash
cd /Users/kaiyakramer/permitagent/permitai
cd packages/core && npm install
cd ../api && npm install
cd ../ai && npm install
```

### 2. Set Up Prisma Schema
Create the database schema for permits, users, documents, and workflows:
```bash
cd packages/api
npx prisma init
# Then create schema in prisma/schema.prisma
```

### 3. Environment Configuration
Create `.env` files in each package:
```bash
# packages/api/.env
DATABASE_URL="postgresql://permitai:permitai123@localhost:5432/permitai"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-development-secret"

# packages/ai/.env  
ANTHROPIC_API_KEY="your-key"
OPENAI_API_KEY="your-key"
```

### 4. Start Docker Services
```bash
cd /Users/kaiyakramer/permitagent/permitai
npm run docker:up
```

## Week 1 Development Plan

### Day 1-2: Foundation
- [ ] Fix package dependencies
- [ ] Create Prisma schema
- [ ] Set up database migrations
- [ ] Implement JWT authentication
- [ ] Create user registration/login endpoints

### Day 3-4: Document Processing
- [ ] File upload endpoint with Multer
- [ ] MinIO integration for storage
- [ ] Basic OCR service with PaddleOCR
- [ ] Document metadata storage

### Day 5-7: AI Integration
- [ ] Test LLM router with real API keys
- [ ] Create permit type classifier
- [ ] Build field extraction prompts
- [ ] Implement extraction endpoint
- [ ] Add validation logic

## Quick Start Commands

```bash
# 1. Navigate to project
cd /Users/kaiyakramer/permitagent/permitai

# 2. Start infrastructure
npm run docker:up

# 3. Install dependencies (in each package for now)
cd packages/core && npm install && cd ..
cd packages/api && npm install && cd ..
cd packages/ai && npm install && cd ..

# 4. Set up database (after creating schema)
cd packages/api
npx prisma migrate dev --name init

# 5. Start API server
npm run dev
```

## Priority Features for MVP

1. **Document Upload & Storage**
   - Accept PDF, JPG, PNG
   - Store in MinIO
   - Save metadata in PostgreSQL

2. **OCR Processing**
   - Extract text from uploads
   - Store OCR results
   - Flag low-confidence extractions

3. **AI Field Extraction**
   - Permit type detection
   - Applicant info extraction
   - Project details parsing

4. **Basic API**
   - POST /api/permits/create
   - POST /api/documents/upload
   - GET /api/permits/:id
   - PATCH /api/permits/:id/status

5. **Simple UI**
   - Upload form
   - Permit status view
   - Extracted data display

## Development Tips

### For Fast Iteration
1. Start with hardcoded permit types
2. Use Claude 3 Haiku for cost-effective testing
3. Mock complex features initially
4. Focus on one permit type first (Building)

### For Testing
1. Create seed data scripts
2. Use Postman for API testing
3. Set up Jest for unit tests later
4. Test with real permit PDFs

### For Debugging
1. Use extensive logging initially
2. Add request IDs for tracing
3. Log all AI responses
4. Monitor token usage

## Resources & References

### Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Claude API](https://docs.anthropic.com)
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)

### Example Permits
- Search for "building permit application PDF" for test documents
- Use simple permits initially (fence, shed)
- Test with both typed and handwritten forms

### Domain Resources
- City permit requirements (check local .gov sites)
- Accela documentation for workflow ideas
- ICC (International Code Council) for standards

## Questions to Consider

1. **Data Privacy**: How will we handle PII in permits?
2. **Accuracy Requirements**: What's acceptable error rate?
3. **Approval Logic**: Which permits can be auto-approved?
4. **Integration Timeline**: When to connect to Accela?
5. **User Training**: How to onboard city staff?

## Success Criteria for Week 1

- [ ] Can upload a permit PDF
- [ ] Can extract text via OCR
- [ ] Can identify permit type with AI
- [ ] Can extract basic fields (name, address)
- [ ] Can store and retrieve permit data
- [ ] Basic API is functional
- [ ] Development environment is stable

Remember: Focus on getting a working vertical slice rather than building out all features horizontally. One complete workflow is better than many partial features.