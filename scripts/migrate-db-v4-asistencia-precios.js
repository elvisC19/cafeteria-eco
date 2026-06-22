// ============================================================================
// CHARCAS CAPITAL - Script de Migración v4: Asistencia Multi-Turno + Precios
// - Permite múltiples turnos por día en asistencia
// - Agrega costo_unitario a insumos
// - Crea tabla de alertas de inventario
// - Trigger de alertas automáticas al descuento de stock
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('🚀 Iniciando migración v4 — Asistencia Multi-Turno + Precios de Insumos...');

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
  // ================================================================
  // 1. ASISTENCIA: Permitir múltiples turnos por día
  // Eliminar la restricción UNIQUE (id_usuario, fecha) si existe
  // ================================================================
  `DO $$
  BEGIN
    -- Buscar y eliminar cualquier constraint UNIQUE que involucre (id_usuario, fecha)
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'registro_asistencia'::regclass 
        AND contype = 'u'
    ) THEN
      EXECUTE (
        SELECT 'ALTER TABLE registro_asistencia DROP CONSTRAINT ' || conname
        FROM pg_constraint
        WHERE conrelid = 'registro_asistencia'::regclass
          AND contype = 'u'
        LIMIT 1
      );
      RAISE NOTICE 'Constraint UNIQUE eliminada de registro_asistencia';
    END IF;
  END $$;`,

  // ================================================================
  // 2. INSUMOS: Agregar columna costo_unitario si no existe
  // ================================================================
  `ALTER TABLE insumos ADD COLUMN IF NOT EXISTS costo_unitario DECIMAL(10,2) DEFAULT 0;`,

  // Semilla de precios unitarios estimados para insumos existentes (BOB por unidad de medida)
  `UPDATE insumos SET costo_unitario = CASE nombre_insumo
    WHEN 'Café molido arábica' THEN 0.12
    WHEN 'Leche entera' THEN 0.008
    WHEN 'Leche deslactosada' THEN 0.012
    WHEN 'Azúcar blanca' THEN 0.008
    WHEN 'Chocolate en polvo' THEN 0.06
    WHEN 'Crema de leche' THEN 0.02
    WHEN 'Canela en polvo' THEN 0.15
    WHEN 'Vainilla líquida' THEN 0.08
    WHEN 'Harina de trigo' THEN 0.006
    WHEN 'Mantequilla' THEN 0.025
    WHEN 'Huevos' THEN 1.50
    WHEN 'Levadura' THEN 0.04
    WHEN 'Mermelada de fresa' THEN 0.03
    WHEN 'Queso crema' THEN 0.035
    WHEN 'Pan de molde' THEN 2.00
    WHEN 'Jamón' THEN 0.06
    WHEN 'Té negro' THEN 0.08
    WHEN 'Manzanilla seca' THEN 0.06
    WHEN 'Hielo' THEN 0.002
    WHEN 'Jarabe de goma' THEN 0.04
    ELSE costo_unitario
  END
  WHERE costo_unitario = 0 OR costo_unitario IS NULL;`,

  // ================================================================
  // 3. ALERTAS DE INVENTARIO: Crear tabla
  // ================================================================
  `CREATE TABLE IF NOT EXISTS alertas_inventario (
    id_alerta    SERIAL PRIMARY KEY,
    id_insumo    INT NOT NULL REFERENCES insumos(id_insumo) ON DELETE CASCADE,
    tipo         VARCHAR(20) NOT NULL CHECK (tipo IN ('BAJO', 'CRITICO', 'AGOTADO')),
    mensaje      TEXT,
    leida        BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  `CREATE INDEX IF NOT EXISTS idx_alertas_no_leidas ON alertas_inventario(leida) WHERE leida = FALSE;`,

  // ================================================================
  // 4. TRIGGER: Generar alertas automáticas tras descuento de inventario
  // Actualizar la función existente para también crear alertas
  // ================================================================
  `CREATE OR REPLACE FUNCTION procesar_descuento_inventario()
  RETURNS TRIGGER AS $$
  DECLARE
      item           RECORD;
      ingrediente    RECORD;
      stock_disponible DECIMAL(10,2);
      check_insumo   RECORD;
  BEGIN
      -- Solo ejecutar cuando el pedido pasa a estado 'Entregado'
      IF NEW.estado_pedido = 'Entregado' AND OLD.estado_pedido != 'Entregado' THEN

          -- ================================================================
          -- FASE 1: Validación preventiva de stock suficiente
          -- ================================================================
          FOR item IN
              SELECT dp.id_producto, dp.cantidad, p.nombre_producto
              FROM detalle_pedido dp
              JOIN productos p ON p.id_producto = dp.id_producto
              WHERE dp.id_pedido = NEW.id_pedido
          LOOP
              FOR ingrediente IN
                  SELECT r.id_insumo, r.cantidad_requerida, i.nombre_insumo, i.stock_actual
                  FROM recetas r
                  JOIN insumos i ON i.id_insumo = r.id_insumo
                  WHERE r.id_producto = item.id_producto
              LOOP
                  stock_disponible := ingrediente.stock_actual - (ingrediente.cantidad_requerida * item.cantidad);

                  IF stock_disponible < 0 THEN
                      RAISE EXCEPTION 'Stock insuficiente para el insumo "%" (disponible: %, requerido: %) al preparar el producto "%".',
                          ingrediente.nombre_insumo,
                          ingrediente.stock_actual,
                          (ingrediente.cantidad_requerida * item.cantidad),
                          item.nombre_producto;
                  END IF;
              END LOOP;
          END LOOP;

          -- ================================================================
          -- FASE 2: Descuento efectivo de inventario
          -- ================================================================
          FOR item IN
              SELECT dp.id_producto, dp.cantidad
              FROM detalle_pedido dp
              WHERE dp.id_pedido = NEW.id_pedido
          LOOP
              FOR ingrediente IN
                  SELECT r.id_insumo, r.cantidad_requerida
                  FROM recetas r
                  WHERE r.id_producto = item.id_producto
              LOOP
                  UPDATE insumos
                  SET stock_actual = stock_actual - (ingrediente.cantidad_requerida * item.cantidad)
                  WHERE id_insumo = ingrediente.id_insumo;
              END LOOP;
          END LOOP;

          -- ================================================================
          -- FASE 3: Generar alertas de inventario si stock está bajo
          -- ================================================================
          FOR check_insumo IN
              SELECT DISTINCT i.id_insumo, i.nombre_insumo, i.stock_actual, i.stock_minimo
              FROM detalle_pedido dp
              JOIN recetas r ON r.id_producto = dp.id_producto
              JOIN insumos i ON i.id_insumo = r.id_insumo
              WHERE dp.id_pedido = NEW.id_pedido
                AND i.stock_actual <= i.stock_minimo
          LOOP
              -- Evitar alertas duplicadas recientes (últimas 24h para el mismo insumo y tipo)
              IF NOT EXISTS (
                  SELECT 1 FROM alertas_inventario
                  WHERE id_insumo = check_insumo.id_insumo
                    AND leida = FALSE
                    AND created_at > NOW() - INTERVAL '24 hours'
              ) THEN
                  INSERT INTO alertas_inventario (id_insumo, tipo, mensaje)
                  VALUES (
                      check_insumo.id_insumo,
                      CASE
                          WHEN check_insumo.stock_actual <= 0 THEN 'AGOTADO'
                          WHEN check_insumo.stock_actual <= check_insumo.stock_minimo THEN 'CRITICO'
                          ELSE 'BAJO'
                      END,
                      'El insumo "' || check_insumo.nombre_insumo || '" tiene stock en ' ||
                      check_insumo.stock_actual || ' unidades (mínimo: ' || check_insumo.stock_minimo || '). ' ||
                      'Requiere validación física en almacén y posible reabastecimiento.'
                  );
              END IF;
          END LOOP;

          -- ================================================================
          -- FASE 4: Liberar mesa asociada (si aplica)
          -- ================================================================
          IF NEW.id_mesa IS NOT NULL THEN
              UPDATE mesas
              SET estado = 'Disponible'
              WHERE id_mesa = NEW.id_mesa;
          END IF;

      END IF;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;`
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

    console.log('⚡ Ejecutando queries de migración v4...');
    for (let i = 0; i < queries.length; i++) {
      await client.query(queries[i]);
      console.log(`  [${i + 1}/${queries.length}] ✅ OK`);
    }
    console.log('\n================================================================');
    console.log('🎉 MIGRACIÓN v4 COMPLETADA');
    console.log('  - Asistencia multi-turno habilitada');
    console.log('  - Precios (costo_unitario) agregados a insumos');
    console.log('  - Tabla alertas_inventario creada');
    console.log('  - Trigger de alertas automáticas actualizado');
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Error durante la migración v4:');
    console.error(error.message);
    if (error.detail) console.error(`Detalle: ${error.detail}`);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada.');
  }
}

runMigration();
