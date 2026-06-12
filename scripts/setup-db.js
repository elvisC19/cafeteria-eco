// ============================================================================
// CHARCAS CAPITAL - Script de Configuración de Base de Datos
// USFX - Ingeniería Económica (IND210)
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('🚀 Iniciando configuración de base de datos para Charcas Capital...');

// 1. Cargar variables de entorno desde .env.local manualmente (para evitar dependencias extra)
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

if (!connectionString || connectionString.includes('[PROJECT_REF]')) {
  console.error('❌ Error: La variable DATABASE_URL no está configurada o contiene valores de plantilla.');
  console.error('Por favor, configure DATABASE_URL en su archivo .env.local antes de continuar.');
  process.exit(1);
}

// 2. Leer archivo DDL de migración
const sqlPath = path.join(__dirname, '../supabase/migrations/001_schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ Error: No se encontró el archivo de migración en: ${sqlPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');
console.log('📖 Archivo SQL 001_schema.sql leído correctamente.');

// 3. Conectarse y ejecutar
async function runSetup() {
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Conectando a Supabase / PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión establecida.');

    console.log('⚡ Ejecutando scripts SQL (Tablas, Índices, Triggers y Semillas)...');
    await client.query(sqlContent);
    
    console.log('\n================================================================');
    console.log('🎉 BASE DE DATOS CONFIGURADA CON ÉXITO PARA CHARCAS CAPITAL');
    console.log('================================================================');
    console.log('Las tablas usuarios, mesas, insumos, productos, recetas,');
    console.log('pedidos y detalle_pedido han sido creadas y pobladas.');
    console.log('Triggers de inventario activos.');
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Error durante la ejecución del DDL:');
    console.error(error.message);
    if (error.detail) console.error(`Detalle: ${error.detail}`);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada.');
  }
}

runSetup();
