// ============================================================================
// API: GET /api/reportes/ingresos
// Métricas de ingresos para el panel de administración
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    // Ingresos del día actual
    const hoy = await query(
      `SELECT 
        COUNT(*) as total_pedidos,
        COALESCE(SUM(CASE WHEN estado_pago = 'Pagado' THEN total_pago ELSE 0 END), 0) as ingresos_pagados,
        COALESCE(SUM(total_pago), 0) as ingresos_totales,
        COALESCE(SUM(CASE WHEN metodo_pago = 'Efectivo' AND estado_pago = 'Pagado' THEN total_pago ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago = 'Pago QR Simple' AND estado_pago = 'Pagado' THEN total_pago ELSE 0 END), 0) as qr
      FROM pedidos
      WHERE DATE(fecha_hora AT TIME ZONE 'America/La_Paz') = DATE(NOW() AT TIME ZONE 'America/La_Paz')`,
      []
    );

    // Ingresos por día (últimos 7 días)
    const semanal = await query(
      `SELECT 
        DATE(fecha_hora AT TIME ZONE 'America/La_Paz') as fecha,
        COUNT(*) as pedidos,
        COALESCE(SUM(CASE WHEN estado_pago = 'Pagado' THEN total_pago ELSE 0 END), 0) as ingresos
      FROM pedidos
      WHERE fecha_hora >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(fecha_hora AT TIME ZONE 'America/La_Paz')
      ORDER BY fecha DESC`,
      []
    );

    // Top 5 productos más vendidos
    const topProductos = await query(
      `SELECT 
        p.nombre_producto,
        p.categoria,
        SUM(dp.cantidad) as total_vendido,
        SUM(dp.subtotal) as ingresos_generados
      FROM detalle_pedido dp
      JOIN productos p ON p.id_producto = dp.id_producto
      JOIN pedidos pe ON pe.id_pedido = dp.id_pedido
      WHERE pe.estado_pago = 'Pagado'
        AND pe.fecha_hora >= NOW() - INTERVAL '30 days'
      GROUP BY p.id_producto, p.nombre_producto, p.categoria
      ORDER BY total_vendido DESC
      LIMIT 5`,
      []
    );

    // Pedidos por estado
    const porEstado = await query(
      `SELECT estado_pedido, COUNT(*) as cantidad
       FROM pedidos
       WHERE DATE(fecha_hora AT TIME ZONE 'America/La_Paz') = DATE(NOW() AT TIME ZONE 'America/La_Paz')
       GROUP BY estado_pedido`,
      []
    );

    return res.status(200).json({
      success: true,
      metricas: {
        hoy: hoy.rows[0],
        semanal: semanal.rows,
        top_productos: topProductos.rows,
        por_estado: porEstado.rows
      }
    });

  } catch (error) {
    console.error('[Reportes Error]:', error);
    return res.status(500).json({ error: 'Error al generar reportes.', detalle: error.message });
  }
}
