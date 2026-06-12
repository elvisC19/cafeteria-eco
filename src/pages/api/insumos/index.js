// ============================================================================
// API: GET/PATCH/POST /api/insumos
// Gestión de inventario de insumos/materia prima
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Listar todos los insumos con alertas de stock
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT *,
          CASE 
            WHEN stock_actual <= stock_minimo THEN TRUE
            ELSE FALSE
          END AS alerta_stock,
          CASE
            WHEN stock_actual <= 0 THEN 'AGOTADO'
            WHEN stock_actual <= stock_minimo THEN 'CRITICO'
            WHEN stock_actual <= (stock_minimo * 1.5) THEN 'BAJO'
            ELSE 'NORMAL'
          END AS nivel_stock
        FROM insumos
        ORDER BY 
          CASE WHEN stock_actual <= stock_minimo THEN 0 ELSE 1 END,
          nombre_insumo`,
        []
      );

      const resumen = {
        total: result.rows.length,
        criticos: result.rows.filter(i => i.stock_actual <= i.stock_minimo).length,
        normales: result.rows.filter(i => i.stock_actual > i.stock_minimo).length
      };

      return res.status(200).json({ success: true, insumos: result.rows, resumen });

    } catch (error) {
      console.error('[GET Insumos Error]:', error);
      return res.status(500).json({ error: 'Error al obtener insumos.', detalle: error.message });
    }
  }

  // PATCH - Reabastecimiento aditivo de insumo
  if (req.method === 'PATCH') {
    try {
      const { id_insumo, cantidad_agregar } = req.body;

      if (!id_insumo || !cantidad_agregar) {
        return res.status(400).json({ error: 'Se requieren id_insumo y cantidad_agregar.' });
      }

      const cantidad = parseFloat(cantidad_agregar);
      if (isNaN(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: 'cantidad_agregar debe ser un número positivo.' });
      }

      const result = await query(
        `UPDATE insumos 
         SET stock_actual = stock_actual + $1
         WHERE id_insumo = $2
         RETURNING *`,
        [cantidad, id_insumo]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Insumo no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: `Se agregaron ${cantidad} ${result.rows[0].unidad_medida} a "${result.rows[0].nombre_insumo}".`,
        insumo: result.rows[0]
      });

    } catch (error) {
      console.error('[PATCH Insumo Error]:', error);
      return res.status(500).json({ error: 'Error al reabastecer.', detalle: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
