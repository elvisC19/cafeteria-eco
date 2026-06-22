const { query } = require('../src/lib/db');

async function migrate() {
  try {
    const envPath = require('path').join(__dirname, '../.env.local');
    if (require('fs').existsSync(envPath)) {
      const envContent = require('fs').readFileSync(envPath, 'utf8');
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
    }

    console.log('=== RECETAS ANTES DE LA MIGRACIÓN ===');
    const recetasAntes = await query(`
      SELECT r.id_producto, p.nombre_producto, r.id_insumo, i.nombre_insumo, r.cantidad_requerida, i.unidad_medida, i.costo_unitario
      FROM recetas r
      JOIN productos p ON p.id_producto = r.id_producto
      JOIN insumos i ON i.id_insumo = r.id_insumo
      ORDER BY p.nombre_producto, i.nombre_insumo
    `);
    console.table(recetasAntes.rows);

    console.log('⚡ Ejecutando actualización en recetas (cantidad_requerida / 1000 para kilos y litros)...');
    const updateResult = await query(`
      UPDATE recetas r
      SET cantidad_requerida = r.cantidad_requerida / 1000.0
      FROM insumos i
      WHERE r.id_insumo = i.id_insumo
        AND i.unidad_medida IN ('kilos', 'litros')
      RETURNING r.id_producto, r.id_insumo, r.cantidad_requerida AS nueva_cantidad;
    `);
    console.log(`✅ Se actualizaron ${updateResult.rowCount} registros de recetas.`);

    console.log('=== RECETAS DESPUÉS DE LA MIGRACIÓN ===');
    const recetasDespues = await query(`
      SELECT r.id_producto, p.nombre_producto, r.id_insumo, i.nombre_insumo, r.cantidad_requerida, i.unidad_medida, i.costo_unitario,
             (r.cantidad_requerida * i.costo_unitario) AS costo_por_ingrediente
      FROM recetas r
      JOIN productos p ON p.id_producto = r.id_producto
      JOIN insumos i ON i.id_insumo = r.id_insumo
      ORDER BY p.nombre_producto, i.nombre_insumo
    `);
    console.table(recetasDespues.rows);

  } catch (err) {
    console.error('❌ Error durante la migración de recetas:', err);
  }
}

migrate();
