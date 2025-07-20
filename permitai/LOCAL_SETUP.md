# Local Development Setup

## Prerequisites

1. **Docker Desktop** - Required for PostgreSQL, Redis, MinIO
   - Download from: https://www.docker.com/products/docker-desktop/
   - After installing, start Docker Desktop

2. **Node.js 18+** - Already installed ✓

## Database Setup

### Option 1: With Docker (Recommended)
```bash
# Start all services
npm run docker:up

# Or start specific services
docker compose up -d postgres redis

# Check services are running
docker ps

# View logs
docker compose logs -f postgres
```

### Option 2: Without Docker (Local PostgreSQL)
If you have PostgreSQL installed locally:

1. Create database:
```bash
createdb permitai
```

2. Update .env file:
```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASS@localhost:5432/permitai
```

## Run Database Migrations

```bash
# Navigate to API package
cd packages/api

# Create initial migration
npx prisma migrate dev --name init

# This will:
# 1. Create all tables
# 2. Set up indexes
# 3. Generate Prisma Client
```

## Seed Database (Optional)

```bash
# Run seed script
npx prisma db seed
```

## Verify Setup

```bash
# Open Prisma Studio to view database
npx prisma studio

# This opens a GUI at http://localhost:5555
```

## Connection URLs

When Docker is running:
- PostgreSQL: `postgresql://permitai:permitai123@localhost:5432/permitai`
- Redis: `redis://localhost:6379`
- MinIO: `http://localhost:9000` (console: http://localhost:9001)

## Troubleshooting

### Port Conflicts
If you get "port already in use":
```bash
# Find what's using port 5432
lsof -i :5432

# Change port in docker-compose.yml:
ports:
  - "5433:5432"  # Use 5433 instead

# Update DATABASE_URL to use new port
```

### Connection Refused
- Make sure Docker Desktop is running
- Check `docker ps` to see if containers are up
- Try `docker compose restart postgres`

### Permission Errors
- Make sure your user has Docker permissions
- On Linux: `sudo usermod -aG docker $USER`

## Next Steps

1. Run migrations: `npx prisma migrate dev`
2. Start API server: `npm run dev`
3. Test endpoints: http://localhost:3000/health