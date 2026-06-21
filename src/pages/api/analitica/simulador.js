// ============================================================================
// API: POST /api/analitica/simulador
// Simulador de Incremento de Precios por Inflación de Insumos
// Calcula en memoria el impacto de un aumento porcentual en un insumo
// sobre los productos que lo utilizan (recetas), sin alterar la base de datos.
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido. Use POST.' });

  try {
    const { id_insumo, incremento_porcentual } = req.body;

    // Validaciones
    if (!id_insumo || incremento_porcentual === undefined || incremento_porcentual === null) {
      return res.status(400).json({
        error: 'Se requieren los campos id_insumo e incremento_porcentual.'
      });
    }

    const incremento = parseFloat(incremento_porcentual);
    if (isNaN(incremento) || incremento < 0 || incremento > 100) {
      return res.status(400).json({
        error: 'incremento_porcentual debe ser un número entre 0 y 100.'
      });
    }

    // 1. Obtener info del insumo seleccionado
    const insumoResult = await query(
      `SELECT id_insumo, nombre_insumo, costo_unitario, unidad_medida
       FROM insumos WHERE id_insumo = $1`,
      [id_insumo]
    );

    if (insumoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
    }

    const insumo = insumoResult.rows[0];
    const costoOriginal = parseFloat(insumo.costo_unitario);
    const costoNuevo = costoOriginal * (1 + incremento / 100);

    // 2. Obtener productos afectados mediante JOIN con recetas
    // Para cada producto que usa este insumo, calculamos:
    //   - El costo actual total de materia prima (sumando todos los insumos de su receta)
    //   - El nuevo costo total (ajustando solo el insumo seleccionado)
    const productosAfectados = await query(
      `SELECT 
         p.id_producto,
         p.nombre_producto,
         p.precio_venta,
         p.categoria,
         r.cantidad_requerida,
         -- Costo actual de este insumo en la receta
         (r.cantidad_requerida * i.costo_unitario) AS costo_insumo_actual,
         -- Costo total de materia prima del producto (todos los insumos)
         (SELECT COALESCE(SUM(r2.cantidad_requerida * i2.costo_unitario), 0)
          FROM recetas r2
          JOIN insumos i2 ON i2.id_insumo = r2.id_insumo
          WHERE r2.id_producto = p.id_producto) AS costo_mp_total_actual
       FROM recetas r
       JOIN productos p ON p.id_producto = r.id_producto
       JOIN insumos i ON i.id_insumo = r.id_insumo
       WHERE r.id_insumo = $1
       ORDER BY p.nombre_producto`,
      [id_insumo]
    );

    if (productosAfectados.rows.length === 0) {
      return res.status(200).json({
        success: true,
        insumo: {
          nombre: insumo.nombre_insumo,
          costo_original: costoOriginal,
          costo_nuevo: parseFloat(costoNuevo.toFixed(2)),
          incremento_porcentual: incremento
        },
        productos_afectados: [],
        mensaje: 'Este insumo no es utilizado en ninguna receta activa.'
      });
    }

    // 3. Calcular escenario "Antes vs Después" para cada producto
    const comparativa = productosAfectados.rows.map(prod => {
      const precioVenta = parseFloat(prod.precio_venta);
      const costoMPActual = parseFloat(prod.costo_mp_total_actual);
      const costoInsumoActual = parseFloat(prod.costo_insumo_actual);
      const cantidadNecesaria = parseFloat(prod.cantidad_requerida);

      // Nuevo costo del insumo en la receta = cantidad * nuevo costo unitario
      const costoInsumoNuevo = cantidadNecesaria * costoNuevo;

      // Nuevo costo total MP = Total actual - costo viejo del insumo + costo nuevo del insumo
      const costoMPNuevo = costoMPActual - costoInsumoActual + costoInsumoNuevo;

      // Márgenes
      const utilidadAntes = precioVenta - costoMPActual;
      const margenAntes = precioVenta > 0 ? (utilidadAntes / precioVenta) * 100 : 0;

      const utilidadDespues = precioVenta - costoMPNuevo;
      const margenDespues = precioVenta > 0 ? (utilidadDespues / precioVenta) * 100 : 0;

      // Precio sugerido para mantener el margen original
      // Fórmula: Precio Sugerido = Nuevo Costo / (1 - Margen Original / 100)
      const precioSugerido = margenAntes >= 100
        ? costoMPNuevo * 2 // Fallback si margen es 100%
        : costoMPNuevo / (1 - margenAntes / 100);

      return {
        id_producto: prod.id_producto,
        nombre_producto: prod.nombre_producto,
        categoria: prod.categoria,
        // Escenario ANTES
        costo_mp_antes: parseFloat(costoMPActual.toFixed(2)),
        precio_venta_actual: parseFloat(precioVenta.toFixed(2)),
        utilidad_antes: parseFloat(utilidadAntes.toFixed(2)),
        margen_antes: parseFloat(margenAntes.toFixed(2)),
        // Escenario DESPUÉS
        costo_mp_despues: parseFloat(costoMPNuevo.toFixed(2)),
        utilidad_despues: parseFloat(utilidadDespues.toFixed(2)),
        margen_despues: parseFloat(margenDespues.toFixed(2)),
        // Recomendación
        precio_venta_sugerido: parseFloat(precioSugerido.toFixed(2)),
        // Deltas
        delta_costo: parseFloat((costoMPNuevo - costoMPActual).toFixed(2)),
        delta_margen: parseFloat((margenDespues - margenAntes).toFixed(2))
      };
    });

    return res.status(200).json({
      success: true,
      insumo: {
        id_insumo: insumo.id_insumo,
        nombre: insumo.nombre_insumo,
        unidad_medida: insumo.unidad_medida,
        costo_original: costoOriginal,
        costo_nuevo: parseFloat(costoNuevo.toFixed(2)),
        incremento_porcentual: incremento
      },
      productos_afectados: comparativa,
      total_productos_impactados: comparativa.length
    });

  } catch (error) {
    console.error('[Simulador Inflación Error]:', error);
    return res.status(500).json({
      error: 'Error al ejecutar simulación de inflación.',
      detalle: error.message
    });
  }
}
