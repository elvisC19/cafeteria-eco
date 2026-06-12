// ============================================================================
// API: GET/PATCH /api/mesas/status
// Control y actualización de estados de ocupación del salón
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Obtener estado de todas las mesas
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT m.*,
          (SELECT json_build_object(
            'id_pedido', p.id_pedido,
            'estado_pedido', p.estado_pedido,
            'total_pago', p.total_pago,
            'estado_pago', p.estado_pago,
            'fecha_hora', p.fecha_hora
          )
          FROM pedidos p
          WHERE p.id_mesa = m.id_mesa 
            AND p.estado_pedido NOT IN ('Entregado', 'Cancelado')
          ORDER BY p.fecha_hora DESC LIMIT 1
          ) AS pedido_activo
        FROM mesas m
        ORDER BY m.numero_mesa ASC`,
        []
      );

      const resumen = {
        disponibles: result.rows.filter(m => m.estado === 'Disponible').length,
        ocupadas: result.rows.filter(m => m.estado === 'Ocupada').length,
        reservadas: result.rows.filter(m => m.estado === 'Reservada').length,
        inactivas: result.rows.filter(m => m.estado === 'Inactiva').length,
        total: result.rows.length
      };

      return res.status(200).json({
        success: true,
        mesas: result.rows,
        resumen
      });

    } catch (error) {
      console.error('[GET Mesas Error]:', error);
      return res.status(500).json({
        error: 'Error al obtener el estado de las mesas.',
        detalle: error.message
      });
    }
  }

  // PATCH - Actualizar estado de una mesa
  if (req.method === 'PATCH') {
    try {
      const { id_mesa, estado } = req.body;

      if (!id_mesa || !estado) {
        return res.status(400).json({ error: 'Se requieren id_mesa y estado.' });
      }

      const validEstados = ['Disponible', 'Ocupada', 'Reservada', 'Inactiva'];
      if (!validEstados.includes(estado)) {
        return res.status(400).json({
          error: `Estado debe ser uno de: ${validEstados.join(', ')}`
        });
      }

      const result = await query(
        'UPDATE mesas SET estado = $1 WHERE id_mesa = $2 RETURNING *',
        [estado, id_mesa]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Mesa no encontrada.' });
      }

      return res.status(200).json({
        success: true,
        message: `Mesa #${result.rows[0].numero_mesa} actualizada a "${estado}".`,
        mesa: result.rows[0]
      });

    } catch (error) {
      console.error('[PATCH Mesa Error]:', error);
      return res.status(500).json({
        error: 'Error al actualizar la mesa.',
        detalle: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
