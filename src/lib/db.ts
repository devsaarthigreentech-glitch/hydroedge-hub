// // ============================================================================
// // DATABASE CONNECTION - PostgreSQL Client
// // ============================================================================

// import { Pool } from 'pg';

// // Database configuration from environment variables
// const pool = new Pool({
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '5432'),
//   database: process.env.DB_NAME || 'gps_tracking',
//   user: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASSWORD,
//   max: 20, // Maximum pool size
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// });

// // Test connection
// pool.on('connect', () => {
//   console.log('✅ Connected to PostgreSQL database');
// });

// pool.on('error', (err) => {
//   console.error('❌ Unexpected database error:', err);
// });

// // Query helper function
// export async function query(text: string, params?: any[]) {
//   const start = Date.now();
//   try {
//     const res = await pool.query(text, params);
//     const duration = Date.now() - start;
//     console.log('Executed query', { text, duration, rows: res.rowCount });
//     return res;
//   } catch (error) {
//     console.error('Database query error:', error);
//     throw error;
//   }
// }

// // Get a client from the pool (for transactions)
// export async function getClient() {
//   const client = await pool.connect();
//   return client;
// }

// export default pool;
import { Pool } from 'pg';

// ① Singleton: store the pool on globalThis so hot-reload reuses it
const globalForPg = globalThis as unknown as { pgPool: Pool | undefined };

// ② Only create a new Pool if one doesn't already exist
const pool = globalForPg.pgPool ?? new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sgt_hydroedge',  // ③ fixed default
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,                    // ④ reduced: you don't need 20
  idleTimeoutMillis: 10000,   // ⑤ close idle connections after 10s
  connectionTimeoutMillis: 2000,
});

// ⑥ In development, save pool to globalThis so next hot-reload finds it
if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// ⑦ Removed verbose query logging for production
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function getClient() {
  return pool.connect();
}

export default pool;