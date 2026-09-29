import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const value = await callback(client);
    await client.query('commit');
    return value;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
