// ============================================================================
// API: GET /api/analitica/equilibrio
// Punto de Equilibrio Operacional de Charcas Capital
// Fórmula: PE = Gastos Fijos Totales / Margen de Contribución Promedio Ponderado
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido. Use GET.' });

  try {
    // 1. Asegurar que la tabla gastos_fijos exista y tenga datos seed
    await query(`
      CREATE TABLE IF NOT EXISTS gastos_fijos (
        id_gasto SERIAL PRIMARY KEY,
        nombre_gasto VARCHAR(100) NOT NULL UNIQUE,
        monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
        categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Alquiler', 'Sueldos', 'Servicios Básicos', 'Otros'))
      );
    `, []);

    await query(`
      INSERT INTO gastos_fijos (nombre_gasto, monto, categoria) VALUES
      ('Alquiler de Local Comercial', 4200.00, 'Alquiler'),
      ('Planilla de Sueldos de Personal', 16800.00, 'Sueldos'),
      ('Consolidado Servicios Básicos (Luz/Agua/Gas/Net)', 2350.00, 'Servicios Básicos')
      ON CONFLICT (nombre_gasto) DO NOTHING;
    `, []);

    // 2. Sumar el total de gastos fijos
    const gastosResult = await query(
      `SELECT 
         COALESCE(SUM(monto), 0) AS total_gastos_fijos,
         json_agg(json_build_object(
           'id_gasto', id_gasto,
           'nombre_gasto', nombre_gasto,
           'monto', monto,
           'categoria', categoria
         ) ORDER BY monto DESC) AS detalle_gastos
       FROM gastos_fijos`,
      []
    );

    const totalGastosFijos = parseFloat(gastosResult.rows[0].total_gastos_fijos);
    const detalleGastos = gastosResult.rows[0].detalle_gastos || [];

    // 3. Calcular el Margen de Contribución Real Ponderado del mes actual
    // Se calcula con datos de ventas reales: para cada producto vendido,
    // ponderamos su margen por la cantidad vendida.
    const margenResult = await query(
      `SELECT
         COALESCE(
           SUM(
             dp.cantidad * (p.precio_venta - COALESCE(
               (SELECT SUM(r.cantidad_requerida * i.costo_unitario)
                FROM recetas r
                JOIN insumos i ON i.id_insumo = r.id_insumo
                WHERE r.id_producto = p.id_producto), 0
             ))
           ) / NULLIF(SUM(dp.cantidad * p.precio_venta), 0) * 100
         , 0) AS margen_contribucion_ponderado,
         COALESCE(SUM(dp.cantidad), 0) AS total_unidades_vendidas
       FROM detalle_pedido dp
       JOIN productos p ON p.id_producto = dp.id_producto
       JOIN pedidos pe ON pe.id_pedido = dp.id_pedido
       WHERE pe.estado_pago = 'Pagado'
         AND pe.fecha_hora >= date_trunc('month', NOW() AT TIME ZONE 'America/La_Paz')`,
      []
    );

    const margenPonderado = parseFloat(margenResult.rows[0].margen_contribucion_ponderado || 0);
    const totalUnidadesVendidas = parseInt(margenResult.rows[0].total_unidades_vendidas || 0);

    // 4. Calcular el Punto de Equilibrio en BOB
    // PE = Gastos Fijos / (Margen Ponderado / 100)
    const puntoEquilibrioBob = margenPonderado > 0
      ? parseFloat((totalGastosFijos / (margenPonderado / 100)).toFixed(2))
      : 0;

    // 5. Obtener ventas actuales del mes en curso (solo pagadas)
    const ventasResult = await query(
      `SELECT COALESCE(SUM(total_pago), 0) AS ventas_mes
       FROM pedidos
       WHERE estado_pago = 'Pagado'
         AND fecha_hora >= date_trunc('month', NOW() AT TIME ZONE 'America/La_Paz')`,
      []
    );

    const ventasActualesMes = parseFloat(ventasResult.rows[0].ventas_mes);

    // 6. Porcentaje de cobertura: (Ventas Actuales / Punto de Equilibrio) * 100
    const porcentajeCobertura = puntoEquilibrioBob > 0
      ? parseFloat(((ventasActualesMes / puntoEquilibrioBob) * 100).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      gastos_fijos_totales: totalGastosFijos,
      detalle_gastos: detalleGastos,
      margen_contribucion_ponderado: parseFloat(margenPonderado.toFixed(2)),
      total_unidades_vendidas: totalUnidadesVendidas,
      punto_equilibrio_bob: puntoEquilibrioBob,
      ventas_actuales_mes: ventasActualesMes,
      porcentaje_cobertura: porcentajeCobertura
    });

  } catch (error) {
    console.error('[Punto Equilibrio Error]:', error);
    return res.status(500).json({
      error: 'Error al calcular el punto de equilibrio.',
      detalle: error.message
    });
  }
}
