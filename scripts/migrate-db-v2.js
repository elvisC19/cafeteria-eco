// ============================================================================
// CHARCAS CAPITAL - Script de Migración de Base de Datos v2
// Adición de campos para imágenes, clientes y facturas legal SIN de Bolivia
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('🚀 Iniciando migración de base de datos para Charcas Capital...');

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
  // 1. Adición de imagen_url en productos
  `ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;`,

  // 2. Modificación del constraint en pedidos.estado_pedido
  // Primero intentamos borrar la restricción habitual
  `ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_pedido_check;`,
  `ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_pedido_check 
   CHECK (estado_pedido IN ('Espera Validación', 'Pendiente', 'En Preparación', 'Listo', 'Entregado', 'Cancelado'));`,

  // 3. Adición de datos de contacto del cliente en pedidos
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(150);`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(30);`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS hora_recojo VARCHAR(50);`,

  // 4. Adición de datos legales de facturación SIN en pedidos
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nit_factura VARCHAR(30);`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS razon_social_factura VARCHAR(150);`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS codigo_control VARCHAR(50);`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nit_emisor VARCHAR(30);`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(30);`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS qr_factura TEXT;`,
  `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS leyenda_factura TEXT;`,

  // 5. Semilla de URLs de imágenes estéticas de Unsplash para los productos por defecto
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500' WHERE nombre_producto = 'Café Americano';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500' WHERE nombre_producto = 'Cappuccino Clásico';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500' WHERE nombre_producto = 'Latte Vainilla';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500' WHERE nombre_producto = 'Mochaccino';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500' WHERE nombre_producto = 'Chocolate Caliente';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500' WHERE nombre_producto = 'Té Negro con Limón';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=500' WHERE nombre_producto = 'Infusión de Manzanilla';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500' WHERE nombre_producto = 'Café Helado';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500' WHERE nombre_producto = 'Frappuccino Mokka';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500' WHERE nombre_producto = 'Limonada del Valle';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500' WHERE nombre_producto = 'Croissant de Mantequilla';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500' WHERE nombre_producto = 'Torta de Chocolate';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500' WHERE nombre_producto = 'Cheesecake de Fresa';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500' WHERE nombre_producto = 'Empanada de Queso';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500' WHERE nombre_producto = 'Desayuno Continental';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1584776296976-f15956578982?w=500' WHERE nombre_producto = 'Tostadas con Mermelada';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=500' WHERE nombre_producto = 'Sandwich Mixto';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=500' WHERE nombre_producto = 'Merienda Clásica';`,
  `UPDATE productos SET imagen_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500' WHERE nombre_producto = 'Té con Masitas';`
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

    console.log('⚡ Ejecutando queries de migración...');
    for (let i = 0; i < queries.length; i++) {
      await client.query(queries[i]);
      process.stdout.write(`  [${i + 1}/${queries.length}] OK\r`);
    }
    console.log('\n================================================================');
    console.log('🎉 MIGRACIÓN COMPLETADA CON ÉXITO PARA CHARCAS CAPITAL');
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Error durante la migración:');
    console.error(error.message);
    if (error.detail) console.error(`Detalle: ${error.detail}`);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada.');
  }
}

runMigration();
