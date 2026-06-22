// ============================================================================
// API: GET/PATCH /api/alertas
// Gestión de alertas de inventario generadas automáticamente
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Listar alertas (por defecto solo no leídas)
  if (req.method === 'GET') {
    try {
      const { todas } = req.query;
      const whereClause = todas === 'true' ? '' : 'WHERE a.leida = FALSE';

      const result = await query(
        `SELECT a.*, i.nombre_insumo, i.stock_actual, i.stock_minimo, i.unidad_medida
         FROM alertas_inventario a
         JOIN insumos i ON i.id_insumo = a.id_insumo
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT 50`,
        []
      );

      return res.status(200).json({
        success: true,
        alertas: result.rows,
        total_no_leidas: result.rows.filter(a => !a.leida).length
      });

    } catch (error) {
      console.error('[GET Alertas Error]:', error);
      return res.status(500).json({ error: 'Error al obtener alertas.', detalle: error.message });
    }
  }

  // PATCH - Marcar alertas como leídas
  if (req.method === 'PATCH') {
    try {
      const { id_alerta, marcar_todas } = req.body;

      if (marcar_todas) {
        await query(`UPDATE alertas_inventario SET leida = TRUE WHERE leida = FALSE`, []);
        return res.status(200).json({
          success: true,
          message: 'Todas las alertas marcadas como leídas.'
        });
      }

      if (!id_alerta) {
        return res.status(400).json({ error: 'Se requiere id_alerta o marcar_todas: true.' });
      }

      const result = await query(
        `UPDATE alertas_inventario SET leida = TRUE WHERE id_alerta = $1 RETURNING *`,
        [id_alerta]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Alerta no encontrada.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Alerta marcada como leída.',
        alerta: result.rows[0]
      });

    } catch (error) {
      console.error('[PATCH Alertas Error]:', error);
      return res.status(500).json({ error: 'Error al actualizar alerta.', detalle: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
