// ============================================================================
// CHARCAS CAPITAL - Database Connection Pool
// Configurado para Supabase Connection Pooler (Puerto 6543 - Modo Transacción)
// ============================================================================
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[DB Pool] Error inesperado en cliente inactivo:', err);
    });
  }
  return pool;
}

/**
 * Ejecuta una consulta SQL con parámetros.
 * @param {string} text - Query SQL parametrizada
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Ejecuta múltiples operaciones dentro de una transacción atómica.
 * @param {function} callback - Función que recibe el client y ejecuta queries
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { query, transaction, getPool };
