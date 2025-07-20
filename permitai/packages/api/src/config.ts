export const config = {
  port: process.env['PORT'] || 3000,
  nodeEnv: process.env['NODE_ENV'] || 'development',
  jwtSecret: process.env['JWT_SECRET'] || 'development-secret',
  databaseUrl: process.env['DATABASE_URL'] || 'postgresql://localhost:5432/permitai'
};