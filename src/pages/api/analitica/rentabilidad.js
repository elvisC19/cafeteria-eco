// ============================================================================
// API: GET /api/analitica/rentabilidad
// Análisis de rentabilidad por producto — Vista de Ingeniería Económica
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido. Use GET.' });

  try {
    // Consultar la vista de ingeniería del menú ordenada por utilidad descendente
    const result = await query(
      `SELECT * FROM vista_ingenieria_menu ORDER BY utilidad_por_unidad DESC;`,
      []
    );

    const productos = result.rows;

    if (productos.length === 0) {
      return res.status(200).json({
        success: true,
        productos: [],
        producto_mas_rentable: null,
        producto_menos_rentable: null,
        margen_promedio_cafeteria: 0
      });
    }

    // Producto más rentable (primer elemento, ya ordenados DESC por utilidad)
    const masRentable = productos[0];
    const producto_mas_rentable = {
      nombre: masRentable.nombre_producto,
      margen: parseFloat(masRentable.margen_contribucion_porcentual),
      utilidad: parseFloat(masRentable.utilidad_por_unidad)
    };

    // Producto menos rentable (último elemento)
    const menosRentable = productos[productos.length - 1];
    const producto_menos_rentable = {
      nombre: menosRentable.nombre_producto,
      margen: parseFloat(menosRentable.margen_contribucion_porcentual),
      utilidad: parseFloat(menosRentable.utilidad_por_unidad)
    };

    // Margen promedio ponderado de la cafetería
    const sumaMargen = productos.reduce(
      (acc, p) => acc + parseFloat(p.margen_contribucion_porcentual || 0), 0
    );
    const margen_promedio_cafeteria = parseFloat((sumaMargen / productos.length).toFixed(2));

    return res.status(200).json({
      success: true,
      productos,
      producto_mas_rentable,
      producto_menos_rentable,
      margen_promedio_cafeteria
    });

  } catch (error) {
    console.error('[Rentabilidad Error]:', error);
    return res.status(500).json({
      error: 'Error al obtener análisis de rentabilidad.',
      detalle: error.message
    });
  }
}
