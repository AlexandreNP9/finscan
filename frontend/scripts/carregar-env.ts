// Importado antes de tudo nos scripts: o Next carrega o .env sozinho, mas tsx não.
import fs from 'node:fs';

if (fs.existsSync('.env')) process.loadEnvFile('.env');
