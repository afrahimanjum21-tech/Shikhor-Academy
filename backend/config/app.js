import dotenv from 'dotenv';
dotenv.config();

export default {
  name: process.env.APP_NAME || 'Shikhor Academy',
  port: parseInt(process.env.APP_PORT || '8000', 10),
  env: process.env.APP_ENV || 'production',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL || 'http://localhost:8000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
};
