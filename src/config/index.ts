// Application configuration
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  // Application metadata
  name: 'AppFactory',
  version: '1.0.0',

  // Database configuration (passed to pg pool)
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  // JWT authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
} as const;

// Validate required environment variables
const requiredEnvVars = ['NODE_ENV'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
