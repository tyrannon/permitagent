# PermitAI - Modern AI-Powered Permitting Platform

Transform legacy government permitting workflows with intelligent automation, natural language processing, and computer vision.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start infrastructure
npm run docker:up

# Run development servers
npm run dev
```

## 🏗 Architecture

PermitAI uses a modern monorepo structure with:
- **Frontend**: React (web), React Native (mobile), Electron (staff portal)
- **Backend**: Node.js + Express with modular services
- **AI**: Claude 3, GPT-4o, and local Llama models
- **Vision**: PaddleOCR for document processing
- **Database**: PostgreSQL + Redis + Pinecone vector DB

## 📦 Packages

- `@permitai/core` - Shared business logic and types
- `@permitai/api` - REST API server
- `@permitai/ai` - AI/LLM services
- `@permitai/document-processor` - OCR and document parsing

## 🎯 Key Features

1. **Smart Document Intake** - Upload permits, auto-extract data
2. **AI Assistant** - Natural language permit guidance
3. **Staff Copilot** - Automated review and triage
4. **Knowledge RAG** - Search past decisions and code

## 🔧 Configuration

Create `.env` files in each package:

```env
# packages/api/.env
DATABASE_URL=postgresql://permitai:permitai123@localhost:5432/permitai
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# packages/ai/.env
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key
PINECONE_API_KEY=your-key
OLLAMA_HOST=http://localhost:11434
```

## 🚦 Development Workflow

```bash
# Run specific app
npm run dev --workspace=apps/web

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

## 🐳 Docker Services

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Ollama: `localhost:11434`
- MinIO (S3): `localhost:9000`

## 📝 License

MIT