import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Reaproveita o pool entre recargas do `next dev` para não esgotar conexões.
const globalComPool = globalThis as unknown as { finscanPool?: Pool };

const pool = globalComPool.finscanPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') globalComPool.finscanPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
