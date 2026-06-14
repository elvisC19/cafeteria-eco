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

  if (req.method === 'PATCH') {
    try {
      const { id_producto, imagen_url } = req.body;
      if (!id_producto) {
        return res.status(400).json({ error: 'Se requiere id_producto.' });
      }
      const result = await query(
        'UPDATE productos SET imagen_url = $1 WHERE id_producto = $2 RETURNING *',
        [imagen_url || null, id_producto]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }
      return res.status(200).json({ success: true, producto: result.rows[0] });
    } catch (error) {
      console.error('[PATCH Productos Error]:', error);
      return res.status(500).json({ error: 'Error al actualizar el producto.', detalle: error.message });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido. Use GET o PATCH.' });
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
