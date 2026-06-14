// ============================================================================
// API: POST /api/pedidos
// Inserta cabecera + detalle de comanda en transacción atómica
// ============================================================================
import { transaction, query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT p.*, u.nombre as nombre_usuario, m.numero_mesa,
         json_agg(json_build_object(
           'id_detalle', dp.id_detalle,
           'id_producto', dp.id_producto,
           'nombre_producto', pr.nombre_producto,
           'cantidad', dp.cantidad,
           'subtotal', dp.subtotal,
           'observaciones', dp.observaciones
         )) as detalles
         FROM pedidos p
         LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
         LEFT JOIN mesas m ON m.id_mesa = p.id_mesa
         LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
         LEFT JOIN productos pr ON pr.id_producto = dp.id_producto
         GROUP BY p.id_pedido, u.nombre, m.numero_mesa
         ORDER BY p.fecha_hora DESC
         LIMIT 100`,
        []
      );
      return res.status(200).json({ success: true, pedidos: result.rows });
    } catch (error) {
      console.error('[GET Pedidos Error]:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos.', detalle: error.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  try {
    const { id_usuario, id_mesa, tipo_servicio, metodo_pago, items, cliente_nombre, cliente_telefono, nit_factura, razon_social_factura, hora_recojo } = req.body;

    // Validaciones
    if (!tipo_servicio || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Datos requeridos: tipo_servicio, items (array no vacío)'
      });
    }

    const validTipos = ['Comer en el Lugar', 'Para Llevar / Recoger'];
    if (!validTipos.includes(tipo_servicio)) {
      return res.status(400).json({
        error: `tipo_servicio debe ser uno de: ${validTipos.join(', ')}`
      });
    }

    // Si es "Comer en el Lugar", se requiere id_mesa
    if (tipo_servicio === 'Comer en el Lugar' && !id_mesa) {
      return res.status(400).json({
        error: 'Para "Comer en el Lugar" se requiere el número de mesa.'
      });
    }

    const resultado = await transaction(async (client) => {
      // Calcular total con precisión decimal
      let totalPago = 0;
      const detallesCalculados = [];

      for (const item of items) {
        const prodResult = await client.query(
          'SELECT id_producto, precio_venta, nombre_producto FROM productos WHERE id_producto = $1 AND disponible = TRUE',
          [item.id_producto]
        );

        if (prodResult.rows.length === 0) {
          throw new Error(`Producto con ID ${item.id_producto} no encontrado o no disponible.`);
        }

        const producto = prodResult.rows[0];
        const cantidad = parseInt(item.cantidad, 10);

        if (isNaN(cantidad) || cantidad <= 0) {
          throw new Error(`Cantidad inválida para ${producto.nombre_producto}.`);
        }

        // Cálculo con 2 decimales estrictos
        const subtotal = parseFloat((producto.precio_venta * cantidad).toFixed(2));
        totalPago = parseFloat((totalPago + subtotal).toFixed(2));

        detallesCalculados.push({
          id_producto: producto.id_producto,
          cantidad,
          subtotal,
          observaciones: item.observaciones || null
        });
      }

      // Si hay mesa asociada, marcarla como Ocupada
      let mesaId = null;
      if (tipo_servicio === 'Comer en el Lugar' && id_mesa) {
        const mesaResult = await client.query(
          'SELECT id_mesa, estado FROM mesas WHERE id_mesa = $1',
          [id_mesa]
        );
        if (mesaResult.rows.length === 0) {
          throw new Error('Mesa no encontrada.');
        }
        mesaId = id_mesa;
        await client.query(
          "UPDATE mesas SET estado = 'Ocupada' WHERE id_mesa = $1",
          [mesaId]
        );
      }

      // Insertar cabecera del pedido
      const estadoPedido = id_usuario ? 'Pendiente' : 'Espera Validación';
      const pedidoResult = await client.query(
        `INSERT INTO pedidos (id_usuario, id_mesa, tipo_servicio, metodo_pago, total_pago, estado_pedido, estado_pago, fecha_hora, cliente_nombre, cliente_telefono, nit_factura, razon_social_factura, hora_recojo)
         VALUES ($1, $2, $3, $4, $5, $6, 'No Pagado', NOW(), $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          id_usuario || null,
          mesaId,
          tipo_servicio,
          metodo_pago || null,
          totalPago,
          estadoPedido,
          cliente_nombre || null,
          cliente_telefono || null,
          nit_factura || null,
          razon_social_factura || null,
          hora_recojo || null
        ]
      );

      const pedido = pedidoResult.rows[0];

      // Insertar detalles del pedido
      for (const detalle of detallesCalculados) {
        await client.query(
          `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, subtotal, observaciones)
           VALUES ($1, $2, $3, $4, $5)`,
          [pedido.id_pedido, detalle.id_producto, detalle.cantidad, detalle.subtotal, detalle.observaciones]
        );
      }

      return { ...pedido, detalles: detallesCalculados };
    });

    return res.status(201).json({
      success: true,
      message: 'Pedido registrado exitosamente.',
      pedido: resultado
    });

  } catch (error) {
    console.error('[POST Pedido Error]:', error);
    return res.status(500).json({
      error: 'Error al registrar el pedido.',
      detalle: error.message
    });
  }
}
