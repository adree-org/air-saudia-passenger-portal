```javascript
'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  application_name: 'air_saudia_portal',
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🟢 New PostgreSQL connection established');
  }
});

/**
 * Execute a parameterised query against the pool.
 * @param {string} text - SQL query string with $1, $2 ... placeholders
 * @param {Array}  params - Query parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️  Slow query detected (${duration}ms): ${text.substring(0, 120)}`);
    }
    return result;
  } catch (err) {
    console.error('❌ Query error:', { text: text.substring(0, 120), error: err.message });
    throw err;
  }
}

/**
 * Get a dedicated client for transaction use.
 * Caller is responsible for calling client.release().
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Test database connectivity and log result.
 * @returns {Promise<void>}
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS now, current_database() AS db, version() AS pg_version');
    const { now, db, pg_version } = result.rows[0];
    console.log('✅ PostgreSQL connected successfully');
    console.log(`   Database : ${db}`);
    console.log(`   Server   : ${pg_version.split(',')[0]}`);
    console.log(`   Server time: ${now}`);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    throw err;
  }
}

module.exports = {
  query,
  getClient,
  pool,
  testConnection,
};
``