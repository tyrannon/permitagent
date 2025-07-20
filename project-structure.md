# PermitAI Project Structure

```
permitai/
├── apps/
│   ├── web/                    # Public-facing web app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── staff-portal/           # Electron app for city staff
│   │   ├── src/
│   │   │   ├── main/
│   │   │   ├── renderer/
│   │   │   └── preload/
│   │   └── package.json
│   │
│   └── mobile/                 # React Native app
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── api/                    # Core API server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── core/                   # Shared business logic
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   ├── use-cases/
│   │   │   └── types/
│   │   └── package.json
│   │
│   ├── ai/                     # AI services
│   │   ├── src/
│   │   │   ├── llm/
│   │   │   ├── vision/
│   │   │   ├── embeddings/
│   │   │   └── pipelines/
│   │   └── package.json
│   │
│   ├── document-processor/     # Document handling
│   │   ├── src/
│   │   │   ├── ocr/
│   │   │   ├── parsers/
│   │   │   └── extractors/
│   │   └── package.json
│   │
│   └── shared/                 # Shared utilities
│       ├── src/
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   ├── k8s/
│   └── terraform/
│
├── scripts/
├── docs/
├── .github/
├── docker-compose.yml
├── turbo.json                  # Turborepo config
├── package.json
└── README.md
```