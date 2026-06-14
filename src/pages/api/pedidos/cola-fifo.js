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

  // PATCH - Actualizar estado o datos de facturación de un pedido
  if (req.method === 'PATCH') {
    try {
      const { id_pedido, estado_pedido, estado_pago, codigo_control, nit_emisor, numero_factura, qr_factura, leyenda_factura } = req.body;

      if (!id_pedido) {
        return res.status(400).json({ error: 'Se requiere id_pedido.' });
      }

      // Validar estado si viene
      const validEstados = ['Espera Validación', 'Pendiente', 'En Preparación', 'Listo', 'Entregado', 'Cancelado'];
      if (estado_pedido && !validEstados.includes(estado_pedido)) {
        return res.status(400).json({
          error: `estado_pedido debe ser uno de: ${validEstados.join(', ')}`
        });
      }

      // Construcción dinámica de la query
      const updateFields = [];
      const params = [];
      let paramCount = 1;

      if (estado_pedido !== undefined) {
        updateFields.push(`estado_pedido = $${paramCount++}`);
        params.push(estado_pedido);
      }
      if (estado_pago !== undefined) {
        updateFields.push(`estado_pago = $${paramCount++}`);
        params.push(estado_pago);
      }
      if (codigo_control !== undefined) {
        updateFields.push(`codigo_control = $${paramCount++}`);
        params.push(codigo_control);
      }
      if (nit_emisor !== undefined) {
        updateFields.push(`nit_emisor = $${paramCount++}`);
        params.push(nit_emisor);
      }
      if (numero_factura !== undefined) {
        updateFields.push(`numero_factura = $${paramCount++}`);
        params.push(numero_factura);
      }
      if (qr_factura !== undefined) {
        updateFields.push(`qr_factura = $${paramCount++}`);
        params.push(qr_factura);
      }
      if (leyenda_factura !== undefined) {
        updateFields.push(`leyenda_factura = $${paramCount++}`);
        params.push(leyenda_factura);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No se enviaron campos para actualizar.' });
      }

      params.push(id_pedido);
      const queryStr = `UPDATE pedidos SET ${updateFields.join(', ')} WHERE id_pedido = $${paramCount} RETURNING *`;

      const result = await query(queryStr, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: `Pedido #${id_pedido} actualizado exitosamente.`,
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
