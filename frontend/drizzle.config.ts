import fs from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit não lê o .env sozinho (o Next lê); no Docker a variável vem do compose.
if (fs.existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
