// ============================================================================
// CHARCAS CAPITAL - Script de Migración v3: Módulo de Inteligencia Económica
// Tabla de control de egresos fijos operacionales (gastos_fijos)
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('🚀 Iniciando migración v3 — Módulo de Inteligencia Económica...');

// 1. Cargar variables de entorno desde .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        process.env[key] = value;
      }
    }
  });
  console.log('✅ Archivo .env.local cargado con éxito.');
} else {
  console.warn('⚠️ Advertencia: No se encontró el archivo .env.local.');
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: La variable DATABASE_URL no está configurada.');
  process.exit(1);
}

const queries = [
  // 1. Creación de tabla gastos_fijos
  `CREATE TABLE IF NOT EXISTS gastos_fijos (
      id_gasto SERIAL PRIMARY KEY,
      nombre_gasto VARCHAR(100) NOT NULL UNIQUE,
      monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
      categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Alquiler', 'Sueldos', 'Servicios Básicos', 'Otros'))
  );`,

  // 2. Semilla de datos iniciales de gastos fijos
  `INSERT INTO gastos_fijos (nombre_gasto, monto, categoria) VALUES
  ('Alquiler de Local Comercial', 4200.00, 'Alquiler'),
  ('Planilla de Sueldos de Personal', 16800.00, 'Sueldos'),
  ('Consolidado Servicios Básicos (Luz/Agua/Gas/Net)', 2350.00, 'Servicios Básicos')
  ON CONFLICT (nombre_gasto) DO NOTHING;`
];

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Conectando a Supabase / PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión establecida.');

    console.log('⚡ Ejecutando queries de migración v3...');
    for (let i = 0; i < queries.length; i++) {
      await client.query(queries[i]);
      console.log(`  [${i + 1}/${queries.length}] ✅ OK`);
    }
    console.log('\n================================================================');
    console.log('🎉 MIGRACIÓN v3 COMPLETADA — Tabla gastos_fijos creada');
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Error durante la migración v3:');
    console.error(error.message);
    if (error.detail) console.error(`Detalle: ${error.detail}`);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada.');
  }
}

runMigration();
