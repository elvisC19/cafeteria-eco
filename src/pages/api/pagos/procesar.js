// ============================================================================
// API: POST /api/pagos/procesar
// Administración de cierres de caja - Efectivo con cambio / QR interbancario
// ============================================================================
import { query, transaction } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  try {
    const { id_pedido, metodo_pago, monto_recibido } = req.body;

    if (!id_pedido || !metodo_pago) {
      return res.status(400).json({
        error: 'Campos requeridos: id_pedido, metodo_pago'
      });
    }

    const validMetodos = ['Efectivo', 'Pago QR Simple'];
    if (!validMetodos.includes(metodo_pago)) {
      return res.status(400).json({
        error: `metodo_pago debe ser: ${validMetodos.join(' o ')}`
      });
    }

    const resultado = await transaction(async (client) => {
      // Obtener pedido actual
      const pedidoResult = await client.query(
        'SELECT * FROM pedidos WHERE id_pedido = $1',
        [id_pedido]
      );

      if (pedidoResult.rows.length === 0) {
        throw new Error('Pedido no encontrado.');
      }

      const pedido = pedidoResult.rows[0];

      if (pedido.estado_pago === 'Pagado') {
        throw new Error('Este pedido ya fue pagado anteriormente.');
      }

      let datoPago = {};

      if (metodo_pago === 'Efectivo') {
        // Validar monto recibido
        const montoRecibido = parseFloat(monto_recibido);
        if (isNaN(montoRecibido) || montoRecibido <= 0) {
          throw new Error('Se requiere un monto_recibido válido para pago en efectivo.');
        }

        const totalPago = parseFloat(pedido.total_pago);
        if (montoRecibido < totalPago) {
          throw new Error(
            `Monto insuficiente. Total: Bs. ${totalPago.toFixed(2)}, Recibido: Bs. ${montoRecibido.toFixed(2)}`
          );
        }

        // Calcular cambio con precisión
        const cambio = parseFloat((montoRecibido - totalPago).toFixed(2));

        datoPago = {
          metodo: 'Efectivo',
          total: totalPago.toFixed(2),
          monto_recibido: montoRecibido.toFixed(2),
          cambio: cambio.toFixed(2)
        };

      } else if (metodo_pago === 'Pago QR Simple') {
        // Simular webhook de confirmación QR interbancario
        datoPago = {
          metodo: 'Pago QR Simple',
          total: parseFloat(pedido.total_pago).toFixed(2),
          referencia_qr: `QR-${Date.now()}-${id_pedido}`,
          banco_emisor: 'Banco Unión (Simulado)',
          confirmacion: 'APROBADA',
          timestamp_confirmacion: new Date().toISOString()
        };
      }

      // Actualizar pedido: marcar como pagado y actualizar estado
      await client.query(
        `UPDATE pedidos 
         SET metodo_pago = $1, 
             estado_pago = 'Pagado',
             estado_pedido = CASE 
               WHEN estado_pedido = 'Pendiente' THEN 'Pendiente'
               ELSE estado_pedido
             END
         WHERE id_pedido = $2`,
        [metodo_pago, id_pedido]
      );

      return {
        id_pedido,
        estado_pago: 'Pagado',
        ...datoPago
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Pago procesado exitosamente.',
      pago: resultado
    });

  } catch (error) {
    console.error('[Procesar Pago Error]:', error);
    return res.status(500).json({
      error: 'Error al procesar el pago.',
      detalle: error.message
    });
  }
}
