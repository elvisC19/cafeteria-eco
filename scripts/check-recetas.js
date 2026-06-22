const { query } = require('../src/lib/db');

async function check() {
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

    console.log('--- INSUMOS ---');
    const insumos = await query('SELECT id_insumo, nombre_insumo, unidad_medida, costo_unitario, stock_actual FROM insumos ORDER BY id_insumo LIMIT 10');
    console.table(insumos.rows);

    console.log('--- RECETAS EJEMPLO ---');
    const recetas = await query(`
      SELECT r.id_producto, p.nombre_producto, r.id_insumo, i.nombre_insumo, r.cantidad_requerida, i.unidad_medida, i.costo_unitario
      FROM recetas r
      JOIN productos p ON p.id_producto = r.id_producto
      JOIN insumos i ON i.id_insumo = r.id_insumo
      ORDER BY p.nombre_producto
      LIMIT 10
    `);
    console.table(recetas.rows);

  } catch (err) {
    console.error(err);
  }
}

check();
