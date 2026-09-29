import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/aurora_market';
const pool = new pg.Pool({ connectionString });

await pool.query(sql);
await pool.end();
console.log('Database schema applied.');
