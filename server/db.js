import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import pg from 'pg';
import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { DATA_DIR } from './config.js';

export async function openDatabase({ directory = path.join(DATA_DIR, 'postgres'), url = process.env.DATABASE_URL } = {}) {
  let db;
  let kind;
  if (url) {
    const parsed = new URL(url);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('DATABASE_URL must be PostgreSQL');
    const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
    parsed.searchParams.delete('sslmode');
    const ca = process.env.DATABASE_SSL_CA ? await readFile(process.env.DATABASE_SSL_CA, 'utf8') : undefined;
    const pool = new pg.Pool({ connectionString: parsed.toString(), ssl: isLocal ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 4, connectionTimeoutMillis: 12000 });
    db = { query: (sql, params) => pool.query(sql, params), exec: sql => pool.query(sql), close: () => pool.end(), transaction: async fn => {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    } };
    kind = /(?:timescale|tigerdata)\.(?:com|cloud)$/.test(parsed.hostname) ? 'tiger-cloud' : 'postgresql';
  } else {
    await mkdir(directory, { recursive: true });
    db = new PGlite(directory, { extensions: { vector } });
    kind = 'local-pglite';
  }
  await db.exec(`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
      merchant TEXT NOT NULL DEFAULT '', receipt_text TEXT NOT NULL,
      purchase_date DATE, warranty_end_date DATE,
      checked BOOLEAN NOT NULL DEFAULT FALSE, is_sample BOOLEAN NOT NULL DEFAULT FALSE,
      attachment_path TEXT, attachment_type TEXT, attachment_name TEXT,
      archived BOOLEAN NOT NULL DEFAULT FALSE, sort_order INTEGER NOT NULL DEFAULT 1000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chunks (
      id UUID PRIMARY KEY, document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL, embedding VECTOR(384) NOT NULL,
      search_vector TSVECTOR NOT NULL
    );
    CREATE INDEX IF NOT EXISTS chunks_document_idx ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS chunks_search_idx ON chunks USING GIN(search_vector);
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return { db, kind };
}
