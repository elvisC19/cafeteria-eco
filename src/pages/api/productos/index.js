// ============================================================================
// API: GET /api/productos
// Obtener todos los productos disponibles para el menú público
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  try {
    const { disponible, categoria } = req.query;
    let whereConditions = [];
    let params = [];

    if (disponible === 'true') {
      whereConditions.push('disponible = TRUE');
    }

    if (categoria) {
      params.push(categoria);
      whereConditions.push(`categoria = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(
      `SELECT * FROM productos ${whereClause} ORDER BY categoria, nombre_producto`,
      params
    );

    // Agrupar por categoría
    const categorias = {};
    result.rows.forEach(prod => {
      if (!categorias[prod.categoria]) {
        categorias[prod.categoria] = [];
      }
      categorias[prod.categoria].push(prod);
    });

    return res.status(200).json({
      success: true,
      productos: result.rows,
      por_categoria: categorias,
      total: result.rows.length
    });

  } catch (error) {
    console.error('[GET Productos Error]:', error);
    return res.status(500).json({ error: 'Error al obtener productos.', detalle: error.message });
  }
}
