// ============================================================================
// API: GET /api/pedidos/cola-fifo
// Cola FIFO de pedidos pendientes ordenados por antigüedad cronológica
// Para pantalla de Barismo y Cocina
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { estado } = req.query;
      
      let whereClause = "p.estado_pedido IN ('Pendiente', 'En Preparación')";
      const params = [];

      if (estado) {
        whereClause = "p.estado_pedido = $1";
        params.push(estado);
      }

      const result = await query(
        `SELECT 
          p.id_pedido,
          p.tipo_servicio,
          p.estado_pedido,
          p.fecha_hora,
          p.id_mesa,
          m.numero_mesa,
          u.nombre AS atendido_por,
          EXTRACT(EPOCH FROM (NOW() - p.fecha_hora))::INT AS segundos_espera,
          json_agg(
            json_build_object(
              'nombre_producto', pr.nombre_producto,
              'cantidad', dp.cantidad,
              'observaciones', dp.observaciones,
              'categoria', pr.categoria
            ) ORDER BY pr.categoria, pr.nombre_producto
          ) AS items
        FROM pedidos p
        LEFT JOIN mesas m ON m.id_mesa = p.id_mesa
        LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
        JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
        JOIN productos pr ON pr.id_producto = dp.id_producto
        WHERE ${whereClause}
        GROUP BY p.id_pedido, p.tipo_servicio, p.estado_pedido, p.fecha_hora, 
                 p.id_mesa, m.numero_mesa, u.nombre
        ORDER BY p.fecha_hora ASC`,
        params
      );

      return res.status(200).json({
        success: true,
        cola: result.rows,
        total_en_cola: result.rows.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Cola FIFO Error]:', error);
      return res.status(500).json({
        error: 'Error al obtener la cola de pedidos.',
        detalle: error.message
      });
    }
  }

  // PATCH - Actualizar estado de un pedido en la cola
  if (req.method === 'PATCH') {
    try {
      const { id_pedido, estado_pedido } = req.body;

      if (!id_pedido || !estado_pedido) {
        return res.status(400).json({ error: 'Se requieren id_pedido y estado_pedido.' });
      }

      const validEstados = ['Pendiente', 'En Preparación', 'Listo', 'Entregado', 'Cancelado'];
      if (!validEstados.includes(estado_pedido)) {
        return res.status(400).json({
          error: `estado_pedido debe ser uno de: ${validEstados.join(', ')}`
        });
      }

      const result = await query(
        `UPDATE pedidos SET estado_pedido = $1 WHERE id_pedido = $2 RETURNING *`,
        [estado_pedido, id_pedido]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: `Pedido #${id_pedido} actualizado a "${estado_pedido}".`,
        pedido: result.rows[0]
      });

    } catch (error) {
      console.error('[PATCH Cola Error]:', error);
      return res.status(500).json({
        error: 'Error al actualizar el pedido.',
        detalle: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
